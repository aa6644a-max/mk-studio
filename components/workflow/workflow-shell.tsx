"use client";

import { useWorkflowStore } from "@/lib/workflow-store";
import Header from "@/components/header";
import TopicInput from "./topic-input";
import StrategyCardView from "./strategy-card";
import ChatInterview from "./chat-interview";
import GeneratingScreen from "./generating-screen";
import ResultPanel from "./result-panel";

const STAGE_LABEL: Record<string, string> = {
  input: "새 포스팅",
  strategy: "전략 수립",
  interview: "인터뷰",
  generating: "생성 중",
  result: "결과",
};

export default function WorkflowShell() {
  const { stage, error } = useWorkflowStore();

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
      }}
    >
      <Header
        title={STAGE_LABEL[stage] ?? "포스팅"}
        actions={
          stage !== "input" && stage !== "generating" ? (
            <StageIndicator />
          ) : undefined
        }
      />

      {error && (
        <div
          style={{
            padding: "8px 20px",
            background: "#FEF2F2",
            borderBottom: "1px solid #FECACA",
            fontSize: "13px",
            color: "#DC2626",
          }}
        >
          오류: {error}
        </div>
      )}

      <div style={{ flex: 1, overflow: "hidden", background: "#F7F7F8" }}>
        {stage === "input" && <TopicInput />}
        {stage === "strategy" && <StrategyCardView />}
        {stage === "interview" && <ChatInterview />}
        {stage === "generating" && <GeneratingScreen />}
        {stage === "result" && <ResultPanel />}
      </div>
    </div>
  );
}

function StageIndicator() {
  const { stage } = useWorkflowStore();
  const stages = ["strategy", "interview", "result"] as const;
  const stageLabels = { strategy: "전략", interview: "인터뷰", result: "결과" };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
      {stages.map((s, i) => {
        const stageIndex = stages.indexOf(stage as typeof stages[number]);
        const isDone = stageIndex > i;
        const isActive = stage === s || (stage === "generating" && s === "result");

        return (
          <div key={s} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span
              style={{
                fontSize: "12px",
                fontWeight: isActive || isDone ? 600 : 400,
                color: isDone ? "#16a34a" : isActive ? "#0066FF" : "#aaa",
              }}
            >
              {isDone ? "✓ " : ""}
              {stageLabels[s]}
            </span>
            {i < stages.length - 1 && (
              <span style={{ color: "#ddd", fontSize: "12px" }}>→</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
