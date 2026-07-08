/**
 * Railway Postgres 연결 (영화소식 자동화 파이프라인 전용).
 * DATABASE_URL 없으면 isDbConfigured()가 false — 호출부에서 폴백 처리.
 * 스키마는 첫 쿼리 전에 ensureSchema()로 자동 생성.
 */

import { Pool } from "pg";

let pool: Pool | null = null;
let schemaReady: Promise<void> | null = null;

export function isDbConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
      // Railway 내부 네트워크는 sslmode 불필요, 외부 URL은 ssl 요구
      ssl: process.env.DATABASE_URL?.includes("railway.internal")
        ? undefined
        : { rejectUnauthorized: false },
    });
  }
  return pool;
}

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS movie_snapshots (
  id SERIAL PRIMARY KEY,
  kind TEXT NOT NULL,
  snapshot_date TEXT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (kind, snapshot_date)
);
CREATE TABLE IF NOT EXISTS movie_events (
  id SERIAL PRIMARY KEY,
  event_key TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  payload JSONB NOT NULL DEFAULT '{}',
  score INT,
  score_reason TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS movie_drafts (
  id SERIAL PRIMARY KEY,
  event_id INT REFERENCES movie_events(id) ON DELETE SET NULL,
  format TEXT NOT NULL,
  title TEXT NOT NULL,
  body_md TEXT NOT NULL,
  card_news JSONB,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
`;

async function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = getPool()
      .query(SCHEMA_SQL)
      .then(() => undefined)
      .catch((e) => {
        schemaReady = null;
        throw e;
      });
  }
  return schemaReady;
}

export async function dbQuery<T extends Record<string, unknown>>(
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  if (!isDbConfigured()) {
    throw new Error("DATABASE_URL 미설정 — Railway Postgres를 추가하세요.");
  }
  await ensureSchema();
  const res = await getPool().query(sql, params);
  return res.rows as T[];
}
