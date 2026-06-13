"use client";

import { useEffect, useRef, useState } from "react";
import type { MovieResult } from "@/lib/tmdb";

export default function MovieSearch({
  onSelect,
  type = "movie",
}: {
  onSelect: (m: MovieResult) => void;
  type?: "movie" | "tv";
}) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<MovieResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  // 디바운스 검색
  useEffect(() => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/tmdb?q=${encodeURIComponent(q)}&type=${type}`,
        );
        const data = await res.json();
        setResults(data.results ?? []);
        setOpen(true);
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [q]);

  // 외부 클릭 닫기
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div ref={boxRef} className="relative">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => results.length && setOpen(true)}
        placeholder="영화 제목 검색…"
        className="w-full rounded-lg border border-[var(--panel-border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
      />
      {loading && (
        <span className="absolute right-3 top-2.5 text-xs text-[var(--text-secondary)]">
          검색중…
        </span>
      )}
      {open && results.length > 0 && (
        <ul className="absolute z-30 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border border-[var(--panel-border)] bg-white shadow-lg">
          {results.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                onClick={() => {
                  onSelect(m);
                  setQ(m.title);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-page"
              >
                {m.posterUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={m.posterUrl}
                    alt={m.title}
                    className="h-12 w-8 shrink-0 rounded object-cover"
                  />
                ) : (
                  <span className="flex h-12 w-8 shrink-0 items-center justify-center rounded bg-page text-xs">
                    🎬
                  </span>
                )}
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">
                    {m.title}
                  </span>
                  <span className="block truncate text-xs text-[var(--text-secondary)]">
                    {m.year} · ★ {m.voteAverage.toFixed(1)}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
