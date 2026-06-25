"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Header from "@/components/header";
import { loadImages, type GalleryImage } from "@/lib/gallery-store";

type Stage = "edit" | "preview";

type TextLayer = {
  id: string;
  text: string;
  x: number; // 0~1 비율
  y: number;
  size: number; // 캔버스 px
  color: string;
  weight: number;
};

const PRESETS = [
  { label: "16:9", w: 1280, h: 720 },
  { label: "1:1", w: 1080, h: 1080 },
  { label: "4:5", w: 1080, h: 1350 },
];

function newLayer(text = "텍스트", y = 0.5): TextLayer {
  return {
    id: crypto.randomUUID(),
    text,
    x: 0.5,
    y,
    size: 72,
    color: "#ffffff",
    weight: 800,
  };
}

export default function CardMaker({ hideHeader = false, onBack }: { hideHeader?: boolean; onBack?: () => void }) {
  const [stage, setStage] = useState<Stage>("edit");
  const [preset, setPreset] = useState(PRESETS[0]);
  const [bgColor, setBgColor] = useState("#171719");
  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null);
  const [layers, setLayers] = useState<TextLayer[]>([newLayer("제목을 입력하세요", 0.5)]);
  const [selected, setSelected] = useState<string>(layers[0].id);
  const [gallery, setGallery] = useState<GalleryImage[]>([]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<{ id: string } | null>(null);

  useEffect(() => setGallery(loadImages()), []);

  // ── 캔버스 렌더 ──
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = preset.w;
    canvas.height = preset.h;

    if (bgImage) {
      const r = Math.max(preset.w / bgImage.width, preset.h / bgImage.height);
      const w = bgImage.width * r;
      const h = bgImage.height * r;
      ctx.drawImage(bgImage, (preset.w - w) / 2, (preset.h - h) / 2, w, h);
    } else {
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, preset.w, preset.h);
    }

    for (const l of layers) {
      ctx.font = `${l.weight} ${l.size}px Pretendard, 'Noto Sans KR', sans-serif`;
      ctx.fillStyle = l.color;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.shadowColor = "rgba(0,0,0,0.35)";
      ctx.shadowBlur = 8;
      ctx.fillText(l.text, l.x * preset.w, l.y * preset.h);
      ctx.shadowBlur = 0;
    }
  }, [preset, bgColor, bgImage, layers]);

  useEffect(() => {
    draw();
  }, [draw, stage]);

  function patch(id: string, p: Partial<TextLayer>) {
    setLayers((ls) => ls.map((l) => (l.id === id ? { ...l, ...p } : l)));
  }

  function addLayer() {
    const l = newLayer("텍스트", 0.35);
    l.size = 56;
    setLayers((ls) => [...ls, l]);
    setSelected(l.id);
  }

  function removeLayer(id: string) {
    setLayers((ls) => {
      const next = ls.filter((l) => l.id !== id);
      if (next.length) setSelected(next[0].id);
      return next;
    });
  }

  function uploadBg(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const el = new Image();
      el.onload = () => setBgImage(el);
      el.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  function pickGalleryBg(img: GalleryImage) {
    const el = new Image();
    el.onload = () => setBgImage(el);
    el.src = img.dataUrl;
  }

  function exportPng() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `card-${Date.now()}.png`;
    a.click();
  }

  // ── 미리보기에서 드래그로 위치 조정 ──
  function canvasPos(e: React.PointerEvent) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    };
  }

  return (
    <div className="flex h-full flex-col">
      {!hideHeader && (
        <Header title={stage === "edit" ? "카드 만들기 — 입력" : "카드 만들기 — 확인"} />
      )}

      {/* 단계 표시 */}
      <div className="flex items-center gap-2 border-b border-[var(--panel-border)] px-3 py-2 text-xs">
        {onBack && (
          <button onClick={onBack} className="mr-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
            ← 메이커
          </button>
        )}
        <span className="font-bold text-[var(--text-primary)]">🪄 기본 카드</span>
        <span className="ml-auto flex items-center gap-1">
          <span className={stage === "edit" ? "font-bold text-[var(--accent)]" : "text-[var(--text-secondary)]"}>① 입력</span>
          <span className="text-[var(--text-secondary)]">→</span>
          <span className={stage === "preview" ? "font-bold text-[var(--accent)]" : "text-[var(--text-secondary)]"}>② 확인</span>
        </span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {stage === "edit" ? (
          // ─────────── STEP 1: 입력 ───────────
          <div className="mx-auto max-w-md space-y-5 p-5">
            {/* 비율 */}
            <Section label="비율">
              <div className="flex gap-2">
                {PRESETS.map((p) => (
                  <button
                    key={p.label}
                    onClick={() => setPreset(p)}
                    className={`flex-1 rounded-lg border py-2 text-sm font-semibold transition-colors ${
                      preset.label === p.label
                        ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]"
                        : "border-[var(--panel-border)] text-[var(--text-secondary)]"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </Section>

            {/* 배경 */}
            <Section label="배경">
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={bgColor}
                  onChange={(e) => {
                    setBgColor(e.target.value);
                    setBgImage(null);
                  }}
                  className="h-10 w-12 rounded border border-[var(--panel-border)]"
                />
                <label className="flex-1 cursor-pointer rounded-lg border border-[var(--panel-border)] bg-white px-3 py-2.5 text-center text-sm">
                  이미지 업로드
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(e) => e.target.files?.[0] && uploadBg(e.target.files[0])}
                  />
                </label>
                {bgImage && (
                  <button
                    onClick={() => setBgImage(null)}
                    className="shrink-0 text-xs text-[var(--text-secondary)] hover:text-red-500"
                  >
                    제거
                  </button>
                )}
              </div>
              {gallery.length > 0 && (
                <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">
                  {gallery.slice(0, 12).map((g) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={g.id}
                      src={g.dataUrl}
                      alt={g.name}
                      onClick={() => pickGalleryBg(g)}
                      className="h-14 w-14 shrink-0 cursor-pointer rounded object-cover ring-1 ring-[var(--panel-border)] hover:ring-[var(--accent)]"
                    />
                  ))}
                </div>
              )}
            </Section>

            {/* 텍스트 */}
            <Section label="텍스트">
              <div className="space-y-2">
                {layers.map((l) => (
                  <div
                    key={l.id}
                    className={`rounded-lg border p-3 ${
                      selected === l.id ? "border-[var(--accent)]" : "border-[var(--panel-border)]"
                    }`}
                    onClick={() => setSelected(l.id)}
                  >
                    <input
                      value={l.text}
                      onChange={(e) => patch(l.id, { text: e.target.value })}
                      onFocus={() => setSelected(l.id)}
                      placeholder="문구 입력"
                      className="w-full rounded-md border border-[var(--panel-border)] bg-white px-3 py-2 text-sm"
                    />
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        type="range"
                        min={24}
                        max={200}
                        value={l.size}
                        onChange={(e) => patch(l.id, { size: Number(e.target.value) })}
                        className="flex-1"
                      />
                      <span className="w-12 text-right text-xs text-[var(--text-secondary)]">{l.size}px</span>
                      <input
                        type="color"
                        value={l.color}
                        onChange={(e) => patch(l.id, { color: e.target.value })}
                        className="h-8 w-10 rounded border border-[var(--panel-border)]"
                      />
                      <select
                        value={l.weight}
                        onChange={(e) => patch(l.id, { weight: Number(e.target.value) })}
                        className="rounded-md border border-[var(--panel-border)] bg-white px-2 py-1.5 text-xs"
                      >
                        <option value={400}>Regular</option>
                        <option value={700}>Bold</option>
                        <option value={800}>Black</option>
                      </select>
                      {layers.length > 1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeLayer(l.id);
                          }}
                          className="shrink-0 text-xs text-[var(--text-secondary)] hover:text-red-500"
                        >
                          삭제
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={addLayer}
                className="mt-2 w-full rounded-lg border border-dashed border-[var(--panel-border)] py-2 text-sm font-semibold text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
              >
                + 텍스트 추가
              </button>
            </Section>

            <button
              onClick={() => setStage("preview")}
              className="w-full rounded-xl bg-[var(--accent)] py-3.5 text-base font-bold text-white hover:opacity-90"
            >
              다음 — 결과 확인 →
            </button>
          </div>
        ) : (
          // ─────────── STEP 2: 확인·다운로드 ───────────
          <div className="flex h-full flex-col">
            <div className="flex flex-1 items-center justify-center overflow-auto bg-[#0e0e10] p-4">
              <canvas
                ref={canvasRef}
                onPointerDown={(e) => {
                  const pos = canvasPos(e);
                  let nearest: TextLayer | null = null;
                  let min = Infinity;
                  for (const l of layers) {
                    const d = Math.hypot(l.x - pos.x, l.y - pos.y);
                    if (d < min) {
                      min = d;
                      nearest = l;
                    }
                  }
                  if (nearest) {
                    setSelected(nearest.id);
                    dragRef.current = { id: nearest.id };
                  }
                }}
                onPointerMove={(e) => {
                  if (!dragRef.current) return;
                  const pos = canvasPos(e);
                  patch(dragRef.current.id, {
                    x: Math.min(1, Math.max(0, pos.x)),
                    y: Math.min(1, Math.max(0, pos.y)),
                  });
                }}
                onPointerUp={() => (dragRef.current = null)}
                onPointerLeave={() => (dragRef.current = null)}
                className="max-h-full w-auto max-w-full cursor-move touch-none rounded shadow-lg"
                style={{ aspectRatio: `${preset.w}/${preset.h}` }}
              />
            </div>
            <p className="px-4 py-1 text-center text-xs text-[var(--text-secondary)]">
              글자를 끌어서 위치를 조정할 수 있어요
            </p>
            <div className="flex gap-3 border-t border-[var(--panel-border)] p-4">
              <button
                onClick={() => setStage("edit")}
                className="flex-1 rounded-xl border border-[var(--panel-border)] py-3 text-sm font-semibold text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--text-primary)]"
              >
                ← 뒤로 수정
              </button>
              <button
                onClick={exportPng}
                className="flex-[2] rounded-xl bg-[var(--accent)] py-3 text-sm font-bold text-white hover:opacity-90"
              >
                PNG 다운로드
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
        {label}
      </div>
      {children}
    </div>
  );
}
