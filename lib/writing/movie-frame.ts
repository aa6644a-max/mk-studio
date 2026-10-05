import type { Question, Run, Section, Source } from "./types";

/**
 * 영화·TV 리뷰/프리뷰 고정 골격.
 * 직접 쓰는 MK 포스팅의 구조(정보표 → 도입 → ■ 어떤 이야기인가요? → 본론 → 🔎 관전 포인트 → 마무리)를
 * 모델의 판단에 맡기지 않고 서버가 정보표·소제목·자리 표시를 고정한다. 모델은 문장만 쓴다.
 */
export const SYNOPSIS_HEADING = "■ 어떤 이야기인가요?";
export const WATCH_HEADING = "🔎 관전 포인트";
export const UNKNOWN = "정보 없음";
const SYNOPSIS_ID = /^(synopsis|plot|story|summary)$/i;
const SYNOPSIS_TEXT = /줄거리|어떤\s*이야기/;
const WATCH_ID = /^(watch[-_ ]?points?|viewing[-_ ]?points?|points?)$/i;
const WATCH_TEXT = /관전\s*포인트/;

export type Fact = { label: string; value: string };
type FrameRun = Pick<Run, "sources" | "brief"> & Partial<Pick<Run, "questions" | "strategy">>;
export type MovieFrame = { kind: "movie" | "tv"; source: Source; title: string; facts: Fact[]; preview: boolean };

export const isSynopsis = (s: Pick<Section, "id" | "heading">) => SYNOPSIS_ID.test(s.id) || SYNOPSIS_TEXT.test(s.heading);
export const isWatchPoints = (s: Pick<Section, "id" | "heading">) => WATCH_ID.test(s.id) || WATCH_TEXT.test(s.heading);

/** 작품이 정확히 하나일 때만 골격을 적용한다. 비교글처럼 작품이 둘 이상이면 모델 구성을 따른다. */
export function frameSource(run: Pick<Run, "sources">): Source | null {
  const movies = run.sources.filter(s => s.kind === "tmdb");
  return movies.length === 1 ? movies[0] : null;
}
function detailOf(source: Source): Record<string, unknown> {
  try { const v = JSON.parse(source.text); return v && typeof v === "object" && !Array.isArray(v) ? v as Record<string, unknown> : {}; } catch { return {}; }
}
const text = (v: unknown) => typeof v === "string" && v.trim() ? v.trim() : "";
const num = (v: unknown) => typeof v === "number" && Number.isFinite(v) && v > 0 ? v : 0;
export function koreanDate(raw: string): string {
  const m = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  return m ? `${m[1]}년 ${Number(m[2])}월 ${Number(m[3])}일` : raw || UNKNOWN;
}
function topNames(raw: string, count = 4) { return raw.split(",").map(s => s.trim()).filter(Boolean).slice(0, count).join(", "); }

/** 사용자가 직접 쓴 글(감상평·주제)과 답변만 본다. 모델 출력이나 검색 자료는 근거로 쓰지 않는다. */
function userStatements(run: FrameRun) {
  return [run.brief.experience, run.brief.topic, ...(run.questions || []).filter(q => q.answer !== undefined && !/쿠키/.test(q.text)).map(q => q.answer!)].filter(Boolean);
}
export function cookieQuestionAnswer(questions: Pick<Question, "text" | "answer">[]): string | null {
  const q = questions.find(x => /쿠키/.test(x.text) && x.answer !== undefined);
  if (!q) return null;
  const a = q.answer!;
  if (/모르|확인\s*못|기억/.test(a)) return UNKNOWN;
  if (/없/.test(a)) return "없음";
  const n = a.match(/(\d+)\s*개/);
  if (n) return `${n[1]}개`;
  if (/있/.test(a)) return "있음";
  return UNKNOWN;
}
export function cookieValue(run: FrameRun): string {
  const answered = cookieQuestionAnswer(run.questions || []);
  if (answered) return answered;
  const found = new Set<string>();
  for (const t of userStatements(run)) for (const m of t.matchAll(/쿠키\s*(?:영상)?[^\n.。!?]{0,14}?(없|있|\d+\s*개)/g)) {
    const w = m[1];
    found.add(w.startsWith("없") ? "없음" : w.startsWith("있") ? "있음" : `${w.replace(/\s/g, "")}`);
  }
  // 한 글에서 서로 다른 말이 나오면 추측하지 않는다.
  return found.size === 1 ? [...found][0] : UNKNOWN;
}
export function ratingValue(run: FrameRun): string {
  const found = new Set<string>();
  for (const t of userStatements(run)) for (const m of t.matchAll(/전체\s*관람가|청소년\s*관람\s*불가|(12|15|19)\s*세\s*(?:이상\s*)?관람가/g)) {
    found.add(/전체/.test(m[0]) ? "전체 관람가" : /불가/.test(m[0]) ? "청소년 관람불가" : `${m[1]}세 이상 관람가`);
  }
  return found.size === 1 ? [...found][0] : UNKNOWN;
}

