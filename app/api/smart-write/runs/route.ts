import type { NextRequest } from "next/server";
import { createRun, storageKind } from "@/lib/writing/repository";
import { newRun } from "@/lib/writing/engine";
import { owner, attachOwner, jsonBody, json, view, errorResponse } from "@/lib/writing/http";
import { parseBrief, str, WritingError } from "@/lib/writing/types";
import { toolSummary } from "@/lib/writing/tools";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) {
  try {
    const session = owner(req, true);
    return attachOwner(req, json({ storage: storageKind(), modelReady: !!process.env.ANTHROPIC_API_KEY, tools: toolSummary() }), session.token);
  } catch (e) { return errorResponse(e); }
}
export async function POST(req: NextRequest) {
  try {
    const b = await jsonBody(req), session = owner(req, true);
    if (!process.env.ANTHROPIC_API_KEY) throw new WritingError("AI 작성을 위해 ANTHROPIC_API_KEY를 설정해주세요.", 503);
    const id = str(b.requestId, 36, true);
    if (!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(id)) throw new WritingError("작업 ID가 올바르지 않습니다.");
    const run = await createRun(session.id, newRun(id, parseBrief(b.brief)));
    return attachOwner(req, json({ run: view(run) }), session.token);
  } catch (e) { return errorResponse(e); }
}
