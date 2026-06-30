import type { NextRequest } from "next/server";

/** TMDB 이미지 동일 출처 프록시 — html-to-image canvas taint 방지. */
export async function GET(req: NextRequest) {
  const u = req.nextUrl.searchParams.get("u");
  if (!u || !/^https:\/\/image\.tmdb\.org\//.test(u)) {
    return new Response("bad url", { status: 400 });
  }
  try {
    const res = await fetch(u, { next: { revalidate: 86400 } });
    if (!res.ok) return new Response("fetch fail", { status: 502 });
    const buf = await res.arrayBuffer();
    return new Response(buf, {
      headers: {
        "Content-Type": res.headers.get("content-type") ?? "image/jpeg",
        "Cache-Control": "public, max-age=86400, immutable",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch {
    return new Response("error", { status: 500 });
  }
}
