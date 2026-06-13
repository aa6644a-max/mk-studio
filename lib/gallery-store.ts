"use client";

/**
 * 갤러리 이미지 저장소. 백엔드 스토리지 미정 → 브라우저 localStorage에
 * data URL 로 보관 (브라우저별 영속). 썸네일 제작기·에디터 연동에서 공유.
 */

export type GalleryImage = {
  id: string;
  name: string;
  dataUrl: string;
  size: number;
  createdAt: number;
};

const KEY = "mk-studio:gallery";
export const MAX_BYTES = 10 * 1024 * 1024; // 10MB
const EVENT = "mk-gallery-change";

export function loadImages(): GalleryImage[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]") as GalleryImage[];
  } catch {
    return [];
  }
}

function save(images: GalleryImage[]) {
  localStorage.setItem(KEY, JSON.stringify(images));
  window.dispatchEvent(new Event(EVENT));
}

export function addImage(img: GalleryImage) {
  save([img, ...loadImages()]);
}

export function removeImage(id: string) {
  save(loadImages().filter((i) => i.id !== id));
}

/** 변경 구독 (업로드/삭제 시 리렌더). */
export function subscribe(cb: () => void): () => void {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

// ── 에디터 포스터 인계 (갤러리 → 작성 화면) ──────────
const POSTER_KEY = "mk-studio:pending-poster";

export function setPendingPoster(dataUrl: string) {
  sessionStorage.setItem(POSTER_KEY, dataUrl);
}

/** 한 번 읽고 비움. */
export function consumePendingPoster(): string | null {
  if (typeof window === "undefined") return null;
  const v = sessionStorage.getItem(POSTER_KEY);
  if (v) sessionStorage.removeItem(POSTER_KEY);
  return v;
}

export function fileToImage(file: File): Promise<GalleryImage> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      resolve({
        id: crypto.randomUUID(),
        name: file.name,
        dataUrl: reader.result as string,
        size: file.size,
        createdAt: Date.now(),
      });
    reader.onerror = () => reject(new Error("파일 읽기 실패"));
    reader.readAsDataURL(file);
  });
}
