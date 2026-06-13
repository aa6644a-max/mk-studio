"use client";

import { useEffect, useState } from "react";
import FileUpload from "@/components/write/file-upload";
import {
  addImage,
  fileToImage,
  loadImages,
  MAX_BYTES,
  removeImage,
  subscribe,
  type GalleryImage,
} from "@/lib/gallery-store";

export default function Gallery() {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [error, setError] = useState("");

  useEffect(() => {
    setImages(loadImages());
    return subscribe(() => setImages(loadImages()));
  }, []);

  async function handleFiles(files: File[]) {
    setError("");
    for (const f of files) {
      if (f.size > MAX_BYTES) {
        setError(`${f.name}: 10MB 초과`);
        continue;
      }
      addImage(await fileToImage(f));
    }
  }

  return (
    <div className="space-y-4">
      {/* 업로드존 */}
      <FileUpload
        accept="image/png,image/jpeg,image/webp"
        label="이미지 드래그 또는 클릭 (PNG/JPG/WEBP, 최대 10MB)"
        onFiles={handleFiles}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}

      {/* 뷰 토글 */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-[var(--text-secondary)]">
          {images.length}개
        </span>
        <div className="flex gap-1">
          {(["grid", "list"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                view === v
                  ? "bg-[var(--accent)] text-white"
                  : "bg-panel text-[var(--text-secondary)]"
              }`}
            >
              {v === "grid" ? "그리드" : "목록"}
            </button>
          ))}
        </div>
      </div>

      {images.length === 0 ? (
        <div className="panel p-8 text-center text-sm text-[var(--text-secondary)]">
          업로드한 이미지가 없습니다.
        </div>
      ) : view === "grid" ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {images.map((img) => (
            <div key={img.id} className="panel group relative overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.dataUrl}
                alt={img.name}
                className="aspect-square w-full object-cover"
              />
              <button
                onClick={() => removeImage(img.id)}
                className="absolute right-1.5 top-1.5 hidden rounded bg-black/60 px-2 py-0.5 text-xs text-white group-hover:block"
              >
                삭제
              </button>
              <div className="truncate p-2 text-xs text-[var(--text-secondary)]">
                {img.name}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <ul className="space-y-2">
          {images.map((img) => (
            <li key={img.id} className="panel flex items-center gap-3 p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.dataUrl}
                alt={img.name}
                className="h-12 w-12 shrink-0 rounded object-cover"
              />
              <span className="min-w-0 flex-1 truncate text-sm">
                {img.name}
              </span>
              <span className="shrink-0 text-xs text-[var(--text-secondary)]">
                {(img.size / 1024).toFixed(0)}KB
              </span>
              <button
                onClick={() => removeImage(img.id)}
                className="shrink-0 text-xs text-[var(--text-secondary)] hover:text-red-500"
              >
                삭제
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
