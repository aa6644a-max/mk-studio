/**
 * 영화소식 이벤트 스코어링 + 초안 자동 생성 (Claude).
 * - scoreEvents: 신규 이벤트 일괄 채점 (0~100, 콘텐츠 가치 기준)
 * - generateDraft: 상위 이벤트 → 포스팅 초안(md) + 카드뉴스 데이터(JSON)
 * 포맷: 브리핑(boxoffice_briefing) / 스포트라이트(단일 작품 이벤트)
 */

import Anthropic from "@anthropic-ai/sdk";
import { dbQuery } from "@/lib/db";
import { getMovieDetails, searchMovies } from "@/lib/tmdb";

const MODEL = "claude-sonnet-5";

export type DbEvent = {
  id: number;
  event_key: string;
  event_type: string;
  title: string;
  summary: string;
  payload: Record<string, unknown>;
  score: number | null;
  status: string;
};

export type CardNewsData = {
  slides: { heading: string; body: string }[];
};

function stripFences(text: string): string {
  return text.replace(/^```(?:json)?\s*/m, "").replace(/```\s*$/m, "").trim();
}

async function askClaude(system: string, user: string, maxTokens: number): Promise<string> {
  const client = new Anthropic();
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await client.messages.create({
        model: MODEL,
        max_tokens: maxTokens,
        system,
        messages: [{ role: "user", content: user }],
      });
      const block = res.content.find((b) => b.type === "text");
      return block && block.type === "text" ? block.text : "";
    } catch (e) {
      const msg = String((e as Error).message);
      const retryable = ["429", "529", "overloaded", "rate_limit"].some((k) =>
        msg.includes(k),
      );
      if (retryable && attempt < 2) {
        await new Promise((r) => setTimeout(r, (attempt + 1) * 5000));
        continue;
      }
      throw e;
    }
  }
  return "";
}

/** status='new' 이벤트 일괄 채점 → score/score_reason 저장, status='scored' */
export async function scoreNewEvents(): Promise<number> {
  const events = await dbQuery<DbEvent>(
    `SELECT id, event_key, event_type, title, summary FROM movie_events
     WHERE status = 'new' ORDER BY id DESC LIMIT 30`,
  );
  if (!events.length) return 0;

  const listText = events
    .map((e) => `- id:${e.id} [${e.event_type}] ${e.title} — ${e.summary}`)
    .join("\n");

  const raw = await askClaude(
    "당신은 영화 블로그 콘텐츠 에디터입니다. 감지된 영화 소식 이벤트가 블로그 포스팅/카드뉴스 소재로 얼마나 가치 있는지 0~100점으로 채점합니다. 기준: 대중 관심도, 시의성, 검색 수요, 카드뉴스 소재 적합성. JSON 배열만 출력하세요.",
    `다음 이벤트들을 채점해줘. 형식: [{"id": 숫자, "score": 0-100, "reason": "한 줄 근거"}]\n\n${listText}`,
    2000,
  );

  let scores: { id: number; score: number; reason: string }[] = [];
  try {
    scores = JSON.parse(stripFences(raw));
  } catch {
    // 파싱 실패 시 전부 기본 점수 — 파이프라인 중단 방지
    scores = events.map((e) => ({ id: e.id, score: 50, reason: "채점 파싱 실패, 기본값" }));
  }

  for (const s of scores) {
    await dbQuery(
      `UPDATE movie_events SET score = $1, score_reason = $2, status = 'scored'
       WHERE id = $3 AND status = 'new'`,
      [Math.max(0, Math.min(100, Math.round(s.score))), s.reason ?? "", s.id],
    );
  }
  // 채점 응답에서 누락된 이벤트도 scored 처리 (무한 재채점 방지)
  await dbQuery(
    `UPDATE movie_events SET score = 40, score_reason = '채점 누락, 기본값', status = 'scored'
     WHERE status = 'new'`,
  );
  return scores.length;
}

/** 이벤트에 딸린 작품의 TMDB 상세를 조사 자료로 수집 (best-effort) */
async function buildResearch(event: DbEvent): Promise<string> {
  const movie = (event.payload as { movie?: { id?: number; movieNm?: string; title?: string } }).movie;
  if (!movie) return "";
  try {
    let tmdbId = movie.id;
    if (!tmdbId && movie.movieNm) {
      const found = await searchMovies(movie.movieNm);
      tmdbId = found[0]?.id;
    }
    if (!tmdbId) return "";
    const d = await getMovieDetails(tmdbId);
    if (!d) return "";
    return `[TMDB 조사 자료]\n제목: ${d.title} (${d.originalTitle})\n감독: ${d.director}\n출연: ${d.actors}\n장르: ${d.genres}\n개봉: ${d.releaseDate}\n줄거리: ${d.overview}`;
  } catch {
    return "";
  }
}

