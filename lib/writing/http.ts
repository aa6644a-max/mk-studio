import { createHash, randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { storageKind } from "./repository";
import { friendlyError } from "./engine";
import { WritingError, record, type Run, type RunView } from "./types";

const COOKIE = "mk-writing-owner";
export function owner(req: NextRequest, create = false) {
  let token = req.cookies.get(COOKIE)?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) {
    if (!create) throw new WritingError("작업을 만든 브라우저에서 다시 열어주세요.", 401);
    token = randomBytes(32).toString("hex");
  }
  return { id: createHash("sha256").update(token).digest("hex"), token };
}
export function attachOwner(req: NextRequest, response: NextResponse, token: string) {
  response.cookies.set(COOKIE, token, { httpOnly: true, sameSite: "strict", secure: req.nextUrl.protocol === "https:", path: "/api/smart-write", maxAge: 60 * 60 * 24 * 365 });
  return response;
}
export function checkOrigin(req: NextRequest) {
  const origin = req.headers.get("origin");
  // Next's dev URL can normalize 127.0.0.1 to localhost. Compare the actual Host header.
  if (origin) {
    let originHost = "";
    try { const parsed = new URL(origin); if (["http:", "https:"].includes(parsed.protocol)) originHost = parsed.host; } catch { /* rejected below */ }
    if (originHost.toLowerCase() !== (req.headers.get("host") || req.nextUrl.host).toLowerCase()) throw new WritingError("같은 사이트에서 요청해주세요.", 403);
  }
  if (req.headers.get("sec-fetch-site") === "cross-site") throw new WritingError("허용되지 않은 요청입니다.", 403);
}
export async function jsonBody(req: NextRequest) {
  checkOrigin(req);
  const text = await req.text();
  if (text.length > 400000) throw new WritingError("입력 자료가 너무 큽니다.", 413);
  try { return record(JSON.parse(text)); } catch (e) { if (e instanceof WritingError) throw e; throw new WritingError("입력 형식을 확인해주세요."); }
}
export function view(run: Run): RunView {
  const { persona, ...rest } = run;
  return { ...rest, personaVersion: persona.version, storage: storageKind() };
}
export function json(value: unknown, status = 200) { return NextResponse.json(value, { status, headers: { "Cache-Control": "no-store" } }); }
export function errorResponse(e: unknown) { return json({ error: friendlyError(e) }, e instanceof WritingError ? e.status : 500); }
