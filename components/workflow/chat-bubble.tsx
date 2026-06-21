"use client";

import type { ChatMessage } from "@/lib/workflow-store";

interface Props {
  message: ChatMessage;
  isStreaming?: boolean;
}

export default function ChatBubble({ message, isStreaming }: Props) {
  const isAi = message.role === "assistant";

  return (
    <div
      className={`flex gap-2 ${isAi ? "justify-start" : "justify-end"}`}
    >
      {isAi && (
        <div className="w-7 h-7 rounded-full bg-accent flex-shrink-0 flex items-center justify-center text-white text-xs font-bold mt-0.5">
          AI
        </div>
      )}

      <div
        style={{
          maxWidth: "80%",
          padding: "10px 14px",
          borderRadius: isAi ? "4px 16px 16px 16px" : "16px 4px 16px 16px",
          backgroundColor: isAi ? "#ffffff" : "#0066FF",
          color: isAi ? "#171719" : "#ffffff",
          fontSize: "14px",
          lineHeight: "1.7",
          boxShadow: isAi ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
          border: isAi ? "1px solid rgba(112,115,124,0.13)" : "none",
          whiteSpace: "pre-wrap",
          wordBreak: "keep-all",
        }}
      >
        {message.content}
        {isStreaming && isAi && (
          <span
            style={{
              display: "inline-block",
              width: "2px",
              height: "14px",
              backgroundColor: "#0066FF",
              marginLeft: "2px",
              verticalAlign: "middle",
              animation: "blink 1s step-end infinite",
            }}
          />
        )}
      </div>

      {!isAi && (
        <div className="w-7 h-7 rounded-full bg-gray-700 flex-shrink-0 flex items-center justify-center text-white text-xs font-bold mt-0.5">
          MK
        </div>
      )}

      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
