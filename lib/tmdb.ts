/**
 * TMDB 영화 검색. 포스터·메타데이터 조회.
 * TMDB_API_KEY (v3) 사용. 키 없으면 mock 결과 폴백.
 */

import type { MovieDetails, TvDetails } from "@/lib/types";

const BASE = "https://api.themoviedb.org/3";
const IMG_BASE = "https://image.tmdb.org/t/p/w500";
const ORIG_BASE = "https://image.tmdb.org/t/p/original";

export type MovieResult = {
  id: number;
  title: string;
  originalTitle: string;
  year: string;
  posterUrl: string | null;
  overview: string;
  voteAverage: number;
};

const MOCK_RESULTS: MovieResult[] = [
  {
    id: 27205,
    title: "인셉션",
    originalTitle: "Inception",
    year: "2010",
    posterUrl: null,
    overview: "꿈 속의 꿈을 설계하는 도둑 코브의 마지막 작전.",
    voteAverage: 8.4,
  },
  {
    id: 157336,
    title: "인터스텔라",
    originalTitle: "Interstellar",
    year: "2014",
    posterUrl: null,
    overview: "멸망하는 지구를 떠나 새 행성을 찾는 우주 탐험.",
    voteAverage: 8.4,
  },
];

export function isTmdbConfigured(): boolean {
  return Boolean(process.env.TMDB_API_KEY);
}

/**
 * TMDB 호출. 키가 `eyJ...` (v4 Bearer JWT)면 Authorization 헤더,
 * 32자 v3 키면 api_key 쿼리. 둘 다 지원.
 */
function tmdbGet(
  path: string,
  params: Record<string, string> = {},
): Promise<Response> {
  const key = process.env.TMDB_API_KEY ?? "";
  const isV4 = key.startsWith("eyJ");
  const usp = new URLSearchParams({ language: "ko-KR", ...params });
  if (!isV4) usp.set("api_key", key);
  return fetch(`${BASE}${path}?${usp.toString()}`, {
    headers: isV4 ? { Authorization: `Bearer ${key}` } : undefined,
    next: { revalidate: 3600 },
  });
}

function mapResult(m: {
  id: number;
  title: string;
  original_title: string;
  release_date?: string;
  poster_path?: string | null;
  overview?: string;
  vote_average?: number;
}): MovieResult {
  return {
    id: m.id,
    title: m.title,
    originalTitle: m.original_title,
    year: m.release_date ? m.release_date.slice(0, 4) : "",
    posterUrl: m.poster_path ? `${IMG_BASE}${m.poster_path}` : null,
    overview: m.overview ?? "",
    voteAverage: m.vote_average ?? 0,
  };
}

export async function searchMovies(query: string): Promise<MovieResult[]> {
  const q = query.trim();
  if (!q) return [];

  const key = process.env.TMDB_API_KEY;
  if (!key) {
    return MOCK_RESULTS.filter((m) => m.title.includes(q) || true);
  }

  const res = await tmdbGet("/search/movie", { query: q, include_adult: "false" });
  if (!res.ok) {
    throw new Error(`TMDB 검색 실패: ${res.status}`);
  }
  const data = (await res.json()) as { results?: Parameters<typeof mapResult>[0][] };
  return (data.results ?? []).slice(0, 10).map(mapResult);
}

export async function searchTv(query: string): Promise<MovieResult[]> {
  const q = query.trim();
  if (!q) return [];
  const key = process.env.TMDB_API_KEY;
  if (!key) return MOCK_RESULTS;
  const res = await tmdbGet("/search/tv", { query: q });
  if (!res.ok) throw new Error(`TMDB TV 검색 실패: ${res.status}`);
  const data = (await res.json()) as {
    results?: {
      id: number;
      name: string;
      original_name: string;
      first_air_date?: string;
      poster_path?: string | null;
      overview?: string;
      vote_average?: number;
    }[];
  };
  return (data.results ?? []).slice(0, 10).map((m) => ({
    id: m.id,
    title: m.name,
    originalTitle: m.original_name,
    year: m.first_air_date ? m.first_air_date.slice(0, 4) : "",
    posterUrl: m.poster_path ? `${IMG_BASE}${m.poster_path}` : null,
    overview: m.overview ?? "",
    voteAverage: m.vote_average ?? 0,
  }));
}

