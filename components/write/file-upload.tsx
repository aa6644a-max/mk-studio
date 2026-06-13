"use client";

import { useRef, useState } from "react";

export default function FileUpload({
  accept,
  label,
  multiple = true,
  onFiles,
  busy,
}: {
  accept: string;
  label: string;
  multiple?: boolean;
  onFiles: (files: File[]) => void | Promise<void>;
  busy?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  function handle(list: FileList | null) {
    if (!list || list.length === 0) return;
    onFiles(Array.from(list));
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        handle(e.dataTransfer.files);
      }}
      onClick={() => inputRef.current?.click()}
      className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-4 text-center text-xs transition-colors ${
        drag
          ? "border-[var(--accent)] bg-[var(--accent)]/5"
          : "border-[var(--panel-border)] text-[var(--text-secondary)] hover:border-[var(--accent)]"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        hidden
        onChange={(e) => handle(e.target.files)}
      />
      <span className="text-lg">📎</span>
      <span className="mt-1">{busy ? "처리 중…" : label}</span>
    </div>
  );
}
