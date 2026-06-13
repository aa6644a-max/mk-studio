"use client";

import { useState } from "react";
import type { PostDraft, PostType } from "@/lib/types";
import { POST_TYPE_META } from "@/lib/types";
import MovieSearch from "./movie-search";
import FileUpload from "./file-upload";

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
      {draft.postType === "review" && (
        <ReviewFields draft={draft} onChange={onChange} />
      )}
      {draft.postType === "preview" && (
        <PreviewFields draft={draft} onChange={onChange} />
      )}
      {draft.postType === "curation" && (
        <ItemListField
          label="추천 영화 목록"
          placeholder="영화 제목 입력 후 Enter"
          items={draft.items}
          onChange={(items) => onChange({ items })}
        />
      )}
      {draft.postType === "binge" && (
        <>
          <Field label="시리즈명">
            <input
              value={draft.movieTitle}
              onChange={(e) =>
                onChange({ movieTitle: e.target.value, title: draft.title || e.target.value })
              }
              placeholder="시리즈 제목"
              className="w-full rounded-lg border border-[var(--panel-border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
            />
          </Field>
          <ItemListField
            label="회차 구성"
            placeholder="예: 시즌1 1~8화"
            items={draft.items}
            onChange={(items) => onChange({ items })}
          />
        </>
      )}
      {draft.postType === "photo" && (
        <PhotoFields draft={draft} onChange={onChange} />
      )}
      {(draft.postType === "local" || draft.postType === "pdf") && (
        <PdfFields draft={draft} onChange={onChange} />
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

function PreviewFields({
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
              title: draft.title || `${m.title} 개봉 프리뷰`,
            })
          }
        />
        {draft.movieTitle && (
          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            선택: {draft.movieTitle}
          </p>
        )}
      </Field>
      <Field label="개봉일">
        <input
          type="date"
          value={draft.releaseDate}
          onChange={(e) => onChange({ releaseDate: e.target.value })}
          className="w-full rounded-lg border border-[var(--panel-border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
        />
      </Field>
      <Field label="기대 포인트">
        <textarea
          value={draft.expectPoints}
          onChange={(e) => onChange({ expectPoints: e.target.value })}
          rows={3}
          placeholder="이 영화의 기대 포인트"
          className="w-full resize-none rounded-lg border border-[var(--panel-border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
        />
      </Field>
    </>
  );
}

function ItemListField({
  label,
  placeholder,
  items,
  onChange,
}: {
  label: string;
  placeholder: string;
  items: string[];
  onChange: (items: string[]) => void;
}) {
  const [input, setInput] = useState("");
  const add = () => {
    const v = input.trim();
    if (!v) return;
    onChange([...items, v]);
    setInput("");
  };
  return (
    <Field label={label}>
      <div className="flex gap-1">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder={placeholder}
          className="min-w-0 flex-1 rounded-lg border border-[var(--panel-border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
        />
        <button
          type="button"
          onClick={add}
          className="shrink-0 rounded-lg bg-[var(--accent)] px-3 text-sm font-semibold text-white"
        >
          추가
        </button>
      </div>
      {items.length > 0 && (
        <ul className="mt-2 space-y-1">
          {items.map((it, i) => (
            <li
              key={i}
              className="flex items-center justify-between rounded-lg bg-page px-3 py-1.5 text-sm"
            >
              <span className="truncate">{it}</span>
              <button
                type="button"
                onClick={() => onChange(items.filter((_, j) => j !== i))}
                className="ml-2 shrink-0 text-[var(--text-secondary)] hover:text-red-500"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </Field>
  );
}

function PhotoFields({
  draft,
  onChange,
}: {
  draft: PostDraft;
  onChange: (patch: Partial<PostDraft>) => void;
}) {
  return (
    <>
      <Field label="장소명">
        <input
          value={draft.placeName}
          onChange={(e) => onChange({ placeName: e.target.value })}
          placeholder="촬영/방문 장소"
          className="w-full rounded-lg border border-[var(--panel-border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
        />
      </Field>
      <Field label={`사진 (${draft.imageNames.length}장)`}>
        <FileUpload
          accept="image/png,image/jpeg,image/webp"
          label="이미지 드래그 또는 클릭"
          onFiles={(files) =>
            onChange({
              imageNames: [...draft.imageNames, ...files.map((f) => f.name)],
            })
          }
        />
        {draft.imageNames.length > 0 && (
          <ul className="mt-2 space-y-1">
            {draft.imageNames.map((n, i) => (
              <li
                key={i}
                className="flex items-center justify-between rounded bg-page px-2 py-1 text-xs"
              >
                <span className="truncate">🖼 {n}</span>
                <button
                  type="button"
                  onClick={() =>
                    onChange({
                      imageNames: draft.imageNames.filter((_, j) => j !== i),
                    })
                  }
                  className="ml-2 text-[var(--text-secondary)] hover:text-red-500"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </Field>
    </>
  );
}

function PdfFields({
  draft,
  onChange,
}: {
  draft: PostDraft;
  onChange: (patch: Partial<PostDraft>) => void;
}) {
  const [busy, setBusy] = useState(false);
  const isLocal = draft.postType === "local";

  async function handlePdfs(files: File[]) {
    setBusy(true);
    try {
      const texts: string[] = [];
      const names: string[] = [];
      for (const f of files) {
        const fd = new FormData();
        fd.append("file", f);
        const res = await fetch("/api/extract-pdf", {
          method: "POST",
          body: fd,
        });
        const data = await res.json();
        if (res.ok) {
          texts.push(data.text ?? "");
          names.push(data.name ?? f.name);
        }
      }
      onChange({
        pdfNames: [...draft.pdfNames, ...names],
        pdfText: [draft.pdfText, ...texts].filter(Boolean).join("\n\n"),
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Field label={isLocal ? "소개 목적" : "카테고리"}>
        <input
          value={isLocal ? draft.purpose : draft.category}
          onChange={(e) =>
            onChange(
              isLocal
                ? { purpose: e.target.value }
                : { category: e.target.value },
            )
          }
          placeholder={isLocal ? "예: 주민 안내" : "예: 정책/행사"}
          className="w-full rounded-lg border border-[var(--panel-border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
        />
      </Field>
      <Field label={`PDF (${draft.pdfNames.length}개)`}>
        <FileUpload
          accept="application/pdf"
          label="PDF 드래그 또는 클릭 (텍스트 추출)"
          busy={busy}
          onFiles={handlePdfs}
        />
        {draft.pdfNames.length > 0 && (
          <ul className="mt-2 space-y-1">
            {draft.pdfNames.map((n, i) => (
              <li
                key={i}
                className="truncate rounded bg-page px-2 py-1 text-xs"
              >
                📄 {n}
              </li>
            ))}
          </ul>
        )}
        {draft.pdfText && (
          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            추출 {draft.pdfText.length.toLocaleString()}자
          </p>
        )}
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
