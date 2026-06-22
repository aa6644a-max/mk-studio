import { google } from "googleapis";
import type { Post, PostStatus, PostType } from "./types";

/**
 * Google Sheets DB (MK_CINELAB_DB) 연동.
 * 스키마: A timestamp | B movie_title | C post_type | D content | E status
 *
 * 인증: GOOGLE_CREDENTIALS_JSON (서비스 계정 JSON 문자열).
 * 시트 지정: GOOGLE_SPREADSHEET_ID 우선, 없으면 GOOGLE_SPREADSHEET_NAME 으로 Drive 검색.
 *
 * 자격증명 없으면 메모리 mock 으로 폴백 → 키 없이도 UI 동작.
 */

const SHEET_RANGE = "A:E";
const SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/drive.readonly",
];

let cachedSpreadsheetId: string | null = null;

function getCredentials(): Record<string, unknown> | null {
  const raw = process.env.GOOGLE_CREDENTIALS_JSON;
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    console.error("[google-sheets] GOOGLE_CREDENTIALS_JSON 파싱 실패");
    return null;
  }
}

export function isSheetsConfigured(): boolean {
  return getCredentials() !== null;
}

async function getAuth() {
  const credentials = getCredentials();
  if (!credentials) return null;
  return new google.auth.GoogleAuth({ credentials, scopes: SCOPES });
}

async function getSpreadsheetId(
  auth: NonNullable<Awaited<ReturnType<typeof getAuth>>>,
): Promise<string> {
  if (process.env.GOOGLE_SPREADSHEET_ID) {
    return process.env.GOOGLE_SPREADSHEET_ID;
  }
  if (cachedSpreadsheetId) return cachedSpreadsheetId;

  const name = process.env.GOOGLE_SPREADSHEET_NAME ?? "MK_CINELAB_DB";
  const drive = google.drive({ version: "v3", auth });
  const res = await drive.files.list({
    q: `name='${name}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`,
    fields: "files(id,name)",
    pageSize: 1,
  });
  const file = res.data.files?.[0];
  if (!file?.id) {
    throw new Error(`스프레드시트 '${name}' 를 찾을 수 없음`);
  }
  cachedSpreadsheetId = file.id;
  return file.id;
}

// ── mock 폴백 (자격증명 없을 때) ──────────────────────
const MOCK_POSTS: Post[] = [
  {
    timestamp: "2026-06-10 21:30:00",
    movieTitle: "그랜드 부다페스트 호텔",
    postType: "review",
    content: "<p>웨스 앤더슨의 대칭미학...</p>",
    status: "published",
  },
  {
    timestamp: "2026-06-08 14:12:00",
    movieTitle: "듄: 파트 2",
    postType: "review",
    content: "<p>모래 위의 서사시...</p>",
    status: "published",
  },
  {
    timestamp: "2026-06-05 09:45:00",
    movieTitle: "6월 추천 SF 5선",
    postType: "curation",
    content: "<p>이번 달 정주행 목록...</p>",
    status: "draft",
  },
];

function rowToPost(row: string[]): Post {
  return {
    timestamp: row[0] ?? "",
    movieTitle: row[1] ?? "",
    postType: (row[2] as PostType) ?? "review",
    content: row[3] ?? "",
    status: (row[4] as PostStatus) ?? "draft",
  };
}

function postToRow(post: Post): string[] {
  return [
    post.timestamp,
    post.movieTitle,
    post.postType,
    post.content,
    post.status,
  ];
}

/** 전체 포스트 조회 (최신순). status 필터 선택. */
export async function getPosts(filter?: PostStatus): Promise<Post[]> {
  const auth = await getAuth();
  let posts: Post[];

  if (!auth) {
    posts = [...MOCK_POSTS];
  } else {
    const spreadsheetId = await getSpreadsheetId(auth);
    const sheets = google.sheets({ version: "v4", auth });
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: SHEET_RANGE,
    });
    const rows = res.data.values ?? [];
    // 데이터 행만: A열이 'YYYY-MM-DD' 타임스탬프인 행 (헤더/빈행 자동 제외)
    const body = rows.filter((r) => /^\d{4}-\d{2}-\d{2}/.test(r[0] ?? ""));
    posts = body.map(rowToPost);
  }

  posts.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  return filter ? posts.filter((p) => p.status === filter) : posts;
}

/** 최근 N개 조회. */
export async function getRecentPosts(n = 3): Promise<Post[]> {
  const posts = await getPosts();
  return posts.slice(0, n);
}

/** 같은 포스팅 타입만 필터링해서 최근 N개 반환. */
export async function getPostsByType(postType: string, n = 3): Promise<Post[]> {
  const posts = await getPosts();
  return posts.filter((p) => p.postType === postType).slice(0, n);
}

/** 포스트 1건 추가. */
export async function appendPost(
  post: Omit<Post, "timestamp"> & { timestamp?: string },
): Promise<Post> {
  const full: Post = {
    ...post,
    timestamp: post.timestamp ?? formatTimestamp(new Date()),
  };

  const auth = await getAuth();
  if (!auth) {
    MOCK_POSTS.unshift(full);
    return full;
  }

  const spreadsheetId = await getSpreadsheetId(auth);
  const sheets = google.sheets({ version: "v4", auth });
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: SHEET_RANGE,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [postToRow(full)] },
  });
  return full;
}

