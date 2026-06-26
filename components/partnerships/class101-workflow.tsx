"use client";

import { useEffect, useRef, useState } from "react";
import ChatBubble from "@/components/workflow/chat-bubble";
import GeneratingScreen from "@/components/workflow/generating-screen";
import {
  ANGLE_LABELS,
  DONE_SIGNAL,
  type Class101Angle,
} from "@/lib/prompts/class101";
import type { ChatMessage } from "@/lib/workflow-store";

type Stage = "setup" | "interview" | "generating" | "result";

function isDone(text: string) {
  return text.includes(DONE_SIGNAL) || text.includes("✍️");
}

function stripFence(s: string): string {
  return s
    .replace(/^```html?\s*\n?/i, "")
    .replace(/\n?```\s*$/i, "")
    .trim();
}

function extractTitle(raw: string): { title: string; body: string } {
  const cleaned = stripFence(raw);
  const m = cleaned.match(/<!--\s*TITLE:\s*([^\-\->]+?)\s*-->/i);
  if (!m) return { title: "", body: cleaned };
  return { title: m[1].trim(), body: cleaned.replace(m[0], "").trim() };
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1] ?? "");
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function Class101Workflow() {
  const [stage, setStage] = useState<Stage>("setup");

  // setup 입력
  const [angle, setAngle] = useState<Class101Angle>(1);
  const [category, setCategory] = useState("AI·업무자동화");
  const [secondaryKeyword, setSecondaryKeyword] = useState("");
  const [pdfBase64, setPdfBase64] = useState("");
  const [pdfName, setPdfName] = useState("");
  const [materialText, setMaterialText] = useState("");

  // interview
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);

  // result
  const [generatedHtml, setGeneratedHtml] = useState("");
  const [seoTitle, setSeoTitle] = useState("");
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState<"preview" | "html">("preview");

  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 종료 신호 감지 → 자동 생성
  useEffect(() => {
    if (stage === "interview" && !isStreaming && messages.length > 0) {
      const last = messages[messages.length - 1];
      if (last.role === "assistant" && isDone(last.content)) {
        const timer = setTimeout(() => startGenerate(), 800);
        return () => clearTimeout(timer);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStreaming, messages, stage]);

  const hasMaterial = !!pdfBase64 || !!materialText.trim();

  async function handlePdf(file: File | undefined) {
    if (!file) return;
    if (file.type !== "application/pdf") {
      setError("PDF 파일만 업로드 가능합니다.");
      return;
    }
    setError("");
    setPdfBase64(await fileToBase64(file));
    setPdfName(file.name);
  }

  // 인터뷰어 호출 (스트리밍). nextMessages 기준으로 다음 AI 발화를 받아 append.
  async function runInterview(currentMessages: ChatMessage[]) {
    const aiMsg: ChatMessage = { role: "assistant", content: "" };
    setMessages([...currentMessages, aiMsg]);
    setIsStreaming(true);
    try {
      const res = await fetch("/api/partnerships/class101/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: currentMessages,
          angle,
          category,
          materialPdfBase64: pdfBase64,
          materialText,
        }),
      });
      if (!res.body) throw new Error("스트림 없음");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of decoder.decode(value).split("\n\n")) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") break;
          try {
            const parsed = JSON.parse(data);
            if (parsed.text) {
              setMessages((prev) => {
                const msgs = [...prev];
                const last = msgs[msgs.length - 1];
                msgs[msgs.length - 1] = { ...last, content: last.content + parsed.text };
                return msgs;
              });
            }
          } catch {}
        }
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsStreaming(false);
    }
  }

  function startInterview() {
    setStage("interview");
    setMessages([]);
    setError("");
    runInterview([]);
  }

  function sendMessage() {
    const text = input.trim();
    if (!text || isStreaming) return;
    setInput("");
    const updated = [...messages, { role: "user", content: text } as ChatMessage];
    runInterview(updated);
  }

  async function startGenerate() {
    setStage("generating");
    try {
      const res = await fetch("/api/partnerships/class101", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: messages.filter((m) => !isDone(m.content)),
          angle,
          category,
          secondaryKeyword,
          materialPdfBase64: pdfBase64,
          materialText,
        }),
      });
      if (!res.ok) throw new Error((await res.text()) || `오류 ${res.status}`);
      if (!res.body) throw new Error("스트림 없음");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
      }
      const { title, body } = extractTitle(acc);
      setGeneratedHtml(body);
      setSeoTitle(title);
      setStage("result");
    } catch (e) {
      setError((e as Error).message);
      setStage("interview");
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function handleReset() {
    setStage("setup");
    setMessages([]);
    setInput("");
    setGeneratedHtml("");
    setSeoTitle("");
    setCopied(false);
    setError("");
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(generatedHtml);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // ── 결과 ──
  if (stage === "result") {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
        <div style={{ padding: "12px 20px", borderBottom: "1px solid rgba(112,115,124,0.1)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, flexWrap: "wrap", gap: "8px" }}>
          <div style={{ display: "flex", gap: "8px" }}>
            {(["preview", "html"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)} style={{ padding: "6px 14px", borderRadius: "8px", border: "none", background: tab === t ? "#0066FF" : "#f0f0f1", color: tab === t ? "#fff" : "#5a5c63", fontSize: "13px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
                {t === "preview" ? "미리보기" : "HTML"}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={handleCopy} style={{ padding: "6px 14px", borderRadius: "8px", border: "none", background: copied ? "#16a34a" : "#0066FF", color: "#fff", fontSize: "13px", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
              {copied ? "복사됨 ✓" : "HTML 복사"}
            </button>
            <button onClick={handleReset} style={{ padding: "6px 14px", borderRadius: "8px", border: "1px solid rgba(112,115,124,0.2)", background: "#fff", fontSize: "13px", color: "#5a5c63", cursor: "pointer", fontFamily: "inherit" }}>
              새 포스팅
            </button>
          </div>
        </div>
        {seoTitle && (
          <div style={{ padding: "10px 20px", borderBottom: "1px solid rgba(112,115,124,0.1)", background: "#EBF2FF", fontSize: "13px", color: "#0066FF", fontWeight: 600, flexShrink: 0 }}>
            제목: {seoTitle}
          </div>
        )}
        <div style={{ flex: 1, overflow: "auto" }}>
          {tab === "preview" ? (
            <iframe srcDoc={generatedHtml} style={{ width: "100%", height: "100%", border: "none" }} sandbox="allow-same-origin" />
          ) : (
            <pre style={{ margin: 0, padding: "20px", fontSize: "12px", color: "#333", background: "#fafafa", overflowX: "auto", height: "100%", whiteSpace: "pre-wrap", wordBreak: "break-all", fontFamily: "monospace" }}>
              {generatedHtml}
            </pre>
          )}
        </div>
      </div>
    );
  }

  // ── 생성 중 ──
  if (stage === "generating") return <GeneratingScreen />;

  // ── 인터뷰 ──
  if (stage === "interview") {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%", maxWidth: "680px", margin: "0 auto", width: "100%" }}>
        <div style={{ padding: "10px 20px", borderBottom: "1px solid rgba(112,115,124,0.1)", display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
          <span style={{ fontSize: "12px", fontWeight: 600, color: "#26C6A4", background: "#E6FAF6", padding: "2px 8px", borderRadius: "10px" }}>
            📦 {ANGLE_LABELS[angle]}
          </span>
          <span style={{ fontSize: "12px", color: "#5a5c63" }}>
            — 경험 인터뷰 ({category})
          </span>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
          {messages.map((msg, i) => (
            <ChatBubble key={i} message={msg} isStreaming={isStreaming && i === messages.length - 1 && msg.role === "assistant"} />
          ))}
          {error && (
            <div style={{ padding: "8px 12px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "8px", fontSize: "13px", color: "#DC2626" }}>
              오류: {error}
            </div>
          )}
          <div ref={bottomRef} />
        </div>
        <div style={{ padding: "12px 16px", borderTop: "1px solid rgba(112,115,124,0.1)", background: "#fff", flexShrink: 0 }}>
          <div style={{ display: "flex", gap: "8px", alignItems: "flex-end", background: "#f7f7f8", borderRadius: "12px", padding: "8px 12px", border: "1px solid rgba(112,115,124,0.15)" }}>
            <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder="답변을 입력하세요… (Enter로 전송)" disabled={isStreaming} rows={1} style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: "14px", fontFamily: "inherit", color: "#171719", resize: "none", maxHeight: "120px" }} />
            <button onClick={sendMessage} disabled={!input.trim() || isStreaming} style={{ width: "32px", height: "32px", borderRadius: "8px", border: "none", background: input.trim() && !isStreaming ? "#26C6A4" : "#e8e9eb", color: input.trim() && !isStreaming ? "#fff" : "#aaa", cursor: input.trim() && !isStreaming ? "pointer" : "default", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px" }}>
              ↑
            </button>
          </div>
          <p style={{ fontSize: "11px", color: "#aaa", textAlign: "center", margin: "6px 0 0" }}>
            인터뷰가 끝나면 자동으로 포스팅이 생성됩니다
          </p>
        </div>
      </div>
    );
  }

  // ── setup ──
  const inputStyle: React.CSSProperties = {
    width: "100%", borderRadius: "8px", border: "1px solid rgba(112,115,124,0.2)",
    background: "#fff", padding: "9px 12px", fontSize: "14px", color: "#171719",
    fontFamily: "inherit", outline: "none",
  };
  const labelStyle: React.CSSProperties = {
    fontSize: "12px", fontWeight: 600, color: "#5a5c63", marginBottom: "6px", display: "block",
  };

  return (
    <div style={{ height: "100%", overflowY: "auto" }}>
      <div style={{ maxWidth: "560px", margin: "0 auto", padding: "24px 20px 40px", display: "flex", flexDirection: "column", gap: "22px" }}>
        <div>
          <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#171719", margin: "0 0 4px" }}>클래스101 파트너스 포스팅</h2>
          <p style={{ fontSize: "13px", color: "#8a8c93", margin: 0 }}>유형 선택 → 자료 업로드 → 경험 인터뷰 → 자동 생성</p>
        </div>

        {/* 유형 */}
        <div>
          <span style={labelStyle}>포스팅 유형 (무게중심 · 글에는 3파트 모두 포함)</span>
          <div style={{ display: "flex", gap: "8px" }}>
            {([1, 2, 3] as Class101Angle[]).map((a) => (
              <button key={a} onClick={() => setAngle(a)} style={{ flex: 1, padding: "12px 8px", borderRadius: "10px", border: angle === a ? "2px solid #26C6A4" : "1px solid rgba(112,115,124,0.2)", background: angle === a ? "#E6FAF6" : "#fff", color: angle === a ? "#178f76" : "#5a5c63", fontSize: "13px", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                {ANGLE_LABELS[a]}
              </button>
            ))}
          </div>
        </div>

        {/* 카테고리 */}
        <div>
          <span style={labelStyle}>카테고리</span>
          <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="예: AI·업무자동화, 드로잉, 재테크" style={inputStyle} />
        </div>

        {/* 보조 키워드 */}
        <div>
          <span style={labelStyle}>보조 키워드 (선택)</span>
          <input value={secondaryKeyword} onChange={(e) => setSecondaryKeyword(e.target.value)} placeholder="예: 드로잉 → 그림 / AI → 자동화" style={inputStyle} />
          <p style={{ fontSize: "11px", color: "#aaa", margin: "6px 0 0" }}>카테고리별 추가 필수 키워드 (제목·본문·해시태그에 함께 삽입)</p>
        </div>

        {/* 자료 */}
        <div>
          <span style={labelStyle}>강의 자료 (PDF 업로드 또는 텍스트)</span>
          <label style={{ display: "flex", alignItems: "center", gap: "10px", padding: "12px", borderRadius: "8px", border: "1px dashed rgba(112,115,124,0.35)", background: "#fafafa", cursor: "pointer", fontSize: "13px", color: pdfName ? "#178f76" : "#8a8c93" }}>
            <span>{pdfName ? `📄 ${pdfName}` : "📎 PDF 파일 선택"}</span>
            <input type="file" accept="application/pdf" onChange={(e) => handlePdf(e.target.files?.[0])} style={{ display: "none" }} />
          </label>
          <textarea value={materialText} onChange={(e) => setMaterialText(e.target.value)} placeholder="또는 강의 정리 내용을 직접 붙여넣기 (PDF와 함께 써도 됨)" rows={4} style={{ ...inputStyle, marginTop: "8px", resize: "vertical" }} />
        </div>

        {error && (
          <div style={{ padding: "8px 12px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "8px", fontSize: "13px", color: "#DC2626" }}>
            {error}
          </div>
        )}

        <button onClick={startInterview} disabled={!hasMaterial} style={{ padding: "13px", borderRadius: "10px", border: "none", background: hasMaterial ? "#26C6A4" : "#e8e9eb", color: hasMaterial ? "#fff" : "#aaa", fontSize: "15px", fontWeight: 700, cursor: hasMaterial ? "pointer" : "default", fontFamily: "inherit" }}>
          인터뷰 시작 →
        </button>
        {!hasMaterial && (
          <p style={{ fontSize: "12px", color: "#aaa", textAlign: "center", margin: "-12px 0 0" }}>
            강의 자료(PDF 또는 텍스트)를 먼저 넣어주세요
          </p>
        )}
      </div>
    </div>
  );
}
