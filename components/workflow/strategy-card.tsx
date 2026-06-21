"use client";

import { useState } from "react";
import { useWorkflowStore, type StrategyCard } from "@/lib/workflow-store";
import { POST_TYPE_META, type PostType } from "@/lib/types";

const CONTENT_TYPE_LABEL = {
  searchable: "🔍 Searchable — 검색 수요 포착",
  shareable: "🔥 Shareable — 공유 유발",
  both: "✨ Both — 검색 + 공유 둘 다",
};

export default function StrategyCardView() {
  const { strategy, topic, postType, setPostType, setStage, addMessage, setStreaming } =
    useWorkflowStore();
  const [starting, setStarting] = useState(false);

  if (!strategy) return null;

  async function handleStart() {
    if (!strategy) return;
    setStarting(true);

    // 인터뷰 시작 — AI 첫 질문 스트리밍
    setStage("interview");
    setStreaming(true);
    addMessage({ role: "assistant", content: "" });

    try {
      const res = await fetch("/api/workflow/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [],
          strategy: { ...strategy, postType },
          topic,
        }),
      });

      if (!res.body) throw new Error("스트림 없음");
      await consumeStream(res.body);
    } catch (e) {
      console.error(e);
    } finally {
      useWorkflowStore.getState().setStreaming(false);
      setStarting(false);
    }
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        padding: "24px",
      }}
    >
      <div style={{ width: "100%", maxWidth: "560px" }}>
        {/* 헤더 */}
        <div style={{ marginBottom: "20px" }}>
          <div
            style={{ fontSize: "12px", color: "#5a5c63", marginBottom: "4px" }}
          >
            주제 분석 완료
          </div>
          <h2
            style={{
              fontSize: "18px",
              fontWeight: 700,
              color: "#171719",
              margin: 0,
            }}
          >
            {topic}
          </h2>
        </div>

        {/* 전략 카드 */}
        <div
          style={{
            background: "#fff",
            borderRadius: "16px",
            border: "1px solid rgba(112,115,124,0.13)",
            boxShadow: "0 2px 16px rgba(0,0,0,0.06)",
            overflow: "hidden",
          }}
        >
          {/* 타입 행 */}
          <div
            style={{
              padding: "16px 20px",
              borderBottom: "1px solid rgba(112,115,124,0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: "11px",
                  color: "#5a5c63",
                  marginBottom: "4px",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                감지된 포스팅 타입
              </div>
              <div
                style={{
                  fontSize: "15px",
                  fontWeight: 600,
                  color: "#171719",
                }}
              >
                {POST_TYPE_META[postType]?.icon}{" "}
                {POST_TYPE_META[postType]?.label}
              </div>
            </div>
            <select
              value={postType}
              onChange={(e) => setPostType(e.target.value as PostType)}
              style={{
                padding: "6px 10px",
                borderRadius: "8px",
                border: "1px solid rgba(112,115,124,0.2)",
                fontSize: "13px",
                color: "#171719",
                background: "#f7f7f8",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              {Object.entries(POST_TYPE_META).map(([key, { icon, label }]) => (
                <option key={key} value={key}>
                  {icon} {label}
                </option>
              ))}
            </select>
          </div>

          {/* 콘텐츠 타입 */}
          <div
            style={{
              padding: "14px 20px",
              borderBottom: "1px solid rgba(112,115,124,0.1)",
              background: "#fafafa",
            }}
          >
            <span
              style={{
                fontSize: "13px",
                fontWeight: 600,
                color: "#0066FF",
              }}
            >
              {CONTENT_TYPE_LABEL[strategy.contentType]}
            </span>
          </div>

          {/* SEO 키워드 */}
          <div
            style={{
              padding: "16px 20px",
              borderBottom: "1px solid rgba(112,115,124,0.1)",
            }}
          >
            <div
              style={{
                fontSize: "11px",
                color: "#5a5c63",
                marginBottom: "8px",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              SEO 키워드
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {strategy.keywords.map((kw) => (
                <span
                  key={kw}
                  style={{
                    padding: "4px 10px",
                    borderRadius: "20px",
                    background: "#EBF2FF",
                    color: "#0066FF",
                    fontSize: "13px",
                    fontWeight: 500,
                  }}
                >
                  {kw}
                </span>
              ))}
            </div>
          </div>

          {/* 타겟 독자 */}
          <div
            style={{
              padding: "16px 20px",
              borderBottom: "1px solid rgba(112,115,124,0.1)",
            }}
          >
            <div
              style={{
                fontSize: "11px",
                color: "#5a5c63",
                marginBottom: "4px",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              타겟 독자
            </div>
            <div style={{ fontSize: "14px", color: "#171719" }}>
              {strategy.target}
            </div>
          </div>

          {/* 콘텐츠 각도 */}
          <div style={{ padding: "16px 20px" }}>
            <div
              style={{
                fontSize: "11px",
                color: "#5a5c63",
                marginBottom: "4px",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              콘텐츠 각도
            </div>
            <div style={{ fontSize: "14px", color: "#171719", lineHeight: 1.6 }}>
              {strategy.angle}
            </div>
          </div>
        </div>

        {/* 액션 버튼 */}
        <div
          style={{
            display: "flex",
            gap: "10px",
            marginTop: "20px",
          }}
        >
          <button
            onClick={() => useWorkflowStore.getState().reset()}
            style={{
              flex: 1,
              padding: "12px",
              borderRadius: "10px",
              border: "1px solid rgba(112,115,124,0.2)",
              background: "#fff",
              fontSize: "14px",
              color: "#5a5c63",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            ← 다시 입력
          </button>
          <button
            onClick={handleStart}
            disabled={starting}
            style={{
              flex: 2,
              padding: "12px",
              borderRadius: "10px",
              border: "none",
              background: starting ? "#e8e9eb" : "#0066FF",
              color: starting ? "#aaa" : "#fff",
              fontSize: "14px",
              fontWeight: 600,
              cursor: starting ? "default" : "pointer",
              fontFamily: "inherit",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
            }}
          >
            {starting ? "인터뷰 시작 중…" : "이 전략으로 시작 →"}
          </button>
        </div>
      </div>
    </div>
  );
}

async function consumeStream(body: ReadableStream) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  const store = useWorkflowStore.getState();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const text = decoder.decode(value);
    const lines = text.split("\n\n");

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6).trim();
      if (data === "[DONE]") return;

      try {
        const parsed = JSON.parse(data);
        if (parsed.text) store.appendToLastMessage(parsed.text);
      } catch {}
    }
  }
}
