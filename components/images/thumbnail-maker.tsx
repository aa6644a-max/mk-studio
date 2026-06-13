"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { loadImages, type GalleryImage } from "@/lib/gallery-store";

type TextLayer = {
  id: string;
  text: string;
  x: number; // 0~1 비율
  y: number;
  size: number; // px (캔버스 기준)
  color: string;
  weight: number;
};

const PRESETS = [
  { label: "16:9 (1280×720)", w: 1280, h: 720 },
  { label: "1:1 (1080×1080)", w: 1080, h: 1080 },
  { label: "4:5 (1080×1350)", w: 1080, h: 1350 },
];

export default function ThumbnailMaker() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [preset, setPreset] = useState(PRESETS[0]);
  const [bgColor, setBgColor] = useState("#171719");
  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null);
  const [layers, setLayers] = useState<TextLayer[]>([
    {
      id: crypto.randomUUID(),
      text: "제목을 입력하세요",
      x: 0.5,
      y: 0.5,
      size: 72,
      color: "#ffffff",
      weight: 800,
    },
  ]);
  const [selected, setSelected] = useState<string | null>(layers[0].id);
  const [gallery, setGallery] = useState<GalleryImage[]>([]);
  const dragRef = useRef<{ id: string } | null>(null);

  useEffect(() => setGallery(loadImages()), []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = preset.w;
    canvas.height = preset.h;

    // 배경
    if (bgImage) {
      // cover
      const r = Math.max(preset.w / bgImage.width, preset.h / bgImage.height);
      const w = bgImage.width * r;
      const h = bgImage.height * r;
      ctx.drawImage(bgImage, (preset.w - w) / 2, (preset.h - h) / 2, w, h);
    } else {
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, preset.w, preset.h);
    }

    // 텍스트 레이어
    for (const l of layers) {
      ctx.font = `${l.weight} ${l.size}px Pretendard, sans-serif`;
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
  }, [draw]);

  function patchLayer(id: string, p: Partial<TextLayer>) {
    setLayers((ls) => ls.map((l) => (l.id === id ? { ...l, ...p } : l)));
  }

  function addLayer() {
    const l: TextLayer = {
      id: crypto.randomUUID(),
      text: "텍스트",
      x: 0.5,
      y: 0.3,
      size: 56,
      color: "#0066ff",
      weight: 700,
    };
    setLayers((ls) => [...ls, l]);
    setSelected(l.id);
  }

  function pickGalleryBg(img: GalleryImage) {
    const el = new Image();
    el.onload = () => setBgImage(el);
    el.src = img.dataUrl;
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

  function exportPng() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `thumbnail-${Date.now()}.png`;
    a.click();
  }

  // 드래그로 텍스트 이동
  function canvasPos(e: React.PointerEvent) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    };
  }

  const sel = layers.find((l) => l.id === selected) ?? null;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_280px]">
      {/* 캔버스 미리보기 */}
      <div className="panel flex items-center justify-center overflow-auto bg-[#0e0e10] p-4">
        <canvas
          ref={canvasRef}
          onPointerDown={(e) => {
            const pos = canvasPos(e);
            // 가장 가까운 레이어 선택 후 드래그
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
            patchLayer(dragRef.current.id, {
              x: Math.min(1, Math.max(0, pos.x)),
              y: Math.min(1, Math.max(0, pos.y)),
            });
          }}
          onPointerUp={() => (dragRef.current = null)}
          onPointerLeave={() => (dragRef.current = null)}
          className="max-h-[60vh] w-auto max-w-full cursor-move touch-none rounded shadow-lg"
          style={{ aspectRatio: `${preset.w}/${preset.h}` }}
        />
      </div>

      {/* 컨트롤 패널 */}
      <div className="space-y-4">
        <Section label="사이즈">
          <select
            value={preset.label}
            onChange={(e) =>
              setPreset(PRESETS.find((p) => p.label === e.target.value)!)
            }
            className="w-full rounded-lg border border-[var(--panel-border)] bg-white px-3 py-2 text-sm"
          >
            {PRESETS.map((p) => (
              <option key={p.label}>{p.label}</option>
            ))}
          </select>
        </Section>

        <Section label="배경">
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={bgColor}
              onChange={(e) => {
                setBgColor(e.target.value);
                setBgImage(null);
              }}
              className="h-9 w-12 rounded border border-[var(--panel-border)]"
            />
            <label className="flex-1 cursor-pointer rounded-lg border border-[var(--panel-border)] bg-white px-3 py-2 text-center text-xs">
              이미지 업로드
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={(e) =>
                  e.target.files?.[0] && uploadBg(e.target.files[0])
                }
              />
            </label>
            {bgImage && (
              <button
                onClick={() => setBgImage(null)}
                className="text-xs text-[var(--text-secondary)] hover:text-red-500"
              >
                제거
              </button>
            )}
          </div>
          {gallery.length > 0 && (
            <div className="mt-2 flex gap-1 overflow-x-auto">
              {gallery.slice(0, 8).map((g) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={g.id}
                  src={g.dataUrl}
                  alt={g.name}
                  onClick={() => pickGalleryBg(g)}
                  className="h-12 w-12 shrink-0 cursor-pointer rounded object-cover ring-1 ring-[var(--panel-border)] hover:ring-[var(--accent)]"
                />
              ))}
            </div>
          )}
        </Section>

        <Section label="텍스트 레이어">
          <div className="space-y-1">
            {layers.map((l) => (
              <button
                key={l.id}
                onClick={() => setSelected(l.id)}
                className={`block w-full truncate rounded px-2 py-1.5 text-left text-xs ${
                  selected === l.id
                    ? "bg-[var(--accent)] text-white"
                    : "bg-page text-[var(--text-secondary)]"
                }`}
              >
                {l.text || "(빈 텍스트)"}
              </button>
            ))}
          </div>
          <button
            onClick={addLayer}
            className="mt-2 w-full rounded-lg border border-[var(--panel-border)] bg-white py-1.5 text-xs font-semibold"
          >
            + 텍스트 추가
          </button>
        </Section>

        {sel && (
          <Section label="선택 레이어 편집">
            <input
              value={sel.text}
              onChange={(e) => patchLayer(sel.id, { text: e.target.value })}
              className="w-full rounded-lg border border-[var(--panel-border)] bg-white px-3 py-2 text-sm"
            />
            <div className="mt-2 flex items-center gap-2">
              <input
                type="range"
                min={16}
                max={160}
                value={sel.size}
                onChange={(e) =>
                  patchLayer(sel.id, { size: Number(e.target.value) })
                }
                className="flex-1"
              />
              <span className="w-10 text-xs text-[var(--text-secondary)]">
                {sel.size}px
              </span>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <input
                type="color"
                value={sel.color}
                onChange={(e) => patchLayer(sel.id, { color: e.target.value })}
                className="h-9 w-12 rounded border border-[var(--panel-border)]"
              />
              <select
                value={sel.weight}
                onChange={(e) =>
                  patchLayer(sel.id, { weight: Number(e.target.value) })
                }
                className="flex-1 rounded-lg border border-[var(--panel-border)] bg-white px-2 py-2 text-xs"
              >
                <option value={400}>Regular</option>
                <option value={700}>Bold</option>
                <option value={800}>Extra Bold</option>
              </select>
              {layers.length > 1 && (
                <button
                  onClick={() => {
                    setLayers((ls) => ls.filter((l) => l.id !== sel.id));
                    setSelected(null);
                  }}
                  className="text-xs text-[var(--text-secondary)] hover:text-red-500"
                >
                  삭제
                </button>
              )}
            </div>
          </Section>
        )}

        <button
          onClick={exportPng}
          className="w-full rounded-lg bg-[var(--accent)] py-2.5 text-sm font-semibold text-white hover:opacity-90"
        >
          PNG 내보내기
        </button>
      </div>
    </div>
  );
}

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="panel p-3">
      <div className="mb-2 text-xs font-semibold text-[var(--text-secondary)]">
        {label}
      </div>
      {children}
    </div>
  );
}
