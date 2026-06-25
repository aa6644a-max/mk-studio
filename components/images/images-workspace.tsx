"use client";

import { useState } from "react";
import CardMaker from "./card-maker";
import NetflixThumbMaker from "./netflix-thumb-maker";
import ImagesView from "./images-view";

type Mode = "maker" | "studio";
type Maker = "basic" | "netflix";

const MAKERS: { id: Maker; icon: string; label: string; desc: string }[] = [
  { id: "basic", icon: "🪄", label: "기본 카드", desc: "배경 + 텍스트로 빠르게" },
  { id: "netflix", icon: "🎬", label: "넷플릭스 썸네일", desc: "넷플릭스 스타일 1:1 썸네일" },
];

export default function ImagesWorkspace() {
  const [mode, setMode] = useState<Mode>("maker");
  const [maker, setMaker] = useState<Maker | null>(null);

  return (
    <div className="flex h-full flex-col">
      {/* 모드 토글 */}
      <div className="flex shrink-0 gap-1 border-b border-[var(--panel-border)] bg-panel px-3 py-2">
        <button
          onClick={() => setMode("maker")}
          className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-colors ${
            mode === "maker" ? "bg-[var(--accent)] text-white" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          }`}
        >
          🪄 간단 메이커
          <span className="ml-1 hidden text-[11px] font-normal opacity-80 sm:inline">(모바일 추천)</span>
        </button>
        <button
          onClick={() => setMode("studio")}
          className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-colors ${
            mode === "studio" ? "bg-[var(--accent)] text-white" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          }`}
        >
          🎨 템플릿 스튜디오
          <span className="ml-1 hidden text-[11px] font-normal opacity-80 sm:inline">(PC 권장)</span>
        </button>
      </div>

      <div className="min-h-0 flex-1">
        {mode === "studio" ? (
          <ImagesView hideHeader />
        ) : maker === null ? (
          // 메이커 선택
          <div className="mx-auto max-w-md space-y-3 p-5">
            <p className="text-sm text-[var(--text-secondary)]">만들 종류를 골라주세요.</p>
            {MAKERS.map((m) => (
              <button
                key={m.id}
                onClick={() => setMaker(m.id)}
                className="flex w-full items-center gap-3 rounded-xl border border-[var(--panel-border)] p-4 text-left transition-colors hover:border-[var(--accent)]"
              >
                <span className="text-2xl">{m.icon}</span>
                <span className="flex flex-col">
                  <span className="text-sm font-bold text-[var(--text-primary)]">{m.label}</span>
                  <span className="text-xs text-[var(--text-secondary)]">{m.desc}</span>
                </span>
                <span className="ml-auto text-[var(--text-secondary)]">→</span>
              </button>
            ))}
          </div>
        ) : maker === "netflix" ? (
          <NetflixThumbMaker onBack={() => setMaker(null)} />
        ) : (
          <CardMaker hideHeader onBack={() => setMaker(null)} />
        )}
      </div>
    </div>
  );
}
