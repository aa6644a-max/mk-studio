"use client";

import { useEffect, useState } from "react";
import type { CurationItem, MovieDetails, PostDraft, PostType, TvDetails } from "@/lib/types";
import { emptyDraft } from "@/lib/types";
import MovieSearch from "./movie-search";
import FileUpload from "./file-upload";
import { buildPreviewDoc } from "@/lib/html-formatter";

// ── 스텝 정의 ─────────────────────────────────────────────────────────────
type StepDef = { id: string; label: string };

const TYPE_STEPS: Record<PostType, StepDef[]> = {
  review:   [{ id: "movie",    label: "영화 검색" }, { id: "comment",  label: "감상평"    }, { id: "final", label: "생성" }],
  preview:  [{ id: "movie",    label: "영화 검색" }, { id: "expect",   label: "기대 포인트" }, { id: "final", label: "생성" }],
  curation: [{ id: "theme",    label: "테마"      }, { id: "items",    label: "작품 추가"  }, { id: "final", label: "생성" }],
  binge:    [{ id: "theme",    label: "테마"      }, { id: "items",    label: "작품 추가"  }, { id: "final", label: "생성" }],
  photo:    [{ id: "category", label: "카테고리"  }, { id: "upload",   label: "사진 업로드" }, { id: "body",  label: "내용 지시" }, { id: "final", label: "생성" }],
  pdf:      [{ id: "upload",   label: "PDF 업로드" }, { id: "body",    label: "생성 지시"  }, { id: "final", label: "생성" }],
  local:    [{ id: "upload",   label: "PDF 업로드" }, { id: "body",    label: "생성 지시"  }, { id: "final", label: "생성" }],
};

const TYPE_CARDS = [
  { type: "review"   as PostType, icon: "🎥", label: "영화 리뷰",  desc: "직접 관람한 영화 솔직 후기" },
  { type: "curation" as PostType, icon: "🎬", label: "큐레이션",   desc: "테마별 영화 추천 리스트" },
  { type: "binge"    as PostType, icon: "📺", label: "정주행",     desc: "정주행 추천 시리즈" },
  { type: "pdf"      as PostType, icon: "📄", label: "PDF 요약",   desc: "PDF 문서 기반 포스팅" },
  { type: "local"    as PostType, icon: "📢", label: "로컬소식",   desc: "지역 행사·공고문" },
  { type: "photo"    as PostType, icon: "📸", label: "사진",       desc: "사진 포스팅" },
];

// ── 메인 Wizard ────────────────────────────────────────────────────────────
type Phase = "type-select" | "steps" | "generating" | "result";

