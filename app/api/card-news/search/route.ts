import type { NextRequest } from "next/server";
import { searchMovies } from "@/lib/tmdb";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (!q) return Response.json({ results: [] });
  try {
    const results = await searchMovies(q);
    return Response.json({ results });
  } catch {
    return Response.json({ error: "검색 실패" }, { status: 500 });
  }
}
