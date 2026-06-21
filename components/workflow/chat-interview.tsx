"use client";

import { useEffect, useRef, useState } from "react";
import { useWorkflowStore } from "@/lib/workflow-store";
import ChatBubble from "./chat-bubble";

const DONE_PHRASES = [
  "포스팅 생성 시작할게요",
  "생성할게요",
  "충분해요",
  "✍️",
];

function isDoneSignal(text: string): boolean {
  return DONE_PHRASES.some((p) => text.includes(p));
}

export default function ChatInterview() {
  const {
    messages,
    isStreaming,
    topic,
    strategy,
    postType,
    setStage,
    addMessage,
    appendToLastMessage,
    setStreaming,
    setError,
  } = useWorkflowStore();

  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // 자동 스크롤
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 종료 신호 감지 → 포스팅 생성 단계
  useEffect(() => {
    if (!isStreaming && messages.length > 0) {
      const last = messages[messages.length - 1];
      if (last.role === "assistant" && isDoneSignal(last.content)) {
        const timer = setTimeout(() => startGenerate(), 800);
        return () => clearTimeout(timer);
      }
    }
  }, [isStreaming, messages]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || sending || isStreaming) return;

    setSending(true);
    setInput("");

    // 사용자 메시지 추가
    addMessage({ role: "user", content: text });

    // AI 응답 스트리밍
    addMessage({ role: "assistant", content: "" });
    setStreaming(true);

    const currentMessages = [
      ...useWorkflowStore.getState().messages.slice(0, -1), // 빈 AI 메시지 제외
    ];

    try {
      const res = await fetch("/api/workflow/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: currentMessages,
          strategy: { ...strategy, postType },
          topic,
        }),
      });

      if (!res.body) throw new Error("스트림 없음");
      await consumeStream(res.body, appendToLastMessage);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setStreaming(false);
      setSending(false);
    }
  }

  async function startGenerate() {
    setStage("generating");
    useWorkflowStore.getState().setStreaming(true);

    try {
      const res = await fetch("/api/workflow/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: messages.filter(
            (m) => !(m.role === "assistant" && isDoneSignal(m.content)),
          ),
          strategy: { ...strategy, postType },
          topic,
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
              useWorkflowStore.getState().setGeneratedHtml(parsed.html);
              useWorkflowStore.getState().setSeoTitles(parsed.titles ?? []);
              useWorkflowStore.getState().setStage("result");
            }
          } catch {}
        }
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      useWorkflowStore.getState().setStreaming(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

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
      {/* 상단 타입 배지 */}
      <div
        style={{
          padding: "12px 20px",
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
            color: "#5a5c63",
          }}
        >
          인터뷰 중 —
        </span>
        <span
          style={{
            fontSize: "12px",
            fontWeight: 600,
            color: "#0066FF",
            background: "#EBF2FF",
            padding: "2px 8px",
            borderRadius: "10px",
          }}
        >
          {strategy?.keywords[0] ?? topic}
        </span>
      </div>

      {/* 메시지 목록 */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "20px 16px",
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
            disabled={sending || isStreaming}
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
              overflowY: "auto",
            }}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || sending || isStreaming}
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "8px",
              border: "none",
              background:
                input.trim() && !sending && !isStreaming ? "#0066FF" : "#e8e9eb",
              color:
                input.trim() && !sending && !isStreaming ? "#fff" : "#aaa",
              cursor:
                input.trim() && !sending && !isStreaming ? "pointer" : "default",
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
          AI가 충분한 정보를 모으면 자동으로 포스팅 생성을 시작해요
        </p>
      </div>
    </div>
  );
}

async function consumeStream(
  body: ReadableStream,
  append: (chunk: string) => void,
) {
  const reader = body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const text = decoder.decode(value);
    for (const line of text.split("\n\n")) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6).trim();
      if (data === "[DONE]") return;

      try {
        const parsed = JSON.parse(data);
        if (parsed.text) append(parsed.text);
      } catch {}
    }
  }
}
