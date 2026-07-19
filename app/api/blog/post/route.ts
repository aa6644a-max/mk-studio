import { NextResponse } from "next/server";

/**
 * 네이버 블로그 글 전문 추출.
 * RSS description은 350자 요약뿐이라, PostView 페이지를 직접 읽어 본문을 뽑는다.
 * 스마트에디터 ONE(se-main-container)과 구버전 에디터(postViewArea) 모두 지원.
 */

const END_MARKERS = [
  'class="u_likeit', // 공감 위젯 — 본문 직후 첫 요소
  'id="naverCommentDiv',
  'class="post_btn',
  'class="blog_authorArea',
  'class="area_comment',
  'id="printPost',
];

function htmlToText(html: string): string {
  return html
    // 링크 카드(oglink)는 본문 중간에도 등장하므로 끝 마커로 쓰지 않고,
    // 카드 안의 제목·요약·URL 텍스트만 제거해 노이즈를 없앤다.
    .replace(
      /<(strong|p)[^>]*class="se-oglink-[^"]*"[^>]*>[\s\S]*?<\/\1>/gi,
      "",
    )
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(?:br|\/p|\/div|\/h[1-6]|\/li)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/​/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n\s*/g, "\n\n")
    .replace(/<[^>]*$/, "") // 끝 마커 위치에서 잘린 미완성 태그 제거
    .trim();
}

/**
 * 컨테이너 div의 닫힘 지점을 div 중첩 깊이로 추적.
 * 스킨마다 본문 뒤에 붙는 위젯·레이어가 달라 마커만으로는 끝을 못 잡는다.
 */
function findDivEnd(html: string, start: number): number {
  const re = /<\/?div\b/gi;
  re.lastIndex = start;
  let depth = 1;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    depth += m[0][1] === "/" ? -1 : 1;
    if (depth === 0) return m.index;
  }
  return html.length;
}

function extractBody(html: string): string {
  for (const startMarker of ["se-main-container", "postViewArea"]) {
    const markerIdx = html.indexOf(startMarker);
    if (markerIdx < 0) continue;
    const start = html.indexOf(">", markerIdx) + 1; // 여는 태그 끝까지 건너뛰기
    let end = findDivEnd(html, start);
    // 마크업이 깨져 depth 추적이 실패한 경우를 대비한 안전망
    for (const m of END_MARKERS) {
      const idx = html.indexOf(m, start);
      if (idx > start && idx < end) end = idx;
    }
    const text = htmlToText(html.slice(start, end));
    if (text.length > 100) return text;
  }
  return "";
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url") ?? "";
  const m = url.match(/blog\.naver\.com\/([A-Za-z0-9_-]+)\/(\d+)/);
  if (!m) {
    return NextResponse.json({ error: "네이버 블로그 글 URL이 아닙니다." }, { status: 400 });
  }
  const [, blogId, logNo] = m;

  try {
    const res = await fetch(
      `https://blog.naver.com/PostView.naver?blogId=${blogId}&logNo=${logNo}`,
      {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; MKStudio/1.0)" },
        next: { revalidate: 300 },
      },
    );
    if (!res.ok) throw new Error(`본문 페이지 ${res.status}`);
    const html = await res.text();
    const text = extractBody(html);
    if (!text) {
      return NextResponse.json(
        { error: "본문 추출 실패 — 글을 복사해 직접 붙여넣어 주세요." },
        { status: 422 },
      );
    }
    return NextResponse.json({ text: text.slice(0, 12000) });
  } catch (e) {
    console.error("[/api/blog/post]", e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
