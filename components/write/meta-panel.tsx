"use client";

import type { PostDraft, PostType } from "@/lib/types";
import { POST_TYPE_META } from "@/lib/types";
import MovieSearch from "./movie-search";

export default function MetaPanel({
  draft,
  onChange,
}: {
  draft: PostDraft;
  onChange: (patch: Partial<PostDraft>) => void;
}) {
  return (
    <aside className="w-full md:w-[264px] shrink-0 space-y-4 overflow-y-auto p-4">
      {/* 포스팅 타입 선택기 */}
      <Field label="포스팅 타입">
        <select
          value={draft.postType}
          onChange={(e) =>
            onChange({ postType: e.target.value as PostType })
          }
          className="w-full rounded-lg border border-[var(--panel-border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
        >
          {(Object.keys(POST_TYPE_META) as PostType[]).map((t) => (
            <option key={t} value={t}>
              {POST_TYPE_META[t].icon} {POST_TYPE_META[t].label}
            </option>
          ))}
        </select>
      </Field>

      {/* 포스터 */}
      <Field label="포스터">
        <div className="overflow-hidden rounded-lg border border-[var(--panel-border)] bg-page">
          {draft.posterUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={draft.posterUrl}
              alt="poster"
              className="aspect-[2/3] w-full object-cover"
            />
          ) : (
            <div className="flex aspect-[2/3] w-full items-center justify-center text-3xl text-[var(--text-secondary)]">
              🎬
            </div>
          )}
        </div>
        {draft.posterUrl && (
          <button
            type="button"
            onClick={() => onChange({ posterUrl: null })}
            className="mt-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--accent)]"
          >
            포스터 제거
          </button>
        )}
      </Field>

      {/* 타입별 고유 필드 */}
      {draft.postType === "review" ? (
        <ReviewFields draft={draft} onChange={onChange} />
      ) : (
        <div className="rounded-lg border border-dashed border-[var(--panel-border)] p-3 text-xs text-[var(--text-secondary)]">
          {POST_TYPE_META[draft.postType].label} 전용 필드는 곧 추가됩니다
          (issue #8/#9).
        </div>
      )}

      {/* 공통: 제목 */}
      <Field label="제목">
        <input
          value={draft.title}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder="포스팅 제목"
          className="w-full rounded-lg border border-[var(--panel-border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
        />
      </Field>

      {/* 공통: 장르 태그 */}
      <Field label="장르 태그">
        <input
          value={draft.genres.join(", ")}
          onChange={(e) =>
            onChange({
              genres: e.target.value
                .split(",")
                .map((g) => g.trim())
                .filter(Boolean),
            })
          }
          placeholder="드라마, SF (쉼표 구분)"
          className="w-full rounded-lg border border-[var(--panel-border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
        />
      </Field>

      {/* 공통: 상태 */}
      <Field label="상태">
        <div className="flex gap-2">
          {(["draft", "published"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onChange({ status: s })}
              className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold ${
                draft.status === s
                  ? "bg-[var(--accent)] text-white"
                  : "border border-[var(--panel-border)] bg-white text-[var(--text-secondary)]"
              }`}
            >
              {s === "draft" ? "임시저장" : "발행됨"}
            </button>
          ))}
        </div>
      </Field>
    </aside>
  );
}

function ReviewFields({
  draft,
  onChange,
}: {
  draft: PostDraft;
  onChange: (patch: Partial<PostDraft>) => void;
}) {
  return (
    <>
      <Field label="영화 검색 (TMDB)">
        <MovieSearch
          onSelect={(m) =>
            onChange({
              movieTitle: m.title,
              posterUrl: m.posterUrl,
              title: draft.title || `${m.title} 리뷰`,
            })
          }
        />
        {draft.movieTitle && (
          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            선택: {draft.movieTitle}
          </p>
        )}
      </Field>

      <Field label="평점">
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => onChange({ rating: n })}
              className={`text-2xl leading-none ${
                n <= draft.rating ? "text-[var(--accent)]" : "text-gray-300"
              }`}
              aria-label={`${n}점`}
            >
              ★
            </button>
          ))}
        </div>
      </Field>

      <Field label="관람 계기">
        <textarea
          value={draft.watchReason}
          onChange={(e) => onChange({ watchReason: e.target.value })}
          rows={2}
          placeholder="이 영화를 보게 된 계기"
          className="w-full resize-none rounded-lg border border-[var(--panel-border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
        />
      </Field>
    </>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-[var(--text-secondary)]">
        {label}
      </label>
      {children}
    </div>
  );
}
