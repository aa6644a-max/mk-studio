"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Stage = "edit" | "preview";
const SIZES = [1080, 800, 600];

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function drawCtrlBar(ctx: CanvasRenderingContext2D, S: number) {
  const sz = S * 0.027, cy = S * 0.955, gap = S * 0.05, lx = S * 0.04, rx = S - S * 0.04, k = sz / 24;
  ctx.save();
  ctx.shadowBlur = 0;
  ctx.fillStyle = "rgba(255,255,255,0.90)";
  ctx.strokeStyle = "rgba(255,255,255,0.90)";
  const at = (cx: number, fn: () => void) => {
    ctx.save();
    ctx.translate(cx - sz / 2, cy - sz / 2);
    ctx.scale(k, k);
    ctx.lineWidth = 2.2 / k;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    fn();
    ctx.restore();
  };
  at(lx, () => { ctx.fillRect(5.5, 4, 4.5, 16); ctx.fillRect(14, 4, 4.5, 16); }); // pause
  at(lx + gap, () => { ctx.beginPath(); ctx.arc(12, 12.5, 8, 0.55, Math.PI * 1.45, false); ctx.stroke(); const a = Math.PI * 1.45, px = 12 + 8 * Math.cos(a), py = 12.5 + 8 * Math.sin(a), tdx = Math.sin(a), tdy = -Math.cos(a); ctx.beginPath(); ctx.moveTo(px + tdx * 3, py + tdy * 3); ctx.lineTo(px - tdy * 2.5, py + tdx * 2.5); ctx.lineTo(px + tdy * 2.5, py - tdx * 2.5); ctx.closePath(); ctx.fill(); ctx.font = "bold 7px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("10", 12, 12.5); });
  at(lx + gap * 2, () => { ctx.beginPath(); ctx.arc(12, 12.5, 8, Math.PI - 0.55, -Math.PI * 0.45, true); ctx.stroke(); const a = -Math.PI * 0.45, px = 12 + 8 * Math.cos(a), py = 12.5 + 8 * Math.sin(a), tdx = -Math.sin(a), tdy = Math.cos(a); ctx.beginPath(); ctx.moveTo(px + tdx * 3, py + tdy * 3); ctx.lineTo(px - tdy * 2.5, py + tdx * 2.5); ctx.lineTo(px + tdy * 2.5, py - tdx * 2.5); ctx.closePath(); ctx.fill(); ctx.font = "bold 7px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("10", 12, 12.5); });
  at(lx + gap * 3, () => { ctx.beginPath(); ctx.moveTo(11, 5); ctx.lineTo(6, 9); ctx.lineTo(2.5, 9); ctx.lineTo(2.5, 15); ctx.lineTo(6, 15); ctx.lineTo(11, 19); ctx.closePath(); ctx.fill(); ctx.beginPath(); ctx.arc(12.5, 12, 4, -Math.PI * 0.5, Math.PI * 0.5, false); ctx.stroke(); ctx.beginPath(); ctx.arc(12.5, 12, 7.5, -Math.PI * 0.5, Math.PI * 0.5, false); ctx.stroke(); });
  at(rx - gap * 3, () => { ctx.beginPath(); ctx.moveTo(4, 4); ctx.lineTo(17, 12); ctx.lineTo(4, 20); ctx.closePath(); ctx.fill(); ctx.fillRect(18, 4, 2.5, 16); });
  at(rx - gap * 2, () => { [6, 12, 18].forEach((y) => { ctx.beginPath(); ctx.arc(3.5, y, 1.5, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.moveTo(8, y); ctx.lineTo(22, y); ctx.stroke(); }); });
  at(rx - gap, () => { ctx.beginPath(); ctx.moveTo(4, 3.5); ctx.lineTo(20, 3.5); ctx.arcTo(22.5, 3.5, 22.5, 6, 2.5); ctx.lineTo(22.5, 16); ctx.arcTo(22.5, 18.5, 20, 18.5, 2.5); ctx.lineTo(14, 18.5); ctx.lineTo(10, 22); ctx.lineTo(10, 18.5); ctx.lineTo(4, 18.5); ctx.arcTo(1.5, 18.5, 1.5, 16, 2.5); ctx.lineTo(1.5, 6); ctx.arcTo(1.5, 3.5, 4, 3.5, 2.5); ctx.closePath(); ctx.stroke(); });
  at(rx, () => { const d = 4.5, m = 2; ctx.beginPath(); ctx.moveTo(m + d, m); ctx.lineTo(m, m); ctx.lineTo(m, m + d); ctx.stroke(); ctx.beginPath(); ctx.moveTo(24 - m - d, m); ctx.lineTo(24 - m, m); ctx.lineTo(24 - m, m + d); ctx.stroke(); ctx.beginPath(); ctx.moveTo(m + d, 24 - m); ctx.lineTo(m, 24 - m); ctx.lineTo(m, 24 - m - d); ctx.stroke(); ctx.beginPath(); ctx.moveTo(24 - m - d, 24 - m); ctx.lineTo(24 - m, 24 - m); ctx.lineTo(24 - m, 24 - m - d); ctx.stroke(); });
  ctx.restore();
}

type RenderState = {
  img: HTMLImageElement | null;
  offX: number;
  offY: number;
  title: string;
  sub: string;
  progress: number;
};

function renderThumb(ctx: CanvasRenderingContext2D, S: number, st: RenderState) {
  ctx.clearRect(0, 0, S, S);
  if (st.img) {
    const iw = st.img.naturalWidth, ih = st.img.naturalHeight;
    const sc = Math.max(S / iw, S / ih);
    const sw = iw * sc, sh = ih * sc;
    ctx.globalAlpha = 0.75;
    ctx.drawImage(st.img, (S - sw) * st.offX, (S - sh) * st.offY, sw, sh);
    ctx.globalAlpha = 1;
  } else {
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(0, 0, S, S);
  }
  const grad = ctx.createLinearGradient(0, 0, 0, S);
  grad.addColorStop(0, "rgba(0,0,0,0.38)");
  grad.addColorStop(0.45, "rgba(0,0,0,0.08)");
  grad.addColorStop(1, "rgba(0,0,0,0.72)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, S, S);

  ctx.textBaseline = "alphabetic";
  const leftX = S * 0.05, maxW = S * 0.9;
  let curY = S * 0.13;

  let titleFs = Math.round(S * 0.088);
  const minTitleFs = Math.round(S * 0.03);
  const title = st.title || "제목을 입력하세요";
  ctx.fillStyle = "#fff";
  ctx.shadowColor = "rgba(0,0,0,0.75)";
  ctx.shadowBlur = S * 0.016;
  ctx.font = `900 ${titleFs}px "Noto Sans KR",sans-serif`;
  while (titleFs > minTitleFs && ctx.measureText(title).width > maxW) {
    titleFs -= 2;
    ctx.font = `900 ${titleFs}px "Noto Sans KR",sans-serif`;
  }
  ctx.fillText(title, leftX, curY + titleFs);
  curY += titleFs + S * 0.018;

  let subFs = Math.round(S * 0.034);
  const minSubFs = Math.round(S * 0.014);
  const sub = st.sub || "부제목을 입력하세요";
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.shadowBlur = S * 0.009;
  ctx.font = `500 ${subFs}px "Noto Sans KR",sans-serif`;
  while (subFs > minSubFs && ctx.measureText(sub).width > maxW) {
    subFs--;
    ctx.font = `500 ${subFs}px "Noto Sans KR",sans-serif`;
  }
  ctx.fillText(sub, leftX, curY + subFs);
  curY += subFs + S * 0.028;
  ctx.shadowBlur = 0;

  const btnH = S * 0.05, btnR = S * 0.01, btnFs = Math.round(S * 0.022);
  ctx.font = `700 ${btnFs}px "Noto Sans KR",sans-serif`;
  const playLabel = "▶  감상 하기";
  const playW = ctx.measureText(playLabel).width + S * 0.038;
  ctx.fillStyle = "#fff";
  roundRect(ctx, leftX, curY, playW, btnH, btnR);
  ctx.fill();
  ctx.fillStyle = "#111";
  ctx.fillText(playLabel, leftX + S * 0.018, curY + btnH * 0.665);
  const infoLabel = "ⓘ  More Info";
  const infoW = ctx.measureText(infoLabel).width + S * 0.038;
  ctx.fillStyle = "rgba(80,80,80,0.78)";
  roundRect(ctx, leftX + playW + S * 0.014, curY, infoW, btnH, btnR);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.fillText(infoLabel, leftX + playW + S * 0.014 + S * 0.018, curY + btnH * 0.665);

  const pbH = Math.max(2, Math.round(S * 0.004));
  const pbY = S * 0.918, pbL = S * 0.04, pbW = S * 0.92;
  const fillW = pbW * (st.progress / 100);
  ctx.fillStyle = "rgba(255,255,255,0.28)";
  ctx.fillRect(pbL, pbY, pbW, pbH);
  ctx.fillStyle = "#e50914";
  ctx.fillRect(pbL, pbY, fillW, pbH);
  ctx.beginPath();
  ctx.arc(pbL + fillW, pbY + pbH / 2, Math.max(4, S * 0.007), 0, Math.PI * 2);
  ctx.fill();

  drawCtrlBar(ctx, S);
}

export default function NetflixThumbMaker({ onBack }: { onBack?: () => void }) {
  const [stage, setStage] = useState<Stage>("edit");
  const [title, setTitle] = useState("");
  const [sub, setSub] = useState("");
  const [progress, setProgress] = useState(20);
  const [size, setSize] = useState(1080);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const offRef = useRef({ x: 0.5, y: 0.5 });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<{ last: { x: number; y: number } } | null>(null);

  const st = useCallback(
    (): RenderState => ({ img, offX: offRef.current.x, offY: offRef.current.y, title, sub, progress }),
    [img, title, sub, progress],
  );

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    renderThumb(ctx, canvas.width, st());
  }, [st]);

  // 미리보기 캔버스 크기 동기화 + 렌더
  useEffect(() => {
    if (stage !== "preview") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const sync = () => {
      const box = canvas.parentElement;
      if (!box) return;
      const s = Math.min(box.clientWidth, box.clientHeight);
      canvas.width = s;
      canvas.height = s;
      draw();
    };
    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, [stage, draw]);

  useEffect(() => {
    if (stage === "preview") draw();
  }, [draw, stage]);

  function uploadImg(file: File) {
    const el = new Image();
    el.onload = () => {
      offRef.current = { x: 0.5, y: 0.5 };
      setImg(el);
    };
    el.src = URL.createObjectURL(file);
  }

  function exportPng() {
    const off = document.createElement("canvas");
    off.width = size;
    off.height = size;
    const ctx = off.getContext("2d");
    if (!ctx) return;
    renderThumb(ctx, size, st());
    const a = document.createElement("a");
    a.href = off.toDataURL("image/png");
    a.download = `netflix-thumb-${Date.now()}.png`;
    a.click();
  }

  // 드래그로 이미지 위치 조정
  function onDown(e: React.PointerEvent) {
    if (!img) return;
    dragRef.current = { last: { x: e.clientX, y: e.clientY } };
  }
  function onMove(e: React.PointerEvent) {
    if (!dragRef.current || !img) return;
    const canvas = canvasRef.current!;
    const S = canvas.width;
    const dx = e.clientX - dragRef.current.last.x;
    const dy = e.clientY - dragRef.current.last.y;
    dragRef.current.last = { x: e.clientX, y: e.clientY };
    const sc = Math.max(S / img.naturalWidth, S / img.naturalHeight);
    const rx = img.naturalWidth * sc - S;
    const ry = img.naturalHeight * sc - S;
    if (rx > 0) offRef.current.x = Math.min(1, Math.max(0, offRef.current.x - dx / rx));
    if (ry > 0) offRef.current.y = Math.min(1, Math.max(0, offRef.current.y - dy / ry));
    draw();
  }
  function onUp() {
    dragRef.current = null;
  }

  return (
    <div className="flex h-full flex-col">
      {/* 단계 표시 */}
      <div className="flex shrink-0 items-center gap-2 border-b border-[var(--panel-border)] px-3 py-2 text-xs">
        {onBack && (
          <button onClick={onBack} className="mr-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
            ← 메이커
          </button>
        )}
        <span className="font-bold text-[var(--text-primary)]">🎬 넷플릭스 썸네일</span>
        <span className="ml-auto flex items-center gap-1">
          <span className={stage === "edit" ? "font-bold text-[var(--accent)]" : "text-[var(--text-secondary)]"}>① 입력</span>
          <span className="text-[var(--text-secondary)]">→</span>
          <span className={stage === "preview" ? "font-bold text-[var(--accent)]" : "text-[var(--text-secondary)]"}>② 확인</span>
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {stage === "edit" ? (
          <div className="mx-auto max-w-md space-y-5 p-5">
            <Section label="배경 이미지">
              <label className="block cursor-pointer rounded-lg border border-dashed border-[var(--panel-border)] p-5 text-center hover:border-[var(--accent)]">
                <span className="block text-2xl">🖼</span>
                <span className="mt-1 block text-sm text-[var(--text-secondary)]">
                  {img ? "이미지 변경" : "클릭하여 이미지 선택 (JPG, PNG)"}
                </span>
                <input type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && uploadImg(e.target.files[0])} />
              </label>
              <p className="mt-1 text-[11px] text-[var(--text-secondary)]">💡 업로드 후 ② 확인 화면에서 드래그로 위치 조정</p>
            </Section>

            <Section label="제목">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="예: 악마는 프라다를 입는다2"
                className="w-full rounded-lg border border-[var(--panel-border)] bg-white px-3 py-2.5 text-sm"
              />
            </Section>

            <Section label="부제목">
              <input
                value={sub}
                onChange={(e) => setSub(e.target.value)}
                placeholder="예: 20년만의 속편 보기전 꼭 알아야 할 정보"
                className="w-full rounded-lg border border-[var(--panel-border)] bg-white px-3 py-2.5 text-sm"
              />
            </Section>

            <Section label={`진행 바 위치 — ${progress}%`}>
              <input
                type="range"
                min={0}
                max={100}
                value={progress}
                onChange={(e) => setProgress(Number(e.target.value))}
                className="w-full"
              />
            </Section>

            <Section label="저장 크기">
              <div className="flex gap-2">
                {SIZES.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSize(s)}
                    className={`flex-1 rounded-lg border py-2 text-sm font-semibold transition-colors ${
                      size === s
                        ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]"
                        : "border-[var(--panel-border)] text-[var(--text-secondary)]"
                    }`}
                  >
                    {s}×{s}
                  </button>
                ))}
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
            <div className="flex flex-1 items-center justify-center overflow-hidden bg-[#0e0e10] p-4">
              <canvas
                ref={canvasRef}
                onPointerDown={onDown}
                onPointerMove={onMove}
                onPointerUp={onUp}
                onPointerLeave={onUp}
                className="max-h-full max-w-full touch-none rounded shadow-lg"
                style={{ aspectRatio: "1/1", cursor: img ? "move" : "default" }}
              />
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
                PNG 다운로드 ({size}×{size})
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
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">{label}</div>
      {children}
    </div>
  );
}
