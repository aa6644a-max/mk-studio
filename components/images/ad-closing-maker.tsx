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

const CREAM = "#f5f0eb";

export default function AdClosingMaker({ onBack }: { onBack?: () => void }) {
  const [stage, setStage] = useState<Stage>("edit");
  const [ratio, setRatio] = useState<Ratio>("4:5");
  const [img, setImg] = useState<string | null>(null);
  const [objPos, setObjPos] = useState({ x: 50, y: 50 });
  const [msg, setMsg] = useState("오늘도 대구의 좋은 소식,\nMK LINK가 함께합니다");
  const [msgSize, setMsgSize] = useState(32);
  const [label, setLabel] = useState("대구의 모든 커뮤니티");
  const [brand, setBrand] = useState("MK LINK");
  const [credit, setCredit] = useState("@mklink_daegu");

  const cardRef = useRef<HTMLDivElement>(null);
  const previewBoxRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const dragRef = useRef<{ x: number; y: number } | null>(null);

  const R = RATIOS[ratio];
  const photoFlex = ratio === "16:9" ? "0 0 50%" : "0 0 44%";

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
    a.download = `ad-closing-${ratio.replace(":", "x")}-${Date.now()}.png`;
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

  const card = (
    <div
      ref={cardRef}
      style={{
        width: R.w,
        height: R.h,
        position: "relative",
        background: CREAM,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        borderRadius: 2,
        flexShrink: 0,
      }}
    >
      {/* 상단 사진 */}
      <div style={{ position: "relative", overflow: "hidden", flex: photoFlex }}>
        {img ? (
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
        ) : (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#d8d0c8",
              fontSize: 11,
              fontFamily: "'DM Mono', monospace",
              color: "#888",
              letterSpacing: "0.12em",
            }}
          >
            이미지를 업로드하세요
          </div>
        )}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 100,
            background: "linear-gradient(to bottom, transparent 0%, rgba(245,240,235,0.55) 55%, rgba(245,240,235,1) 100%)",
            pointerEvents: "none",
          }}
        />
      </div>

      {/* 하단 패널 */}
      <div style={{ flex: 1, minHeight: 0, background: CREAM, padding: "14px 22px 20px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontFamily: "'Black Han Sans', sans-serif", fontSize: 36, lineHeight: 0.9, color: "#3a3835", marginBottom: 6 }}>“</div>
          <div style={{ fontFamily: "'Black Han Sans', sans-serif", fontSize: msgSize, lineHeight: 1.1, color: "#3a3835", wordBreak: "keep-all", whiteSpace: "pre-line" }}>
            {msg}
          </div>
        </div>
        <div>
          <div style={{ width: "100%", height: 1, background: "rgba(0,0,0,0.10)", margin: "12px 0" }} />
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
            {label && <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: "0.18em", color: "#8a8480", textTransform: "uppercase" }}>{label}</div>}
            {brand && <div style={{ fontFamily: "'Black Han Sans', sans-serif", fontSize: 26, color: "#3a3835", letterSpacing: "0.04em" }}>{brand}</div>}
            {credit && <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: "#a09890", letterSpacing: "0.12em", textAlign: "right", marginTop: 2 }}>{credit}</div>}
          </div>
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
        <span className="font-bold text-[var(--text-primary)]">📣 광고 오버레이 · 슬라이드 3 (클로징)</span>
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

            <Section label="상단 사진">
              <label className="block cursor-pointer rounded-lg border border-dashed border-[var(--panel-border)] p-5 text-center hover:border-[var(--accent)]">
                <span className="block text-2xl">🖼</span>
                <span className="mt-1 block text-sm text-[var(--text-secondary)]">{img ? "이미지 변경" : "클릭하여 이미지 선택"}</span>
                <input type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && uploadImg(e.target.files[0])} />
              </label>
            </Section>

            <Section label="클로징 멘트">
              <textarea value={msg} onChange={(e) => setMsg(e.target.value)} rows={3} placeholder="마무리 멘트 (줄바꿈 가능)" className={`${inputCls} resize-none`} />
              <RangeRow label="멘트 크기" value={msgSize} min={18} max={60} onChange={setMsgSize} />
            </Section>

            <Section label="브랜드">
              <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="상단 라벨" className={inputCls} />
              <input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="브랜드명" className={`${inputCls} mt-2`} />
              <input value={credit} onChange={(e) => setCredit(e.target.value)} placeholder="SNS 핸들 / 연락처" className={`${inputCls} mt-2`} />
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
              {img ? "상단 사진을 끌어서 위치를 조정할 수 있어요" : "상단 사진을 넣어주세요"}
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

function RangeRow({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (n: number) => void }) {
  return (
    <div className="mt-2 flex items-center gap-2">
      <span className="w-20 shrink-0 text-xs text-[var(--text-secondary)]">{label}</span>
      <input type="range" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} className="flex-1" />
      <span className="w-12 text-right text-xs text-[var(--text-secondary)]">{value}px</span>
    </div>
  );
}
