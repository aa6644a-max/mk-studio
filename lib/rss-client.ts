/**
 * Naver Blog RSS 클라이언트.
 * feedparser 없이 순수 fetch + 정규식으로 파싱.
 */

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
      posts.push({ title, text: stripHtml(description) });
    }
  }
  return posts;
}

/**
 * 최신 N개 블로그 글을 텍스트로 반환.
 * Claude 참조용 (문체/스타일 학습 소스).
 */
export async function getRssLatestText(
  blogId = "shock552",
  limit = 5,
): Promise<string> {
  const posts = await parseRSS(blogId);
  if (!posts.length) return "";
  return posts
    .slice(0, limit)
    .map(
      (p, i) =>
        `--- 블로그 원문 ${i + 1}: ${p.title} ---\n${p.text.slice(0, 1500)}`,
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
