"use client";

import { useState, useRef } from "react";
import { useWorkflowStore } from "@/lib/workflow-store";

const EXAMPLES = [
  "어벤져스 인피니티 워 리뷰",
  "대구 청년 지원사업 공고",
  "크리스토퍼 놀란 영화 큐레이션",
  "나혼자만 레벨업 정주행 추천",
  "봉평 메밀꽃밭 방문기",
];

export default function TopicInput() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const { setTopic, setStrategy, setStage, setError } = useWorkflowStore();
  const inputRef = useRef<HTMLTextAreaElement>(null);

  async function handleSubmit() {
    const topic = input.trim();
    if (!topic || loading) return;

    setLoading(true);
    setError("");
    setTopic(topic);

    try {
      const res = await fetch("/api/workflow/strategy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic }),
      });
      if (!res.ok) throw new Error("전략 분석 실패");
      const strategy = await res.json();
      setStrategy(strategy);
      setStage("strategy");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
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
        gap: "32px",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <h1
          style={{
            fontSize: "24px",
            fontWeight: 800,
            color: "#171719",
            margin: "0 0 8px",
          }}
        >
          무엇을 쓸까요?
        </h1>
        <p style={{ fontSize: "14px", color: "#5a5c63", margin: 0 }}>
          주제를 자유롭게 말해주세요. 전략부터 포스팅까지 함께 만들어요.
        </p>
      </div>

      <div style={{ width: "100%", maxWidth: "600px" }}>
        <div
          style={{
            background: "#fff",
            borderRadius: "16px",
            border: "1.5px solid rgba(112,115,124,0.2)",
            boxShadow: "0 2px 16px rgba(0,0,0,0.06)",
            overflow: "hidden",
            transition: "border-color 0.15s",
          }}
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="예) 어벤져스 인피니티 워 리뷰 써줘"
            disabled={loading}
            rows={3}
            style={{
              width: "100%",
              padding: "16px 20px 8px",
              fontSize: "15px",
              border: "none",
              outline: "none",
              resize: "none",
              fontFamily: "inherit",
              color: "#171719",
              background: "transparent",
            }}
          />
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              padding: "8px 12px 12px",
            }}
          >
            <button
              onClick={handleSubmit}
              disabled={!input.trim() || loading}
              style={{
                padding: "8px 20px",
                borderRadius: "8px",
                background: input.trim() && !loading ? "#0066FF" : "#e8e9eb",
                color: input.trim() && !loading ? "#fff" : "#aaa",
                border: "none",
                fontSize: "14px",
                fontWeight: 600,
                cursor: input.trim() && !loading ? "pointer" : "default",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                transition: "background 0.15s",
              }}
            >
              {loading ? (
                <>
                  <span
                    style={{
                      width: "14px",
                      height: "14px",
                      border: "2px solid #aaa",
                      borderTopColor: "transparent",
                      borderRadius: "50%",
                      display: "inline-block",
                      animation: "spin 0.7s linear infinite",
                    }}
                  />
                  전략 분석 중…
                </>
              ) : (
                "전략 수립 →"
              )}
            </button>
          </div>
        </div>

        {/* 예시 chips */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "8px",
            marginTop: "16px",
            justifyContent: "center",
          }}
        >
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              onClick={() => {
                setInput(ex);
                inputRef.current?.focus();
              }}
              style={{
                padding: "6px 12px",
                borderRadius: "20px",
                background: "#f0f0f1",
                border: "none",
                fontSize: "12px",
                color: "#5a5c63",
                cursor: "pointer",
                transition: "background 0.1s",
              }}
              onMouseEnter={(e) =>
                ((e.target as HTMLButtonElement).style.background = "#e4e5e7")
              }
              onMouseLeave={(e) =>
                ((e.target as HTMLButtonElement).style.background = "#f0f0f1")
              }
            >
              {ex}
            </button>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