/** 대시보드 통계. */
export async function getStats(): Promise<{
  total: number;
  thisMonth: number;
  publishedRatio: number;
}> {
  const posts = await getPosts();
  const ym = new Date().toISOString().slice(0, 7); // YYYY-MM
  const thisMonth = posts.filter((p) => p.timestamp.startsWith(ym)).length;
  const published = posts.filter((p) => p.status === "published").length;
  return {
    total: posts.length,
    thisMonth,
    publishedRatio: posts.length ? Math.round((published / posts.length) * 100) : 0,
  };
}

export function formatTimestamp(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(
    d.getHours(),
  )}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

/** 블로그 원본 글 저장 (PostType 제약 없이 raw row 삽입). */
export async function appendBlogPost(
  title: string,
  content: string,
): Promise<void> {
  const auth = await getAuth();
  if (!auth) return;
  const spreadsheetId = await getSpreadsheetId(auth);
  const sheets = google.sheets({ version: "v4", auth });
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: SHEET_RANGE,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[formatTimestamp(new Date()), title, "blog", content, "published"]],
    },
  });
}

// ── MK 프로필 (인터뷰 누적 개인화) ──────────────────────
// 별도 탭 MK_PROFILE 에 그룹당 1행: A group | B profile_text | C quotes(JSON) | D updated_at
const PROFILE_TAB = "MK_PROFILE";
export const PROFILE_GROUPS = ["movie", "photo", "info"] as const;
export type ProfileGroup = (typeof PROFILE_GROUPS)[number];
export type MkProfile = {
  group: ProfileGroup;
  profileText: string;
  quotes: string[];
  updatedAt: string;
};

const MOCK_PROFILES = new Map<ProfileGroup, MkProfile>();

function parseQuotes(raw: string | undefined): string[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}

/** 그룹 프로필 조회. 없으면 null. */
export async function getProfile(group: ProfileGroup): Promise<MkProfile | null> {
  const auth = await getAuth();
  if (!auth) return MOCK_PROFILES.get(group) ?? null;
  try {
    const spreadsheetId = await getSpreadsheetId(auth);
    const sheets = google.sheets({ version: "v4", auth });
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${PROFILE_TAB}!A:D`,
    });
    const row = (res.data.values ?? []).find((r) => r[0] === group);
    if (!row) return null;
    return {
      group,
      profileText: row[1] ?? "",
      quotes: parseQuotes(row[2]),
      updatedAt: row[3] ?? "",
    };
  } catch {
    return null; // 탭 미존재 등
  }
}

async function ensureProfileTab(
  sheets: ReturnType<typeof google.sheets>,
  spreadsheetId: string,
): Promise<void> {
  try {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests: [{ addSheet: { properties: { title: PROFILE_TAB } } }] },
    });
  } catch {
    // 이미 존재 → 무시
  }
}

/** 그룹 프로필 upsert. 3개 그룹 고정 순서로 A1:D3 전체 덮어쓰기 (stale 방지). */
export async function upsertProfile(
  group: ProfileGroup,
  profileText: string,
  quotes: string[],
): Promise<void> {
  const updatedAt = formatTimestamp(new Date());
  const auth = await getAuth();
  if (!auth) {
    MOCK_PROFILES.set(group, { group, profileText, quotes, updatedAt });
    return;
  }
  const spreadsheetId = await getSpreadsheetId(auth);
  const sheets = google.sheets({ version: "v4", auth });
  await ensureProfileTab(sheets, spreadsheetId);

  const existing = new Map<ProfileGroup, MkProfile>();
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${PROFILE_TAB}!A:D`,
    });
    for (const r of res.data.values ?? []) {
      const g = r[0] as ProfileGroup;
      if (PROFILE_GROUPS.includes(g)) {
        existing.set(g, { group: g, profileText: r[1] ?? "", quotes: parseQuotes(r[2]), updatedAt: r[3] ?? "" });
      }
    }
  } catch {
    // 첫 쓰기
  }
  existing.set(group, { group, profileText, quotes, updatedAt });

  const values = PROFILE_GROUPS.map((g) => {
    const p = existing.get(g);
    return p ? [g, p.profileText, JSON.stringify(p.quotes), p.updatedAt] : [g, "", "[]", ""];
  });
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${PROFILE_TAB}!A1:D3`,
    valueInputOption: "RAW",
    requestBody: { values },
  });
}

/** 블로그 원본 글 제목 목록 (중복 체크용). */
export async function getBlogPostTitles(): Promise<Set<string>> {
  const auth = await getAuth();
  if (!auth) return new Set();
  try {
    const spreadsheetId = await getSpreadsheetId(auth);
    const sheets = google.sheets({ version: "v4", auth });
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "A:C",
    });
    const rows = res.data.values ?? [];
    return new Set(
      rows.filter((r) => r[2] === "blog").map((r) => r[1] ?? ""),
    );
  } catch {
    return new Set();
  }
}
