"use client";

import type { PostDraft } from "@/lib/types";

const TOOLBAR = ["B", "I", "U", "H1", "H2", "목록", "링크", "이미지"];

export default function Editor({
  draft,
  onChange,
  savedAt,
}: {
  draft: PostDraft;
  onChange: (patch: Partial<PostDraft>) => void;
  savedAt?: number | null;
}) {
  const charCount = draft.body.length;
  const savedLabel = savedAt
    ? `자동저장됨 ${new Date(savedAt).toLocaleTimeString("ko-KR", {
        hour: "2-digit",
        minute: "2-digit",
      })}`
    : "자동저장 대기";

  return (
    <section className="flex flex-1 flex-col overflow-hidden p-4">
      {/* 리뷰 제목 */}
      <input
        value={draft.title}
        onChange={(e) => onChange({ title: e.target.value })}
        placeholder="리뷰 제목"
        className="mb-3 w-full bg-transparent text-[26px] font-extrabold outline-none placeholder:text-gray-300"
      />

      {/* 툴바 (시각용 — 서식 적용은 추후) */}
      <div className="mb-2 flex flex-wrap gap-1 border-b border-[var(--panel-border)] pb-2">
        {TOOLBAR.map((t) => (
          <button
            key={t}
            type="button"
            className="rounded px-2 py-1 text-xs font-semibold text-[var(--text-secondary)] hover:bg-page"
          >
            {t}
          </button>
        ))}
      </div>

      {/* 본문 */}
      <textarea
        value={draft.body}
        onChange={(e) => onChange({ body: e.target.value })}
        placeholder="리뷰 본문 또는 생성 지시를 입력하세요. 발행하기를 누르면 Claude가 완성합니다."
        className="min-h-[400px] flex-1 resize-none rounded-lg border border-[var(--panel-border)] bg-white p-4 text-sm leading-relaxed outline-none focus:border-[var(--accent)]"
      />

      {/* 하단: 글자수 · 자동저장 */}
      <div className="mt-2 flex items-center justify-between text-xs text-[var(--text-secondary)]">
        <span>{charCount}자</span>
        <span>{savedLabel}</span>
      </div>

      {/* 생성 결과 */}
      {draft.generatedHtml && (
        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--text-secondary)]">
              생성 결과 (HTML)
            </span>
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(draft.generatedHtml)}
              className="rounded bg-[var(--accent)] px-2.5 py-1 text-xs font-semibold text-white"
            >
              HTML 복사
            </button>
          </div>
          <div
            className="panel max-h-80 overflow-y-auto p-4 text-sm leading-relaxed"
            dangerouslySetInnerHTML={{ __html: draft.generatedHtml }}
          />

          {draft.seoTitles.length > 0 && (
            <div className="mt-3">
              <span className="text-xs font-semibold text-[var(--text-secondary)]">
                네이버 SEO 제목 추천
              </span>
              <ul className="mt-1.5 space-y-1">
                {draft.seoTitles.map((t, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between rounded-lg bg-page px-3 py-1.5 text-sm"
                  >
                    <span className="min-w-0 truncate">{t}</span>
                    <button
                      type="button"
                      onClick={() => navigator.clipboard.writeText(t)}
                      className="ml-2 shrink-0 text-xs font-semibold text-[var(--accent)]"
                    >
                      복사
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
