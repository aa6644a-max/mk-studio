"use client";

import { useEffect, useState } from "react";
import { fileToScaledDataUrl } from "@/lib/image";

type Item = { file: File; url: string };

const TONES = [
  { id: "emotional", label: "감성적", emoji: "🌙" },
  { id: "informative", label: "정보성", emoji: "📌" },
  { id: "punchy", label: "짧고 힙하게", emoji: "⚡" },
];

const MAX_IMAGES = 10; // 인스타 캐러셀 한도

export default function CaptionMaker() {
  const [items, setItems] = useState<Item[]>([]);
  const [hint, setHint] = useState("");
  const [tone, setTone] = useState("emotional");
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  // 언마운트 시 objectURL 정리
  useEffect(() => {
    return () => items.forEach((i) => URL.revokeObjectURL(i.url));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function addFiles(fileList: FileList | null) {
    if (!fileList?.length) return;
    setError("");
    const next: Item[] = [];
    for (const f of Array.from(fileList)) {
      if (!f.type.startsWith("image/")) continue;
      next.push({ file: f, url: URL.createObjectURL(f) });
    }
    if (!next.length) {
      setError("이미지 파일만 올릴 수 있어요.");
      return;
    }
    setItems((prev) => [...prev, ...next].slice(0, MAX_IMAGES));
  }

  function removeItem(idx: number) {
    setItems((prev) => {
      const target = prev[idx];
      if (target) URL.revokeObjectURL(target.url);
      return prev.filter((_, i) => i !== idx);
    });
  }

  async function generate() {
    if (!items.length) {
      setError("이미지를 먼저 올려주세요.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      // 분석 전송용: 앞 6장을 1024px로 축소
      const images = await Promise.all(
        items.slice(0, 6).map((i) => fileToScaledDataUrl(i.file, 1024, 0.8)),
      );
      const res = await fetch("/api/insta-caption", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images, hint, tone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "생성 실패");
      setCaption(data.caption || "");
    } catch (e) {
      setError((e as Error).message || "캡션 생성 실패");
    } finally {
      setBusy(false);
    }
  }

  async function copyCaption() {
    try {
      await navigator.clipboard.writeText(caption);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setError("복사 실패 — 캡션을 길게 눌러 복사해주세요.");
    }
  }

  async function shareInstagram() {
    if (!items.length) return;
    setBusy(true);
    setError("");
    try {
      if (caption) {
        try {
          await navigator.clipboard.writeText(caption);
        } catch {
          /* 무시 */
        }
      }
      const files = items.map((i) => i.file);
      const nav = navigator as Navigator & { canShare?: (d?: ShareData) => boolean };
      if (nav.canShare && nav.canShare({ files })) {
        await navigator.share({ files, text: caption });
      } else {
        setError("이 브라우저는 직접 공유가 안 돼요. 인스타 앱에서 이미지를 올리고 캡션(복사됨)을 붙여넣어 주세요.");
      }
    } catch (e) {
      if ((e as Error)?.name !== "AbortError") setError("공유 실패");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-6 p-5">
      {/* 이미지 업로드 */}
      <Section label={`이미지 (${items.length}/${MAX_IMAGES}) · 넘겨보는 캐러셀 한 세트`}>
        <div className="grid grid-cols-3 gap-2">
          {items.length < MAX_IMAGES && (
            <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-0.5 rounded-lg border-2 border-dashed border-[var(--panel-border)] text-[var(--text-secondary)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]">
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  addFiles(e.target.files);
                  e.currentTarget.value = "";
                }}
              />
              <span className="text-xl leading-none">＋</span>
              <span className="text-xs font-semibold">사진 추가</span>
            </label>
          )}
          {items.map((it, i) => (
            <div key={it.url} className="relative">
              <div className="overflow-hidden rounded-lg border border-[var(--panel-border)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={it.url} alt="" className="aspect-square w-full object-cover" />
              </div>
              <span className="absolute left-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--accent)] text-[10px] font-bold text-white">
                {i + 1}
              </span>
              <button
                onClick={() => removeItem(i)}
                aria-label="삭제"
                className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-[11px] text-white hover:bg-red-500"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        {items.length > 6 && (
          <p className="mt-2 text-xs text-[var(--text-secondary)]">
            캡션은 앞 6장을 분석해서 생성돼요. 공유는 올린 전체가 함께 나갑니다.
          </p>
        )}
      </Section>

      {/* 힌트 */}
      <Section label="힌트 (선택 — 영화명·키워드·원하는 내용)">
        <input
          value={hint}
          onChange={(e) => setHint(e.target.value)}
          placeholder="예: 인터스텔라, 우주, 부성애"
          className="w-full rounded-lg border border-[var(--panel-border)] bg-white px-3 py-2.5 text-sm"
        />
      </Section>

      {/* 톤 */}
      <Section label="캡션 톤">
        <div className="flex gap-2">
          {TONES.map((t) => (
            <button
              key={t.id}
              onClick={() => setTone(t.id)}
              className={`flex-1 rounded-lg border-2 py-2.5 text-sm font-semibold transition ${
                tone === t.id
                  ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]"
                  : "border-[var(--panel-border)] text-[var(--text-secondary)]"
              }`}
            >
              {t.emoji} {t.label}
            </button>
          ))}
        </div>
      </Section>

      {/* 생성 */}
      <button
        onClick={generate}
        disabled={busy || !items.length}
        className="w-full rounded-xl bg-[var(--accent)] py-3 text-sm font-bold text-white disabled:opacity-40"
      >
        {busy ? "생성 중..." : caption ? "🔄 캡션 다시 생성" : "✨ 캡션 생성"}
      </button>

      {/* 결과 */}
      {caption && (
        <Section label="캡션 (편집 가능)">
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            rows={8}
            className="w-full resize-none rounded-lg border border-[var(--panel-border)] bg-white px-3 py-2.5 text-sm leading-relaxed"
          />
          <div className="mt-3 flex gap-3">
            <button
              onClick={copyCaption}
              className="flex-1 rounded-xl border border-[var(--panel-border)] py-3 text-sm font-bold text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--text-primary)]"
            >
              {copied ? "복사됨 ✓" : "캡션 복사"}
            </button>
            <button
              onClick={shareInstagram}
              disabled={busy}
              className="flex-[2] rounded-xl bg-[var(--accent)] py-3 text-sm font-bold text-white disabled:opacity-60"
            >
              {busy ? "처리 중..." : "📷 인스타 공유"}
            </button>
          </div>
          <p className="mt-2 text-xs text-[var(--text-secondary)]">
            모바일에서 공유하면 인스타 선택 → 이미지 게시, 캡션은 붙여넣기(복사됨).
          </p>
        </Section>
      )}

      {error && <div className="text-center text-sm text-red-500">{error}</div>}
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
        {label}
      </div>
      {children}
    </div>
  );
}