export type DraftResult = { draftId: number; title: string };

/** 이벤트 1건 → 초안 생성 + 저장. 이벤트 status='drafted'. */
export async function generateDraftForEvent(eventId: number): Promise<DraftResult> {
  const rows = await dbQuery<DbEvent>(
    `SELECT id, event_key, event_type, title, summary, payload, score, status
     FROM movie_events WHERE id = $1`,
    [eventId],
  );
  if (!rows.length) throw new Error(`이벤트 없음: ${eventId}`);
  const event = rows[0];

  const format = event.event_type === "boxoffice_briefing" ? "briefing" : "spotlight";
  const research = format === "spotlight" ? await buildResearch(event) : "";
  const payloadText = JSON.stringify(event.payload).slice(0, 4000);

  const formatGuide =
    format === "briefing"
      ? "포맷: 정보성 뉴스 브리핑. 박스오피스 순위 전체를 다루되 눈에 띄는 변동(신규 진입, 급상승)에 짧은 코멘트. 순위표는 마크다운 표로."
      : "포맷: 단일 작품 스포트라이트. 이 작품이 왜 지금 화제인지(순위/개봉/트렌딩 맥락) → 작품 소개(감독·출연·줄거리) → 관전 포인트 순서.";

  const raw = await askClaude(
    `당신은 한국 영화 블로그의 콘텐츠 작가입니다. 감지된 영화 소식 이벤트를 바탕으로 블로그 포스팅 초안과 카드뉴스 문구를 만듭니다.
- 객관적 정보 전달 톤. 개인 감상("제가 봤는데") 금지 — 이 글은 정보성 콘텐츠임.
- 포스팅 본문은 마크다운, 1000~1500자, 소제목(##) 2~4개.
- 제목은 검색 노출을 고려해 구체적으로 (작품명·순위·날짜 포함).
- 카드뉴스는 슬라이드 5~6장, 슬라이드당 heading 15자 이내 + body 60자 이내.
- JSON만 출력: {"title": "...", "bodyMd": "...", "cardNews": {"slides": [{"heading": "...", "body": "..."}]}}`,
    `${formatGuide}\n\n[이벤트]\n${event.title}\n${event.summary}\n\n[데이터]\n${payloadText}\n\n${research}`,
    6000,
  );

  let parsed: { title?: string; bodyMd?: string; cardNews?: CardNewsData };
  try {
    parsed = JSON.parse(stripFences(raw));
  } catch {
    throw new Error(`초안 JSON 파싱 실패 (이벤트 ${eventId})`);
  }
  if (!parsed.title || !parsed.bodyMd) {
    throw new Error(`초안 필드 누락 (이벤트 ${eventId})`);
  }

  const inserted = await dbQuery<{ id: number }>(
    `INSERT INTO movie_drafts (event_id, format, title, body_md, card_news)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [event.id, format, parsed.title, parsed.bodyMd, JSON.stringify(parsed.cardNews ?? null)],
  );
  await dbQuery(`UPDATE movie_events SET status = 'drafted' WHERE id = $1`, [event.id]);
  return { draftId: inserted[0].id, title: parsed.title };
}

/** 오늘 생성분 상한 고려해 scored 상위 이벤트 자동 초안 생성 */
export async function generateTopDrafts(dailyLimit = 3, minScore = 50): Promise<DraftResult[]> {
  const todayCount = await dbQuery<{ n: string }>(
    `SELECT count(*)::text AS n FROM movie_drafts
     WHERE created_at > now() - interval '20 hours'`,
  );
  const remaining = dailyLimit - Number(todayCount[0]?.n ?? 0);
  if (remaining <= 0) return [];

  const top = await dbQuery<DbEvent>(
    `SELECT id, event_key, event_type, title, summary, payload, score, status
     FROM movie_events
     WHERE status = 'scored' AND score >= $1
     ORDER BY score DESC, id DESC LIMIT $2`,
    [minScore, remaining],
  );

  const results: DraftResult[] = [];
  for (const ev of top) {
    try {
      results.push(await generateDraftForEvent(ev.id));
    } catch (e) {
      console.error("[movie-news] 초안 생성 실패", ev.id, e);
    }
  }
  return results;
}