// ── 영화 상세 (V2 get_movie_details 이식) ────────────
type CreditCrew = { job?: string; name?: string };
type CreditCast = { name?: string };
type Backdrop = { file_path?: string };

export async function getMovieDetails(id: number): Promise<MovieDetails | null> {
  const key = process.env.TMDB_API_KEY;
  if (!key) {
    return {
      id,
      title: "인셉션",
      originalTitle: "Inception",
      country: "미국",
      releaseDate: "2010-07-21",
      director: "크리스토퍼 놀란",
      actors: "레오나르도 디카프리오, 조셉 고든레빗, 엘렌 페이지",
      genres: "액션, SF, 스릴러",
      overview: "꿈 속의 꿈을 설계하는 도둑 코브의 마지막 작전.",
      posterUrl: undefined,
      backdropUrls: [],
    };
  }

  const res = await tmdbGet(`/movie/${id}`, {
    append_to_response: "credits,images",
    include_image_language: "ko,en,null",
  });
  if (!res.ok) throw new Error(`TMDB 상세 실패: ${res.status}`);
  const data = (await res.json()) as {
    id?: number;
    title?: string;
    original_title?: string;
    release_date?: string;
    overview?: string;
    poster_path?: string | null;
    backdrop_path?: string | null;
    runtime?: number | null;
    genres?: { name?: string }[];
    production_countries?: { name?: string }[];
    credits?: { crew?: CreditCrew[]; cast?: CreditCast[] };
    images?: { backdrops?: Backdrop[] };
  };

  const director =
    data.credits?.crew?.find((c) => c.job === "Director")?.name ?? "정보 없음";
  const actors =
    (data.credits?.cast ?? [])
      .slice(0, 3)
      .map((c) => c.name)
      .filter(Boolean)
      .join(", ") || "정보 없음";
  const genres =
    (data.genres ?? []).map((g) => g.name).filter(Boolean).join(", ") || "정보 없음";
  const country =
    (data.production_countries ?? []).map((c) => c.name).filter(Boolean).join(", ") ||
    "정보 없음";

  let backdropUrls = (data.images?.backdrops ?? [])
    .slice(0, 10)
    .map((b) => b.file_path)
    .filter((p): p is string => Boolean(p))
    .map((p) => `${ORIG_BASE}${p}`);
  if (!backdropUrls.length && data.backdrop_path) {
    backdropUrls = [`${ORIG_BASE}${data.backdrop_path}`];
  }

  return {
    id: data.id,
    title: data.title ?? "",
    originalTitle: data.original_title ?? "정보 없음",
    country,
    releaseDate: data.release_date || "정보 없음",
    director,
    actors,
    genres,
    runtime: data.runtime ?? undefined,
    overview: data.overview || "TMDB에 등록된 공식 줄거리가 없습니다.",
    posterUrl: data.poster_path ? `${IMG_BASE}${data.poster_path}` : undefined,
    backdropUrls,
  };
}

