import { NextResponse } from "next/server";
import { appendPost, getPosts } from "@/lib/google-sheets";
import type { PostStatus, PostType } from "@/lib/types";

// GET /api/posts?status=published|draft → 목록 조회
export async function GET(req: Request) {
  const status = new URL(req.url).searchParams.get("status") as
    | PostStatus
    | null;
  try {
    const posts = await getPosts(status ?? undefined);
    return NextResponse.json({ posts });
  } catch (e) {
    console.error("[/api/posts GET]", e);
    return NextResponse.json(
      { posts: [], error: (e as Error).message },
      { status: 500 },
    );
  }
}

// POST /api/posts → 1건 저장
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      movieTitle: string;
      postType: PostType;
      content: string;
      status: PostStatus;
    };
    const saved = await appendPost(body);
    return NextResponse.json({ post: saved });
  } catch (e) {
    console.error("[/api/posts POST]", e);
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 },
    );
  }
}
