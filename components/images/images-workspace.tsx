"use client";

import { useState } from "react";
import CardMaker from "./card-maker";
import ImagesView from "./images-view";

type Mode = "maker" | "studio";

export default function ImagesWorkspace() {
  const [mode, setMode] = useState<Mode>("maker");

  return (
    <div className="flex h-full flex-col">
      {/* 모드 토글 */}
      <div className="flex shrink-0 gap-1 border-b border-[var(--panel-border)] bg-panel px-3 py-2">
        <button
          onClick={() => setMode("maker")}
          className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-colors ${
            mode === "maker"
              ? "bg-[var(--accent)] text-white"
              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          }`}
        >
          🪄 간단 메이커
          <span className="ml-1 hidden text-[11px] font-normal opacity-80 sm:inline">
            (모바일 추천)
          </span>
        </button>
        <button
          onClick={() => setMode("studio")}
          className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-colors ${
            mode === "studio"
              ? "bg-[var(--accent)] text-white"
              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          }`}
        >
          🎨 템플릿 스튜디오
          <span className="ml-1 hidden text-[11px] font-normal opacity-80 sm:inline">
            (PC 권장)
          </span>
        </button>
      </div>

      <div className="min-h-0 flex-1">
        {mode === "maker" ? <CardMaker hideHeader /> : <ImagesView hideHeader />}
      </div>
    </div>
  );
}
