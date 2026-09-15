/**
 * Naver Blog RSS 클라이언트.
 * feedparser 없이 순수 fetch + 정규식으로 파싱.
 */
import { htmlToStyleText, sampleStyleText } from "@/lib/style-text";

function extractCDATA(xml: string, tag: string): string {
  const cdata = new RegExp(
    `<${tag}><\\!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`,
    "i",
  );
  const plain = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, "i");
  return (xml.match(cdata)?.[1] ?? xml.match(plain)?.[1] ?? "").trim();
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * postType → RSS 문체 참조 우선 키워드 (같은 계열 글 우선 선별).
 * 배열 앞쪽일수록 변별력이 높은 키워드를 둔다 — titleScore가 순서를 가중치로 쓴다.
 * ("후기"는 영화 리뷰·마켓·방문기에 모두 붙으므로 "영화"·"리뷰"보다 뒤에 둔다.)
 */
export const TYPE_STYLE_KEYWORDS: Record<string, string[]> = {
  review: ["영화", "리뷰", "후기", "개봉"],
  preview: ["영화", "개봉", "기대", "프리뷰"],
  curation: ["영화", "추천", "큐레이션", "모음"],
  binge: ["정주행", "시리즈", "드라마", "몰아보기"],
  photo: ["카페", "맛집", "방문", "여행", "전시"],
  local: ["모집", "공고", "지원", "교육", "행사"],
  pdf: ["안내", "정리", "총정리", "소식"],
  market: ["마켓", "플리마켓", "페어", "행사", "후기"],
};

interface RSSPost {
  title: string;
  text: string;
}

/**
 * 제목이 preferKeywords와 얼마나 맞는지 점수화. 배열 앞쪽 키워드일수록 가중치가 높다.
 * 단순 포함 여부(매칭/비매칭)로만 나누면 "플리마켓 후기"와 "영화 인턴 리뷰"가 동급이 되어
 * 최신순에 밀린 쪽이 문체 참조에서 빠진다.
 */
function titleScore(title: string, preferKeywords: string[]): number {
  let score = 0;
  preferKeywords.forEach((keyword, i) => {
    if (keyword && title.includes(keyword)) score += preferKeywords.length - i;
  });
  return score;
}

/**
 * 주제에서 제목 매칭에 쓸 소재어를 뽑는다.
 * 같은 작품·장소를 다룬 과거 글이 있으면 그게 가장 좋은 문체 참조다.
 * 한국어는 조사가 붙어("경주기행을") 그대로는 제목에 안 걸리므로 끝 한 글자를 뗀 형태도 함께 넣는다.
 */
function topicTerms(topic: string, limit = 4): string[] {
  const terms: string[] = [];
  let count = 0;
  for (const raw of topic.split(/\s+/)) {
    if (count >= limit) break;
    const word = raw.replace(/[^가-힣A-Za-z0-9]/g, "");
    if (word.length < 2) continue;
    count++;
    terms.push(word);
    if (word.length >= 3) terms.push(word.slice(0, -1));
  }
  return terms;
}

/**
 * 주제 문장에서 문체 참조용 키워드 세트를 고른다.
 * postType이 아직 정해지지 않은 단계(AI 맞춤 작성의 첫 분석)에서 쓴다.
 * 같은 소재를 다룬 과거 글을 최우선으로 두고, 그 뒤에 같은 계열
 * (TYPE_STYLE_KEYWORDS 중 주제에 가장 많이 걸리는 그룹) 글을 둔다.
 * 둘 다 없으면 빈 배열이 되어 최신순으로 떨어진다.
 */
export function styleKeywordsForTopic(topic: string): string[] {
  let best: string[] = [];
  let bestScore = 0;
  for (const keywords of Object.values(TYPE_STYLE_KEYWORDS)) {
    const score = titleScore(topic, keywords);
    if (score > bestScore) {
      bestScore = score;
      best = keywords;
    }
  }
  return [...topicTerms(topic), ...best];
}