export function movieFrame(run: FrameRun): MovieFrame | null {
  const source = frameSource(run);
  if (!source) return null;
  const kind = /\/tv\/\d+$/.test(source.url || "") ? "tv" : "movie";
  const d = detailOf(source);
  const title = text(d.title) || source.title.replace(/\s*\([^)]*\)\s*$/, "");
  const orig = text(d.originalTitle) || title;
  const genres = text(d.genres) || UNKNOWN, country = text(d.country) || UNKNOWN;
  const facts: Fact[] = kind === "tv" ? [
    { label: "원제", value: orig }, { label: "장르", value: genres }, { label: "국가", value: country },
    { label: "연출/원작", value: text(d.creator) || UNKNOWN }, { label: "출연", value: topNames(text(d.cast)) || UNKNOWN },
    { label: "시즌/화수", value: num(d.numberOfSeasons) && num(d.numberOfEpisodes) ? `${num(d.numberOfSeasons)}시즌 ${num(d.numberOfEpisodes)}화` : UNKNOWN },
    { label: "편당 러닝타임", value: num(d.episodeRuntime) ? `${num(d.episodeRuntime)}분` : UNKNOWN },
    { label: "공개일", value: text(d.firstAirDate) ? koreanDate(text(d.firstAirDate)) : UNKNOWN },
  ] : [
    { label: "원제", value: orig }, { label: "장르", value: genres }, { label: "국가", value: country },
    { label: "감독", value: text(d.director) || UNKNOWN },
    { label: "러닝타임", value: num(d.runtime) ? `${num(d.runtime)}분` : UNKNOWN },
    { label: "관람등급", value: ratingValue(run) },
    { label: "개봉일", value: text(d.releaseDate) ? koreanDate(text(d.releaseDate)) : UNKNOWN },
    { label: "쿠키영상", value: cookieValue(run) },
  ];
  const preview = /프리뷰|기대평|개봉\s*전|공개\s*전|미리/.test(`${run.strategy?.domain || ""} ${run.strategy?.intent || ""} ${run.brief.topic}`);
  return { kind, source, title, facts, preview };
}

/** 프리뷰·TV는 관람 정보가 아니므로 쿠키영상 질문을 만들지 않는다. */
export function cookieQuestion(run: Required<Pick<Run, "questions">> & FrameRun): Question | null {
  const frame = movieFrame(run);
  if (!frame || frame.kind !== "movie" || frame.preview) return null;
  if (run.questions.some(q => /쿠키/.test(q.text))) return null;
  if (cookieValue(run) !== UNKNOWN) return null;
  return { id: `q-cookie-${run.questions.length + 1}`, kind: "clarification", text: `‘${frame.title}’에 쿠키영상이 있었나요? 정보표에 그대로 들어가요.`, options: ["있음", "없음", "잘 모르겠음"] };
}

/**
 * 모델이 정한 구역 이름과 순서를 골격에 맞춘다. 문장은 건드리지 않는다.
 * 도입(소제목 없음) → 줄거리 → 본론 → 관전 포인트 → 마무리(소제목 없음).
 */
export function normalizeMovieSections(run: Pick<Run, "article"> & FrameRun) {
  if (!run.article || !frameSource(run)) return;
  const sections = run.article.sections;
  const synopsis = sections.find(isSynopsis), watch = sections.find(isWatchPoints);
  if (synopsis) synopsis.heading = SYNOPSIS_HEADING;
  if (watch) watch.heading = WATCH_HEADING;
  // 정보표는 서버가 만든다. 모델이 채운 정보 항목은 중복 표가 되므로 비운다.
  for (const s of sections) s.facts = [];
  const rest = sections.filter(s => s !== synopsis && s !== watch);
  const intro = rest[0] && !rest[0].heading ? rest.shift() : undefined;
  const outro = rest.length > 1 && !rest[rest.length - 1].heading ? rest.pop() : undefined;
  run.article.sections = [...(intro ? [intro] : []), ...(synopsis ? [synopsis] : []), ...rest, ...(watch ? [watch] : []), ...(outro ? [outro] : [])];
}

export function lintMovieFrame(run: Pick<Run, "article"> & FrameRun) {
  const out: { message: string; sectionId?: string; severity: "error" | "warning" }[] = [];
  if (!run.article || !frameSource(run)) return out;
  const sections = run.article.sections;
  if (!sections.some(isSynopsis)) out.push({ severity: "error", message: `줄거리 구역이 없습니다. 도입 바로 다음에 id를 synopsis로 한 ‘${SYNOPSIS_HEADING}’ 구역을 넣어주세요.` });
  if (!sections.some(isWatchPoints)) out.push({ severity: "error", message: `관전 포인트 구역이 없습니다. 본론 뒤, 마무리 앞에 id를 watch-points로 한 ‘${WATCH_HEADING}’ 구역(2~3문장)을 넣어주세요.` });
  if (sections[0]?.heading && !isSynopsis(sections[0])) out.push({ severity: "warning", message: "도입은 소제목 없이 시작하는 첫 구역이어야 합니다.", sectionId: sections[0].id });
  if (sections.filter(s => s.heading && !isSynopsis(s) && !isWatchPoints(s)).length < 2) out.push({ severity: "warning", message: "본론 소제목이 2개 미만입니다. 감상평 근거가 허락하는 범위에서 서로 다른 관점의 소제목을 나눠주세요." });
  return out;
}
