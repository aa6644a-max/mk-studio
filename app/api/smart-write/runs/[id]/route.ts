import type { NextRequest } from "next/server";
import { getRun } from "@/lib/writing/repository";
import { owner, json, view, errorResponse } from "@/lib/writing/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { return json({ run: view(await getRun(owner(req).id, (await params).id)) }); }
  catch (e) { return errorResponse(e); }
}
