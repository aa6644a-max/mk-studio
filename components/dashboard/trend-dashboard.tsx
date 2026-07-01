"use client";

import { useCallback, useEffect, useState } from "react";
import type { TrendResult } from "@/lib/naver-datalab";
import {
  addGroup,
  loadGroups,
  MAX_GROUPS,
  removeGroup,
  subscribe,
  updateGroup,
  type TrendGroup,
} from "@/lib/trend-groups-store";

const TREND_ARROW: Record<TrendResult["trend"], string> = {
  up: "↑",
  down: "↓",
  stable: "→",
};

const TREND_COLOR: Record<TrendResult["trend"], string> = {
  up: "text-red-500",
  down: "text-blue-500",
  stable: "text-[var(--text-secondary)]",
};

export default function TrendDashboard() {
  const [groups, setGroups] = useState<TrendGroup[]>([]);
  const [trends, setTrends] = useState<Map<string, TrendResult>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editMode, setEditMode] = useState(false);

  const [query, setQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [searchResult, setSearchResult] = useState<TrendResult | null>(null);

  const refreshTrends = useCallback(async (currentGroups: TrendGroup[]) => {
    if (currentGroups.length === 0) {
      setTrends(new Map());
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/trends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groups: currentGroups.map((g) => ({ groupName: g.groupName, keywords: g.keywords })),
        }),
      });
      const data = (await res.json()) as { trends?: TrendResult[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? "트렌드 조회 실패");
      const map = new Map<string, TrendResult>();
      (data.trends ?? []).forEach((t) => map.set(t.groupName, t));
      setTrends(map);
    } catch (err) {
      setError(err instanceof Error ? err.message : "트렌드 조회 실패");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const current = loadGroups();
    setGroups(current);
    refreshTrends(current);

    return subscribe(() => {
      const next = loadGroups();
      setGroups(next);
      refreshTrends(next);
    });
  }, [refreshTrends]);

  async function handleSearch() {
    const keyword = query.trim();
    if (!keyword) return;
    setSearchLoading(true);
    setSearchError("");
    setSearchResult(null);
    try {
      const res = await fetch("/api/trends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groups: [{ groupName: keyword, keywords: [keyword] }] }),
      });
      const data = (await res.json()) as { trends?: TrendResult[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? "검색 실패");
      setSearchResult(data.trends?.[0] ?? null);
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : "검색 실패");
    } finally {
      setSearchLoading(false);
    }
  }

  function handleAddSearchToGroups() {
    if (!searchResult) return;
    if (groups.length >= MAX_GROUPS) {
      setSearchError(`대시보드 그룹은 최대 ${MAX_GROUPS}개까지예요`);
      return;
    }
    addGroup({ groupName: searchResult.groupName, keywords: searchResult.keywords });
    setSearchResult(null);
    setQuery("");
  }

  function handleAddEmptyGroup() {
    if (groups.length >= MAX_GROUPS) return;
    addGroup({ groupName: "새 그룹", keywords: [] });
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-[var(--text-primary)]">
          트렌드 대시보드
          <span className="ml-2 text-xs font-normal text-[var(--text-secondary)]">
            Naver DataLab 검색량 기준 · 최근 4주
          </span>
        </h3>
        <button
          type="button"
          onClick={() => setEditMode((v) => !v)}
          className="rounded-lg border border-[var(--panel-border)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
        >
          {editMode ? "완료" : "편집"}
        </button>
      </div>

      {/* 자유 검색 */}
      <div className="panel p-4">
        <div className="flex gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="키워드로 검색 (예: 어벤져스 4)"
            className="flex-1 rounded-lg border border-[var(--panel-border)] bg-transparent px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
          />
          <button
            type="button"
            onClick={handleSearch}
            disabled={searchLoading || !query.trim()}
            className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-40"
          >
            {searchLoading ? "조회 중…" : "검색"}
          </button>
        </div>

        {searchError && (
          <div className="mt-3 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-xs text-red-400">
            {searchError}
          </div>
        )}

        {searchResult && (
          <div className="mt-3 flex items-center justify-between rounded-lg border border-[var(--panel-border)] px-3 py-2">
            <TrendLine result={searchResult} />
            <button
              type="button"
              onClick={handleAddSearchToGroups}
              className="shrink-0 rounded-lg border border-[var(--accent)] px-3 py-1.5 text-xs font-bold text-[var(--accent)] transition hover:bg-[var(--accent)]/10"
            >
              + 대시보드에 추가
            </button>
          </div>
        )}
      </div>

      {/* 그룹 카드 */}
      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-xs text-red-400">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {groups.map((g) =>
          editMode ? (
            <GroupEditCard key={g.id} group={g} />
          ) : (
            <div key={g.id} className="panel p-4">
              {loading ? (
                <div className="text-xs text-[var(--text-secondary)]">불러오는 중…</div>
              ) : (
                <TrendLine result={trends.get(g.groupName)} fallbackGroupName={g.groupName} />
              )}
            </div>
          )
        )}

        {editMode && groups.length < MAX_GROUPS && (
          <button
            type="button"
            onClick={handleAddEmptyGroup}
            className="panel flex items-center justify-center p-4 text-sm font-semibold text-[var(--text-secondary)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
          >
            + 그룹 추가
          </button>
        )}

        {groups.length === 0 && !editMode && (
          <div className="panel col-span-full p-8 text-center text-sm text-[var(--text-secondary)]">
            추적 중인 키워드그룹이 없어요. 편집을 눌러 추가해보세요.
          </div>
        )}
      </div>
    </section>
  );
}

function TrendLine({
  result,
  fallbackGroupName,
}: {
  result?: TrendResult;
  fallbackGroupName?: string;
}) {
  if (!result) {
    return (
      <div>
        <div className="text-sm font-bold text-[var(--text-primary)]">{fallbackGroupName}</div>
        <div className="text-xs text-[var(--text-secondary)]">데이터 없음</div>
      </div>
    );
  }
  return (
    <div>
      <div className="text-sm font-bold text-[var(--text-primary)]">{result.groupName}</div>
      <div className="mt-1 text-xs text-[var(--text-secondary)]">
        {result.keywords.join(", ")}
      </div>
      <div className={`mt-1.5 text-sm font-bold ${TREND_COLOR[result.trend]}`}>
        {TREND_ARROW[result.trend]} {result.latestRatio}/100
        <span className="ml-1 text-xs font-semibold">
          ({result.changePercent > 0 ? "+" : ""}
          {result.changePercent}%)
        </span>
      </div>
    </div>
  );
}

function GroupEditCard({ group }: { group: TrendGroup }) {
  const [name, setName] = useState(group.groupName);
  const [keywordsText, setKeywordsText] = useState(group.keywords.join(", "));

  function commit() {
    const keywords = keywordsText
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);
    updateGroup(group.id, { groupName: name.trim() || group.groupName, keywords });
  }

  return (
    <div className="panel space-y-2 p-4">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={commit}
        className="w-full rounded-lg border border-[var(--panel-border)] bg-transparent px-2 py-1 text-sm font-bold text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
        placeholder="그룹 이름"
      />
      <textarea
        value={keywordsText}
        onChange={(e) => setKeywordsText(e.target.value)}
        onBlur={commit}
        rows={2}
        className="w-full rounded-lg border border-[var(--panel-border)] bg-transparent px-2 py-1 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
        placeholder="키워드를 쉼표로 구분 (최대 20개)"
      />
      <button
        type="button"
        onClick={() => removeGroup(group.id)}
        className="text-xs font-semibold text-red-500 hover:underline"
      >
        삭제
      </button>
    </div>
  );
}
