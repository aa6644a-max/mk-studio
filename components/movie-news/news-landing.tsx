"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { marked } from "marked";

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
  poster_url: string | null;
};

const FORMAT_LABEL: Record<Draft["format"], string> = {
  briefing: "데일리 브리핑",
  spotlight: "스포트라이트",
};

const EVENT_LABEL: Record<string, string> = {
  boxoffice_briefing: "박스오피스",
  boxoffice_new_no1: "새 1위",
  boxoffice_new_entry: "TOP10 진입",
  boxoffice_surge: "순위 급상승",
  tmdb_release: "신규 개봉",
  tmdb_upcoming: "개봉 예정",
  tmdb_trending: "트렌딩",
};

function excerpt(md: string, len = 150): string {
  const plain = md
    .replace(/^#{1,6}\s.*$/gm, "")
    .replace(/\|.*\|/g, "")
    .replace(/[*_`>#-]/g, "")
    .replace(/\n+/g, " ")
    .trim();
  return plain.length > len ? `${plain.slice(0, len)}…` : plain;
}

function todayKst(): string {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(new Date());
}

export default function NewsLanding() {
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

  const posters = useMemo(
    () => events.map((e) => e.poster_url).filter((p): p is string => Boolean(p)).slice(0, 4),
    [events],
  );

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
    <div className="min-h-full">
      {/* ── 히어로 ── */}
      <section className="relative overflow-hidden bg-[#0c0d16] px-6 py-16 text-white sm:py-20">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(600px 300px at 20% 0%, rgba(0,102,255,0.35), transparent 70%), radial-gradient(500px 300px at 90% 100%, rgba(0,102,255,0.18), transparent 70%)",
          }}
        />
        <div className="relative mx-auto flex max-w-5xl items-center justify-between gap-8">
          <div className="max-w-xl">
            <div className="text-[11px] font-bold tracking-[0.35em] text-[#6ea8ff]">
              MK STUDIO · DAILY MOVIE BRIEF
            </div>
            <h1
              className="mt-4 text-4xl leading-tight sm:text-5xl"
              style={{ fontFamily: "'Black Han Sans', sans-serif" }}
            >
              오늘의 영화소식
            </h1>
            <p className="mt-3 text-sm text-white/60 sm:text-base">
              {todayKst()} — 박스오피스와 신작 소식을 매일 아침 자동 수집하고,
              AI가 소재 가치를 채점해 포스팅 초안까지 만들어둡니다.
            </p>
            <div className="mt-7 flex flex-wrap gap-2.5">
              <span className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-bold">
                ✍️ 검토 대기 <span className="text-[#6ea8ff]">{drafts.length}</span>건
              </span>
              <span className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-bold">
                📡 감지 이벤트 <span className="text-[#6ea8ff]">{events.length}</span>건
              </span>
              <span className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-bold text-white/70">
                ⏰ 매일 08:00 자동 수집
              </span>
            </div>
          </div>

          {/* 포스터 스택 (데스크톱) */}
          {posters.length > 0 && (
            <div className="relative hidden h-56 w-64 shrink-0 lg:block">
              {posters.map((p, i) => (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  key={p}
                  src={p}
                  alt=""
                  className="absolute w-32 rounded-xl shadow-2xl shadow-black/60"
                  style={{
                    left: `${i * 34}px`,
                    top: `${(i % 2) * 18}px`,
                    transform: `rotate(${(i - 1.5) * 5}deg)`,
                    zIndex: i,
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      <div className="mx-auto max-w-5xl space-y-14 px-6 py-12">
        {!configured && !loading && (
          <p className="panel p-5 text-sm text-[var(--text-secondary)]">
            DATABASE_URL 미설정 — Railway에서 Postgres를 추가하면 자동수집이 활성화됩니다.
          </p>
        )}
        {error && <p className="panel p-5 text-sm text-red-500">{error}</p>}

        {/* ── 오늘의 초안 ── */}
        <section>
          <div className="flex items-end justify-between">
            <div>
              <div className="text-[11px] font-bold tracking-[0.3em] text-[var(--accent)]">
                TODAY&apos;S DRAFTS
              </div>
              <h2 className="mt-1 text-2xl font-extrabold text-[var(--text-primary)]">
                검토 대기 초안
              </h2>
            </div>
            <button
              onClick={refresh}
              className="text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              ↻ 새로고침
            </button>
          </div>

          {loading && (
            <p className="mt-6 text-sm text-[var(--text-secondary)]">불러오는 중…</p>
          )}
          {!loading && drafts.length === 0 && (
            <p className="panel mt-6 p-8 text-center text-sm text-[var(--text-secondary)]">
              지금은 검토할 초안이 없습니다. 내일 아침 8시에 새 소식이 도착합니다. 🌙
            </p>
          )}

          <div className="mt-6 space-y-5">
            {drafts.map((d, i) => (
              <article
                key={d.id}
                className="news-fade-up panel overflow-hidden"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="p-6">
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-[var(--accent)] px-2.5 py-1 text-[10px] font-extrabold tracking-wide text-white">
                      {FORMAT_LABEL[d.format]}
                    </span>
                    <span className="text-[11px] text-[var(--text-secondary)]">
                      {new Date(d.created_at).toLocaleString("ko-KR", {
                        timeZone: "Asia/Seoul",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <h3 className="mt-3 text-lg font-extrabold leading-snug text-[var(--text-primary)] sm:text-xl">
                    {d.title}
                  </h3>
                  {openDraft !== d.id && (
                    <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
                      {excerpt(d.body_md)}
                    </p>
                  )}

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => setOpenDraft(openDraft === d.id ? null : d.id)}
                      className="rounded-lg bg-[var(--accent)] px-4 py-2 text-xs font-bold text-white transition hover:opacity-90"
                    >
                      {openDraft === d.id ? "접기 ▲" : "전문 보기 ▼"}
                    </button>
                    <button
                      onClick={() => copyText(`body-${d.id}`, d.body_md)}
                      className="rounded-lg border border-[var(--panel-border)] px-4 py-2 text-xs font-bold text-[var(--text-primary)] transition hover:border-[var(--accent)]"
                    >
                      {copied === `body-${d.id}` ? "✓ 복사됨" : "본문 복사"}
                    </button>
                    {d.card_news?.slides?.length ? (
                      <button
                        onClick={() =>
                          copyText(
                            `card-${d.id}`,
                            d.card_news!.slides!
                              .map((s, n) => `[${n + 1}] ${s.heading}\n${s.body}`)
                              .join("\n\n"),
                          )
                        }
                        className="rounded-lg border border-[var(--panel-border)] px-4 py-2 text-xs font-bold text-[var(--text-primary)] transition hover:border-[var(--accent)]"
                      >
                        {copied === `card-${d.id}` ? "✓ 복사됨" : "카드뉴스 문구 복사"}
                      </button>
                    ) : null}
                    <span className="flex-1" />
                    <button
                      onClick={() => setDraftStatus(d.id, "reviewed")}
                      className="text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    >
                      검토 완료
                    </button>
                    <button
                      onClick={() => setDraftStatus(d.id, "archived")}
                      className="text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    >
                      보관
                    </button>
                  </div>
                </div>

                {openDraft === d.id && (
                  <div className="border-t border-[var(--panel-border)]">
                    <div className="p-6">
                      <div
                        className="md-body"
                        dangerouslySetInnerHTML={{
                          __html: marked.parse(d.body_md, { async: false }),
                        }}
                      />
                    </div>

                    {d.card_news?.slides?.length ? (
                      <div className="border-t border-[var(--panel-border)] bg-[#0c0d16] p-6">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold tracking-[0.25em] text-[#6ea8ff]">
                            CARD NEWS PREVIEW
                          </span>
                          <Link
                            href="/card-news"
                            className="text-[11px] font-bold text-white/60 hover:text-white"
                          >
                            카드뉴스 메이커에서 만들기 →
                          </Link>
                        </div>
                        <div className="mt-4 flex snap-x gap-3 overflow-x-auto pb-2">
                          {d.card_news.slides.map((s, n) => (
                            <div
                              key={n}
                              className="flex w-44 shrink-0 snap-start flex-col justify-between rounded-xl border border-white/10 bg-gradient-to-br from-[#141628] to-[#0c0d16] p-4"
                              style={{ aspectRatio: "4 / 5" }}
                            >
                              <span className="font-mono text-[10px] font-bold text-[#6ea8ff]">
                                {String(n + 1).padStart(2, "0")}
                              </span>
                              <div>
                                <div className="text-sm font-extrabold leading-snug text-white">
                                  {s.heading}
                                </div>
                                <div className="mt-2 text-[11px] leading-relaxed text-white/60">
                                  {s.body}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>

        {/* ── 감지 레이더 ── */}
        <section>
          <div className="text-[11px] font-bold tracking-[0.3em] text-[var(--accent)]">
            DETECTION RADAR
          </div>
          <h2 className="mt-1 text-2xl font-extrabold text-[var(--text-primary)]">
            감지된 이벤트
          </h2>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            AI가 소재 가치를 0~100점으로 채점 — 점수 높은 건은 자동으로 초안이 생성되고,
            나머지는 여기서 직접 생성할 수 있습니다.
          </p>

          {!loading && events.length === 0 && (
            <p className="panel mt-5 p-8 text-center text-sm text-[var(--text-secondary)]">
              감지된 이벤트가 없습니다. 다음 수집을 기다리는 중입니다.
            </p>
          )}

          <div className="mt-5 space-y-3">
            {events.map((ev) => (
              <div key={ev.id} className="panel flex items-center gap-4 p-4">
                {ev.poster_url ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={ev.poster_url}
                    alt=""
                    className="h-16 w-11 shrink-0 rounded-md object-cover"
                  />
                ) : (
                  <div className="flex h-16 w-11 shrink-0 items-center justify-center rounded-md bg-[var(--accent)]/10 text-lg">
                    🎬
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-[var(--accent)]/10 px-1.5 py-0.5 text-[10px] font-bold text-[var(--accent)]">
                      {EVENT_LABEL[ev.event_type] ?? ev.event_type}
                    </span>
                    <span className="truncate text-sm font-bold text-[var(--text-primary)]">
                      {ev.title}
                    </span>
                  </div>
                  {ev.score_reason && (
                    <p className="mt-1 truncate text-[11px] text-[var(--text-secondary)]">
                      {ev.score_reason}
                    </p>
                  )}
                  {/* 점수 미터: 단일 지표 → accent 단일 색조 + 숫자 라벨 병기 */}
                  <div className="mt-2 flex items-center gap-2">
                    <div className="h-1.5 w-full max-w-52 overflow-hidden rounded-full bg-[var(--panel-border)]">
                      <div
                        className="h-full rounded-full bg-[var(--accent)]"
                        style={{ width: `${ev.score ?? 0}%` }}
                      />
                    </div>
                    <span className="font-mono text-xs font-bold text-[var(--accent)]">
                      {ev.score ?? "–"}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => generateFromEvent(ev.id)}
                  disabled={busyEvent !== null}
                  className="shrink-0 rounded-lg border border-[var(--panel-border)] px-3.5 py-2 text-xs font-bold text-[var(--text-primary)] transition hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:opacity-40"
                >
                  {busyEvent === ev.id ? "생성 중…" : "초안 생성"}
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* ── 작동 방식 ── */}
        <section className="pb-6">
          <div className="text-[11px] font-bold tracking-[0.3em] text-[var(--accent)]">
            HOW IT WORKS
          </div>
          <h2 className="mt-1 text-2xl font-extrabold text-[var(--text-primary)]">
            자동화 파이프라인
          </h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {[
              {
                icon: "📡",
                title: "1. 감지",
                desc: "KOFIC 박스오피스 순위 변동과 TMDB 신작·트렌딩을 전일과 비교해 이벤트로 포착",
              },
              {
                icon: "🧠",
                title: "2. AI 채점",
                desc: "대중 관심도·시의성·검색 수요 기준으로 소재 가치를 0~100점 채점",
              },
              {
                icon: "✍️",
                title: "3. 초안 생성",
                desc: "상위 이벤트만 하루 3건까지 포스팅 초안과 카드뉴스 문구를 자동 작성",
              },
            ].map((s) => (
              <div key={s.title} className="panel p-5">
                <span className="text-2xl">{s.icon}</span>
                <h3 className="mt-2 text-sm font-extrabold text-[var(--text-primary)]">
                  {s.title}
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-[var(--text-secondary)]">
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
