import WorkflowShell from "@/components/workflow/workflow-shell";

/**
 * AI 맞춤 작성 — 타입을 먼저 고르지 않고 자유 텍스트/첨부만으로 시작.
 * /api/workflow/strategy의 자동분류(STRATEGY_SYSTEM)가 review/preview/curation/
 * binge/essay 중 postType을 판단한다. 사진·PDF·마켓은 첨부 자체가 명시적 신호.
 */
export default function SmartWritePage() {
  return <WorkflowShell entryMode="smart" />;
}
