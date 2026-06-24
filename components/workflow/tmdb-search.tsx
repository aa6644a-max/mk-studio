"use client";

import { useEffect, useRef, useState } from "react";
import { useWorkflowStore, type TmdbSelection } from "@/lib/workflow-store";
import type { MovieResult } from "@/lib/tmdb";

const SINGLE_TYPES = ["review", "binge"];
const TV_TYPES = ["binge"];

export default function TmdbSearchView() {
  const { postType, topic, setStage, setTmdbSelections, setStrategy, setError } =
    useWorkflowStore();

  const isMulti = !SINGLE_TYPES.includes(postType);
  const isTv = TV_TYPES.includes(postType);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MovieResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<TmdbSelection[]>([]);
  const [starting, setStarting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function doSearch(q: string) {
    if (!q.trim()) return;
    setSearching(true);
    try {
      const res = await fetch("/api/workflow/tmdb-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q.trim(), mediaType: isTv ? "tv" : "movie" }),
      });
      const data = await res.json();
      setResults(Array.isArray(data) ? data : []);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }

  function toggleSelect(item: MovieResult) {
    const sel: TmdbSelection = {
      id: item.id,
      title: item.title,
      year: item.year,
      posterUrl: item.posterUrl,
      mediaType: isTv ? "tv" : "movie",
    };

    if (!isMulti) {
      setSelected([sel]);
      return;
    }

    const exists = selected.find((s) => s.id === item.id);
    if (exists) {
      setSelected(selected.filter((s) => s.id !== item.id));
    } else {
      setSelected([...selected, sel]);
    }
  }

  function isSelected(id: number) {
    return selected.some((s) => s.id === id);
  }

  async function handleProceedToStrategy() {
    if (!selected.length || starting) return;
    setStarting(true);
    setError("");

    const finalSelected = selected;
    setTmdbSelections(finalSelected);

    const { postType: pt, topic: t } = useWorkflowStore.getState();

    // review: 전략 수립 전에 감상평부터 받음 (감상평 → 전략 → 인터뷰)
    if (pt === "review") {
      useWorkflowStore.getState().setSeed("");
      setStage("seed");
      setStarting(false);
      return;
    }

    try {
      // 선택된 작품 데이터로 전략 수립 (검색→전략 순서)
      const res = await fetch("/api/workflow/strategy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: t,
          selectedType: pt,
          tmdbSelections: finalSelected.map((s) => ({
            id: s.id,
            title: s.title,
            mediaType: s.mediaType,
          })),
        }),
      });
      if (!res.ok) throw new Error("전략 분석 실패");
      const strategy = await res.json();
      setStrategy(strategy);
      setStage("strategy");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setStarting(false);
    }
  }

  const canStart = selected.length > 0;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        height: "100%",
        padding: "24px",
        gap: "20px",
        overflowY: "auto",
        background: "#F7F7F8",
      }}
    >
      <div style={{ width: "100%", maxWidth: "640px" }}>
        {/* 안내 */}
        <div style={{ marginBottom: "16px" }}>
          <div style={{ fontSize: "13px", color: "#5a5c63", marginBottom: "4px" }}>
            {isTv ? "TV 시리즈" : "영화"} 검색
          </div>
          <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#171719", margin: 0 }}>
            {isMulti ? "작품을 검색해서 추가하세요" : "작품을 선택하세요"}
          </h2>
          {isMulti && (
            <p style={{ fontSize: "13px", color: "#5a5c63", margin: "4px 0 0" }}>
              여러 작품을 추가할 수 있어요. 검색어를 바꿔서 계속 추가하세요.
            </p>
          )}
        </div>

        {/* 검색창 */}
        <div
          style={{
            display: "flex",
            gap: "8px",
            marginBottom: "16px",
          }}
        >
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") doSearch(query); }}
            placeholder={isTv ? "시리즈명 검색…" : "영화 제목 검색…"}
            style={{
              flex: 1,
              padding: "10px 14px",
              borderRadius: "10px",
              border: "1.5px solid rgba(112,115,124,0.2)",
              fontSize: "14px",
              outline: "none",
              fontFamily: "inherit",
              color: "#171719",
              background: "#fff",
            }}
          />
          <button
            onClick={() => doSearch(query)}
            disabled={searching}
            style={{
              padding: "10px 18px",
              borderRadius: "10px",
              border: "none",
              background: "#0066FF",
              color: "#fff",
              fontSize: "14px",
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            {searching ? "…" : "검색"}
          </button>
        </div>

        {/* 검색 결과 */}
        {results.length > 0 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(5, 1fr)",
              gap: "10px",
              marginBottom: "20px",
            }}
          >
            {results.map((item) => {
              const sel = isSelected(item.id);
              return (
                <div
                  key={item.id}
                  onClick={() => toggleSelect(item)}
                  style={{
                    borderRadius: "10px",
                    overflow: "hidden",
                    border: sel ? "2.5px solid #0066FF" : "2px solid transparent",
                    background: "#fff",
                    cursor: "pointer",
                    boxShadow: sel ? "0 0 0 3px rgba(0,102,255,0.12)" : "0 1px 6px rgba(0,0,0,0.08)",
                    transition: "all 0.15s",
                    position: "relative",
                  }}
                >
                  {sel && (
                    <div
                      style={{
                        position: "absolute",
                        top: "6px",
                        right: "6px",
                        width: "20px",
                        height: "20px",
                        background: "#0066FF",
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "11px",
                        color: "#fff",
                        fontWeight: 700,
                        zIndex: 1,
                      }}
                    >
                      ✓
                    </div>
                  )}
                  {item.posterUrl ? (
                    <img
                      src={item.posterUrl}
                      alt={item.title}
                      style={{ width: "100%", aspectRatio: "2/3", objectFit: "cover", display: "block" }}
                    />
                  ) : (
                    <div
                      style={{
                        width: "100%",
                        aspectRatio: "2/3",
                        background: "#e8e9eb",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "24px",
                      }}
                    >
                      🎬
                    </div>
                  )}
                  <div style={{ padding: "6px 8px" }}>
                    <div
                      style={{
                        fontSize: "11px",
                        fontWeight: 600,
                        color: "#171719",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        lineHeight: 1.3,
                      }}
                    >
                      {item.title}
                    </div>
                    <div style={{ fontSize: "10px", color: "#aaa", marginTop: "2px" }}>
                      {item.year}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {searching && (
          <div style={{ textAlign: "center", color: "#aaa", fontSize: "14px", padding: "20px" }}>
            검색 중…
          </div>
        )}

        {/* 선택된 작품 목록 (멀티 선택 모드) */}
        {isMulti && selected.length > 0 && (
          <div
            style={{
              background: "#fff",
              borderRadius: "12px",
              padding: "12px 16px",
              border: "1px solid rgba(112,115,124,0.15)",
              marginBottom: "16px",
            }}
          >
            <div style={{ fontSize: "12px", color: "#5a5c63", marginBottom: "8px", fontWeight: 600 }}>
              선택된 작품 ({selected.length}개)
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {selected.map((s) => (
                <div
                  key={s.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "4px 10px 4px 8px",
                    background: "#EBF2FF",
                    borderRadius: "20px",
                    fontSize: "12px",
                    color: "#0066FF",
                    fontWeight: 500,
                  }}
                >
                  {s.posterUrl && (
                    <img src={s.posterUrl} alt="" style={{ width: "16px", height: "22px", objectFit: "cover", borderRadius: "2px" }} />
                  )}
                  {s.title} ({s.year})
                  <button
                    onClick={() => setSelected(selected.filter((x) => x.id !== s.id))}
                    style={{ border: "none", background: "none", cursor: "pointer", color: "#0066FF", fontSize: "14px", padding: 0, lineHeight: 1 }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 전략 수립 버튼 */}
        <button
          onClick={handleProceedToStrategy}
          disabled={!canStart || starting}
          style={{
            width: "100%",
            padding: "13px",
            borderRadius: "12px",
            border: "none",
            background: canStart && !starting ? "#0066FF" : "#e8e9eb",
            color: canStart && !starting ? "#fff" : "#aaa",
            fontSize: "15px",
            fontWeight: 600,
            cursor: canStart && !starting ? "pointer" : "default",
            fontFamily: "inherit",
            transition: "background 0.15s",
          }}
        >
          {starting ? "처리 중…" : canStart ? `${postType === "review" ? "감상평 쓰기" : "전략 수립"} → (${selected.map((s) => s.title).join(", ")})` : "작품을 선택하세요"}
        </button>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
