"use client";

import { useCallback, useEffect, useState } from "react";

type Draft = {
  id: number;
  format: "briefing" | "spotlight";
  title: string;
  body_md: string;
  card_news: { slides?: { heading: string; body: string }[] } | null;
  status: string;
  created_at: string;
};

type NewsEvent = {
  id: number;
  event_type: string;
  title: string;
  summary: string;
  score: number | null;
  score_reason: string | null;
  status: string;
  created_at: string;
};

const FORMAT_LABEL: Record<Draft["format"], string> = {
  briefing: "브리핑",
  spotlight: "스포트라이트",
};

export default function MovieNewsPanel() {
  const [configured, setConfigured] = useState(true);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [events, setEvents] = useState<NewsEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openDraft, setOpenDraft] = useState<number | null>(null);
  const [busyEvent, setBusyEvent] = useState<number | null>(null);
  const [copied, setCopied] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/movie-news");
      const data = (await res.json()) as {
        configured?: boolean;
        drafts?: Draft[];
        events?: NewsEvent[];
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "영화소식 조회 실패");
      setConfigured(data.configured ?? false);
      setDrafts(data.drafts ?? []);
      setEvents(data.events ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "영화소식 조회 실패");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function copyText(key: string, text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(""), 1500);
  }

  async function setDraftStatus(draftId: number, status: "reviewed" | "archived") {
    await fetch("/api/movie-news", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ draftId, status }),
    });
    refresh();
  }

  async function generateFromEvent(eventId: number) {
    setBusyEvent(eventId);
    setError("");
    try {
      const res = await fetch("/api/movie-news", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "초안 생성 실패");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "초안 생성 실패");
    } finally {
      setBusyEvent(null);
    }
  }

  return (
    <section className="panel p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-[var(--text-primary)]">
          🎬 영화소식 자동수집
          {drafts.length > 0 && (
            <span className="ml-2 rounded-full bg-[var(--accent)] px-2 py-0.5 text-[10px] font-bold text-white">
              검토 대기 {drafts.length}
            </span>
          )}
        </h2>
        <button
          onClick={refresh}
          className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          새로고침
        </button>
      </div>

      {!configured && !loading && (
        <p className="mt-3 text-xs text-[var(--text-secondary)]">
          DATABASE_URL 미설정 — Railway에서 Postgres를 추가하면 자동수집이 활성화됩니다.
        </p>
      )}
      {error && <p className="mt-3 text-xs text-red-500">{error}</p>}
      {loading && <p className="mt-3 text-xs text-[var(--text-secondary)]">불러오는 중…</p>}

      {/* 검토 대기 초안 */}
      {drafts.length > 0 && (
        <div className="mt-4 space-y-2">
          {drafts.map((d) => (
            <div key={d.id} className="rounded-lg border border-[var(--panel-border)] p-3">
              <button
                onClick={() => setOpenDraft(openDraft === d.id ? null : d.id)}
                className="flex w-full items-center justify-between text-left"
              >
                <span className="text-sm font-semibold text-[var(--text-primary)]">
                  <span className="mr-2 rounded bg-[var(--accent)]/10 px-1.5 py-0.5 text-[10px] font-bold text-[var(--accent)]">
                    {FORMAT_LABEL[d.format]}
                  </span>
                  {d.title}
                </span>
                <span className="text-xs text-[var(--text-secondary)]">
                  {openDraft === d.id ? "▲" : "▼"}
                </span>
              </button>

              {openDraft === d.id && (
                <div className="mt-3 space-y-3">
                  <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded bg-black/5 p-3 text-xs text-[var(--text-primary)] dark:bg-white/5">
                    {d.body_md}
                  </pre>
                  {d.card_news?.slides?.length ? (
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {d.card_news.slides.map((s, i) => (
                        <div
                          key={i}
                          className="rounded border border-[var(--panel-border)] p-2 text-xs"
                        >
                          <div className="font-bold text-[var(--text-primary)]">{s.heading}</div>
                          <div className="mt-1 text-[var(--text-secondary)]">{s.body}</div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => copyText(`body-${d.id}`, d.body_md)}
                      className="rounded bg-[var(--accent)] px-3 py-1.5 text-xs font-bold text-white"
                    >
                      {copied === `body-${d.id}` ? "복사됨!" : "본문 복사"}
                    </button>
                    {d.card_news?.slides?.length ? (
                      <button
                        onClick={() =>
                          copyText(
                            `card-${d.id}`,
                            d.card_news!.slides!
                              .map((s, i) => `[${i + 1}] ${s.heading}\n${s.body}`)
                              .join("\n\n"),
                          )
                        }
                        className="rounded border border-[var(--panel-border)] px-3 py-1.5 text-xs font-bold text-[var(--text-primary)]"
                      >
                        {copied === `card-${d.id}` ? "복사됨!" : "카드뉴스 문구 복사"}
                      </button>
                    ) : null}
                    <button
                      onClick={() => setDraftStatus(d.id, "reviewed")}
                      className="rounded border border-[var(--panel-border)] px-3 py-1.5 text-xs text-[var(--text-secondary)]"
                    >
                      검토 완료
                    </button>
                    <button
                      onClick={() => setDraftStatus(d.id, "archived")}
                      className="rounded border border-[var(--panel-border)] px-3 py-1.5 text-xs text-[var(--text-secondary)]"
                    >
                      보관
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 감지된 이벤트 */}
      {events.length > 0 && (
        <div className="mt-4">
          <h3 className="text-xs font-bold text-[var(--text-secondary)]">감지된 이벤트</h3>
          <ul className="mt-2 space-y-1.5">
            {events.map((ev) => (
              <li
                key={ev.id}
                className="flex items-center justify-between gap-3 text-xs"
              >
                <span className="min-w-0 flex-1 truncate text-[var(--text-primary)]">
                  {ev.score != null && (
                    <span className="mr-1.5 font-mono font-bold text-[var(--accent)]">
                      {ev.score}
                    </span>
                  )}
                  {ev.title}
                </span>
                <button
                  onClick={() => generateFromEvent(ev.id)}
                  disabled={busyEvent !== null}
                  className="shrink-0 rounded border border-[var(--panel-border)] px-2 py-1 text-[10px] font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-40"
                >
                  {busyEvent === ev.id ? "생성 중…" : "초안 생성"}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {configured && !loading && !drafts.length && !events.length && !error && (
        <p className="mt-3 text-xs text-[var(--text-secondary)]">
          아직 감지된 소식이 없습니다. 매일 아침 자동 수집됩니다.
        </p>
      )}
    </section>
  );
}
