import { randomUUID } from "node:crypto";
import { dbQuery, isDbConfigured } from "@/lib/db";
import { WritingError, type Run } from "./types";

export function storageKind(): "postgres" | "local" {
  if (isDbConfigured()) return "postgres";
  if (process.env.NODE_ENV === "production") throw new WritingError("작업 저장을 위해 DATABASE_URL을 설정해주세요.", 503);
  return "local";
}
async function local() {
  // This build-time branch excludes development filesystem code from production.
  if (process.env.NODE_ENV === "production") throw new WritingError("작업 저장을 위해 DATABASE_URL을 설정해주세요.", 503);
  return import("./local-repository");
}
let schema: Promise<unknown> | undefined;
async function ready() {
  if (!schema) schema = dbQuery(`CREATE TABLE IF NOT EXISTS writing_runs (
    id UUID PRIMARY KEY, owner TEXT NOT NULL, version INT NOT NULL DEFAULT 0,
    payload JSONB NOT NULL, lease TEXT, lease_until TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`).catch(e => { schema = undefined; throw e; });
  await schema;
}
function validateId(id: string) {
  if (!/^[a-f0-9-]{36}$/.test(id)) throw new WritingError("작업을 찾을 수 없습니다.", 404);
}
export async function createRun(owner: string, run: Run): Promise<Run> {
  validateId(run.id);
  if (storageKind() === "local") return (await local()).createRun(owner, run);
  await ready();
  await dbQuery("INSERT INTO writing_runs (id, owner, payload) VALUES ($1,$2,$3) ON CONFLICT (id) DO NOTHING", [run.id, owner, JSON.stringify(run)]);
  return getRun(owner, run.id);
}
export async function getRun(owner: string, id: string): Promise<Run> {
  validateId(id);
  if (storageKind() === "local") return (await local()).getRun(owner, id);
  await ready();
  const rows = await dbQuery<{ payload: Run }>("SELECT payload FROM writing_runs WHERE id=$1 AND owner=$2", [id, owner]);
  if (!rows[0]) throw new WritingError("작업을 찾을 수 없습니다.", 404);
  return rows[0].payload;
}
/** A lease serializes calls. Version and lease checks discard stale results. */
export async function mutateRun(owner: string, id: string, version: number, change: (run: Run) => Promise<void>): Promise<Run> {
  validateId(id);
  if (storageKind() === "local") return (await local()).mutateRun(owner, id, version, change);
  const run = await getRun(owner, id);
  if (run.version !== version) throw new WritingError("다른 요청이 먼저 반영됐습니다. 최신 상태로 이어갑니다.", 409);
  const token = randomUUID();
  const rows = await dbQuery("UPDATE writing_runs SET lease=$4, lease_until=now()+interval '4 minutes' WHERE id=$1 AND owner=$2 AND version=$3 AND (lease IS NULL OR lease_until<now()) RETURNING id", [id, owner, version, token]);
  if (!rows.length) throw new WritingError("이전 단계를 처리하고 있습니다.", 409);
  try {
    const current = await getRun(owner, id);
    if (current.version !== version) throw new WritingError("최신 작업 상태를 다시 불러옵니다.", 409);
    await change(current);
    current.version++; current.updatedAt = new Date().toISOString();
    const saved = await dbQuery("UPDATE writing_runs SET payload=$4, version=$5, updated_at=now(), lease=NULL, lease_until=NULL WHERE id=$1 AND owner=$2 AND version=$3 AND lease=$6 AND lease_until>now() RETURNING id", [id, owner, version, JSON.stringify(current), current.version, token]);
    if (!saved.length) throw new WritingError("작업 시간이 만료됐습니다. 저장된 단계에서 다시 시도해주세요.", 409);
    return current;
  } finally {
    await dbQuery("UPDATE writing_runs SET lease=NULL, lease_until=NULL WHERE id=$1 AND owner=$2 AND lease=$3", [id, owner, token]);
  }
}
