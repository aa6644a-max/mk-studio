import { type NextRequest, NextResponse } from "next/server";
import { appendBlogPost, getBlogPostTitles } from "@/lib/google-sheets";

type RSSItem = { title: string; link: string; description: string };

function extractCDATA(xml: string, tag: string): string {
  const cdataRe = new RegExp(`<${tag}><\\!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, "i");
  const plainRe = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, "i");
  return (xml.match(cdataRe)?.[1] ?? xml.match(plainRe)?.[1] ?? "").trim();
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

async function parseRSS(blogId: string): Promise<RSSItem[]> {
  const rssUrl = `https://rss.blog.naver.com/${blogId}.xml`;
  const res = await fetch(rssUrl, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; MKStudio/1.0)" },
    next: { revalidate: 0 },
  });
  if (!res.ok) throw new Error(`RSS 피드 오류 (${res.status})`);
  const xml = await res.text();

  const items: RSSItem[] = [];
  for (const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const block = m[1];
    const title = extractCDATA(block, "title");
    const link = extractCDATA(block, "link") || block.match(/<link\s*\/?\s*>(.*?)<\/link>/i)?.[1] || "";
    const description = extractCDATA(block, "description");
    if (title) items.push({ title, link, description });
  }
  return items;
}

async function scrapeFullText(link: string): Promise<string | null> {
  if (!link) return null;
  try {
    const mobileUrl = link.replace("blog.naver.com", "m.blog.naver.com");
    const res = await fetch(mobileUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; SM-G981B) AppleWebKit/537.36 Mobile Safari/537.36",
      },
    });
    if (!res.ok) return null;
    const html = await res.text();
    // se-main-container 영역 추출 (최신 네이버 에디터)
    const match = html.match(/class="se-main-container"[^>]*>([\s\S]{100,10000})/);
    if (!match) return null;
    return stripHtml(match[1]).slice(0, 8000);
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const { blogId = "shock552", force = false } = await req.json().catch(() => ({}));

  try {
    const [items, existingTitles] = await Promise.all([
      parseRSS(blogId),
      force ? Promise.resolve(new Set<string>()) : getBlogPostTitles(),
    ]);

    if (!items.length) {
      return NextResponse.json({ error: "RSS에서 글을 가져올 수 없습니다." }, { status: 400 });
    }

    let saved = 0;
    let skipped = 0;

    for (const item of items) {
      if (existingTitles.has(item.title)) {
        skipped++;
        continue;
      }

      // 모바일 스크래핑 시도 → 실패 시 RSS description 폴백
      const fullText = await scrapeFullText(item.link);
      const content = fullText ?? stripHtml(item.description);

      if (content.length > 20) {
        await appendBlogPost(item.title, content);
        saved++;
      }

      // Sheets API 과부하 방지
      await new Promise((r) => setTimeout(r, 1500));
    }

    return NextResponse.json({ total: items.length, saved, skipped });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
