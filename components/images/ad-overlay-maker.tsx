"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toPng } from "html-to-image";

type Stage = "edit" | "preview";
type Align = "left" | "center" | "right";
type Line2Style = "box" | "plain" | "outline" | "highlight";

const RATIOS = {
  "4:5": { w: 384, h: 480, pr: 2.8125 },
  "1:1": { w: 480, h: 480, pr: 2.25 },
  "4:3": { w: 480, h: 360, pr: 2.25 },
  "16:9": { w: 480, h: 270, pr: 4.0 },
} as const;
type Ratio = keyof typeof RATIOS;

const ACCENTS = ["#ff4d4d", "#ff8c00", "#ffe500", "#26c6a4", "#4c9fff", "#bf5fff"];

export default function AdOverlayMaker({ onBack }: { onBack?: () => void }) {
  const [stage, setStage] = useState<Stage>("edit");
  const [ratio, setRatio] = useState<Ratio>("4:5");
  const [img, setImg] = useState<string | null>(null);
  const [objPos, setObjPos] = useState({ x: 50, y: 50 });
  const [line1a, setLine1a] = useState("");
  const [line1b, setLine1b] = useState("");
  const [size1, setSize1] = useState(52);
  const [line2, setLine2] = useState("");
  const [line2Style, setLine2Style] = useState<Line2Style>("box");
  const [size2, setSize2] = useState(48);
  const [sub, setSub] = useState("");
  const [credit, setCredit] = useState("");
  const [badge, setBadge] = useState("");
  const [align, setAlign] = useState<Align>("left");
  const [accent, setAccent] = useState("#ff4d4d");

  const cardRef = useRef<HTMLDivElement>(null);
  const previewBoxRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const dragRef = useRef<{ x: number; y: number } | null>(null);

  const R = RATIOS[ratio];

  // 미리보기: 카드(고정 base 크기)를 컨테이너에 맞춰 시각적으로 스케일
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
    const url = await toPng(node, {
      pixelRatio: R.pr,
      width: R.w,
      height: R.h,
      cacheBust: true,
    });
    const a = document.createElement("a");
    a.href = url;
    a.download = `ad-overlay-${ratio.replace(":", "x")}-${Date.now()}.png`;
    a.click();
  }

  // 이미지 위치 드래그 (object-position %)
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

  const alignItems = align === "center" ? "center" : align === "right" ? "flex-end" : "flex-start";
  const textAlign = align;

  const line2Css: React.CSSProperties =
    line2Style === "box"
      ? { background: accent, color: "#fff", padding: "2px 14px" }
      : line2Style === "highlight"
      ? { background: "#ffe500", color: "#000", padding: "2px 14px" }
      : line2Style === "outline"
      ? { color: "#fff", WebkitTextStroke: `2px ${accent}` }
      : { color: "#fff" };

  // 카드 DOM (미리보기 = export 동일 노드)
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
      {/* 오버레이 */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 1,
          pointerEvents: "none",
          background:
            "linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.55) 35%, rgba(0,0,0,0.1) 60%, transparent 100%)",
        }}
      />
      {/* 우상단 뱃지 */}
      {badge && (
        <div
          style={{
            position: "absolute",
            top: 14,
            right: 14,
            zIndex: 3,
            background: "rgba(0,0,0,0.55)",
            border: "1px solid rgba(255,255,255,0.18)",
            padding: "5px 10px",
            borderRadius: 3,
            fontFamily: "'DM Mono', monospace",
            fontSize: 8,
            letterSpacing: "0.2em",
            color: "rgba(255,255,255,0.6)",
          }}
        >
          {badge}
        </div>
      )}
      {/* 텍스트 영역 */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          padding: "0 22px 22px",
          display: "flex",
          flexDirection: "column",
          alignItems,
          textAlign,
        }}
      >
        {(line1a || line1b) && (
          <div
            style={{
              fontFamily: "'Black Han Sans', sans-serif",
              fontSize: size1,
              lineHeight: 1.05,
              color: "#fff",
              display: "flex",
              flexWrap: "wrap",
              alignItems: "baseline",
              gap: "0 8px",
              justifyContent: alignItems,
            }}
          >
            {line1a && <span>{line1a}</span>}
            {line1b && <span style={{ color: accent }}>{line1b}</span>}
          </div>
        )}
        {line2 && (
          <div style={{ display: "flex", alignItems: "center", marginTop: 2 }}>
            <span
              style={{
                fontFamily: "'Black Han Sans', sans-serif",
                fontSize: size2,
                lineHeight: 1.1,
                display: "inline-block",
                ...line2Css,
              }}
            >
              {line2}
            </span>
          </div>
        )}
        {sub && (
          <div
            style={{
              fontSize: 12,
              color: "rgba(255,255,255,0.75)",
              lineHeight: 1.6,
              marginTop: 10,
              letterSpacing: "0.01em",
              fontFamily: "'Noto Sans KR', sans-serif",
            }}
          >
            {sub}
          </div>
        )}
        {credit && (
          <div
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 9,
              color: "rgba(255,255,255,0.45)",
              letterSpacing: "0.12em",
              marginTop: 12,
            }}
          >
            {credit}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center gap-2 border-b border-[var(--panel-border)] px-3 py-2 text-xs">
        {onBack && (
          <button onClick={onBack} className="mr-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
            ← 메이커
          </button>
        )}
        <span className="font-bold text-[var(--text-primary)]">📣 광고 오버레이 · 슬라이드 1</span>
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
                      ratio === r
                        ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]"
                        : "border-[var(--panel-border)] text-[var(--text-secondary)]"
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
                <span className="mt-1 block text-sm text-[var(--text-secondary)]">
                  {img ? "이미지 변경" : "클릭하여 이미지 선택"}
                </span>
                <input type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && uploadImg(e.target.files[0])} />
              </label>
            </Section>

            <Section label="라인 1 (제목)">
              <input value={line1a} onChange={(e) => setLine1a(e.target.value)} placeholder="일반 텍스트" className={inputCls} />
              <input value={line1b} onChange={(e) => setLine1b(e.target.value)} placeholder="강조 텍스트 (강조색)" className={`${inputCls} mt-2`} />
              <RangeRow label="라인1 크기" value={size1} min={24} max={80} onChange={setSize1} />
            </Section>

            <Section label="라인 2 (핵심 문구)">
              <input value={line2} onChange={(e) => setLine2(e.target.value)} placeholder="핵심 문구" className={inputCls} />
              <select value={line2Style} onChange={(e) => setLine2Style(e.target.value as Line2Style)} className={`${inputCls} mt-2`}>
                <option value="box">■ 배경 박스 (강조색)</option>
                <option value="plain">텍스트만 (흰색)</option>
                <option value="outline">아웃라인 (테두리)</option>
                <option value="highlight">하이라이트 (노랑)</option>
              </select>
              <RangeRow label="라인2 크기" value={size2} min={20} max={80} onChange={setSize2} />
            </Section>

            <Section label="서브 텍스트">
              <textarea value={sub} onChange={(e) => setSub(e.target.value)} placeholder="설명 문구" rows={2} className={`${inputCls} resize-none`} />
            </Section>

            <div className="grid grid-cols-2 gap-3">
              <Section label="크레딧">
                <input value={credit} onChange={(e) => setCredit(e.target.value)} placeholder="출처/크레딧" className={inputCls} />
              </Section>
              <Section label="우상단 뱃지">
                <input value={badge} onChange={(e) => setBadge(e.target.value)} placeholder="브랜드명" className={inputCls} />
              </Section>
            </div>

            <Section label="정렬">
              <div className="flex gap-2">
                {(["left", "center", "right"] as Align[]).map((a) => (
                  <button
                    key={a}
                    onClick={() => setAlign(a)}
                    className={`flex-1 rounded-lg border py-2 text-xs font-semibold transition-colors ${
                      align === a
                        ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]"
                        : "border-[var(--panel-border)] text-[var(--text-secondary)]"
                    }`}
                  >
                    {a === "left" ? "왼쪽" : a === "center" ? "가운데" : "오른쪽"}
                  </button>
                ))}
              </div>
            </Section>

            <Section label="강조 컬러">
              <div className="flex flex-wrap items-center gap-2">
                {ACCENTS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setAccent(c)}
                    style={{ background: c }}
                    className={`h-8 w-8 rounded ${accent === c ? "ring-2 ring-offset-1 ring-[var(--text-primary)]" : ""}`}
                  />
                ))}
                <input type="color" value={accent} onChange={(e) => setAccent(e.target.value)} className="h-8 w-10 rounded border border-[var(--panel-border)]" />
              </div>
            </Section>

            <button
              onClick={() => setStage("preview")}
              className="w-full rounded-xl bg-[var(--accent)] py-3.5 text-base font-bold text-white hover:opacity-90"
            >
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
                PNG 다운로드 ({ratio})
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-[var(--panel-border)] bg-white px-3 py-2.5 text-sm";

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">{label}</div>
      {children}
    </div>
  );
}

function RangeRow({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="mt-2 flex items-center gap-2">
      <span className="w-20 shrink-0 text-xs text-[var(--text-secondary)]">{label}</span>
      <input type="range" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} className="flex-1" />
      <span className="w-10 text-right text-xs text-[var(--text-secondary)]">{value}px</span>
    </div>
  );
}
