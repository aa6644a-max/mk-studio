"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toPng } from "html-to-image";
import CardCanvas, { type InfoRow, type RatingItem } from "./card-canvas";

const IMG = (size: string, path: string) => `https://image.tmdb.org/t/p/${size}${path}`;

type SearchResult = { id: number; title: string; year: string; posterUrl: string | null };

interface MovieDetail {
  id: number;
  title: string;
  original_title: string;
  overview: string;
  tagline: string;
  release_date: string;
  runtime: number;
  vote_average: number;
  genres: string[];
  director: string;
  production: string;
  cast: string[];
  ratings: RatingItem[];
  poster_path: string | null;
  backdrops: string[];
  posters: string[];
}

const STEPS = [
  "영화 검색",
  "히어로 배경",
  "히어로 텍스트",
  "작품 정보",
  "OST 플레이어",
  "갤러리 선택",
  "미리보기",
];

function fmtRuntime(min: number) {
  if (!min) return "";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}시간 ${m}분` : `${m}분`;
}

export default function MovieCardWorkflow() {
  const [step, setStep] = useState(0);

  // search
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  // movie + card fields
  const [movie, setMovie] = useState<MovieDetail | null>(null);
  const [heroPath, setHeroPath] = useState("");
  const [movieTitle, setMovieTitle] = useState("");
  const [badgeText, setBadgeText] = useState("오늘의 추천작");
  const [heroTagline, setHeroTagline] = useState("");
  const [metaLine, setMetaLine] = useState("");
  const [bodyCopy, setBodyCopy] = useState("");
  const [ratings, setRatings] = useState<RatingItem[]>([]);
  const [infoRows, setInfoRows] = useState<InfoRow[]>([]);
  const [ostTitle, setOstTitle] = useState("");
  const [galleryPaths, setGalleryPaths] = useState<string[]>([]);

  const [accentColor, setAccentColor] = useState("#1c2b5e");
  const [accentAuto, setAccentAuto] = useState(true);
  const [bgColor] = useState("#eef0f3");
  const [creditText, setCreditText] = useState("MK LINK © 2026");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const cardRef = useRef<HTMLDivElement>(null);
  const colorCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const previewBoxRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.3);

  const fit = useCallback(() => {
    const box = previewBoxRef.current;
    if (!box) return;
    const s = Math.min((box.clientWidth - 8) / 1080, 0.6);
    setScale(Math.max(0.12, s));
  }, []);
  useEffect(() => {
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [fit, step]);

  // 스틸컷에서 브랜드 컬러 자동 추출
  useEffect(() => {
    if (!accentAuto || !heroPath) return;
    const url = `/api/card-news/img?u=${encodeURIComponent(IMG("w300", heroPath))}`;
    const img = new Image();
    img.onload = () => {
      let canvas = colorCanvasRef.current;
      if (!canvas) {
        canvas = document.createElement("canvas");
        colorCanvasRef.current = canvas;
      }
      const w = 80;
      const h = Math.max(1, Math.round((img.height / img.width) * 80));
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, w, h);
      let data: Uint8ClampedArray;
      try {
        data = ctx.getImageData(0, 0, w, h).data;
      } catch {
        return;
      }
      let best = -1;
      let br = 28, bg = 43, bb = 94;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2];
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        const sat = max === 0 ? 0 : (max - min) / max;
        const lum = (max + min) / 2 / 255;
        const score = sat * (1 - Math.abs(lum - 0.5));
        if (score > best) {
          best = score;
          br = r; bg = g; bb = b;
        }
      }
      const f = 0.55; // 흰 텍스트 대비 위해 어둡게
      const hx = (n: number) => Math.round(Math.min(255, n)).toString(16).padStart(2, "0");
      setAccentColor(`#${hx(br * f)}${hx(bg * f)}${hx(bb * f)}`);
    };
    img.src = url;
  }, [heroPath, accentAuto]);

  async function runSearch() {
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    setError("");
    try {
      const res = await fetch(`/api/card-news/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data.results ?? []);
    } catch {
      setError("검색 실패");
    } finally {
      setSearching(false);
    }
  }

  async function selectMovie(id: number) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/card-news/movie/${id}`);
      const m: MovieDetail = await res.json();
      setMovie(m);
      setMovieTitle(m.title);
      setHeroTagline(m.tagline || (m.overview ? m.overview.split(/(?<=[.!?])\s/)[0] : ""));
      setBodyCopy(m.overview || "");
      const year = m.release_date?.slice(0, 4) || "";
      setMetaLine([year, m.genres.slice(0, 2).join(", "), fmtRuntime(m.runtime)].filter(Boolean).join(" · "));
      setRatings(m.ratings?.length ? m.ratings : [{ source: "TMDB", value: (m.vote_average || 0).toFixed(1) }]);
      setInfoRows([
        { label: "감독", value: m.director || "-" },
        { label: "제작", value: m.production || "-" },
        { label: "개봉", value: m.release_date ? m.release_date.replace(/-/g, ".") : "-" },
        { label: "장르", value: m.genres.join(", ") || "-" },
      ]);
      setOstTitle(`${m.title} OST`);
      setGalleryPaths(m.backdrops.slice(0, 6));
      setHeroPath(m.backdrops[0] || "");
      setCreditText("MK LINK © 2026");
      setStep(1);
    } catch {
      setError("영화 정보를 불러오지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  function toggleGallery(path: string) {
    setGalleryPaths((prev) => {
      if (prev.includes(path)) return prev.filter((p) => p !== path);
      if (prev.length >= 6) return prev;
      return [...prev, path];
    });
  }
  function updateInfoRow(i: number, field: "label" | "value", val: string) {
    setInfoRows((rows) => rows.map((r, idx) => (idx === i ? { ...r, [field]: val } : r)));
  }
  function addInfoRow() {
    setInfoRows((rows) => (rows.length >= 6 ? rows : [...rows, { label: "", value: "" }]));
  }
  function deleteInfoRow(i: number) {
    setInfoRows((rows) => rows.filter((_, idx) => idx !== i));
  }

  async function exportPng() {
    const node = cardRef.current;
    if (!node) return;
    setBusy(true);
    try {
      const url = await toPng(node, { width: 1080, height: 1350, pixelRatio: 2, cacheBust: true });
      const a = document.createElement("a");
      a.href = url;
      a.download = `${movieTitle || "movie"}_card.png`;
      a.click();
    } catch {
      setError("이미지 생성 실패");
    } finally {
      setBusy(false);
    }
  }

  const heroUrl = heroPath ? IMG("w1280", heroPath) : "";
  const posterUrl = movie?.poster_path ? IMG("w342", movie.poster_path) : "";
  const ostBgUrl = galleryPaths[1] ? IMG("w780", galleryPaths[1]) : heroUrl;
  const galleryUrls = galleryPaths.map((p) => IMG("w300", p));

  const card = (
    <CardCanvas
      ref={cardRef}
      movieTitle={movieTitle}
      heroTagline={heroTagline}
      bodyCopy={bodyCopy}
      heroUrl={heroUrl}
      posterUrl={posterUrl}
      accentColor={accentColor}
      bgColor={bgColor}
      badgeText={badgeText}
      metaLine={metaLine}
      ratings={ratings}
      infoRows={infoRows}
      ostTitle={ostTitle}
      ostBgUrl={ostBgUrl}
      galleryUrls={galleryUrls}
      creditText={creditText}
    />
  );

  const canNext = step === 0 ? !!movie : step === 1 ? !!heroPath : true;

  return (
    <div className="flex h-full flex-col">
      {/* step chips */}
      <div className="flex shrink-0 items-center gap-1 overflow-x-auto border-b border-[var(--panel-border)] px-3 py-2 text-[11px]">
        {STEPS.map((s, i) => (
          <button
            key={s}
            onClick={() => (movie || i === 0) && setStep(i)}
            className={`shrink-0 rounded-full px-2.5 py-1 font-semibold transition-colors ${
              step === i
                ? "bg-[var(--accent)] text-white"
                : i < step
                ? "text-[var(--accent)]"
                : "text-[var(--text-secondary)]"
            }`}
          >
            {i + 1}. {s}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {/* 미리보기 — 마지막 단계에서만 */}
        {movie && step === 6 && (
          <div ref={previewBoxRef} className="flex min-h-full items-start justify-center bg-[#0e0e10] p-4">
            <div style={{ width: 1080 * scale, height: 1350 * scale, overflow: "hidden", borderRadius: 8 * scale, boxShadow: "0 10px 40px rgba(0,0,0,0.5)" }}>
              <div style={{ transform: `scale(${scale})`, transformOrigin: "top left" }}>{card}</div>
            </div>
          </div>
        )}

        {step === 6 ? null : (
          <div className="mx-auto max-w-md space-y-5 p-5">
            {/* STEP 0 — search */}
            {step === 0 && (
              <>
                <Section label="영화 검색">
                  <div className="flex gap-2">
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && runSearch()}
                      placeholder="영화 제목 입력"
                      className={inputCls}
                    />
                    <button onClick={runSearch} disabled={searching} className="shrink-0 rounded-lg bg-[var(--accent)] px-4 text-sm font-bold text-white">
                      {searching ? "..." : "검색"}
                    </button>
                  </div>
                </Section>
                <div className="space-y-2">
                  {results.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => selectMovie(r.id)}
                      disabled={busy}
                      className="flex w-full items-center gap-3 rounded-lg border border-[var(--panel-border)] bg-white p-2 text-left hover:border-[var(--accent)]"
                    >
                      {r.posterUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={r.posterUrl} alt="" className="h-16 w-11 shrink-0 rounded object-cover" />
                      ) : (
                        <div className="h-16 w-11 shrink-0 rounded bg-[var(--page-bg)]" />
                      )}
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold">{r.title}</div>
                        <div className="text-xs text-[var(--text-secondary)]">{r.year}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* STEP 1 — hero bg */}
            {step === 1 && movie && (
              <>
                <Section label="히어로 배경 이미지">
                  <div className="grid grid-cols-2 gap-2">
                    {movie.backdrops.map((p) => (
                      <button
                        key={p}
                        onClick={() => setHeroPath(p)}
                        className={`overflow-hidden rounded-lg border-2 transition ${heroPath === p ? "border-[var(--accent)]" : "border-transparent"}`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={IMG("w300", p)} alt="" className="aspect-video w-full object-cover" />
                      </button>
                    ))}
                  </div>
                </Section>

                <Section label="브랜드 컬러">
                  <div className="flex items-center gap-2">
                    <div className="h-9 w-9 shrink-0 rounded-lg border border-[var(--panel-border)]" style={{ background: accentColor }} />
                    <input
                      type="color"
                      value={accentColor}
                      onChange={(e) => { setAccentAuto(false); setAccentColor(e.target.value); }}
                      className="h-9 w-12 rounded border border-[var(--panel-border)]"
                    />
                    <span className="font-mono text-xs text-[var(--text-secondary)]">{accentColor}</span>
                    <button
                      onClick={() => setAccentAuto(true)}
                      className={`ml-auto rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                        accentAuto
                          ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]"
                          : "border-[var(--panel-border)] text-[var(--text-secondary)]"
                      }`}
                    >
                      🎨 스틸컷 자동
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-[var(--text-secondary)]">
                    {accentAuto ? "선택한 스틸컷 색감에서 자동 추출 중." : "수동 지정됨. '스틸컷 자동'으로 되돌릴 수 있어요."}
                  </p>
                </Section>
              </>
            )}

            {/* STEP 2 — hero text */}
            {step === 2 && (
              <>
                <Section label="추천 뱃지"><input value={badgeText} onChange={(e) => setBadgeText(e.target.value)} className={inputCls} /></Section>
                <Section label="제목"><input value={movieTitle} onChange={(e) => setMovieTitle(e.target.value)} className={inputCls} /></Section>
                <Section label="핵심 메시지 (2~3줄)"><textarea value={heroTagline} onChange={(e) => setHeroTagline(e.target.value)} rows={3} className={`${inputCls} resize-none`} /></Section>
              </>
            )}

            {/* STEP 3 — info */}
            {step === 3 && (
              <>
                <Section label="메타 (연도 · 장르 · 러닝타임)"><input value={metaLine} onChange={(e) => setMetaLine(e.target.value)} className={inputCls} /></Section>
                <Section label="줄거리"><textarea value={bodyCopy} onChange={(e) => setBodyCopy(e.target.value)} rows={4} className={`${inputCls} resize-none`} /></Section>
                <Section label="평점 (자동)">
                  <div className="flex flex-wrap gap-2">
                    {ratings.length === 0 && <span className="text-xs text-[var(--text-secondary)]">평점 없음</span>}
                    {ratings.map((r, i) => (
                      <span key={i} className="rounded-lg bg-[var(--page-bg)] px-3 py-1.5 text-sm">
                        <b>{r.source}</b> {r.value}
                      </span>
                    ))}
                  </div>
                </Section>
                <Section label="주요 정보 (항목 추가·삭제·수정)">
                  <div className="space-y-2">
                    {infoRows.map((r, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input value={r.label} onChange={(e) => updateInfoRow(i, "label", e.target.value)} placeholder="항목" className={`${inputCls} w-20`} />
                        <input value={r.value} onChange={(e) => updateInfoRow(i, "value", e.target.value)} placeholder="내용" className={`${inputCls} flex-1`} />
                        <button
                          onClick={() => deleteInfoRow(i)}
                          aria-label="삭제"
                          className="shrink-0 rounded-lg border border-[var(--panel-border)] px-2.5 py-2 text-sm text-[var(--text-secondary)] hover:border-red-400 hover:text-red-500"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                  {infoRows.length < 6 && (
                    <button
                      onClick={addInfoRow}
                      className="mt-2 w-full rounded-lg border border-dashed border-[var(--panel-border)] py-2 text-sm font-semibold text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
                    >
                      + 항목 추가
                    </button>
                  )}
                </Section>
              </>
            )}

            {/* STEP 4 — OST */}
            {step === 4 && (
              <Section label="OST 곡명 (지금 재생 중)">
                <input value={ostTitle} onChange={(e) => setOstTitle(e.target.value)} placeholder="예: Sparkle (Theme Song)" className={inputCls} />
                <p className="mt-2 text-xs text-[var(--text-secondary)]">앨범아트=포스터, 배경=갤러리 2번째 스틸컷 자동.</p>
              </Section>
            )}

            {/* STEP 5 — gallery */}
            {step === 5 && movie && (
              <Section label={`갤러리 스틸컷 선택 (${galleryPaths.length}/6)`}>
                <p className="mb-2 text-xs text-[var(--text-secondary)]">최대 6장, 선택 순서대로 배치.</p>
                <div className="grid grid-cols-3 gap-2">
                  {movie.backdrops.map((p) => {
                    const idx = galleryPaths.indexOf(p);
                    const sel = idx >= 0;
                    const full = galleryPaths.length >= 6 && !sel;
                    return (
                      <button
                        key={p}
                        onClick={() => toggleGallery(p)}
                        disabled={full}
                        className={`relative overflow-hidden rounded-lg border-2 transition ${sel ? "border-[var(--accent)]" : full ? "border-transparent opacity-30" : "border-transparent"}`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={IMG("w185", p)} alt="" className="aspect-video w-full object-cover" />
                        {sel && <span className="absolute left-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--accent)] text-[10px] font-bold text-white">{idx + 1}</span>}
                      </button>
                    );
                  })}
                </div>
              </Section>
            )}
          </div>
        )}
      </div>

      {error && <div className="px-4 py-2 text-center text-sm text-red-500">{error}</div>}

      {/* bottom nav */}
      {movie && (
        <div className="flex shrink-0 gap-3 border-t border-[var(--panel-border)] p-4">
          {step > 0 && (
            <button onClick={() => setStep((s) => Math.max(0, s - 1))} className="flex-1 rounded-xl border border-[var(--panel-border)] py-3 text-sm font-semibold text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--text-primary)]">
              ← 이전
            </button>
          )}
          {step < 6 ? (
            <button onClick={() => canNext && setStep((s) => s + 1)} disabled={!canNext} className="flex-[2] rounded-xl bg-[var(--accent)] py-3 text-sm font-bold text-white disabled:opacity-40">
              다음 →
            </button>
          ) : (
            <button onClick={exportPng} disabled={busy} className="flex-[2] rounded-xl bg-[var(--accent)] py-3 text-sm font-bold text-white disabled:opacity-60">
              {busy ? "생성 중..." : "PNG 다운로드 (1080×1350)"}
            </button>
          )}
        </div>
      )}
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
