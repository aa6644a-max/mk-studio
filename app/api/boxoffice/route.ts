import { NextResponse } from "next/server";
import { getBoxOffice } from "@/lib/kobis";

export async function GET() {
  try {
    const movies = await getBoxOffice(5);
    return NextResponse.json({ movies });
  } catch (e) {
    return NextResponse.json(
      { movies: [], error: (e as Error).message },
      { status: 502 },
    );
  }
}
