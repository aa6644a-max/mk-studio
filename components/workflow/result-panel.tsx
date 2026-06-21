"use client";

import { useState } from "react";
import { useWorkflowStore } from "@/lib/workflow-store";

export default function ResultPanel() {
  const { generatedHtml, seoTitles, topic, postType, reset } =
    useWorkflowStore();
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");
  const [selectedTitle, setSelectedTitle] = useState(0);
  const [tab, setTab] = useState<"preview" | "html">("preview");

  async function handleCopy() {
    await navigator.clipboard.writeText(generatedHtml);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleSave() {
    setSaving(true);
    setSavedMsg("");
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          movieTitle: seoTitles[selectedTitle] || topic,
          postType,
          content: generatedHtml,
          status: "published",
        }),
      });
      if (!res.ok) throw new Error("저장 실패");
      setSavedMsg("Google Sheets 저장 완료 ✓");
    } catch (e) {
      setSavedMsg((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
      }}
    >
      {/* 상단 바 */}
      <div
        style={{
          padding: "12px 20px",
          borderBottom: "1px solid rgba(112,115,124,0.1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
          flexWrap: "wrap",
          gap: "8px",
        }}
      >
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={() => setTab("preview")}
            style={{
              padding: "6px 14px",
              borderRadius: "8px",
              border: "none",
              background: tab === "preview" ? "#0066FF" : "#f0f0f1",
              color: tab === "preview" ? "#fff" : "#5a5c63",
              fontSize: "13px",
              fontWeight: 500,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            미리보기
          </button>
          <button
            onClick={() => setTab("html")}
            style={{
              padding: "6px 14px",
              borderRadius: "8px",
              border: "none",
              background: tab === "html" ? "#0066FF" : "#f0f0f1",
              color: tab === "html" ? "#fff" : "#5a5c63",
              fontSize: "13px",
              fontWeight: 500,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            HTML
          </button>
        </div>

        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          {savedMsg && (
            <span
              style={{
                fontSize: "12px",
                color: savedMsg.includes("완료") ? "#16a34a" : "#dc2626",
              }}
            >
              {savedMsg}
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: "6px 14px",
              borderRadius: "8px",
              border: "1px solid rgba(112,115,124,0.2)",
              background: "#fff",
              fontSize: "13px",
              color: "#5a5c63",
              cursor: saving ? "default" : "pointer",
              fontFamily: "inherit",
            }}
          >
            {saving ? "저장 중…" : "📊 Sheets 저장"}
          </button>
          <button
            onClick={handleCopy}
            style={{
              padding: "6px 14px",
              borderRadius: "8px",
              border: "none",
              background: copied ? "#16a34a" : "#0066FF",
              color: "#fff",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
              transition: "background 0.2s",
            }}
          >
            {copied ? "복사됨 ✓" : "HTML 복사"}
          </button>
          <button
            onClick={reset}
            style={{
              padding: "6px 14px",
              borderRadius: "8px",
              border: "1px solid rgba(112,115,124,0.2)",
              background: "#fff",
              fontSize: "13px",
              color: "#5a5c63",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            새 포스팅
          </button>
        </div>
      </div>

      {/* SEO 제목 선택 */}
      {seoTitles.length > 0 && (
        <div
          style={{
            padding: "12px 20px",
            borderBottom: "1px solid rgba(112,115,124,0.1)",
            background: "#fafafa",
            flexShrink: 0,
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
            SEO 제목 선택
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            {seoTitles.map((title, i) => (
              <button
                key={i}
                onClick={() => setSelectedTitle(i)}
                style={{
                  padding: "6px 12px",
                  borderRadius: "6px",
                  border: `1px solid ${selectedTitle === i ? "#0066FF" : "rgba(112,115,124,0.15)"}`,
                  background: selectedTitle === i ? "#EBF2FF" : "#fff",
                  color: selectedTitle === i ? "#0066FF" : "#171719",
                  fontSize: "13px",
                  cursor: "pointer",
                  textAlign: "left",
                  fontFamily: "inherit",
                  fontWeight: selectedTitle === i ? 600 : 400,
                }}
              >
                {title}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 본문 */}
      <div style={{ flex: 1, overflow: "auto" }}>
        {tab === "preview" ? (
          <iframe
            srcDoc={generatedHtml}
            style={{
              width: "100%",
              height: "100%",
              border: "none",
              background: "#fff",
            }}
            sandbox="allow-same-origin"
          />
        ) : (
          <pre
            style={{
              margin: 0,
              padding: "20px",
              fontSize: "12px",
              color: "#333",
              background: "#fafafa",
              overflowX: "auto",
              height: "100%",
              whiteSpace: "pre-wrap",
              wordBreak: "break-all",
              fontFamily: "monospace",
            }}
          >
            {generatedHtml}
          </pre>
        )}
      </div>
    </div>
  );
}
