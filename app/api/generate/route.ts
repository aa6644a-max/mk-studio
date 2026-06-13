import { NextResponse } from "next/server";
import { generatePost } from "@/lib/claude";
import type { PostDraft } from "@/lib/types";

export const maxDuration = 300; // Railway: 생성 1~2분 허용

export async function POST(req: Request) {
  try {
    const draft = (await req.json()) as PostDraft;
    const html = await generatePost(draft);
    return NextResponse.json({ html });
  } catch (e) {
    console.error("[/api/generate]", e);
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 },
    );
  }
}