export default function Wizard({
  draft,
  onChange,
  onPublish,
  onReset,
  busy,
  msg,
}: {
  draft: PostDraft;
  onChange: (p: Partial<PostDraft>) => void;
  onPublish: () => Promise<void>;
  onReset: () => void;
  busy: boolean;
  msg: string;
}) {
  const [phase, setPhase]       = useState<Phase>("type-select");
  const [stepIdx, setStepIdx]   = useState(0);
  const [slideDir, setSlideDir] = useState<"fwd" | "bwd">("fwd");
  const [animKey, setAnimKey]   = useState(0);

  const steps = TYPE_STEPS[draft.postType] ?? [];

  // busy → false + html 생성 완료 시 result 화면
  useEffect(() => {
    if (!busy && draft.generatedHtml && phase === "generating") {
      setPhase("result");
    }
  }, [busy, draft.generatedHtml, phase]);

  function selectType(type: PostType) {
    onChange({ postType: type });
    setPhase("steps");
    setStepIdx(0);
    setSlideDir("fwd");
    setAnimKey((k) => k + 1);
  }

  function navigate(newIdx: number, dir: "fwd" | "bwd") {
    setSlideDir(dir);
    setAnimKey((k) => k + 1);
    setStepIdx(newIdx);
  }

  function goNext() {
    if (stepIdx < steps.length - 1) navigate(stepIdx + 1, "fwd");
  }

  function goBack() {
    if (stepIdx > 0) {
      navigate(stepIdx - 1, "bwd");
    } else {
      setPhase("type-select");
      setAnimKey((k) => k + 1);
    }
  }

  function jumpTo(idx: number) {
    if (idx === stepIdx) return;
    navigate(idx, idx > stepIdx ? "fwd" : "bwd");
  }

  async function handleGenerate() {
    setPhase("generating");
    await onPublish();
  }

  function handleReset() {
    onReset();
    setPhase("type-select");
    setStepIdx(0);
  }

  // ── 화면 분기 ─────────────────────────────────────────────────────────
  if (phase === "type-select") {
    return <TypeSelectScreen onSelect={selectType} />;
  }

  if (phase === "result") {
    return <ResultScreen draft={draft} onReset={handleReset} />;
  }

  const isFinal  = stepIdx === steps.length - 1;
  const isGenerating = phase === "generating";

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* 상단: 뒤로 + 진행 도트 */}
      <div className="flex shrink-0 items-center gap-4 border-b border-[var(--panel-border)] bg-white px-6 py-3">
        <button
          onClick={goBack}
          className="shrink-0 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          ← {stepIdx === 0 ? "타입 선택" : "이전"}
        </button>
        <ProgressDots steps={steps} current={stepIdx} onJump={jumpTo} />
      </div>

      {/* 스텝 콘텐츠 (슬라이드 애니메이션) */}
      <div className="flex flex-1 overflow-hidden">
        <div
          key={animKey}
          className={`flex w-full flex-col ${slideDir === "fwd" ? "wizard-slide-fwd" : "wizard-slide-bwd"}`}
        >
          {isGenerating ? (
            <GeneratingScreen msg={msg} />
          ) : (
            <StepContent
              stepId={steps[stepIdx]?.id ?? ""}
              draft={draft}
              onChange={onChange}
              onNext={goNext}
              onGenerate={handleGenerate}
              isFinal={isFinal}
              busy={busy}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ── 진행 도트 ──────────────────────────────────────────────────────────────
function ProgressDots({
  steps, current, onJump,
}: {
  steps: StepDef[];
  current: number;
  onJump: (i: number) => void;
}) {
  return (
    <div className="flex items-center gap-0">
      {steps.map((s, i) => {
        const done    = i < current;
        const active  = i === current;
        return (
          <div key={i} className="flex items-center">
            <button
              onClick={() => done && onJump(i)}
              disabled={!done}
              className={`flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-semibold transition-all ${
                active
                  ? "text-[var(--accent)]"
                  : done
                    ? "cursor-pointer text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    : "cursor-default text-[var(--panel-border)]"
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full transition-all ${
                  active ? "bg-[var(--accent)] scale-125" : done ? "bg-[var(--text-secondary)]" : "bg-[var(--panel-border)]"
                }`}
              />
              <span className={active ? "" : "hidden sm:inline"}>{s.label}</span>
            </button>
            {i < steps.length - 1 && (
              <span className="mx-1 text-[var(--panel-border)]">─</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── 타입 선택 화면 ─────────────────────────────────────────────────────────
function TypeSelectScreen({ onSelect }: { onSelect: (t: PostType) => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-8">
      <h2 className="mb-2 text-2xl font-extrabold text-[var(--text-primary)]">
        어떤 포스팅을 작성할까요?
      </h2>
      <p className="mb-8 text-sm text-[var(--text-secondary)]">
        타입을 선택하면 단계별로 안내해 드립니다
      </p>
      <div className="grid w-full max-w-2xl grid-cols-2 gap-4 sm:grid-cols-3">
        {TYPE_CARDS.map(({ type, icon, label, desc }) => (
          <button
            key={type}
            onClick={() => onSelect(type)}
            className="group flex flex-col items-center rounded-2xl border-2 border-[var(--panel-border)] bg-white p-6 text-center transition-all hover:border-[var(--accent)] hover:shadow-md"
          >
            <span className="mb-3 text-4xl">{icon}</span>
            <span className="text-sm font-bold text-[var(--text-primary)] group-hover:text-[var(--accent)]">
              {label}
            </span>
            <span className="mt-1 text-xs leading-snug text-[var(--text-secondary)]">
              {desc}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── 생성 중 화면 ───────────────────────────────────────────────────────────
function GeneratingScreen({ msg }: { msg: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-[var(--panel-border)] border-t-[var(--accent)]" />
      <p className="text-sm font-semibold text-[var(--text-primary)]">
        {msg || "Claude 생성 중… (1~2분 소요)"}
      </p>
    </div>
  );
}

// ── 결과 화면 ──────────────────────────────────────────────────────────────
function ResultScreen({ draft, onReset }: { draft: PostDraft; onReset: () => void }) {
  const [tab, setTab] = useState<"preview" | "code">("preview");
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* 상단 바 */}
      <div className="flex shrink-0 items-center justify-between border-b border-[var(--panel-border)] bg-white px-6 py-3">
        <span className="text-sm font-semibold text-emerald-600">✓ 생성 완료!</span>
        <div className="flex gap-2">
          <TabBtn active={tab === "preview"} onClick={() => setTab("preview")}>👁️ 미리보기</TabBtn>
          <TabBtn active={tab === "code"}    onClick={() => setTab("code")}>📋 HTML 코드</TabBtn>
        </div>
        <button
          onClick={onReset}
          className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          ← 새 포스팅
        </button>
      </div>

      {/* SEO 제목 */}
      {(draft.seoTitles ?? []).length > 0 && (
        <div className="shrink-0 border-b border-[var(--panel-border)] bg-[var(--page-bg)] px-6 py-3">
          <p className="mb-1.5 text-xs font-semibold text-[var(--text-secondary)]">
            📌 네이버 SEO 제목 추천
          </p>
          <div className="flex flex-wrap gap-2">
            {draft.seoTitles.map((t, i) => (
              <button
                key={i}
                onClick={() => navigator.clipboard.writeText(t)}
                className="rounded-lg border border-[var(--panel-border)] bg-white px-3 py-1 text-xs hover:border-[var(--accent)] hover:text-[var(--accent)]"
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 콘텐츠 */}
      <div className="flex flex-1 overflow-hidden">
        {tab === "preview" ? (
          <iframe
            srcDoc={buildPreviewDoc(draft.generatedHtml)}
            className="h-full w-full border-0"
            sandbox="allow-same-origin"
            title="미리보기"
          />
        ) : (
          <div className="flex flex-1 flex-col overflow-hidden p-6">
            <div className="mb-3 flex justify-end">
              <button
                onClick={() => navigator.clipboard.writeText(draft.generatedHtml)}
                className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
              >
                전체 복사
              </button>
            </div>
            <pre className="flex-1 overflow-auto rounded-xl border border-[var(--panel-border)] bg-gray-50 p-4 text-xs leading-relaxed text-gray-700">
              {draft.generatedHtml}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
        active
          ? "bg-[var(--accent)] text-white"
          : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
      }`}
    >
      {children}
    </button>
  );
}

// ── 스텝 콘텐츠 라우터 ────────────────────────────────────────────────────
function StepContent({
  stepId, draft, onChange, onNext, onGenerate, isFinal, busy,
}: {
  stepId: string;
  draft: PostDraft;
  onChange: (p: Partial<PostDraft>) => void;
  onNext: () => void;
  onGenerate: () => void;
  isFinal: boolean;
  busy: boolean;
}) {
  if (isFinal) return <FinalStep draft={draft} onChange={onChange} onGenerate={onGenerate} busy={busy} />;

  switch (stepId) {
    case "movie":    return <MovieStep        draft={draft} onChange={onChange} onNext={onNext} />;
    case "theme":    return <ThemeStep        draft={draft} onChange={onChange} onNext={onNext} />;
    case "items":    return <ItemsStep        draft={draft} onChange={onChange} onNext={onNext} />;
    case "comment":  return <CommentStep      draft={draft} onChange={onChange} onNext={onNext} />;
    case "expect":   return <ExpectStep       draft={draft} onChange={onChange} onNext={onNext} />;
    case "body":     return <BodyStep         draft={draft} onChange={onChange} onNext={onNext} />;
    case "upload":   return <UploadStep       draft={draft} onChange={onChange} onNext={onNext} />;
    case "category": return <PhotoCategoryStep draft={draft} onChange={onChange} onNext={onNext} />;
    default:         return null;
  }
}

// ── 공통 스텝 레이아웃 ─────────────────────────────────────────────────────
function StepLayout({
  title, subtitle, children, onNext, nextLabel = "다음 →", nextDisabled,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onNext?: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
}) {
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col overflow-hidden px-6 py-8">
        <h3 className="mb-1 text-xl font-extrabold text-[var(--text-primary)]">{title}</h3>
        {subtitle && <p className="mb-6 text-sm text-[var(--text-secondary)]">{subtitle}</p>}
        <div className="flex-1 overflow-y-auto">{children}</div>
        {onNext && (
          <div className="mt-6 flex justify-end">
            <button
              onClick={onNext}
              disabled={nextDisabled}
              className="rounded-xl bg-[var(--accent)] px-6 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40"
            >
              {nextLabel}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── 영화 검색 스텝 ────────────────────────────────────────────────────────
function MovieStep({ draft, onChange, onNext }: { draft: PostDraft; onChange: (p: Partial<PostDraft>) => void; onNext: () => void }) {
  const isPreview = draft.postType === "preview";

  async function handleSelect(m: { id: number; title: string; posterUrl: string | null }) {
    onChange({ movieTitle: m.title, posterUrl: m.posterUrl, title: `${m.title} ${isPreview ? "프리뷰" : "리뷰"}` });
    const d = await fetchDetails(m.id, "movie");
    if (d) onChange({ details: d as MovieDetails, posterUrl: (d as MovieDetails).posterUrl ?? m.posterUrl });
    setTimeout(onNext, 400);
  }

  return (
    <StepLayout title="어떤 영화인가요?" subtitle="제목을 검색하면 자동으로 정보를 불러옵니다">
      <MovieSearch onSelect={handleSelect} />
      {draft.movieTitle && (
        <div className="mt-6 flex items-center gap-4 rounded-2xl border border-[var(--panel-border)] bg-white p-4">
          {draft.posterUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={draft.posterUrl} alt="" className="h-24 w-16 rounded-lg object-cover" />
          )}
          <div>
            <p className="font-bold text-[var(--text-primary)]">{draft.movieTitle}</p>
            {draft.details?.director && (
              <p className="mt-0.5 text-xs text-[var(--text-secondary)]">감독: {draft.details.director}</p>
            )}
            <p className="mt-2 text-xs text-[var(--accent)]">✓ 선택됨 — 다음 단계로 넘어갑니다…</p>
          </div>
        </div>
      )}
    </StepLayout>
  );
}

// ── 테마 스텝 (큐레이션·정주행) ───────────────────────────────────────────
function ThemeStep({ draft, onChange, onNext }: { draft: PostDraft; onChange: (p: Partial<PostDraft>) => void; onNext: () => void }) {
  const label  = draft.postType === "binge" ? "정주행" : "큐레이션";
  const example = draft.postType === "binge"
    ? "예: 방학에 정주행하기 좋은 일본 애니메이션"
    : "예: 스티븐 스필버그의 필모그래피";

  return (
    <StepLayout
      title={`${label} 포스팅의 메인 테마`}
      subtitle="이번 포스팅에서 다룰 주제나 컨셉을 한 줄로 적어주세요"
      onNext={onNext}
      nextDisabled={!draft.theme.trim()}
    >
      <input
        value={draft.theme}
        onChange={(e) => onChange({ theme: e.target.value })}
        onKeyDown={(e) => { if (e.key === "Enter" && draft.theme.trim()) onNext(); }}
        placeholder={example}
        className="w-full rounded-xl border border-[var(--panel-border)] bg-white px-4 py-3 text-base outline-none focus:border-[var(--accent)]"
        autoFocus
      />
    </StepLayout>
  );
}

// ── 작품 추가 스텝 (큐레이션·정주행) ─────────────────────────────────────
function ItemsStep({ draft, onChange, onNext }: { draft: PostDraft; onChange: (p: Partial<PostDraft>) => void; onNext: () => void }) {
  const isBinge  = draft.postType === "binge";
  const itemType = isBinge ? ("tv" as const) : ("movie" as const);

  async function handleSelect(m: { id: number; title: string; posterUrl: string | null }) {
    const d = await fetchDetails(m.id, itemType);
    let item: CurationItem;
    if (isBinge && d) {
      const tv = d as TvDetails;
      item = {
        title: tv.title,
        originalTitle: tv.originalTitle,
        posterUrl: tv.posterUrl ?? m.posterUrl,
        tmdbId: m.id,
        country: tv.country,
        cast: tv.cast,
        genres: tv.genres,
        overview: tv.overview,
        numberOfEpisodes: tv.numberOfEpisodes,
        numberOfSeasons: tv.numberOfSeasons,
        episodeRuntime: tv.episodeRuntime,
        totalWatchTime: tv.totalWatchTime,
        reason: "",
      };
    } else {
      const mv = d as MovieDetails | null;
      item = {
        title: mv?.title ?? m.title,
        originalTitle: mv?.originalTitle,
        posterUrl: mv?.posterUrl ?? m.posterUrl,
        tmdbId: m.id,
        country: mv?.country,
        releaseDate: mv?.releaseDate,
        director: mv?.director,
        actors: mv?.actors,
        genres: mv?.genres,
        overview: mv?.overview,
        reason: "",
      };
    }
    onChange({ items: [...draft.items, item] });
  }

  function updateReason(idx: number, reason: string) {
    const next = [...draft.items];
    next[idx] = { ...next[idx], reason };
    onChange({ items: next });
  }

  function removeItem(idx: number) {
    onChange({ items: draft.items.filter((_, i) => i !== idx) });
  }

  return (
    <StepLayout
      title={isBinge ? "정주행 작품을 추가하세요" : "추천 영화를 추가하세요"}
      subtitle="검색해서 추가하고, 각 작품마다 추천 이유를 적어주세요"
      onNext={onNext}
      nextDisabled={draft.items.length === 0}
      nextLabel={`다음 → (${draft.items.length}편)`}
    >
      {/* 추가된 작품 카드 */}
      <div className="mb-6 space-y-3">
        {draft.items.map((item, i) => (
          <div key={i} className="rounded-2xl border border-[var(--panel-border)] bg-white p-4">
            <div className="mb-3 flex items-start gap-3">
              {item.posterUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.posterUrl} alt="" className="h-16 w-11 shrink-0 rounded-lg object-cover" />
              )}
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-[var(--text-primary)]">{item.title}</p>
                {isBinge && item.numberOfEpisodes && (
                  <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
                    전 {item.numberOfEpisodes}화 ({item.numberOfSeasons}시즌) · 약 {item.totalWatchTime}
                  </p>
                )}
                {!isBinge && item.releaseDate && (
                  <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
                    {item.releaseDate} · {item.director}
                  </p>
                )}
              </div>
              <button
                onClick={() => removeItem(i)}
                className="shrink-0 text-[var(--text-secondary)] hover:text-red-500"
              >
                ×
              </button>
            </div>
            <textarea
              value={item.reason}
              onChange={(e) => updateReason(i, e.target.value)}
              rows={2}
              placeholder={isBinge ? "이 시리즈를 정주행 추천하는 이유…" : "이 영화를 추천하는 이유…"}
              className="w-full resize-none rounded-lg border border-[var(--panel-border)] bg-[var(--page-bg)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
            />
          </div>
        ))}
      </div>

      {/* 작품 검색 */}
      <div className="rounded-2xl border border-dashed border-[var(--panel-border)] p-4">
        <p className="mb-2 text-xs font-semibold text-[var(--text-secondary)]">
          ＋ {isBinge ? "시리즈/애니 검색" : "영화 검색"}
        </p>
        <MovieSearch type={itemType} onSelect={handleSelect} />
      </div>
    </StepLayout>
  );
}

// ── 감상평 스텝 (리뷰) ────────────────────────────────────────────────────
function CommentStep({ draft, onChange, onNext }: { draft: PostDraft; onChange: (p: Partial<PostDraft>) => void; onNext: () => void }) {
  const len = draft.comment.length;
  return (
    <StepLayout
      title="나의 솔직한 감상평"
      subtitle="직접 경험한 느낌을 자유롭게 적어주세요. 많이 적을수록 리뷰 품질이 올라갑니다."
      onNext={onNext}
      nextDisabled={len < 30}
    >
      {/* 평점 */}
      <div className="mb-4 flex items-center gap-2">
        <span className="text-xs font-semibold text-[var(--text-secondary)]">평점</span>
        {[1,2,3,4,5].map((n) => (
          <button
            key={n}
            onClick={() => onChange({ rating: n })}
            className={`text-2xl leading-none transition-colors ${n <= draft.rating ? "text-[var(--accent)]" : "text-gray-300"}`}
          >
            ★
          </button>
        ))}
      </div>
      {/* 관람 계기 */}
      <div className="mb-3">
        <label className="mb-1 block text-xs font-semibold text-[var(--text-secondary)]">관람 계기 (선택)</label>
        <input
          value={draft.watchReason}
          onChange={(e) => onChange({ watchReason: e.target.value })}
          placeholder="이 영화를 보게 된 계기"
          className="w-full rounded-xl border border-[var(--panel-border)] bg-white px-4 py-2 text-sm outline-none focus:border-[var(--accent)]"
        />
      </div>
      {/* 감상평 */}
      <textarea
        value={draft.comment}
        onChange={(e) => onChange({ comment: e.target.value })}
        rows={10}
        placeholder={`영화를 보고 느낀 솔직한 감상을 자유롭게 적어주세요.\n\n예시)\n- 기대와 달랐던 점 / 예상보다 좋았던 점\n- 인상적인 장면, 대사, 연출\n- 배우 연기에 대한 생각`}
        className="w-full resize-none rounded-xl border border-[var(--panel-border)] bg-white p-4 text-sm leading-relaxed outline-none focus:border-[var(--accent)]"
      />
      <p className="mt-1 text-right text-xs text-[var(--text-secondary)]">
        {len.toLocaleString()}자
        {len < 200 && len > 0 && (
          <span className="ml-2 text-amber-500">— 더 자세히 적을수록 리뷰 품질이 올라갑니다</span>
        )}
      </p>
    </StepLayout>
  );
}

// ── 기대 포인트 스텝 (프리뷰) ─────────────────────────────────────────────
function ExpectStep({ draft, onChange, onNext }: { draft: PostDraft; onChange: (p: Partial<PostDraft>) => void; onNext: () => void }) {
  return (
    <StepLayout
      title="기대 포인트"
      subtitle="이 영화에서 가장 기대되는 부분이나 포스팅 계기를 적어주세요"
      onNext={onNext}
      nextDisabled={!draft.expectPoints.trim() && !draft.watchReason.trim()}
    >
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-semibold text-[var(--text-secondary)]">기대 포인트 / 강조할 내용</label>
          <textarea
            value={draft.expectPoints}
            onChange={(e) => onChange({ expectPoints: e.target.value })}
            rows={4}
            placeholder="예: 감독의 전작 팬이라 기대. 첫 한국 배우 출연이라는 점이 관심 포인트"
            className="w-full resize-none rounded-xl border border-[var(--panel-border)] bg-white p-4 text-sm outline-none focus:border-[var(--accent)]"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-[var(--text-secondary)]">포스팅 계기 (선택)</label>
          <input
            value={draft.watchReason}
            onChange={(e) => onChange({ watchReason: e.target.value })}
            placeholder="이 영화를 포스팅하게 된 이유"
            className="w-full rounded-xl border border-[var(--panel-border)] bg-white px-4 py-2 text-sm outline-none focus:border-[var(--accent)]"
          />
        </div>
      </div>
    </StepLayout>
  );
}

// ── 내용/지시 스텝 (사진·PDF·로컬) ──────────────────────────────────────
function BodyStep({ draft, onChange, onNext }: { draft: PostDraft; onChange: (p: Partial<PostDraft>) => void; onNext: () => void }) {
  const isPhoto = draft.postType === "photo";
  const isLocal = draft.postType === "local";
  return (
    <StepLayout
      title={isPhoto ? "장소 및 내용 지시" : "생성 지시"}
      subtitle="Claude에게 어떻게 작성할지 알려주세요"
      onNext={onNext}
    >
      {isPhoto && (
        <div className="mb-4">
          <label className="mb-1 block text-xs font-semibold text-[var(--text-secondary)]">
            {draft.photoCategory === "일상기록" ? "오늘 있었던 곳 (선택)" :
             draft.photoCategory === "여행나들이" ? "방문 장소 (선택)" :
             draft.photoCategory === "전시문화" ? "전시 장소 (선택)" :
             "장소명 (선택)"}
          </label>
          <input
            value={draft.placeName}
            onChange={(e) => onChange({ placeName: e.target.value })}
            placeholder={
              draft.photoCategory === "일상기록"
                ? "특정 장소 없으면 비워두세요"
                : "촬영/방문 장소"
            }
            className="w-full rounded-xl border border-[var(--panel-border)] bg-white px-4 py-2 text-sm outline-none focus:border-[var(--accent)]"
          />
        </div>
      )}
      {isLocal && (
        <div className="mb-4 flex items-center gap-4">
          <label className="text-xs font-semibold text-[var(--text-secondary)]">섹션 헤더 색상</label>
          <input
            type="color"
            value={draft.brandColor || "#1a2e4a"}
            onChange={(e) => onChange({ brandColor: e.target.value })}
            className="h-8 w-14 cursor-pointer rounded border border-[var(--panel-border)]"
          />
          <span className="text-xs text-[var(--text-secondary)]">{draft.brandColor || "#1a2e4a"}</span>
          <button
            onClick={() => onChange({ brandColor: "#b2e46c" })}
            className="rounded-lg border border-[var(--panel-border)] px-2 py-1 text-xs hover:border-[var(--accent)]"
            style={{ backgroundColor: "#b2e46c" }}
          >
            DIMF 연두
          </button>
          <button
            onClick={() => onChange({ brandColor: "#1a2e4a" })}
            className="rounded-lg border border-[var(--panel-border)] px-2 py-1 text-xs text-white hover:border-[var(--accent)]"
            style={{ backgroundColor: "#1a2e4a" }}
          >
            기본 네이비
          </button>
        </div>
      )}
      <label className="mb-1 block text-xs font-semibold text-[var(--text-secondary)]">
        {isPhoto ? "포스팅 내용 지시" : "생성 지시 / 중점 내용"}
      </label>
      <textarea
        value={draft.body}
        onChange={(e) => onChange({ body: e.target.value })}
        rows={8}
        placeholder="Claude에게 포스팅 방향이나 강조할 내용을 알려주세요"
        className="w-full resize-none rounded-xl border border-[var(--panel-border)] bg-white p-4 text-sm leading-relaxed outline-none focus:border-[var(--accent)]"
      />
    </StepLayout>
  );
}

// ── 사진 카테고리 선택 스텝 ────────────────────────────────────────────────
const PHOTO_CATEGORIES = [
  { value: "맛집카페",  icon: "🍽️", label: "맛집·카페",  desc: "방문 후기, 메뉴 소개" },
  { value: "일상기록",  icon: "📖", label: "일상·기록",  desc: "오늘 하루, 에피소드" },
  { value: "여행나들이", icon: "🗺️", label: "여행·나들이", desc: "코스, 팁 포함" },
  { value: "전시문화",  icon: "🎨", label: "전시·문화",  desc: "전시·행사 현장 후기" },
];

function PhotoCategoryStep({ draft, onChange, onNext }: { draft: PostDraft; onChange: (p: Partial<PostDraft>) => void; onNext: () => void }) {
  function select(value: string) {
    onChange({ photoCategory: value });
    setTimeout(onNext, 300);
  }
  return (
    <StepLayout title="어떤 포스팅인가요?" subtitle="카테고리를 선택하면 그에 맞는 구조로 작성됩니다">
      <div className="grid grid-cols-2 gap-3">
        {PHOTO_CATEGORIES.map(({ value, icon, label, desc }) => (
          <button
            key={value}
            onClick={() => select(value)}
            className={`flex flex-col items-center rounded-2xl border-2 p-5 text-center transition-all hover:border-[var(--accent)] hover:shadow-md ${
              draft.photoCategory === value
                ? "border-[var(--accent)] bg-[var(--accent)]/5"
                : "border-[var(--panel-border)] bg-white"
            }`}
          >
            <span className="mb-2 text-3xl">{icon}</span>
            <span className="text-sm font-bold text-[var(--text-primary)]">{label}</span>
            <span className="mt-1 text-xs text-[var(--text-secondary)]">{desc}</span>
          </button>
        ))}
      </div>
    </StepLayout>
  );
}

// ── 업로드 스텝 (사진·PDF·로컬) ───────────────────────────────────────────
function UploadStep({ draft, onChange, onNext }: { draft: PostDraft; onChange: (p: Partial<PostDraft>) => void; onNext: () => void }) {
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const isPhoto = draft.postType === "photo";

  async function handlePdfs(files: File[]) {
    setPdfBusy(true);
    setPdfError(null);
    try {
      const texts: string[] = [];
      const names: string[] = [];
      for (const f of files) {
        const fd = new FormData();
        fd.append("file", f);
        const res = await fetch("/api/extract-pdf", { method: "POST", body: fd });
        const data = await res.json();
        if (res.ok) {
          texts.push(data.text ?? "");
          names.push(data.name ?? f.name);
        } else {
          setPdfError(`${f.name}: ${data.error ?? "추출 실패"}`);
        }
      }
      if (names.length > 0) {
        onChange({
          pdfNames: [...draft.pdfNames, ...names],
          pdfText: [draft.pdfText, ...texts].filter(Boolean).join("\n\n"),
        });
      }
    } catch (e) {
      setPdfError((e as Error).message ?? "업로드 중 오류 발생");
    } finally {
      setPdfBusy(false);
    }
  }

  const canNext = isPhoto ? draft.imageNames.length > 0 : draft.pdfNames.length > 0;

  return (
    <StepLayout
      title={isPhoto ? "사진을 업로드하세요" : "PDF를 업로드하세요"}
      subtitle={isPhoto ? "포스팅에 사용할 사진을 선택해주세요" : "텍스트가 추출됩니다 (비밀번호 없는 PDF만)"}
      onNext={onNext}
      nextDisabled={!canNext}
    >
      {isPhoto ? (
        <>
          <FileUpload
            accept="image/png,image/jpeg,image/webp"
            label="이미지 드래그 또는 클릭"
            onFiles={(files) => {
              const newNames = files.map((f) => f.name);
              const newCaptions = files.map(() => "");
              const newUrls = files.map((f) => URL.createObjectURL(f));
              onChange({
                imageNames: [...draft.imageNames, ...newNames],
                imageCaptions: [...(draft.imageCaptions ?? []), ...newCaptions],
                imagePreviewUrls: [...(draft.imagePreviewUrls ?? []), ...newUrls],
              });
            }}
          />
          {draft.imageNames.length > 0 && (
            <ul className="mt-3 space-y-2">
              {draft.imageNames.map((n, i) => (
                <li key={i} className="rounded-xl border border-[var(--panel-border)] bg-white p-3">
                  <div className="flex items-start gap-3">
                    {draft.imagePreviewUrls?.[i] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={draft.imagePreviewUrls[i]}
                        alt={n}
                        className="h-16 w-16 shrink-0 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-[var(--page-bg)] text-xl">🖼</div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="mb-1.5 flex items-center justify-between">
                        <span className="truncate text-xs font-semibold text-[var(--text-secondary)]">{i + 1}. {n}</span>
                        <button
                          onClick={() => {
                            const removedUrl = draft.imagePreviewUrls?.[i];
                            if (removedUrl) URL.revokeObjectURL(removedUrl);
                            onChange({
                              imageNames: draft.imageNames.filter((_, j) => j !== i),
                              imageCaptions: (draft.imageCaptions ?? []).filter((_, j) => j !== i),
                              imagePreviewUrls: (draft.imagePreviewUrls ?? []).filter((_, j) => j !== i),
                            });
                          }}
                          className="ml-2 shrink-0 text-[var(--text-secondary)] hover:text-red-500"
                        >×</button>
                      </div>
                      <input
                        value={draft.imageCaptions?.[i] ?? ""}
                        onChange={(e) => {
                          const next = [...(draft.imageCaptions ?? [])];
                          next[i] = e.target.value;
                          onChange({ imageCaptions: next });
                        }}
                        placeholder="이 사진 설명 (예: 입구 외관, 간판이 나무 소재)"
                        className="w-full rounded-lg border border-[var(--panel-border)] bg-[var(--page-bg)] px-3 py-1.5 text-xs outline-none focus:border-[var(--accent)]"
                      />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <>
          <FileUpload
            accept="application/pdf"
            label="PDF 드래그 또는 클릭 (텍스트 추출)"
            busy={pdfBusy}
            onFiles={handlePdfs}
          />
          {pdfError && (
            <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{pdfError}</p>
          )}
          {draft.pdfNames.length > 0 && (
            <ul className="mt-3 space-y-1">
              {draft.pdfNames.map((n, i) => (
                <li key={i} className="truncate rounded-lg bg-[var(--page-bg)] px-3 py-1.5 text-sm">📄 {n}</li>
              ))}
            </ul>
          )}
          {draft.pdfText && (
            <p className="mt-2 text-xs text-[var(--text-secondary)]">추출 {draft.pdfText.length.toLocaleString()}자</p>
          )}
        </>
      )}
    </StepLayout>
  );
}

// ── 최종 스텝 (제목 확인 + 생성) ─────────────────────────────────────────
function FinalStep({
  draft, onChange, onGenerate, busy,
}: {
  draft: PostDraft;
  onChange: (p: Partial<PostDraft>) => void;
  onGenerate: () => void;
  busy: boolean;
}) {
  useEffect(() => {
    if (draft.postType === "local" && !draft.title) {
      onChange({ title: "로컬소식 · 공고" });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const needsShortTitle = ["pdf", "local", "photo"].includes(draft.postType);

  return (
    <StepLayout title="마지막으로 제목을 확인하고 생성하세요">
      {needsShortTitle && (
        <div className="mb-4">
          <label className="mb-1.5 block text-xs font-semibold text-[var(--text-secondary)]">
            헤더 제목 <span className="text-[var(--accent)]">짧게</span> (2~5단어)
          </label>
          <input
            value={draft.shortTitle}
            onChange={(e) => onChange({ shortTitle: e.target.value })}
            placeholder="예: 메가박스 현황 정리 / 을지로 카페 후기"
            className="w-full rounded-xl border border-[var(--panel-border)] bg-white px-4 py-3 text-base font-semibold outline-none focus:border-[var(--accent)]"
            autoFocus
          />
          <p className="mt-1 text-xs text-[var(--text-secondary)]">포스팅 상단 MK LINK DAILY 아래 표시되는 제목</p>
        </div>
      )}
      <div className="mb-6">
        <label className="mb-1.5 block text-xs font-semibold text-[var(--text-secondary)]">
          블로그 포스팅 제목 (네이버 SEO)
        </label>
        <input
          value={draft.title}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder="자동 입력된 제목을 수정하거나 직접 입력하세요"
          className="w-full rounded-xl border border-[var(--panel-border)] bg-white px-4 py-3 text-base outline-none focus:border-[var(--accent)]"
        />
      </div>

      {/* 요약 카드 */}
      <div className="mb-6 rounded-2xl border border-[var(--panel-border)] bg-[var(--page-bg)] p-4 text-sm text-[var(--text-secondary)]">
        <p className="mb-1 font-semibold text-[var(--text-primary)]">포스팅 요약</p>
        {draft.movieTitle && <p>영화: {draft.movieTitle}</p>}
        {draft.theme && <p>테마: {draft.theme}</p>}
        {draft.items.length > 0 && <p>작품 수: {draft.items.length}편</p>}
        {draft.rating > 0 && <p>평점: {"★".repeat(draft.rating)}{"☆".repeat(5 - draft.rating)}</p>}
        {draft.pdfNames.length > 0 && <p>PDF: {draft.pdfNames.join(", ")}</p>}
        {draft.imageNames.length > 0 && <p>사진: {draft.imageNames.length}장</p>}
      </div>

      <button
        onClick={onGenerate}
        disabled={busy}
        className="w-full rounded-xl bg-[var(--accent)] py-3.5 text-base font-bold text-white hover:opacity-90 disabled:opacity-50"
      >
        {busy ? "생성 중…" : "✦ 발행하기"}
      </button>
    </StepLayout>
  );
}

// ── TMDB API 헬퍼 ─────────────────────────────────────────────────────────
async function fetchDetails(id: number, type: "movie" | "tv"): Promise<MovieDetails | TvDetails | null> {
  try {
    const res = await fetch(`/api/tmdb/details?id=${id}&type=${type}`);
    const data = await res.json();
    return data.details ?? null;
  } catch {
    return null;
  }
}