// ── TV 상세 (정주행, V2 get_tv_details 이식) ──────────
export async function getTvDetails(id: number): Promise<TvDetails | null> {
  const key = process.env.TMDB_API_KEY;
  if (!key) {
    return {
      id,
      title: "오징어 게임",
      numberOfEpisodes: 9,
      numberOfSeasons: 1,
      episodeRuntime: 55,
      totalWatchTime: "8시간 15분",
      genres: "드라마, 스릴러",
      overview: "빚에 쫓기는 사람들의 목숨을 건 서바이벌.",
      cast: "이정재, 박해수, 위하준",
      backdropUrls: [],
    };
  }

  const res = await tmdbGet(`/tv/${id}`, {
    append_to_response: "credits,images",
    include_image_language: "ko,en,null",
  });
  if (!res.ok) throw new Error(`TMDB TV 상세 실패: ${res.status}`);
  const data = (await res.json()) as {
    id?: number;
    name?: string;
    original_name?: string;
    first_air_date?: string;
    number_of_episodes?: number;
    number_of_seasons?: number;
    episode_run_time?: number[];
    overview?: string;
    poster_path?: string | null;
    backdrop_path?: string | null;
    genres?: { name?: string }[];
    production_countries?: { name?: string }[];
    credits?: { cast?: CreditCast[] };
    images?: { backdrops?: Backdrop[] };
  };

  const avgRuntime = data.episode_run_time?.[0] ?? 24;
  const totalEpisodes = data.number_of_episodes ?? 0;
  const totalMinutes = totalEpisodes * avgRuntime;
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  const totalWatchTime =
    hours > 0 ? (mins ? `${hours}시간 ${mins}분` : `${hours}시간`) : `${totalMinutes}분`;

  let backdropUrls = (data.images?.backdrops ?? [])
    .slice(0, 5)
    .map((b) => b.file_path)
    .filter((p): p is string => Boolean(p))
    .map((p) => `${ORIG_BASE}${p}`);
  if (!backdropUrls.length && data.backdrop_path) {
    backdropUrls = [`${ORIG_BASE}${data.backdrop_path}`];
  }

  return {
    id: data.id,
    title: data.name ?? "",
    originalTitle: data.original_name ?? "정보 없음",
    country:
      (data.production_countries ?? []).map((c) => c.name).filter(Boolean).join(", ") ||
      "정보 없음",
    firstAirDate: data.first_air_date || "정보 없음",
    numberOfEpisodes: totalEpisodes,
    numberOfSeasons: data.number_of_seasons ?? 1,
    episodeRuntime: avgRuntime,
    totalWatchTime,
    genres:
      (data.genres ?? []).map((g) => g.name).filter(Boolean).join(", ") || "정보 없음",
    overview: data.overview || "TMDB에 등록된 공식 줄거리가 없습니다.",
    cast:
      (data.credits?.cast ?? [])
        .slice(0, 3)
        .map((c) => c.name)
        .filter(Boolean)
        .join(", ") || "정보 없음",
    posterUrl: data.poster_path ? `${IMG_BASE}${data.poster_path}` : undefined,
    backdropUrls,
  };
}

// ── 목록 조회 (영화소식 자동수집용) ────────────
export type MovieListKind = "trending" | "now_playing" | "upcoming";

/**
 * trending은 전세계 일간, now_playing/upcoming은 region=KR.
 * 상위 10개만 반환 — 이벤트 감지(전일 스냅샷 비교)에 사용.
 */
export async function getMovieList(kind: MovieListKind): Promise<MovieResult[]> {
  const key = process.env.TMDB_API_KEY;
  if (!key) return MOCK_RESULTS;

  const path = kind === "trending" ? "/trending/movie/day" : `/movie/${kind}`;
  const params: Record<string, string> =
    kind === "trending" ? {} : { region: "KR" };
  const res = await tmdbGet(path, params);
  if (!res.ok) throw new Error(`TMDB ${kind} 실패: ${res.status}`);
  const data = (await res.json()) as {
    results?: Parameters<typeof mapResult>[0][];
  };
  return (data.results ?? []).slice(0, 10).map(mapResult);
}

export type TmdbSelectionRef = { id: number; title: string; mediaType: "movie" | "tv" };

/**
 * 선택된 작품들의 TMDB 상세(줄거리·감독·출연·장르)를 프롬프트용 텍스트로 포맷.
 * 전략 수립·인터뷰 양쪽이 공유 — "내 감상 × AI 조사 교차"의 조사 재료.
 */
export async function formatTmdbDetailsText(selections: TmdbSelectionRef[]): Promise<string> {
  const parts = await Promise.all(
    selections.map(async (sel) => {
      if (sel.mediaType === "tv") {
        const d = await getTvDetails(sel.id).catch(() => null);
        if (!d) return `- ${sel.title} (상세 조회 실패)`;
        return `[작품: ${d.title} (${d.originalTitle ?? ""})]\n장르: ${d.genres ?? "?"}\n출연: ${d.cast ?? "?"}\n시즌/화수: ${d.numberOfSeasons ?? "?"}시즌 ${d.numberOfEpisodes ?? "?"}화\n줄거리: ${d.overview ?? ""}`;
      }
      const d = await getMovieDetails(sel.id).catch(() => null);
      if (!d) return `- ${sel.title} (상세 조회 실패)`;
      return `[작품: ${d.title} (${d.originalTitle ?? ""})]\n장르: ${d.genres ?? "?"}\n감독: ${d.director ?? "?"}\n출연: ${d.actors ?? "?"}\n개봉: ${d.releaseDate ?? "?"}\n줄거리: ${d.overview ?? ""}`;
    }),
  );
  return parts.join("\n\n");
}
