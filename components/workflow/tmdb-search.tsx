"use client";

import { useEffect, useRef, useState } from "react";
import { useWorkflowStore, type TmdbSelection } from "@/lib/workflow-store";
import type { MovieResult } from "@/lib/tmdb";

const SINGLE_TYPES = ["review", "binge"];
const TV_TYPES = ["binge"];

export default function TmdbSearchView() {
  const { strategy, postType, topic, setStage, setTmdbSelections, addMessage, setStreaming, setError } =
    useWorkflowStore();

  const isMulti = !SINGLE_TYPES.includes(postType);
  const isTv = TV_TYPES.includes(postType);

  const [query, setQuery] = useState(strategy?.keywords[0] ?? topic ?? "");
  const [results, setResults] = useState<MovieResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<TmdbSelection[]>([]);
  const [starting, setStarting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // 첫 진입 시 자동 검색
  useEffect(() => {
    if (query) doSearch(query);
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

  async function handleStartInterview() {
    if (!selected.length || starting) return;
    setStarting(true);

    const finalSelected = selected;
    setTmdbSelections(finalSelected);

    const { strategy: strat, postType: pt, topic: t, fileContent, imageNames, imageCaptions } =
      useWorkflowStore.getState();

    const imageInfo =
      imageNames.length > 0
        ? imageNames
            .map((name, i) => `파일명: ${name}${imageCaptions[i] ? ` — 캡션: ${imageCaptions[i]}` : ""}`)
            .join("\n")
        : "";

    const selectedTitles = finalSelected.map((s) => `${s.title} (${s.year})`).join(", ");

    setStage("interview");
    setStreaming(true);
    addMessage({ role: "assistant", content: "" });

    try {
      const res = await fetch("/api/workflow/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [],
          strategy: { ...strat, postType: pt },
          topic: t,
          fileContent: fileContent || undefined,
          imageInfo: imageInfo || undefined,
          tmdbTitles: selectedTitles,
        }),
      });

      if (!res.body) throw new Error("스트림 없음");
      await consumeStream(res.body);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      useWorkflowStore.getState().setStreaming(false);
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

        {/* 인터뷰 시작 버튼 */}
        <button
          onClick={handleStartInterview}
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
          {starting ? "인터뷰 시작 중…" : canStart ? `인터뷰 시작 → (${selected.map((s) => s.title).join(", ")})` : "작품을 선택하세요"}
        </button>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

async function consumeStream(body: ReadableStream) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  const store = useWorkflowStore.getState();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const text = decoder.decode(value);
    for (const line of text.split("\n\n")) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6).trim();
      if (data === "[DONE]") return;
      try {
        const parsed = JSON.parse(data);
        if (parsed.text) store.appendToLastMessage(parsed.text);
      } catch {}
    }
  }
}
