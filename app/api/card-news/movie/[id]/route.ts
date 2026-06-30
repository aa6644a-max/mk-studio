import type { NextRequest } from "next/server";

const BASE = "https://api.themoviedb.org/3";

function tmdbGet(path: string, params: Record<string, string> = {}) {
  const key = process.env.TMDB_API_KEY ?? "";
  const isV4 = key.startsWith("eyJ");
  const usp = new URLSearchParams({ language: "ko-KR", ...params });
  if (!isV4) usp.set("api_key", key);
  return fetch(`${BASE}${path}?${usp.toString()}`, {
    headers: isV4 ? { Authorization: `Bearer ${key}` } : undefined,
    next: { revalidate: 3600 },
  });
}

interface OmdbResponse {
  Response: string;
  Awards?: string;
  Rated?: string;
  Ratings?: { Source: string; Value: string }[];
}

async function fetchOmdb(imdbId?: string): Promise<OmdbResponse | null> {
  const key = process.env.OMDB_API_KEY;
  if (!key || !imdbId) return null;
  try {
    const res = await fetch(`https://www.omdbapi.com/?apikey=${key}&i=${imdbId}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as OmdbResponse;
    return data.Response === "True" ? data : null;
  } catch {
    return null;
  }
}

interface TMDBImage { file_path: string }

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const [detailRes, imagesRes] = await Promise.all([
    tmdbGet(`/movie/${id}`, { append_to_response: "credits" }),
    tmdbGet(`/movie/${id}/images`, { include_image_language: "ko,en,null" }),
  ]);

  if (!detailRes.ok) {
    return Response.json({ error: "영화 정보를 찾을 수 없습니다" }, { status: 404 });
  }

  const detail = await detailRes.json();
  const images = imagesRes.ok ? await imagesRes.json() : { backdrops: [], posters: [] };

  const crew = (detail.credits?.crew ?? []) as { job: string; name: string }[];
  const cast = (detail.credits?.cast ?? []) as { name: string }[];
  const director = crew.find((c) => c.job === "Director")?.name ?? "";
  const production =
    ((detail.production_companies ?? []) as { name: string }[])[0]?.name ?? "";

  const ratings: { source: string; value: string }[] = [];
  if (typeof detail.vote_average === "number" && detail.vote_average > 0) {
    ratings.push({ source: "TMDB", value: detail.vote_average.toFixed(1) });
  }
  const omdb = await fetchOmdb(detail.imdb_id);
  if (omdb) {
    for (const r of omdb.Ratings ?? []) {
      if (r.Source === "Internet Movie Database") {
        ratings.push({ source: "IMDb", value: r.Value.split("/")[0] });
      } else if (r.Source === "Metacritic") {
        ratings.push({ source: "Metacritic", value: r.Value.split("/")[0] });
      }
    }
  }

  return Response.json({
    id: detail.id,
    title: detail.title,
    original_title: detail.original_title,
    overview: detail.overview,
    tagline: detail.tagline ?? "",
    release_date: detail.release_date,
    runtime: detail.runtime ?? 0,
    vote_average: detail.vote_average,
    genres: (detail.genres as { name: string }[]).map((g) => g.name),
    director,
    production,
    cast: cast.slice(0, 4).map((c) => c.name),
    ratings,
    poster_path: detail.poster_path,
    backdrop_path: detail.backdrop_path,
    backdrops: (images.backdrops as TMDBImage[]).slice(0, 12).map((b) => b.file_path),
    posters: (images.posters as TMDBImage[]).slice(0, 6).map((p) => p.file_path),
  });
}
