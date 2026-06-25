"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toPng } from "html-to-image";

type Stage = "edit" | "preview";

const RATIOS = {
  "4:5": { w: 384, h: 480, pr: 2.8125 },
  "1:1": { w: 480, h: 480, pr: 2.25 },
  "4:3": { w: 480, h: 360, pr: 2.25 },
  "16:9": { w: 480, h: 270, pr: 4.0 },
} as const;
type Ratio = keyof typeof RATIOS;

const ACCENTS = ["#ff4d4d", "#ff8c00", "#ffe500", "#26c6a4", "#4c9fff", "#bf5fff"];

export default function AdListMaker({ onBack }: { onBack?: () => void }) {
  const [stage, setStage] = useState<Stage>("edit");
  const [ratio, setRatio] = useState<Ratio>("4:5");
  const [img, setImg] = useState<string | null>(null);
  const [objPos, setObjPos] = useState({ x: 50, y: 50 });
  const [overlay, setOverlay] = useState(80);
  const [tagline, setTagline] = useState("MK LINK PICK");
  const [title, setTitle] = useState("대구 주말 핫플 베스트");
  const [titleSize, setTitleSize] = useState(38);
  const [showDivider, setShowDivider] = useState(true);
  const [section, setSection] = useState("이번 주 추천 리스트");
  const [items, setItems] = useState<string[]>(["수성못 야경 카페", "김광석 거리 골목", "앞산 전망대 노을"]);
  const [accent, setAccent] = useState("#ff4d4d");

  const cardRef = useRef<HTMLDivElement>(null);
  const previewBoxRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const dragRef = useRef<{ x: number; y: number } | null>(null);

  const R = RATIOS[ratio];

  const fit = useCallback(() => {
    const box = previewBoxRef.current;
    if (!box) return;
    const pad = 24;
    const s = Math.min((box.clientWidth - pad) / R.w, (box.clientHeight - pad) / R.h, 1.6);
    setScale(Math.max(0.1, s));
  }, [R.w, R.h]);

  useEffect(() => {
    if (stage !== "preview") return;
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [stage, fit]);

  function uploadImg(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      setObjPos({ x: 50, y: 50 });
      setImg(reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  async function exportPng() {
    const node = cardRef.current;
    if (!node) return;
    const url = await toPng(node, { pixelRatio: R.pr, width: R.w, height: R.h, cacheBust: true });
    const a = document.createElement("a");
    a.href = url;
    a.download = `ad-list-${ratio.replace(":", "x")}-${Date.now()}.png`;
    a.click();
  }

  function onDown(e: React.PointerEvent) {
    if (!img) return;
    dragRef.current = { x: e.clientX, y: e.clientY };
  }
  function onMove(e: React.PointerEvent) {
    if (!dragRef.current || !img) return;
    const dx = e.clientX - dragRef.current.x;
    const dy = e.clientY - dragRef.current.y;
    dragRef.current = { x: e.clientX, y: e.clientY };
    setObjPos((p) => ({
      x: Math.min(100, Math.max(0, p.x - (dx / R.w) * 100)),
      y: Math.min(100, Math.max(0, p.y - (dy / R.h) * 100)),
    }));
  }
  function onUp() {
    dragRef.current = null;
  }

  function patchItem(i: number, v: string) {
    setItems((arr) => arr.map((x, idx) => (idx === i ? v : x)));
  }

  // 오버레이 강도(0~100) → 기본 80 대비 알파 스케일
  const k = overlay / 80;
  const a = (base: number) => Math.min(1, base * k).toFixed(3);
  const overlayBg = `linear-gradient(to top, rgba(0,0,0,${a(0.95)}) 0%, rgba(0,0,0,${a(0.8)}) 35%, rgba(0,0,0,${a(0.35)}) 60%, transparent 100%)`;

  const card = (
    <div
      ref={cardRef}
      style={{
        width: R.w,
        height: R.h,
        position: "relative",
        background: "#111",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        overflow: "hidden",
        borderRadius: 2,
        flexShrink: 0,
      }}
    >
      {img && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={img}
          alt=""
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: `${objPos.x}% ${objPos.y}%`,
          }}
        />
      )}
      <div style={{ position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none", background: overlayBg }} />

      <div
        style={{
          position: "relative",
          zIndex: 2,
          padding: "0 22px 22px",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          textAlign: "left",
          width: "100%",
        }}
      >
        {tagline && (
          <div
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 9,
              letterSpacing: "0.22em",
              color: "rgba(255,255,255,0.5)",
              textTransform: "uppercase",
              marginBottom: 6,
            }}
          >
            {tagline}
          </div>
        )}
        {title && (
          <div
            style={{
              fontFamily: "'Black Han Sans', sans-serif",
              fontSize: titleSize,
              lineHeight: 1.05,
              color: "#fff",
              wordBreak: "keep-all",
              marginBottom: 12,
            }}
          >
            {title}
          </div>
        )}
        {showDivider && <div style={{ width: "100%", height: 1, background: "rgba(255,255,255,0.22)", marginBottom: 12 }} />}
        {section && (
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: accent, flexShrink: 0 }} />
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "rgba(255,255,255,0.75)",
                letterSpacing: "0.02em",
                fontFamily: "'Noto Sans KR', sans-serif",
              }}
            >
              {section}
            </span>
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%" }}>
          {items.filter((t) => t.trim()).map((t, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 3,
                padding: "9px 13px",
              }}
            >
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: "0.06em", color: accent, flexShrink: 0, fontWeight: 500 }}>
                {String(i + 1).padStart(2, "0")}
              </span>
              <span style={{ width: 1, height: 14, background: "rgba(255,255,255,0.2)", flexShrink: 0 }} />
              <span style={{ fontFamily: "'Black Han Sans', sans-serif", fontSize: 15, color: "#fff", wordBreak: "keep-all", lineHeight: 1.2 }}>
                {t}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center gap-2 border-b border-[var(--panel-border)] px-3 py-2 text-xs">
        {onBack && (
          <button onClick={onBack} className="mr-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
            ← 슬라이드
          </button>
        )}
        <span className="font-bold text-[var(--text-primary)]">📣 광고 오버레이 · 슬라이드 2 (리스트)</span>
        <span className="ml-auto flex items-center gap-1">
          <span className={stage === "edit" ? "font-bold text-[var(--accent)]" : "text-[var(--text-secondary)]"}>① 입력</span>
          <span className="text-[var(--text-secondary)]">→</span>
          <span className={stage === "preview" ? "font-bold text-[var(--accent)]" : "text-[var(--text-secondary)]"}>② 확인</span>
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {stage === "edit" ? (
          <div className="mx-auto max-w-md space-y-5 p-5">
            <Section label="비율">
              <div className="flex gap-2">
                {(Object.keys(RATIOS) as Ratio[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => setRatio(r)}
                    className={`flex-1 rounded-lg border py-2 text-xs font-semibold transition-colors ${
                      ratio === r ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]" : "border-[var(--panel-border)] text-[var(--text-secondary)]"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </Section>

            <Section label="배경 이미지">
              <label className="block cursor-pointer rounded-lg border border-dashed border-[var(--panel-border)] p-5 text-center hover:border-[var(--accent)]">
                <span className="block text-2xl">🖼</span>
                <span className="mt-1 block text-sm text-[var(--text-secondary)]">{img ? "이미지 변경" : "클릭하여 이미지 선택"}</span>
                <input type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && uploadImg(e.target.files[0])} />
              </label>
              <RangeRow label="어둡기" value={overlay} min={0} max={100} suffix="%" onChange={setOverlay} />
            </Section>

            <Section label="태그라인">
              <input value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="상단 작은 라벨" className={inputCls} />
            </Section>

            <Section label="메인 타이틀">
              <textarea value={title} onChange={(e) => setTitle(e.target.value)} rows={2} className={`${inputCls} resize-none`} />
              <RangeRow label="타이틀 크기" value={titleSize} min={20} max={72} onChange={setTitleSize} />
              <label className="mt-2 flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                <input type="checkbox" checked={showDivider} onChange={(e) => setShowDivider(e.target.checked)} />
                구분선 표시
              </label>
            </Section>

            <Section label="섹션 헤더">
              <input value={section} onChange={(e) => setSection(e.target.value)} placeholder="리스트 섹션 제목" className={inputCls} />
            </Section>

            <Section label="리스트 항목">
              <div className="space-y-2">
                {items.map((t, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="w-6 shrink-0 text-center text-xs font-bold text-[var(--accent)]">{String(i + 1).padStart(2, "0")}</span>
                    <input value={t} onChange={(e) => patchItem(i, e.target.value)} placeholder={`항목 ${i + 1}`} className={`${inputCls} flex-1`} />
                    {items.length > 1 && (
                      <button onClick={() => setItems((arr) => arr.filter((_, idx) => idx !== i))} className="shrink-0 text-xs text-[var(--text-secondary)] hover:text-red-500">
                        삭제
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {items.length < 6 && (
                <button onClick={() => setItems((arr) => [...arr, ""])} className="mt-2 w-full rounded-lg border border-dashed border-[var(--panel-border)] py-2 text-sm font-semibold text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)]">
                  + 항목 추가
                </button>
              )}
            </Section>

            <Section label="강조 컬러">
              <div className="flex flex-wrap items-center gap-2">
                {ACCENTS.map((c) => (
                  <button key={c} onClick={() => setAccent(c)} style={{ background: c }} className={`h-8 w-8 rounded ${accent === c ? "ring-2 ring-offset-1 ring-[var(--text-primary)]" : ""}`} />
                ))}
                <input type="color" value={accent} onChange={(e) => setAccent(e.target.value)} className="h-8 w-10 rounded border border-[var(--panel-border)]" />
              </div>
            </Section>

            <button onClick={() => setStage("preview")} className="w-full rounded-xl bg-[var(--accent)] py-3.5 text-base font-bold text-white hover:opacity-90">
              다음 — 결과 확인 →
            </button>
          </div>
        ) : (
          <div className="flex h-full flex-col">
            <div
              ref={previewBoxRef}
              onPointerDown={onDown}
              onPointerMove={onMove}
              onPointerUp={onUp}
              onPointerLeave={onUp}
              className="flex flex-1 items-center justify-center overflow-hidden bg-[#0e0e10] p-3"
              style={{ cursor: img ? "move" : "default", touchAction: "none" }}
            >
              <div style={{ transform: `scale(${scale})`, transformOrigin: "center" }}>{card}</div>
            </div>
            <p className="px-4 py-1 text-center text-xs text-[var(--text-secondary)]">
              {img ? "이미지를 끌어서 위치를 조정할 수 있어요" : "배경 이미지를 넣으면 더 멋져요"}
            </p>
            <div className="flex gap-3 border-t border-[var(--panel-border)] p-4">
              <button onClick={() => setStage("edit")} className="flex-1 rounded-xl border border-[var(--panel-border)] py-3 text-sm font-semibold text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--text-primary)]">
                ← 뒤로 수정
              </button>
              <button onClick={exportPng} className="flex-[2] rounded-xl bg-[var(--accent)] py-3 text-sm font-bold text-white hover:opacity-90">
                PNG 다운로드 ({ratio})
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const inputCls = "w-full rounded-lg border border-[var(--panel-border)] bg-white px-3 py-2.5 text-sm";

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">{label}</div>
      {children}
    </div>
  );
}

function RangeRow({ label, value, min, max, suffix = "px", onChange }: { label: string; value: number; min: number; max: number; suffix?: string; onChange: (n: number) => void }) {
  return (
    <div className="mt-2 flex items-center gap-2">
      <span className="w-20 shrink-0 text-xs text-[var(--text-secondary)]">{label}</span>
      <input type="range" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} className="flex-1" />
      <span className="w-12 text-right text-xs text-[var(--text-secondary)]">{value}{suffix}</span>
    </div>
  );
}
