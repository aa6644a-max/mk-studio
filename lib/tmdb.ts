/**
 * TMDB 영화 검색. 포스터·메타데이터 조회.
 * TMDB_API_KEY (v3) 사용. 키 없으면 mock 결과 폴백.
 */

const BASE = "https://api.themoviedb.org/3";
const IMG_BASE = "https://image.tmdb.org/t/p/w500";

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

  const url = `${BASE}/search/movie?api_key=${key}&language=ko-KR&query=${encodeURIComponent(
    q,
  )}&include_adult=false`;
  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) {
    throw new Error(`TMDB 검색 실패: ${res.status}`);
  }
  const data = (await res.json()) as { results?: Parameters<typeof mapResult>[0][] };
  return (data.results ?? []).slice(0, 10).map(mapResult);
}
