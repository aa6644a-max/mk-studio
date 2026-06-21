"use client";

import { useEffect, useState } from "react";
import { useWorkflowStore } from "@/lib/workflow-store";

export default function GeneratingScreen() {
  const generatingChars = useWorkflowStore((s) => s.generatingChars);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  const timeStr = mins > 0 ? `${mins}분 ${secs}초` : `${secs}초`;

  const steps = [
    { label: "레퍼런스 수집", done: elapsed >= 5 },
    { label: "HTML 작성 중", done: generatingChars > 500 },
    { label: "마무리 정리", done: generatingChars > 8000 },
  ];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        gap: "24px",
        color: "#5a5c63",
        padding: "40px",
      }}
    >
      <div
        style={{
          width: "48px",
          height: "48px",
          border: "3px solid #e8e9eb",
          borderTopColor: "#0066FF",
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
        }}
      />

      <div style={{ textAlign: "center" }}>
        <p style={{ fontSize: "16px", fontWeight: 600, color: "#171719", margin: "0 0 6px" }}>
          포스팅 생성 중…
        </p>
        <p style={{ fontSize: "13px", margin: "0 0 4px", color: "#5a5c63" }}>
          경과: {timeStr}
          {generatingChars > 0 && ` · ${generatingChars.toLocaleString()}자 작성됨`}
        </p>
        <p style={{ fontSize: "12px", margin: 0, color: "#aaa" }}>
          평균 1~3분 소요 · 탭 닫지 마세요
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "8px", width: "200px" }}>
        {steps.map((step) => (
          <div
            key={step.label}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "13px",
              color: step.done ? "#16a34a" : "#aaa",
            }}
          >
            <span style={{ fontSize: "14px" }}>{step.done ? "✓" : "○"}</span>
            {step.label}
          </div>
        ))}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
