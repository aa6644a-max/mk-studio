"use client";

import { useState } from "react";
import { useWorkflowStore } from "@/lib/workflow-store";

/**
 * 감상평 입력 (review). 작품 선택 직후, 전략 수립 전.
 * 사용자가 직접 쓴 감상평을 시드로 받아 → 전략 hook/관전/차별화 추출 + 인터뷰 콜드스타트 제거.
 */
export default function SeedInput() {
  const { tmdbSelections, topic, postType, setSeed, setStrategy, setStage, setError } =
    useWorkflowStore();
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const work = tmdbSelections[0];
  const canSubmit = text.trim().length > 0 && !submitting;

  async function handleSubmit() {
    if (!canSubmit) return;
    const seed = text.trim();
    setSubmitting(true);
    setError("");
    setSeed(seed);

    try {
      const res = await fetch("/api/workflow/strategy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          selectedType: postType,
          tmdbSelections: tmdbSelections.map((s) => ({
            id: s.id,
            title: s.title,
            mediaType: s.mediaType,
          })),
          seed,
        }),
      });
      if (!res.ok) throw new Error("전략 분석 실패");
      const strategy = await res.json();
      setStrategy(strategy);
      setStage("strategy");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
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
        overflowY: "auto",
      }}
    >
      <div style={{ width: "100%", maxWidth: "600px" }}>
        {/* 선택 작품 */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
          {work?.posterUrl && (
            <img
              src={work.posterUrl}
              alt={work.title}
              style={{ width: "48px", height: "68px", objectFit: "cover", borderRadius: "6px", flexShrink: 0 }}
            />
          )}
          <div>
            <div style={{ fontSize: "12px", color: "#5a5c63", marginBottom: "4px" }}>
              감상평 작성
            </div>
            <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#171719", margin: 0 }}>
              {work ? `${work.title} (${work.year})` : topic}
            </h2>
          </div>
        </div>

        <p style={{ fontSize: "14px", color: "#5a5c63", margin: "0 0 12px", lineHeight: 1.6 }}>
          이 작품 보고 느낀 점을 편하게 적어주세요. 거칠어도 좋아요 — 이걸 토대로 전략을 잡고,
          AI가 작품 정보와 엮어 더 깊은 질문을 드립니다. <b style={{ color: "#171719" }}>여기 쓴 문장은 최종 글에 최대한 살립니다.</b>
        </p>

        <div
          style={{
            background: "#fff",
            borderRadius: "16px",
            border: "1.5px solid rgba(112,115,124,0.2)",
            boxShadow: "0 2px 16px rgba(0,0,0,0.06)",
            overflow: "hidden",
          }}
        >
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={"예) 휴 잭맨 울버린 복귀가 반가웠다. 액션은 화끈했는데 후반부 카메오 나열은 좀 늘어지는 느낌. 그래도 엔딩 한 방이 다 살렸음."}
            disabled={submitting}
            rows={8}
            autoFocus
            style={{
              width: "100%",
              padding: "16px 20px",
              fontSize: "15px",
              border: "none",
              outline: "none",
              resize: "vertical",
              fontFamily: "inherit",
              color: "#171719",
              background: "transparent",
              lineHeight: 1.7,
              boxSizing: "border-box",
            }}
          />
        </div>

        <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
          <button
            onClick={() => setStage("tmdb-search")}
            disabled={submitting}
            style={{
              flex: 1,
              padding: "12px",
              borderRadius: "10px",
              border: "1px solid rgba(112,115,124,0.2)",
              background: "#fff",
              fontSize: "14px",
              color: "#5a5c63",
              cursor: submitting ? "default" : "pointer",
              fontFamily: "inherit",
            }}
          >
            ← 작품 다시 선택
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            style={{
              flex: 2,
              padding: "12px",
              borderRadius: "10px",
              border: "none",
              background: canSubmit ? "#0066FF" : "#e8e9eb",
              color: canSubmit ? "#fff" : "#aaa",
              fontSize: "14px",
              fontWeight: 600,
              cursor: canSubmit ? "pointer" : "default",
              fontFamily: "inherit",
            }}
          >
            {submitting ? "전략 수립 중…" : "전략 수립 →"}
          </button>
        </div>
      </div>
    </div>
  );
}
