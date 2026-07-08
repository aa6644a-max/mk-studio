import { NextResponse } from "next/server";
import { isDbConfigured } from "@/lib/db";
import { detectAndStoreEvents } from "@/lib/movie-news/detect";
import { scoreNewEvents, generateTopDrafts } from "@/lib/movie-news/generate";

export const maxDuration = 300; // 감지 + 채점 + 초안 생성까지 수 분 소요

/**
 * 영화소식 수집 파이프라인 (GitHub Actions cron이 호출).
 * 감지 → 채점 → 상위 2~3건 초안 생성. CRON_SECRET 헤더 필수.
 */
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!isDbConfigured()) {
    return NextResponse.json(
      { error: "DATABASE_URL 미설정 — Railway Postgres를 추가하세요." },
      { status: 503 },
    );
  }

  try {
    const detect = await detectAndStoreEvents();
    const scored = await scoreNewEvents();
    const drafts = await generateTopDrafts();
    return NextResponse.json({ ok: true, ...detect, scored, drafts });
  } catch (e) {
    console.error("[/api/cron/collect]", e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
