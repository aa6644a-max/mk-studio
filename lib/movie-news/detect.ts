/**
 * 영화소식 이벤트 감지 (1단계: 구조 데이터).
 * - KOFIC 박스오피스: 신규 1위, TOP10 신규 진입, 순위 급상승, 일일 브리핑
 * - TMDB trending/now_playing/upcoming: 전일 스냅샷 대비 신규 등장
 * 감지된 이벤트는 event_key로 dedup — 같은 소식 재생성 방지.
 */

import { getBoxOffice, type BoxOfficeMovie } from "@/lib/kobis";
import { getMovieList, type MovieListKind, type MovieResult } from "@/lib/tmdb";
import { dbQuery } from "@/lib/db";

export type MovieEvent = {
  eventKey: string;
  eventType:
    | "boxoffice_briefing"
    | "boxoffice_new_no1"
    | "boxoffice_new_entry"
    | "boxoffice_surge"
    | "tmdb_release"
    | "tmdb_upcoming"
    | "tmdb_trending";
  title: string;
  summary: string;
  payload: Record<string, unknown>;
};

function kstDate(): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul" }).format(
    new Date(),
  ); // YYYY-MM-DD
}

function detectBoxOfficeEvents(list: BoxOfficeMovie[], date: string): MovieEvent[] {
  const events: MovieEvent[] = [];
  if (!list.length) return events;

  const top5 = list
    .slice(0, 5)
    .map((m) => `${m.rank}위 ${m.movieNm} (누적 ${Number(m.audiAcc).toLocaleString()}명)`)
    .join(", ");
  events.push({
    eventKey: `boxoffice-briefing-${date}`,
    eventType: "boxoffice_briefing",
    title: `박스오피스 일일 브리핑 (${date})`,
    summary: top5,
    payload: { list },
  });

  for (const m of list) {
    const rank = Number(m.rank);
    const inten = Number(m.rankInten);
    if (rank === 1 && (m.rankOldAndNew === "NEW" || inten > 0)) {
      events.push({
        eventKey: `boxoffice-new1-${m.movieCd}`,
        eventType: "boxoffice_new_no1",
        title: `박스오피스 새 1위: ${m.movieNm}`,
        summary: `${m.movieNm}이(가) 박스오피스 1위 등극. 누적 ${Number(m.audiAcc).toLocaleString()}명.`,
        payload: { movie: m },
      });
    } else if (m.rankOldAndNew === "NEW") {
      events.push({
        eventKey: `boxoffice-entry-${m.movieCd}`,
        eventType: "boxoffice_new_entry",
        title: `TOP10 신규 진입: ${m.movieNm} (${m.rank}위)`,
        summary: `${m.movieNm}이(가) 박스오피스 ${m.rank}위로 신규 진입.`,
        payload: { movie: m },
      });
    } else if (inten >= 3) {
      events.push({
        eventKey: `boxoffice-surge-${m.movieCd}-${date}`,
        eventType: "boxoffice_surge",
        title: `순위 급상승: ${m.movieNm} (+${inten} → ${m.rank}위)`,
        summary: `${m.movieNm}이(가) 전일 대비 ${inten}계단 상승해 ${m.rank}위.`,
        payload: { movie: m },
      });
    }
  }
  return events;
}

/** 전일 스냅샷과 비교해 신규 등장 영화 이벤트 생성 + 오늘 스냅샷 저장 */
async function detectTmdbEvents(
  kind: MovieListKind,
  list: MovieResult[],
  date: string,
): Promise<MovieEvent[]> {
  const prev = await dbQuery<{ payload: { ids?: number[] } }>(
    `SELECT payload FROM movie_snapshots
     WHERE kind = $1 AND snapshot_date < $2
     ORDER BY snapshot_date DESC LIMIT 1`,
    [kind, date],
  );
  await dbQuery(
    `INSERT INTO movie_snapshots (kind, snapshot_date, payload)
     VALUES ($1, $2, $3)
     ON CONFLICT (kind, snapshot_date) DO UPDATE SET payload = EXCLUDED.payload`,
    [kind, date, JSON.stringify({ ids: list.map((m) => m.id), list })],
  );

  // 첫 실행(비교 기준 없음)이면 이벤트 생성 안 함 — 전부 "신규"로 오탐하므로
  if (!prev.length) return [];
  const prevIds = new Set(prev[0].payload.ids ?? []);

  const meta: Record<MovieListKind, { type: MovieEvent["eventType"]; label: string }> = {
    now_playing: { type: "tmdb_release", label: "신규 개봉" },
    upcoming: { type: "tmdb_upcoming", label: "개봉 예정" },
    trending: { type: "tmdb_trending", label: "트렌딩 진입" },
  };
  const { type, label } = meta[kind];

  return list
    .filter((m) => !prevIds.has(m.id))
    .map((m) => ({
      eventKey: `${type}-${m.id}`,
      eventType: type,
      title: `${label}: ${m.title}${m.year ? ` (${m.year})` : ""}`,
      summary: m.overview.slice(0, 200),
      payload: { movie: m },
    }));
}

export type DetectResult = { detected: number; inserted: number };

/** 전체 소스 수집 → 이벤트 감지 → DB upsert. 신규 삽입 건수 반환. */
export async function detectAndStoreEvents(): Promise<DetectResult> {
  const date = kstDate();
  const [boxoffice, trending, nowPlaying, upcoming] = await Promise.all([
    getBoxOffice(10).catch(() => [] as BoxOfficeMovie[]),
    getMovieList("trending").catch(() => [] as MovieResult[]),
    getMovieList("now_playing").catch(() => [] as MovieResult[]),
    getMovieList("upcoming").catch(() => [] as MovieResult[]),
  ]);

  const events: MovieEvent[] = [
    ...detectBoxOfficeEvents(boxoffice, date),
    ...(await detectTmdbEvents("trending", trending, date)),
    ...(await detectTmdbEvents("now_playing", nowPlaying, date)),
    ...(await detectTmdbEvents("upcoming", upcoming, date)),
  ];

  let inserted = 0;
  for (const ev of events) {
    const rows = await dbQuery(
      `INSERT INTO movie_events (event_key, event_type, title, summary, payload)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (event_key) DO NOTHING
       RETURNING id`,
      [ev.eventKey, ev.eventType, ev.title, ev.summary, JSON.stringify(ev.payload)],
    );
    if (rows.length) inserted++;
  }
  return { detected: events.length, inserted };
}
