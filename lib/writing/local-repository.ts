/** Development-only durable store. Never imported in a production build. */
import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile, rename, open, unlink, stat, link } from "node:fs/promises";
import path from "node:path";
import { WritingError, type Run } from "./types";

const LEASE_MS = 240000;
const directory = path.join(process.cwd(), ".data", process.env.NODE_ENV === "test" ? "writing-tests" : "writing");
type Stored = { owner: string; run: Run };
function file(id: string) {
  if (!/^[a-f0-9-]{36}$/.test(id)) throw new WritingError("작업을 찾을 수 없습니다.", 404);
  return path.join(directory, `${id}.json`);
}
async function localRead(id: string): Promise<Stored> {
  try { return JSON.parse(await readFile(file(id), "utf8")); }
  catch (e) { if ((e as NodeJS.ErrnoException).code === "ENOENT") throw new WritingError("작업을 찾을 수 없습니다.", 404); throw e; }
}
async function localWrite(value: Stored) {
  const target = file(value.run.id), tmp = `${target}.${randomUUID()}.tmp`;
  await writeFile(tmp, JSON.stringify(value), { mode: 0o600 });
  await rename(tmp, target);
}
export async function createRun(owner: string, run: Run): Promise<Run> {
  await mkdir(directory, { recursive: true });
  // Publish an entire file atomically; the client UUID makes retries idempotent.
  const temporary = `${file(run.id)}.${randomUUID()}.tmp`;
  await writeFile(temporary, JSON.stringify({ owner, run }), { mode: 0o600 });
  try { await link(temporary, file(run.id)); }
  catch (e) { if ((e as NodeJS.ErrnoException).code !== "EEXIST") throw e; }
  finally { await unlink(temporary); }
  return getRun(owner, run.id);
}
export async function getRun(owner: string, id: string): Promise<Run> {
  const value = await localRead(id);
  if (value.owner !== owner) throw new WritingError("작업을 찾을 수 없습니다.", 404);
  return value.run;
}
export async function mutateRun(owner: string, id: string, version: number, change: (run: Run) => Promise<void>): Promise<Run> {
  const run = await getRun(owner, id);
  if (run.version !== version) throw new WritingError("다른 요청이 먼저 반영됐습니다. 최신 상태로 이어갑니다.", 409);
  const token = randomUUID(), lockFile = `${file(id)}.lock`;
  try { const info = await stat(lockFile); if (Date.now() - info.mtimeMs > LEASE_MS) await unlink(lockFile); } catch (e) { if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e; }
  let handle;
  try { handle = await open(lockFile, "wx"); } catch { throw new WritingError("이전 단계를 처리하고 있습니다.", 409); }
  try { await handle.writeFile(token); } finally { await handle.close(); }
  try {
    const current = await getRun(owner, id);
    if (current.version !== version) throw new WritingError("최신 작업 상태를 다시 불러옵니다.", 409);
    await change(current);
    current.version++; current.updatedAt = new Date().toISOString();
    const held = await readFile(lockFile, "utf8");
    if (held !== token || Date.now() - (await stat(lockFile)).mtimeMs > LEASE_MS) throw new WritingError("작업 시간이 만료됐습니다.", 409);
    await localWrite({ owner, run: current });
    return current;
  } finally { try { if (await readFile(lockFile, "utf8") === token) await unlink(lockFile); } catch { /* expired lease */ } }
}
