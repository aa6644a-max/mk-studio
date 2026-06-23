"use client";

import { useWorkflowStore } from "@/lib/workflow-store";
import Header from "@/components/header";
import TopicInput from "./topic-input";
import StrategyCardView from "./strategy-card";
import TmdbSearchView from "./tmdb-search";
import SeedInput from "./seed-input";
import ChatInterview from "./chat-interview";
import GeneratingScreen from "./generating-screen";
import ResultPanel from "./result-panel";

const STAGE_LABEL: Record<string, string> = {
  input: "새 포스팅",
  strategy: "전략 수립",
  "tmdb-search": "작품 검색",
  seed: "감상평",
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
        {stage === "tmdb-search" && <TmdbSearchView />}
        {stage === "seed" && <SeedInput />}
        {stage === "interview" && <ChatInterview />}
        {stage === "generating" && <GeneratingScreen />}
        {stage === "result" && <ResultPanel />}
      </div>
    </div>
  );
}

const MOVIE_TYPES = ["review", "preview", "curation", "binge"];

function StageIndicator() {
  const { stage, postType } = useWorkflowStore();
  const isMovie = MOVIE_TYPES.includes(postType);
  // review: 작품 → 감상평 → 전략, 그 외 영화: 작품 → 전략, 비영화: 전략부터
  const stages = (postType === "review"
    ? ["tmdb-search", "seed", "strategy", "interview", "result"]
    : isMovie
    ? ["tmdb-search", "strategy", "interview", "result"]
    : ["strategy", "interview", "result"]) as readonly string[];
  const stageLabels: Record<string, string> = { strategy: "전략", "tmdb-search": "작품", seed: "감상평", interview: "인터뷰", result: "결과" };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
      {stages.map((s, i) => {
        const stageIndex = stages.indexOf(stage);
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
