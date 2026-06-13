import { NextResponse } from "next/server";
import { getMovieDetails, getTvDetails } from "@/lib/tmdb";

// GET /api/tmdb/details?id=123&type=movie|tv → 상세(감독/배우/스틸컷 등)
export async function GET(req: Request) {
  const url = new URL(req.url);
  const id = Number(url.searchParams.get("id"));
  const type = url.searchParams.get("type") ?? "movie";
  if (!id) return NextResponse.json({ error: "id 필요" }, { status: 400 });
  try {
    const details =
      type === "tv" ? await getTvDetails(id) : await getMovieDetails(id);
    return NextResponse.json({ details });
  } catch (e) {
    return NextResponse.json(
      { details: null, error: (e as Error).message },
      { status: 502 },
    );
  }
}
