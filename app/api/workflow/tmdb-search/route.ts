import { NextResponse } from "next/server";
import { searchMovies, searchTv } from "@/lib/tmdb";

export async function POST(req: Request) {
  try {
    const { query, mediaType } = (await req.json()) as {
      query: string;
      mediaType: "movie" | "tv";
    };

    const results =
      mediaType === "tv" ? await searchTv(query) : await searchMovies(query);

    return NextResponse.json(results.slice(0, 5));
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
