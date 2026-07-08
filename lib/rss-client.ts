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

/** postType → RSS 문체 참조 우선 키워드 (같은 계열 글 우선 선별). */
export const TYPE_STYLE_KEYWORDS: Record<string, string[]> = {
  review: ["영화", "리뷰", "후기", "개봉"],
  preview: ["영화", "개봉", "기대", "프리뷰"],
  curation: ["영화", "추천", "큐레이션", "모음"],
  binge: ["정주행", "시리즈", "드라마", "몰아보기"],
  photo: ["카페", "맛집", "방문", "여행", "전시"],
  local: ["모집", "공고", "지원", "교육", "행사"],
  pdf: ["안내", "정리", "총정리", "소식"],
};

interface RSSPost {
  title: string;
  text: string;
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
    const matched = posts.filter((p) =>
      preferKeywords.some((k) => p.title.includes(k)),
    );
    const rest = posts.filter((p) => !matched.includes(p));
    selected = [...matched, ...rest];
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
