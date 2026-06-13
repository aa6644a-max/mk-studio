"use client";

import { useEffect, useMemo, useState } from "react";
import type { Post, PostStatus } from "@/lib/types";
import { POST_TYPE_META } from "@/lib/types";
import { posterColor } from "@/lib/colors";

type Filter = "all" | PostStatus;

const TABS: { key: Filter; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "published", label: "발행됨" },
  { key: "draft", label: "임시저장" },
];

export default function HistoryList({ query }: { query: string }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/posts")
      .then((r) => r.json())
      .then((d) => setPosts(d.posts ?? []))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let list = posts;
    if (filter !== "all") list = list.filter((p) => p.status === filter);
    const q = query.trim().toLowerCase();
    if (q) list = list.filter((p) => p.movieTitle.toLowerCase().includes(q));
    return list;
  }, [posts, filter, query]);

  return (
    <div className="space-y-4">
      {/* 필터 탭 */}
      <div className="flex gap-1">
        {TABS.map((t) => {
          const count =
            t.key === "all"
              ? posts.length
              : posts.filter((p) => p.status === t.key).length;
          return (
            <button
              key={t.key}
              onClick={() => setFilter(t.key)}
              className={`rounded-lg px-3.5 py-1.5 text-sm font-semibold transition-colors ${
                filter === t.key
                  ? "bg-[var(--accent)] text-white"
                  : "bg-panel text-[var(--text-secondary)] hover:bg-page"
              }`}
            >
              {t.label}{" "}
              <span className="opacity-70">{count}</span>
            </button>
          );
        })}
      </div>

      {/* 리스트 */}
      {loading ? (
        <div className="panel p-8 text-sm text-[var(--text-secondary)]">
          불러오는 중…
        </div>
      ) : filtered.length === 0 ? (
        <div className="panel p-8 text-sm text-[var(--text-secondary)]">
          {query ? `"${query}" 검색 결과 없음` : "포스팅이 없습니다."}
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((p) => (
            <li key={p.timestamp} className="panel flex items-center gap-4 p-3">
              <div
                className="flex h-14 w-10 shrink-0 items-center justify-center rounded text-lg text-white/90"
                style={{ background: posterColor(p.movieTitle) }}
              >
                {POST_TYPE_META[p.postType].icon}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-bold text-[var(--text-primary)]">
                  {p.movieTitle}
                </div>
                <div className="mt-0.5 text-xs text-[var(--text-secondary)]">
                  {POST_TYPE_META[p.postType].label} · {p.timestamp.slice(0, 10)}
                </div>
              </div>
              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                  p.status === "published"
                    ? "bg-[var(--accent)]/10 text-[var(--accent)]"
                    : "bg-page text-[var(--text-secondary)]"
                }`}
              >
                {p.status === "published" ? "발행됨" : "임시저장"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
