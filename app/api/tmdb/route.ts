import { NextResponse } from "next/server";
import { searchMovies, searchTv } from "@/lib/tmdb";

// GET /api/tmdb?q=...&type=movie|tv → 검색
export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? "";
  const type = url.searchParams.get("type") ?? "movie";
  if (!q.trim()) return NextResponse.json({ results: [] });
  try {
    const results = type === "tv" ? await searchTv(q) : await searchMovies(q);
    return NextResponse.json({ results });
  } catch (e) {
    return NextResponse.json(
      { results: [], error: (e as Error).message },
      { status: 502 },
    );
  }
}