async function parseRSS(blogId: string): Promise<RSSPost[]> {
  const url = `https://rss.blog.naver.com/${blogId}.xml`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; MKStudio/1.0)" },
    next: { revalidate: 300 }, // 5분 캐시
  });
  if (!res.ok) throw new Error(`RSS ${res.status}`);
  const xml = await res.text();

  const posts: RSSPost[] = [];
  for (const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const block = m[1];
    const title = extractCDATA(block, "title");
    const description = extractCDATA(block, "description");
    if (title) {
      // 문체 학습용이므로 단락 리듬·강조 패턴을 보존해 변환
      posts.push({ title, text: htmlToStyleText(description) });
    }
  }
  return posts;
}

/**
 * 최신 N개 블로그 글을 문체 학습용 텍스트로 반환.
 * preferKeywords를 주면 제목에 해당 키워드가 포함된 글(같은 타입 계열)을
 * 우선 선별해 문체 오염(예: 최신 글이 전부 공고문일 때 영화 리뷰 생성)을 줄인다.
 */
export async function getRssLatestText(
  blogId = "shock552",
  limit = 5,
  preferKeywords: string[] = [],
): Promise<string> {
  const posts = await parseRSS(blogId);
  if (!posts.length) return "";

  let selected = posts;
  if (preferKeywords.length) {
    // 점수 높은 순, 동점이면 원래 순서(최신순)를 유지한다.
    selected = posts
      .map((post, index) => ({ post, index, score: titleScore(post.title, preferKeywords) }))
      .sort((a, b) => b.score - a.score || a.index - b.index)
      .map((x) => x.post);
  }

  return selected
    .slice(0, limit)
    .map(
      (p, i) =>
        `--- 블로그 원문 ${i + 1}: ${p.title} ---\n${sampleStyleText(p.text, 1100, 400)}`,
    )
    .join("\n\n");
}

export interface BlogPost {
  title: string;
  link: string;
  pubDate: string;
  thumbnail: string | null;
  excerpt: string;
}

function extractThumbnail(html: string): string | null {
  const m = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return m?.[1] ?? null;
}

function parseDate(raw: string): string {
  try {
    return new Date(raw).toISOString().slice(0, 10);
  } catch {
    return raw.slice(0, 10);
  }
}

async function parseRSSFull(blogId: string): Promise<BlogPost[]> {
  const url = `https://rss.blog.naver.com/${blogId}.xml`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; MKStudio/1.0)" },
    next: { revalidate: 300 },
  });
  if (!res.ok) throw new Error(`RSS ${res.status}`);
  const xml = await res.text();

  const posts: BlogPost[] = [];
  for (const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const block = m[1];
    const title = extractCDATA(block, "title");
    const link =
      extractCDATA(block, "link") ||
      block.match(/<link[^>]*>(.*?)<\/link>/i)?.[1] ||
      "";
    const pubDateRaw =
      block.match(/<pubDate>(.*?)<\/pubDate>/i)?.[1]?.trim() ?? "";
    const description = extractCDATA(block, "description");

    if (!title) continue;
    posts.push({
      title,
      link,
      pubDate: parseDate(pubDateRaw),
      thumbnail: extractThumbnail(description),
      excerpt: stripHtml(description).slice(0, 120),
    });
  }
  return posts;
}

/**
 * 홈 대시보드용 최신 블로그 포스팅 목록.
 */
export async function getRssLatestPosts(
  blogId = "shock552",
  limit = 5,
): Promise<BlogPost[]> {
  const posts = await parseRSSFull(blogId);
  return posts.slice(0, limit);
}

/**
 * RSS 전체 글 수 (홈 통계용).
 */
export async function getRssTotalCount(blogId = "shock552"): Promise<number> {
  const posts = await parseRSSFull(blogId);
  return posts.length;
}
