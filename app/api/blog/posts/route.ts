import { NextResponse } from "next/server";
import { getRssLatestPosts } from "@/lib/rss-client";

/** 카드뉴스 메이커용 내 블로그 최신 글 목록 (RSS, 최대 50개) */
export async function GET() {
  try {
    const posts = await getRssLatestPosts("shock552", 50);
    return NextResponse.json({ posts });
  } catch (e) {
    console.error("[/api/blog/posts]", e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
