"use client";

import { useEffect, useRef, useState } from "react";
import ChatBubble from "@/components/workflow/chat-bubble";
import GeneratingScreen from "@/components/workflow/generating-screen";
import type { ChatMessage } from "@/lib/workflow-store";

type Stage = "interview" | "generating" | "result";

const CLASS101_INTERVIEW_INTRO = `안녕하세요! 클래스101 파트너스 포스팅을 같이 만들어볼게요.

먼저, 어떤 **카테고리** 강의를 쓰실 건가요?
(예: AI·업무자동화, 드로잉, 영상편집, 재테크, 운동 등)`;

const CLASS101_SYSTEM = `당신은 클래스101 파트너스 블로그 포스팅 인터뷰어입니다.
아래 정보를 자연스러운 대화로 수집하세요:
1. 카테고리 (AI·업무자동화, 드로잉, 재테크 등)
2. 수강 강의명 (선택 — 없으면 넘어가도 됨)
3. 포스팅 앵글: 구독 계기(1) / 강의 리뷰(2) / 활용 아이디어(3)
4. 구체적인 경험이나 강조할 내용

규칙:
- 질문 한 번에 하나씩
- 위 4가지 정보 수집되면 반드시 "좋아요! 포스팅 생성 시작할게요 ✍️" 로 종료 (정확히 이 문장)
- 종료 후 추가 질문 금지`;

const DONE_SIGNAL = "포스팅 생성 시작할게요";

function isDone(text: string) {
  return text.includes(DONE_SIGNAL) || text.includes("✍️");
}

