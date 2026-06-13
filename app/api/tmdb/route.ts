import { NextResponse } from "next/server";
import { searchMovies } from "@/lib/tmdb";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q") ?? "";
  if (!q.trim()) {
    return NextResponse.json({ results: [] });
  }
  try {
    const results = await searchMovies(q);
    return NextResponse.json({ results });
  } catch (e) {
    return NextResponse.json(
      { results: [], error: (e as Error).message },
      { status: 502 },
    );
  }
}
