"use client";

import type { PostDraft } from "./types";

/** 작성 중 드래프트 자동저장 (localStorage). 발행/저장 완료 시 클리어. */
const KEY = "mk-studio:draft";

export function saveDraft(draft: PostDraft) {
  try {
    localStorage.setItem(KEY, JSON.stringify(draft));
  } catch {
    // 용량 초과(대용량 pdfText/포스터) 시 무시
  }
}

export function loadDraft(): PostDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as PostDraft) : null;
  } catch {
    return null;
  }
}

export function clearDraft() {
  localStorage.removeItem(KEY);
}
