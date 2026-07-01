"use client";

/**
 * 홈 트렌드 대시보드용 키워드그룹 저장소. 백엔드 DB 없이 브라우저
 * localStorage에 보관 (gallery-store.ts와 동일 패턴).
 */

export type TrendGroup = {
  id: string;
  groupName: string;
  keywords: string[];
};

const KEY = "mk-studio:trend-groups";
export const MAX_GROUPS = 10;
const EVENT = "mk-trend-groups-change";

const DEFAULT_GROUPS: TrendGroup[] = [
  { id: "default-movie", groupName: "영화", keywords: ["영화 추천", "요즘 영화", "박스오피스"] },
  { id: "default-culture", groupName: "문화", keywords: ["대구 문화", "대구 전시", "대구 공연"] },
  { id: "default-youth", groupName: "청년", keywords: ["대구 청년", "대구 크리에이터"] },
  { id: "default-local", groupName: "로컬", keywords: ["대구 로컬", "동네 모임", "로컬 커뮤니티"] },
  { id: "default-it", groupName: "IT", keywords: ["AI 콘텐츠", "생성형 AI", "블로그 자동화"] },
];

export function loadGroups(): TrendGroup[] {
  if (typeof window === "undefined") return DEFAULT_GROUPS;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_GROUPS;
    return JSON.parse(raw) as TrendGroup[];
  } catch {
    return DEFAULT_GROUPS;
  }
}

function save(groups: TrendGroup[]) {
  localStorage.setItem(KEY, JSON.stringify(groups));
  window.dispatchEvent(new Event(EVENT));
}

export function addGroup(group: Omit<TrendGroup, "id">): TrendGroup[] {
  const groups = loadGroups();
  const next = [...groups, { ...group, id: crypto.randomUUID() }].slice(0, MAX_GROUPS);
  save(next);
  return next;
}

export function removeGroup(id: string): TrendGroup[] {
  const next = loadGroups().filter((g) => g.id !== id);
  save(next);
  return next;
}

export function updateGroup(id: string, patch: Partial<Omit<TrendGroup, "id">>): TrendGroup[] {
  const next = loadGroups().map((g) => (g.id === id ? { ...g, ...patch } : g));
  save(next);
  return next;
}

/** 변경 구독 (편집 시 리렌더). */
export function subscribe(cb: () => void): () => void {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}