export default function Class101Workflow() {
  const [stage, setStage] = useState<Stage>("interview");
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: CLASS101_INTERVIEW_INTRO },
  ]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [generatedHtml, setGeneratedHtml] = useState("");
  const [seoTitle, setSeoTitle] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"preview" | "html">("preview");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 종료 신호 감지
  useEffect(() => {
    if (!isStreaming && messages.length > 1) {
      const last = messages[messages.length - 1];
      if (last.role === "assistant" && isDone(last.content)) {
        const timer = setTimeout(() => startGenerate(), 800);
        return () => clearTimeout(timer);
      }
    }
  }, [isStreaming, messages]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || isStreaming) return;

    setInput("");
    const userMsg: ChatMessage = { role: "user", content: text };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);

    // AI 응답
    const aiMsg: ChatMessage = { role: "assistant", content: "" };
    setMessages((prev) => [...prev, aiMsg]);
    setIsStreaming(true);

    try {
      const res = await fetch("/api/workflow/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages,
          strategy: {
            postType: "review",
            keywords: ["클래스101", "구독", "후기"],
            target: "클래스101 구독 고려 중인 20~40대",
            angle: "파트너스 포스팅",
            contentType: "searchable",
          },
          topic: "클래스101 파트너스 포스팅",
          customSystem: CLASS101_SYSTEM,
        }),
      });

      if (!res.body) throw new Error("스트림 없음");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value);
        for (const line of text.split("\n\n")) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") break;
          try {
            const parsed = JSON.parse(data);
            if (parsed.text) {
              setMessages((prev) => {
                const msgs = [...prev];
                const last = msgs[msgs.length - 1];
                msgs[msgs.length - 1] = {
                  ...last,
                  content: last.content + parsed.text,
                };
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

  async function startGenerate() {
    setStage("generating");

    try {
      const res = await fetch("/api/workflow/generate-class101", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: messages.filter((m) => !isDone(m.content)),
        }),
      });

      if (!res.body) throw new Error("스트림 없음");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value);
        for (const line of text.split("\n\n")) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") break;
          try {
            const parsed = JSON.parse(data);
            if (parsed.done && parsed.html) {
              setGeneratedHtml(parsed.html);
              setSeoTitle(parsed.titles?.[0] ?? "");
              setStage("result");
            }
          } catch {}
        }
      }
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
    setStage("interview");
    setMessages([{ role: "assistant", content: CLASS101_INTERVIEW_INTRO }]);
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

  // ── 결과 화면 ──
  if (stage === "result") {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
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
            {(["preview", "html"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  padding: "6px 14px",
                  borderRadius: "8px",
                  border: "none",
                  background: tab === t ? "#0066FF" : "#f0f0f1",
                  color: tab === t ? "#fff" : "#5a5c63",
                  fontSize: "13px",
                  fontWeight: 500,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                {t === "preview" ? "미리보기" : "HTML"}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
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
              }}
            >
              {copied ? "복사됨 ✓" : "HTML 복사"}
            </button>
            <button
              onClick={handleReset}
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

        {seoTitle && (
          <div
            style={{
              padding: "10px 20px",
              borderBottom: "1px solid rgba(112,115,124,0.1)",
              background: "#EBF2FF",
              fontSize: "13px",
              color: "#0066FF",
              fontWeight: 600,
              flexShrink: 0,
            }}
          >
            제목: {seoTitle}
          </div>
        )}

        <div style={{ flex: 1, overflow: "auto" }}>
          {tab === "preview" ? (
            <iframe
              srcDoc={generatedHtml}
              style={{ width: "100%", height: "100%", border: "none" }}
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

  // ── 생성 중 ──
  if (stage === "generating") {
    return <GeneratingScreen />;
  }

  // ── 인터뷰 ──
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        maxWidth: "680px",
        margin: "0 auto",
        width: "100%",
      }}
    >
      {/* 상단 배지 */}
      <div
        style={{
          padding: "10px 20px",
          borderBottom: "1px solid rgba(112,115,124,0.1)",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontSize: "12px",
            fontWeight: 600,
            color: "#26C6A4",
            background: "#E6FAF6",
            padding: "2px 8px",
            borderRadius: "10px",
          }}
        >
          📦 클래스101 파트너스
        </span>
        <span style={{ fontSize: "12px", color: "#5a5c63" }}>
          — 인터뷰로 포스팅 만들기
        </span>
      </div>

      {/* 마감 안내 */}
      <div
        style={{
          margin: "12px 16px 0",
          padding: "8px 12px",
          background: "#FFFBEB",
          border: "1px solid #FCD34D",
          borderRadius: "8px",
          fontSize: "12px",
          color: "#92400E",
          flexShrink: 0,
        }}
      >
        ⏰ 구독권 등록: 2026-06-24 | 업로드: 2026-07-01
      </div>

      {/* 메시지 */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "16px",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        {messages.map((msg, i) => (
          <ChatBubble
            key={i}
            message={msg}
            isStreaming={
              isStreaming && i === messages.length - 1 && msg.role === "assistant"
            }
          />
        ))}
        {error && (
          <div
            style={{
              padding: "8px 12px",
              background: "#FEF2F2",
              border: "1px solid #FECACA",
              borderRadius: "8px",
              fontSize: "13px",
              color: "#DC2626",
            }}
          >
            오류: {error}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* 입력창 */}
      <div
        style={{
          padding: "12px 16px",
          borderTop: "1px solid rgba(112,115,124,0.1)",
          background: "#fff",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            gap: "8px",
            alignItems: "flex-end",
            background: "#f7f7f8",
            borderRadius: "12px",
            padding: "8px 12px",
            border: "1px solid rgba(112,115,124,0.15)",
          }}
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="답변을 입력하세요… (Enter로 전송)"
            disabled={isStreaming}
            rows={1}
            style={{
              flex: 1,
              border: "none",
              outline: "none",
              background: "transparent",
              fontSize: "14px",
              fontFamily: "inherit",
              color: "#171719",
              resize: "none",
              maxHeight: "120px",
            }}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isStreaming}
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "8px",
              border: "none",
              background: input.trim() && !isStreaming ? "#26C6A4" : "#e8e9eb",
              color: input.trim() && !isStreaming ? "#fff" : "#aaa",
              cursor: input.trim() && !isStreaming ? "pointer" : "default",
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "16px",
            }}
          >
            ↑
          </button>
        </div>
        <p
          style={{
            fontSize: "11px",
            color: "#aaa",
            textAlign: "center",
            margin: "6px 0 0",
          }}
        >
          레퍼럴 링크 · 필수 키워드 · 해시태그 자동 삽입
        </p>
      </div>
    </div>
  );
}
