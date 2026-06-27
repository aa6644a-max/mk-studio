"use client";

import { useState } from "react";

type Model = "realistic" | "anime";
type Ratio = "portrait" | "square" | "landscape";

const MODELS: { id: Model; label: string; desc: string }[] = [
  { id: "realistic", label: "실사", desc: "사실적인 인물·풍경" },
  { id: "anime", label: "애니", desc: "일러스트·애니메이션 스타일" },
];

const RATIOS: { id: Ratio; label: string; w: number; h: number }[] = [
  { id: "portrait", label: "세로 2:3", w: 512, h: 768 },
  { id: "square",   label: "정사각 1:1", w: 512, h: 512 },
  { id: "landscape",label: "가로 3:2", w: 768, h: 512 },
];

export default function AiGenMaker() {
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState<Model>("realistic");
  const [ratio, setRatio] = useState<Ratio>("portrait");
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    if (!prompt.trim()) return;
    setLoading(true);
    setImageUrl(null);
    setError(null);

    try {
      const res = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, model, ratio }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "생성 실패");
      setImageUrl(data.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류 발생");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-4 p-5">
      {/* 모델 선택 */}
      <div className="flex gap-2">
        {MODELS.map((m) => (
          <button
            key={m.id}
            onClick={() => setModel(m.id)}
            className={`flex-1 rounded-xl border p-3 text-left transition-colors ${
              model === m.id
                ? "border-[var(--accent)] bg-[var(--accent)]/10"
                : "border-[var(--panel-border)] hover:border-[var(--accent)]"
            }`}
          >
            <div className="text-sm font-bold text-[var(--text-primary)]">{m.label}</div>
            <div className="text-xs text-[var(--text-secondary)]">{m.desc}</div>
          </button>
        ))}
      </div>

      {/* 비율 선택 */}
      <div className="flex gap-2">
        {RATIOS.map((r) => (
          <button
            key={r.id}
            onClick={() => setRatio(r.id)}
            className={`flex-1 rounded-xl border py-2 text-xs font-semibold transition-colors ${
              ratio === r.id
                ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--text-primary)]"
                : "border-[var(--panel-border)] text-[var(--text-secondary)] hover:border-[var(--accent)]"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* 프롬프트 */}
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="영어로 입력하면 품질이 높아요. 예: beautiful woman, long hair, sunset background, high quality"
        rows={4}
        className="w-full resize-none rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:border-[var(--accent)] focus:outline-none"
      />

      {/* 생성 버튼 */}
      <button
        onClick={generate}
        disabled={loading || !prompt.trim()}
        className="w-full rounded-xl bg-[var(--accent)] py-3 text-sm font-bold text-white transition-opacity disabled:opacity-50"
      >
        {loading ? "생성 중... (30~60초)" : "✨ 이미지 생성"}
      </button>

      {/* 에러 */}
      {error && (
        <p className="rounded-lg bg-red-500/10 p-3 text-sm text-red-500">{error}</p>
      )}

      {/* 결과 */}
      {imageUrl && (
        <div className="space-y-2">
          <img src={imageUrl} alt="생성된 이미지" className="w-full rounded-xl" />
          <a
            href={imageUrl}
            download="generated.png"
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full rounded-xl border border-[var(--panel-border)] py-2.5 text-center text-sm font-semibold text-[var(--text-primary)] transition-colors hover:border-[var(--accent)]"
          >
            ⬇️ 다운로드
          </a>
        </div>
      )}
    </div>
  );
}
