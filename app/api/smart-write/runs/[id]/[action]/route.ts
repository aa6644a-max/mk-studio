import type { NextRequest } from "next/server";
import { mutateRun } from "@/lib/writing/repository";
import { advanceRun, answerRun } from "@/lib/writing/engine";
import { owner, jsonBody, json, view, errorResponse } from "@/lib/writing/http";
import { parseStrategy, WritingError } from "@/lib/writing/types";

export const runtime = "nodejs";
export const maxDuration = 210;
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string; action: string }> }) {
  try {
    const { id, action } = await params;
    if (!["advance", "answers", "strategy", "retry", "cancel"].includes(action)) throw new WritingError("지원하지 않는 작업입니다.", 404);
    const body = await jsonBody(req);
    if (!Number.isInteger(body.version) || (body.version as number) < 0) throw new WritingError("작업 버전이 올바르지 않습니다.");
    const run = await mutateRun(owner(req).id, id, body.version as number, async run => {
      if (action === "advance") await advanceRun(run);
      if (action === "answers") await answerRun(run, body.answers);
      if (action === "strategy") {
        if (!run.strategy || run.stage === "cancelled" || run.stage === "awaiting_input") throw new WritingError("추가 질문을 마친 뒤 방향을 수정해주세요.", 409);
        run.strategy = parseStrategy(body.strategy);
        run.article = null; run.issues = []; run.repairs = 0;
        // Research again before drafting so an edited angle never relies on stale coverage.
        run.brief.audience = run.strategy.audience;
        run.stage = "planning";
        delete run.error; delete run.retryStage;
        run.log.push({ at: new Date().toISOString(), message: "사용자가 수정한 방향을 기준으로 자료와 구성을 다시 확인합니다." });
      }
      if (action === "retry") {
        if (run.stage !== "failed" || !run.retryStage) throw new WritingError("다시 시도할 단계가 없습니다.", 409);
        run.stage = run.retryStage; delete run.error;
      }
      if (action === "cancel") { run.stage = "cancelled"; delete run.error; run.log.push({ at: new Date().toISOString(), message: "작성을 중지했습니다. 현재까지의 자료는 저장돼 있습니다." }); }
    });
    return json({ run: view(run) });
  } catch (e) { return errorResponse(e); }
}
