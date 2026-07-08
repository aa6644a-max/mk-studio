import { NextResponse } from "next/server";
import { dbQuery, isDbConfigured } from "@/lib/db";
import { generateDraftForEvent } from "@/lib/movie-news/generate";

export const maxDuration = 300;

/** 홈 탭 영화소식 패널: 검토 대기 초안 + 최근 이벤트 목록 */
export async function GET() {
  if (!isDbConfigured()) {
    return NextResponse.json({ configured: false, drafts: [], events: [] });
  }
  try {
    const [drafts, events] = await Promise.all([
      dbQuery(
        `SELECT id, format, title, body_md, card_news, status, created_at
         FROM movie_drafts WHERE status = 'pending'
         ORDER BY id DESC LIMIT 10`,
      ),
      dbQuery(
        `SELECT id, event_type, title, summary, score, score_reason, status, created_at
         FROM movie_events WHERE status IN ('scored', 'new')
         ORDER BY score DESC NULLS LAST, id DESC LIMIT 15`,
      ),
    ]);
    return NextResponse.json({ configured: true, drafts, events });
  } catch (e) {
    console.error("[/api/movie-news GET]", e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

/** 이벤트 수동 초안 생성: { eventId } */
export async function POST(req: Request) {
  try {
    const { eventId } = (await req.json()) as { eventId?: number };
    if (!eventId) {
      return NextResponse.json({ error: "eventId 필요" }, { status: 400 });
    }
    const result = await generateDraftForEvent(eventId);
    return NextResponse.json(result);
  } catch (e) {
    console.error("[/api/movie-news POST]", e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

/** 초안 상태 변경: { draftId, status: 'reviewed' | 'archived' } */
export async function PATCH(req: Request) {
  try {
    const { draftId, status } = (await req.json()) as {
      draftId?: number;
      status?: string;
    };
    if (!draftId || !status || !["reviewed", "archived"].includes(status)) {
      return NextResponse.json({ error: "draftId, status(reviewed|archived) 필요" }, { status: 400 });
    }
    await dbQuery(`UPDATE movie_drafts SET status = $1 WHERE id = $2`, [status, draftId]);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[/api/movie-news PATCH]", e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
