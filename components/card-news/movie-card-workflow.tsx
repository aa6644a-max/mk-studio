"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toPng } from "html-to-image";
import CardCanvas, { type InfoRow, type RatingItem } from "./card-canvas";
import { BodySlideCanvas, EndingSlideCanvas } from "./review-slides";
import { fileToScaledDataUrl } from "@/lib/image";

const IMG = (size: string, path: string) => `https://image.tmdb.org/t/p/${size}${path}`;
// 업로드(data URL)면 원본 그대로, TMDB 경로면 사이즈별 URL 조립.
const resolve = (size: string, v: string) => (v.startsWith("data:") ? v : IMG(size, v));

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
  "블로그 리뷰",
  "카드 편집",
  "미리보기·저장",
  "업로드 도우미",
];
const PREVIEW_STEP = 8;
const LAST_STEP = STEPS.length - 1;

type BlogPost = {
  title: string;
  link: string;
  pubDate: string;
  thumbnail: string | null;
  excerpt: string;
};

type ReviewSlide = { headline: string; quote: string; imagePath: string };

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
  const [searched, setSearched] = useState(false);

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
  const [uploads, setUploads] = useState<string[]>([]); // 올린 스틸컷(히어로·갤러리 공용)

  const [accentColor, setAccentColor] = useState("#1c2b5e");
  const [accentAuto, setAccentAuto] = useState(true);
  const [bgColor] = useState("#eef0f3");
  const [creditText, setCreditText] = useState("MK LINK © 2026");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // 리뷰 카드뉴스 (블로그 연계 5장)
  const [blogPosts, setBlogPosts] = useState<BlogPost[] | null>(null);
  const [blogLoading, setBlogLoading] = useState(false);
  const [postLoading, setPostLoading] = useState("");
  const [reviewTitle, setReviewTitle] = useState("");
  const [reviewText, setReviewText] = useState("");
  const [blogUrl, setBlogUrl] = useState("");
  const [genBusy, setGenBusy] = useState(false);
  const [slides, setSlides] = useState<ReviewSlide[]>([]);
  const [slideEdit, setSlideEdit] = useState(0);
  const [endingHook, setEndingHook] = useState("");
  const [triggerKeyword, setTriggerKeyword] = useState("리뷰");
  const [followLine, setFollowLine] = useState("팔로우하면 다음 리뷰도 만나볼 수 있어요");
  const [caption, setCaption] = useState("");
  const [dmOpening, setDmOpening] = useState("");
  const [dmButton, setDmButton] = useState("");
  const [dmLinkMessage, setDmLinkMessage] = useState("");
  const [copiedKey, setCopiedKey] = useState("");

  const cardRef = useRef<HTMLDivElement>(null);
  const bodyRefs = useRef<(HTMLDivElement | null)[]>([]);
  const endingRef = useRef<HTMLDivElement>(null);
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
    const url = heroPath.startsWith("data:")
      ? heroPath
      : `/api/card-news/img?u=${encodeURIComponent(IMG("w300", heroPath))}`;
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

  function resetAll() {
    setStep(0);
    setQuery("");
    setResults([]);
    setSearched(false);
    setMovie(null);
    setHeroPath("");
    setMovieTitle("");
    setBadgeText("오늘의 추천작");
    setHeroTagline("");
    setMetaLine("");
    setBodyCopy("");
    setRatings([]);
    setInfoRows([]);
    setOstTitle("");
    setGalleryPaths([]);
    setUploads([]);
    setAccentColor("#1c2b5e");
    setAccentAuto(true);
    setCreditText("MK LINK © 2026");
    setError("");
    setReviewTitle("");
    setReviewText("");
    setBlogUrl("");
    setSlides([]);
    setSlideEdit(0);
    setEndingHook("");
    setTriggerKeyword("리뷰");
    setFollowLine("팔로우하면 다음 리뷰도 만나볼 수 있어요");
    setCaption("");
    setDmOpening("");
    setDmButton("");
    setDmLinkMessage("");
  }

  async function copyToClipboard(key: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(""), 1500);
    } catch {
      setError("복사 실패 — 텍스트를 직접 선택해 복사해주세요.");
    }
  }

  // ── 블로그 리뷰 연계 ────────────────────────────
  async function loadBlogPosts() {
    setBlogLoading(true);
    setError("");
    try {
      const res = await fetch("/api/blog/posts");
      const data = (await res.json()) as { posts?: BlogPost[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? "블로그 목록 조회 실패");
      setBlogPosts(data.posts ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "블로그 목록 조회 실패");
    } finally {
      setBlogLoading(false);
    }
  }

  async function pickBlogPost(p: BlogPost) {
    setPostLoading(p.link);
    setError("");
    try {
      const res = await fetch(`/api/blog/post?url=${encodeURIComponent(p.link)}`);
      const data = (await res.json()) as { text?: string; error?: string };
      if (!res.ok || !data.text) throw new Error(data.error ?? "본문 추출 실패");
      setReviewTitle(p.title);
      setReviewText(data.text);
      setBlogUrl(p.link.split("?")[0]);
    } catch (e) {
      setError(
        e instanceof Error
          ? `${e.message} — 글 내용을 아래에 직접 붙여넣어도 됩니다.`
          : "본문 추출 실패",
      );
    } finally {
      setPostLoading("");
    }
  }

  async function generateSlides() {
    if (!reviewText.trim()) {
      setError("리뷰 본문이 비어 있어요. 블로그 글을 선택하거나 붙여넣어 주세요.");
      return;
    }
    setGenBusy(true);
    setError("");
    try {
      const res = await fetch("/api/card-news/slides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ movieTitle, reviewTitle, reviewText, triggerKeyword }),
      });
      const data = (await res.json()) as {
        slides?: { headline: string; quote: string }[];
        ending?: { hook: string; followLine: string };
        caption?: string;
        dm?: { opening: string; button: string; linkMessage: string };
        error?: string;
      };
      if (!res.ok || !data.slides) throw new Error(data.error ?? "문구 생성 실패");
      setDmOpening(data.dm?.opening ?? "");
      setDmButton(data.dm?.button ?? "");
      setDmLinkMessage(data.dm?.linkMessage ?? "");
      setSlides(
        data.slides.slice(0, 3).map((s, i) => ({
          headline: s.headline,
          quote: s.quote,
          imagePath: galleryPaths[i] ?? galleryPaths[0] ?? heroPath,
        })),
      );
      setEndingHook(data.ending?.hook ?? "");
      if (data.ending?.followLine) setFollowLine(data.ending.followLine);
      if (data.caption) setCaption(data.caption);
      setSlideEdit(0);
      setStep(7);
    } catch (e) {
      setError(e instanceof Error ? e.message : "문구 생성 실패");
    } finally {
      setGenBusy(false);
    }
  }

  function updateSlide(i: number, patch: Partial<ReviewSlide>) {
    setSlides((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  }

  async function runSearch() {
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    setError("");
    try {
      const res = await fetch(`/api/card-news/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data.results ?? []);
      setSearched(true);
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
      setUploads([]);
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

  async function onFiles(fileList: FileList | null, mode: "hero" | "gallery" | "slide") {
    if (!fileList?.length) return;
    setError("");
    const urls: string[] = [];
    for (const f of Array.from(fileList)) {
      if (!f.type.startsWith("image/")) continue;
      try {
        urls.push(await fileToScaledDataUrl(f));
      } catch {
        /* skip bad file */
      }
    }
    if (!urls.length) {
      setError("이미지 파일만 올릴 수 있어요.");
      return;
    }
    setUploads((prev) => [...urls, ...prev]);
    if (mode === "hero") {
      setHeroPath(urls[0]);
    } else if (mode === "slide") {
      // 올린 첫 장을 편집 중인 리뷰 카드 배경으로 바로 적용
      updateSlide(slideEdit, { imagePath: urls[0] });
    } else {
      setGalleryPaths((prev) => {
        const room = 6 - prev.length;
        return [...prev, ...urls.slice(0, Math.max(0, room)).filter((u) => !prev.includes(u))];
      });
    }
  }

  function removeUpload(url: string) {
    setUploads((prev) => prev.filter((u) => u !== url));
    setHeroPath((h) => (h === url ? "" : h));
    setGalleryPaths((prev) => prev.filter((p) => p !== url));
    // 삭제한 업로드를 쓰던 리뷰 카드는 대체 이미지로 폴백
    setSlides((prev) =>
      prev.map((s) =>
        s.imagePath === url
          ? { ...s, imagePath: galleryPaths.find((p) => p !== url) ?? (heroPath !== url ? heroPath : "") }
          : s,
      ),
    );
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

  const hasReviewDeck = slides.length === 3;

  function nodeToPng(node: HTMLDivElement) {
    return toPng(node, { width: 1080, height: 1350, pixelRatio: 2, cacheBust: true, includeQueryParams: true });
  }

  /** 덱 전체(표지+본문3+엔딩) 또는 표지 1장의 [파일명, 노드] 목록 */
  function deckNodes(): [string, HTMLDivElement][] {
    const title = movieTitle || "movie";
    const list: [string, HTMLDivElement | null][] = hasReviewDeck
      ? [
          [`${title}_01_표지.png`, cardRef.current],
          [`${title}_02_리뷰1.png`, bodyRefs.current[0]],
          [`${title}_03_리뷰2.png`, bodyRefs.current[1]],
          [`${title}_04_리뷰3.png`, bodyRefs.current[2]],
          [`${title}_05_엔딩.png`, endingRef.current],
        ]
      : [[`${title}_card.png`, cardRef.current]];
    return list.filter((e): e is [string, HTMLDivElement] => Boolean(e[1]));
  }

  async function exportPng() {
    setBusy(true);
    setError("");
    try {
      for (const [name, node] of deckNodes()) {
        const url = await nodeToPng(node);
        const a = document.createElement("a");
        a.href = url;
        a.download = name;
        a.click();
        // 브라우저 다중 다운로드 차단 회피
        await new Promise((r) => setTimeout(r, 400));
      }
    } catch {
      setError("이미지 생성 실패");
    } finally {
      setBusy(false);
    }
  }

  function buildCaption() {
    if (caption.trim()) return caption;
    const tag = (movieTitle || "").replace(/[^\p{L}\p{N}]/gu, "");
    const lines = [`🎬 ${movieTitle}`, "", heroTagline, ""];
    if (hasReviewDeck) {
      lines.push(`💬 댓글에 '${triggerKeyword || "리뷰"}' 남기면 DM으로 리뷰 전문 링크를 보내드려요`, "");
    }
    lines.push(`#영화추천 #영화리뷰 #영화${tag ? ` #${tag}` : ""}`);
    return lines.join("\n");
  }

  async function shareInstagram() {
    setBusy(true);
    setError("");
    try {
      const files: File[] = [];
      for (const [name, node] of deckNodes()) {
        const url = await nodeToPng(node);
        const blob = await (await fetch(url)).blob();
        files.push(new File([blob], name, { type: "image/png" }));
      }
      const captionText = buildCaption();
      try {
        await navigator.clipboard.writeText(captionText);
      } catch {
        /* clipboard 권한 없으면 무시 */
      }
      const nav = navigator as Navigator & { canShare?: (d?: ShareData) => boolean };
      if (nav.canShare && nav.canShare({ files })) {
        await navigator.share({ files, text: captionText });
      } else {
        for (const f of files) {
          const a = document.createElement("a");
          a.href = URL.createObjectURL(f);
          a.download = f.name;
          a.click();
          await new Promise((r) => setTimeout(r, 400));
        }
        setError(
          `이 브라우저는 직접 공유가 안 돼요. 이미지 ${files.length}장 저장됨 — 인스타 앱에서 올려주세요. (캡션은 복사됨)`,
        );
      }
    } catch (e) {
      if ((e as Error)?.name !== "AbortError") setError("공유 실패");
    } finally {
      setBusy(false);
    }
  }

  const heroUrl = heroPath ? resolve("w1280", heroPath) : "";
  const posterUrl = movie?.poster_path ? IMG("w342", movie.poster_path) : "";
  const ostBgUrl = galleryPaths[1] ? resolve("w780", galleryPaths[1]) : heroUrl;
  const galleryUrls = galleryPaths.map((p) => resolve("w300", p));

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
        {movie && (
          <button
            onClick={resetAll}
            className="ml-auto shrink-0 rounded-full border border-[var(--panel-border)] px-2.5 py-1 font-semibold text-[var(--text-secondary)] hover:border-red-400 hover:text-red-500"
          >
            🔄 처음부터
          </button>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {/* 미리보기·저장 (덱이면 5장 전체) */}
        {movie && step === PREVIEW_STEP && (
          <div ref={previewBoxRef} className="flex min-h-full flex-col items-center gap-4 bg-[#0e0e10] p-4">
            {hasReviewDeck && (
              <p className="text-xs text-white/50">
                표지 → 리뷰 01·02·03 → 엔딩 · 총 5장이 순서대로 저장/공유됩니다.
              </p>
            )}
            {[
              <div key="cover">{card}</div>,
              ...(hasReviewDeck
                ? [
                    ...slides.map((s, i) => (
                      <BodySlideCanvas
                        key={`body-${i}`}
                        ref={(el) => {
                          bodyRefs.current[i] = el;
                        }}
                        index={i}
                        headline={s.headline}
                        quote={s.quote}
                        imageUrl={s.imagePath ? resolve("w1280", s.imagePath) : ""}
                        movieTitle={movieTitle}
                        accentColor={accentColor}
                        bgColor={bgColor}
                        creditText={creditText}
                      />
                    )),
                    <EndingSlideCanvas
                      key="ending"
                      ref={endingRef}
                      hook={endingHook}
                      triggerKeyword={triggerKeyword}
                      followLine={followLine}
                      posterUrl={posterUrl}
                      movieTitle={movieTitle}
                      accentColor={accentColor}
                      bgColor={bgColor}
                      creditText={creditText}
                    />,
                  ]
                : []),
            ].map((node, i) => (
              <div key={i} style={{ width: 1080 * scale, height: 1350 * scale, overflow: "hidden", borderRadius: 8 * scale, boxShadow: "0 10px 40px rgba(0,0,0,0.5)", flexShrink: 0 }}>
                <div style={{ transform: `scale(${scale})`, transformOrigin: "top left" }}>{node}</div>
              </div>
            ))}
          </div>
        )}

        {step === PREVIEW_STEP ? null : (
          <div className="mx-auto max-w-md space-y-5 p-5">
            {/* STEP 0 — search */}
            {step === 0 && (
              <>
                {movie && (
                  <div className="flex items-center gap-3 rounded-lg border border-[var(--accent)] bg-[var(--accent)]/5 p-3 text-sm">
                    <span className="min-w-0 flex-1">
                      현재 <b className="text-[var(--accent)]">{movie.title}</b> 작업 중. 다른 영화로 만들려면 아래에서 새로 검색·선택하세요.
                    </span>
                    <button onClick={resetAll} className="shrink-0 rounded-lg border border-[var(--panel-border)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:border-red-400 hover:text-red-500">
                      🔄 처음부터
                    </button>
                  </div>
                )}
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
                {searched && !searching && results.length === 0 && (
                  <p className="rounded-lg bg-[var(--page-bg)] p-3 text-xs leading-relaxed text-[var(--text-secondary)]">
                    검색 결과가 없어요. TMDB에 아직 등록되지 않은 신작일 수 있습니다.
                    <br />
                    이 경우 비슷한 다른 영화로 틀을 잡은 뒤 <b>＋ 사진 추가</b>로 이미지를 직접 올리고, 텍스트를 수정해 만들 수 있어요.
                  </p>
                )}
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
                    <UploadTile onFiles={(f) => onFiles(f, "hero")} />
                    {[...uploads, ...movie.backdrops].map((p) => {
                      const isUp = p.startsWith("data:");
                      return (
                        <div key={p} className="relative">
                          <button
                            onClick={() => setHeroPath(p)}
                            className={`block w-full overflow-hidden rounded-lg border-2 transition ${heroPath === p ? "border-[var(--accent)]" : "border-transparent"}`}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={resolve("w300", p)} alt="" className="aspect-video w-full object-cover" />
                          </button>
                          {isUp && (
                            <button
                              onClick={() => removeUpload(p)}
                              aria-label="삭제"
                              className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-[11px] text-white hover:bg-red-500"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      );
                    })}
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
                        <input value={r.label} onChange={(e) => updateInfoRow(i, "label", e.target.value)} placeholder="항목" className="w-20 shrink-0 rounded-lg border border-[var(--panel-border)] bg-white px-3 py-2.5 text-sm" />
                        <input value={r.value} onChange={(e) => updateInfoRow(i, "value", e.target.value)} placeholder="내용" className="min-w-0 flex-1 rounded-lg border border-[var(--panel-border)] bg-white px-3 py-2.5 text-sm" />
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
                  <UploadTile onFiles={(f) => onFiles(f, "gallery")} />
                  {[...uploads, ...movie.backdrops].map((p) => {
                    const isUp = p.startsWith("data:");
                    const idx = galleryPaths.indexOf(p);
                    const sel = idx >= 0;
                    const full = galleryPaths.length >= 6 && !sel;
                    return (
                      <div key={p} className="relative">
                        <button
                          onClick={() => toggleGallery(p)}
                          disabled={full}
                          className={`block w-full overflow-hidden rounded-lg border-2 transition ${sel ? "border-[var(--accent)]" : full ? "border-transparent opacity-30" : "border-transparent"}`}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={resolve("w185", p)} alt="" className="aspect-video w-full object-cover" />
                          {sel && <span className="absolute left-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--accent)] text-[10px] font-bold text-white">{idx + 1}</span>}
                        </button>
                        {isUp && (
                          <button
                            onClick={() => removeUpload(p)}
                            aria-label="삭제"
                            className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-[11px] text-white hover:bg-red-500"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </Section>
            )}

            {/* STEP 6 — 블로그 리뷰 불러오기 + AI 문구 생성 */}
            {step === 6 && (
              <>
                <Section label="내 블로그 리뷰 불러오기">
                  <button
                    onClick={loadBlogPosts}
                    disabled={blogLoading}
                    className="w-full rounded-lg border border-[var(--panel-border)] py-2.5 text-sm font-semibold text-[var(--text-primary)] hover:border-[var(--accent)] disabled:opacity-50"
                  >
                    {blogLoading ? "불러오는 중…" : blogPosts ? "↻ 목록 새로고침" : "📄 최신 글 목록 불러오기"}
                  </button>
                  {blogPosts && (
                    <div className="mt-2 max-h-64 space-y-1.5 overflow-y-auto">
                      {blogPosts.map((p) => (
                        <button
                          key={p.link}
                          onClick={() => pickBlogPost(p)}
                          disabled={!!postLoading}
                          className={`flex w-full items-center gap-2 rounded-lg border p-2 text-left text-xs transition ${
                            blogUrl && p.link.startsWith(blogUrl)
                              ? "border-[var(--accent)] bg-[var(--accent)]/5"
                              : "border-[var(--panel-border)] bg-white hover:border-[var(--accent)]"
                          }`}
                        >
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-semibold">{p.title}</span>
                            <span className="text-[var(--text-secondary)]">{p.pubDate}</span>
                          </span>
                          {postLoading === p.link && <span className="shrink-0 text-[var(--accent)]">추출 중…</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </Section>
                <Section label={`리뷰 본문 ${reviewText ? `(${reviewText.length.toLocaleString()}자)` : "(선택하거나 직접 붙여넣기)"}`}>
                  <textarea
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    rows={7}
                    placeholder="위에서 글을 선택하면 전문이 자동으로 들어옵니다. 직접 붙여넣어도 돼요."
                    className={`${inputCls} resize-none`}
                  />
                </Section>
                <Section label="댓글 트리거 키워드 (엔딩 카드·캡션에 사용)">
                  <input value={triggerKeyword} onChange={(e) => setTriggerKeyword(e.target.value)} className={inputCls} />
                </Section>
                <button
                  onClick={generateSlides}
                  disabled={genBusy || !reviewText.trim()}
                  className="w-full rounded-xl bg-[var(--accent)] py-3 text-sm font-bold text-white disabled:opacity-40"
                >
                  {genBusy ? "AI가 카드 문구를 뽑는 중… (30초 내외)" : "✨ AI로 리뷰 카드 문구 생성"}
                </button>
                {hasReviewDeck && (
                  <p className="text-center text-xs text-[var(--text-secondary)]">
                    이미 생성된 문구가 있어요. 다시 누르면 새로 생성됩니다.
                  </p>
                )}
                <p className="text-xs leading-relaxed text-[var(--text-secondary)]">
                  이 단계를 건너뛰면 기존처럼 <b>표지 1장</b>만 만들어져요. 생성하면 표지+리뷰3장+엔딩 <b>총 5장</b>이 됩니다.
                </p>
              </>
            )}

            {/* STEP 7 — 카드 편집 (리뷰 3장 + 엔딩) */}
            {step === 7 && (
              <>
                {!hasReviewDeck ? (
                  <p className="rounded-lg bg-[var(--page-bg)] p-4 text-sm text-[var(--text-secondary)]">
                    아직 리뷰 카드 문구가 없어요. <b>7. 블로그 리뷰</b> 단계에서 먼저 생성해주세요.
                  </p>
                ) : (
                  <>
                    <div className="flex gap-2">
                      {[...slides.map((_, i) => String(i + 1).padStart(2, "0")), "엔딩"].map((label, i) => (
                        <button
                          key={label}
                          onClick={() => setSlideEdit(i)}
                          className={`flex-1 rounded-lg py-2 text-sm font-bold transition ${
                            slideEdit === i
                              ? "bg-[var(--accent)] text-white"
                              : "border border-[var(--panel-border)] text-[var(--text-secondary)]"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    {slideEdit < slides.length ? (
                      <>
                        <Section label={`카드 ${slideEdit + 1} 헤드라인`}>
                          <input
                            value={slides[slideEdit]?.headline ?? ""}
                            onChange={(e) => updateSlide(slideEdit, { headline: e.target.value })}
                            className={inputCls}
                          />
                        </Section>
                        <Section label="리뷰 발췌 (2~3문장)">
                          <textarea
                            value={slides[slideEdit]?.quote ?? ""}
                            onChange={(e) => updateSlide(slideEdit, { quote: e.target.value })}
                            rows={4}
                            className={`${inputCls} resize-none`}
                          />
                        </Section>
                        <Section label="배경 스틸컷">
                          <p className="mb-2 text-xs text-[var(--text-secondary)]">
                            TMDB 스틸컷을 고르거나, 원하는 이미지를 직접 올릴 수 있어요.
                          </p>
                          <div className="grid grid-cols-3 gap-2">
                            <UploadTile onFiles={(f) => onFiles(f, "slide")} />
                            {[...uploads, ...(movie?.backdrops ?? [])].map((p) => {
                              const isUp = p.startsWith("data:");
                              return (
                                <div key={p} className="relative">
                                  <button
                                    onClick={() => updateSlide(slideEdit, { imagePath: p })}
                                    className={`block w-full overflow-hidden rounded-lg border-2 transition ${
                                      slides[slideEdit]?.imagePath === p ? "border-[var(--accent)]" : "border-transparent"
                                    }`}
                                  >
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={resolve("w185", p)} alt="" className="aspect-video w-full object-cover" />
                                  </button>
                                  {isUp && (
                                    <button
                                      onClick={() => removeUpload(p)}
                                      aria-label="삭제"
                                      className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-[11px] text-white hover:bg-red-500"
                                    >
                                      ✕
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </Section>
                      </>
                    ) : (
                      <>
                        <Section label="엔딩 훅 (상단 큰 문구)">
                          <input value={endingHook} onChange={(e) => setEndingHook(e.target.value)} className={inputCls} />
                        </Section>
                        <Section label="댓글 트리거 키워드 (엔딩 카드에 표시)">
                          <input value={triggerKeyword} onChange={(e) => setTriggerKeyword(e.target.value)} className={inputCls} />
                        </Section>
                        <Section label="팔로우 유도 문구">
                          <input value={followLine} onChange={(e) => setFollowLine(e.target.value)} className={inputCls} />
                        </Section>
                      </>
                    )}
                  </>
                )}
              </>
            )}

            {/* STEP 9 — 업로드 도우미 (캡션 + Manychat) */}
            {step === LAST_STEP && (
              <>
                <p className="rounded-lg border border-[var(--accent)]/30 bg-[var(--accent)]/5 p-3 text-xs leading-relaxed text-[var(--text-primary)]">
                  📋 <b>업로드 순서</b>: ① 인스타에 저장한 이미지 게시 (캡션 붙여넣기) → ② Manychat 자동화 복제 → 게시물 변경 → 아래 DM 문구 붙여넣기 → Set Live
                </p>
                <Section label="인스타 캡션">
                  <textarea
                    value={caption || buildCaption()}
                    onChange={(e) => setCaption(e.target.value)}
                    rows={8}
                    className={`${inputCls} resize-none`}
                  />
                  <button
                    onClick={() => copyToClipboard("caption", caption || buildCaption())}
                    className="mt-2 w-full rounded-lg border border-[var(--panel-border)] py-2.5 text-sm font-bold text-[var(--text-primary)] hover:border-[var(--accent)]"
                  >
                    {copiedKey === "caption" ? "✓ 복사됨" : "캡션 복사"}
                  </button>
                </Section>

                {/* Manychat DM 문구 — 복붙용 (덱 생성 시에만) */}
                {hasReviewDeck && (
                    <div className="rounded-xl border border-[var(--accent)]/30 bg-[var(--accent)]/5 p-4">
                      <div className="mb-3 text-xs font-bold uppercase tracking-wide text-[var(--accent)]">
                        💬 Manychat DM 문구 (복사 → 붙여넣기)
                      </div>
                      <div className="space-y-3">
                        <DmField
                          label="① 오프닝 DM (an opening DM)"
                          value={dmOpening}
                          onChange={setDmOpening}
                          rows={3}
                          copied={copiedKey === "dm-open"}
                          onCopy={() => copyToClipboard("dm-open", dmOpening)}
                        />
                        <DmField
                          label="② 버튼명"
                          value={dmButton}
                          onChange={setDmButton}
                          rows={1}
                          copied={copiedKey === "dm-btn"}
                          onCopy={() => copyToClipboard("dm-btn", dmButton)}
                        />
                        <DmField
                          label="③ 링크 DM 멘트 (a DM with a link)"
                          value={dmLinkMessage}
                          onChange={setDmLinkMessage}
                          rows={2}
                          copied={copiedKey === "dm-link"}
                          onCopy={() => copyToClipboard("dm-link", dmLinkMessage)}
                        />
                        {blogUrl && (
                          <div>
                            <div className="mb-1 flex items-center justify-between">
                              <span className="text-[11px] font-semibold text-[var(--text-secondary)]">④ 블로그 링크 (DM에 함께 등록)</span>
                              <button
                                onClick={() => copyToClipboard("dm-url", blogUrl)}
                                className="rounded border border-[var(--panel-border)] px-2 py-0.5 text-[11px] font-bold text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
                              >
                                {copiedKey === "dm-url" ? "✓ 복사됨" : "복사"}
                              </button>
                            </div>
                            <p className="break-all rounded-lg bg-white p-2.5 text-xs text-[var(--text-secondary)]">{blogUrl}</p>
                          </div>
                        )}
                      </div>
                      <p className="mt-3 text-[11px] leading-relaxed text-[var(--text-secondary)]">
                        Manychat에서 기존 자동화 복제 → 게시물 변경 → 위 문구 ①②③ 붙여넣기 → 링크 ④ 교체 → Set Live.
                        댓글 자동답글은 &quot;DM 보냈어요! 확인해주세요 📩&quot; 고정 추천.
                      </p>
                    </div>
                )}
              </>
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
          {step === PREVIEW_STEP ? (
            <>
              <button onClick={exportPng} disabled={busy} className="flex-1 rounded-xl border border-[var(--panel-border)] py-3 text-sm font-bold text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--text-primary)] disabled:opacity-60">
                {busy ? "..." : hasReviewDeck ? "PNG 5장 저장" : "PNG 저장"}
              </button>
              <button onClick={shareInstagram} disabled={busy} className="flex-1 rounded-xl border border-[var(--panel-border)] py-3 text-sm font-bold text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--text-primary)] disabled:opacity-60">
                {busy ? "..." : "📷 공유"}
              </button>
              <button onClick={() => setStep((s) => s + 1)} className="flex-1 rounded-xl bg-[var(--accent)] py-3 text-sm font-bold text-white">
                다음 →
              </button>
            </>
          ) : step < LAST_STEP ? (
            <button onClick={() => canNext && setStep((s) => s + 1)} disabled={!canNext} className="flex-[2] rounded-xl bg-[var(--accent)] py-3 text-sm font-bold text-white disabled:opacity-40">
              다음 →
            </button>
          ) : (
            <button onClick={resetAll} className="flex-[2] rounded-xl bg-[var(--accent)] py-3 text-sm font-bold text-white">
              ✅ 완료 — 새 카드뉴스 만들기
            </button>
          )}
        </div>
      )}
    </div>
  );
}

const inputCls = "w-full rounded-lg border border-[var(--panel-border)] bg-white px-3 py-2.5 text-sm";

function UploadTile({ onFiles }: { onFiles: (files: FileList | null) => void }) {
  return (
    <label className="flex aspect-video cursor-pointer flex-col items-center justify-center gap-0.5 rounded-lg border-2 border-dashed border-[var(--panel-border)] text-[var(--text-secondary)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]">
      <input
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          onFiles(e.target.files);
          e.currentTarget.value = "";
        }}
      />
      <span className="text-xl leading-none">＋</span>
      <span className="text-xs font-semibold">사진 추가</span>
    </label>
  );
}

function DmField({
  label, value, onChange, rows, copied, onCopy,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows: number;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[11px] font-semibold text-[var(--text-secondary)]">{label}</span>
        <button
          onClick={onCopy}
          disabled={!value}
          className="rounded border border-[var(--panel-border)] px-2 py-0.5 text-[11px] font-bold text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:opacity-40"
        >
          {copied ? "✓ 복사됨" : "복사"}
        </button>
      </div>
      {rows === 1 ? (
        <input value={value} onChange={(e) => onChange(e.target.value)} className={inputCls} />
      ) : (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows} className={`${inputCls} resize-none`} />
      )}
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
