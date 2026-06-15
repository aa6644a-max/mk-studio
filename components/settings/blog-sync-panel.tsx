"use client";

import { useState } from "react";

type SyncResult = { total: number; saved: number; skipped: number; error?: string };

export default function BlogSyncPanel({ sheetsOk }: { sheetsOk: boolean }) {
  const [blogId, setBlogId] = useState("shock552");
  const [force, setForce] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<SyncResult | null>(null);

  async function handleSync() {
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/sync-blog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blogId, force }),
      });
      const data: SyncResult = await res.json();
      setResult(data);
    } catch (e) {
      setResult({ total: 0, saved: 0, skipped: 0, error: String(e) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-[var(--panel-border)] bg-white p-5">
      <h2 className="mb-1 text-sm font-bold text-[var(--text-primary)]">
        📡 네이버 블로그 동기화
      </h2>
      <p className="mb-4 text-xs text-[var(--text-secondary)]">
        블로그 원본 글을 Google Sheets에 저장합니다. Claude 발행 시 문체 참조 풀이 풍부해집니다.
      </p>

      {!sheetsOk && (
        <div className="mb-4 rounded-lg bg-amber-50 px-3 py-2.5 text-xs text-amber-700">
          ⚠ Google Sheets 미연결 — GOOGLE_CREDENTIALS_JSON 환경변수를 설정해야 합니다.
        </div>
      )}

      <div className="space-y-3">
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-[var(--text-secondary)]">
            네이버 블로그 ID
          </label>
          <input
            value={blogId}
            onChange={(e) => setBlogId(e.target.value.trim())}
            placeholder="예: shock552"
            className="w-full rounded-lg border border-[var(--panel-border)] bg-[var(--page)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
          />
        </div>

        <label className="flex cursor-pointer items-center gap-2 text-xs text-[var(--text-secondary)]">
          <input
            type="checkbox"
            checked={force}
            onChange={(e) => setForce(e.target.checked)}
            className="rounded"
          />
          기존 데이터 무시하고 새로 수집 (중복 덮어쓰기)
        </label>

        <button
          type="button"
          onClick={handleSync}
          disabled={busy || !sheetsOk || !blogId}
          className="w-full rounded-lg bg-[var(--accent)] py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40"
        >
          {busy ? "동기화 중… (글 수에 따라 수 분 소요)" : "🚀 블로그 전체 본문 동기화"}
        </button>

        {busy && (
          <p className="text-center text-xs text-[var(--text-secondary)]">
            네이버 API 제한 방지를 위해 글 당 1.5초 대기 중입니다.
          </p>
        )}

        {result && (
          <div className={`rounded-lg px-4 py-3 text-sm ${result.error ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
            {result.error ? (
              <p>❌ 오류: {result.error}</p>
            ) : (
              <>
                <p className="font-semibold">✅ 동기화 완료!</p>
                <p className="mt-1 text-xs">
                  전체 {result.total}편 · 저장 {result.saved}편 · 건너뜀 {result.skipped}편
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
