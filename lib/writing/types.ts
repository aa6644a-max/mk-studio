export const STAGE_LABELS = {
  analyzing: "주제와 자료 살펴보는 중",
  researching: "자료 찾고 출처 확인하는 중",
  planning: "글의 방향과 구성 잡는 중",
  awaiting_input: "조금만 더 알려주세요",
  drafting: "MK의 문체로 작성하는 중",
  checking: "문체와 사실 점검하는 중",
  ready: "초안 완성",
  needs_review: "확인이 필요한 초안",
  failed: "작업을 이어가지 못했어요",
  cancelled: "작성 중지",
} as const;
export type Stage = keyof typeof STAGE_LABELS;
export const ACTIVE_STAGES: Stage[] = ["analyzing", "researching", "planning", "drafting", "checking"];
export type Attachment = { id: string; kind: "document" | "photo" | "url"; name: string; text: string };
export type Brief = { topic: string; experience: string; audience: string; length: "auto" | "short" | "standard" | "long"; attachments: Attachment[] };
export type Source = { id: string; title: string; url?: string; text: string; kind: "document" | "snippet" | "web" | "tmdb"; retrievedAt: string; publishedAt?: string; note?: string };
export type ToolId = "naver_web" | "naver_news" | "tmdb_search" | "read_url";
export type ResearchTask = { tool: ToolId; query: string; reason: string; mediaType?: "movie" | "tv"; status: "pending" | "done" | "failed"; result?: string };
export type MovieCandidate = { id: number; title: string; year: string; mediaType: "movie" | "tv"; posterUrl: string | null };
export type Question = { id: string; text: string; kind: "experience" | "clarification" | "movie"; options: string[]; candidates?: MovieCandidate[]; answer?: string };
export type Strategy = { domain: string; intent: string; audience: string; question: string; angle: string; keywords: string[]; outline: string[]; length: number; voice: "full" | "light"; limitations: string[] };
export type Section = { id: string; heading: string; paragraphs: string[]; sourceIds: string[]; experienceIds: string[]; imageIds: string[]; facts: { label: string; value: string }[] };
export type Article = { titles: string[]; sections: Section[]; hashtags: string[] };
export type Issue = { kind: "format" | "evidence" | "experience" | "voice"; severity: "warning" | "error"; message: string; sectionId?: string };
export type Run = {
  id: string; version: number; createdAt: string; updatedAt: string; stage: Stage;
  brief: Brief; tasks: ResearchTask[]; sources: Source[]; questions: Question[];
  strategy: Strategy | null; article: Article | null; issues: Issue[];
  notices: string[]; persona: { version: string; style: string; profile: string };
  researchRounds: number; questionRounds: number; repairs: number;
  tokens: number; model: string; error?: string; retryStage?: Stage;
  log: { at: string; message: string }[];
};
export type RunView = Omit<Run, "persona"> & { personaVersion: string; storage: "postgres" | "local"; busy?: boolean };

export class WritingError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
export function record(value: unknown): Record<string, unknown> {
  // Models occasionally serialize a nested object argument as a JSON string. Accept that shape.
  if (typeof value === "string") { try { value = JSON.parse(value); } catch { throw new WritingError("입력 형식을 확인해주세요."); } }
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new WritingError("입력 형식을 확인해주세요.");
  return value as Record<string, unknown>;
}
export function str(value: unknown, max: number, required = false): string {
  if (value === undefined && !required) return "";
  if (typeof value !== "string" || value.length > max || (required && !value.trim())) throw new WritingError(`텍스트 입력을 확인해주세요 (최대 ${max.toLocaleString()}자).`);
  return value.trim();
}
export function strings(value: unknown, maxItems = 12, maxChars = 1000): string[] {
  if (!Array.isArray(value) || value.length > maxItems) throw new WritingError("목록 형식을 확인해주세요.");
  return value.map(v => str(v, maxChars, true));
}
export function publicUrl(value: string): string {
  let url: URL;
  try { url = new URL(value); } catch { throw new WritingError("올바른 웹 주소를 입력해주세요."); }
  if (!["https:", "http:"].includes(url.protocol) || url.username || url.password || (url.port && !["80", "443"].includes(url.port))) throw new WritingError("공개 웹 문서 주소만 사용할 수 있습니다.");
  url.hash = "";
  return url.href;
}
export function parseBrief(value: unknown): Brief {
  const b = record(value);
  const topic = str(b.topic, 5000), experience = str(b.experience, 16000);
  if (!Array.isArray(b.attachments) || b.attachments.length > 20) throw new WritingError("자료는 최대 20개까지 첨부할 수 있습니다.");
  const attachments = b.attachments.map((raw, i): Attachment => {
    const a = record(raw), kind = a.kind;
    if (kind !== "document" && kind !== "photo" && kind !== "url") throw new WritingError("지원하지 않는 자료 형식입니다.");
    const text = str(a.text, kind === "document" ? 40000 : 4000);
    if (kind === "document" && !text) throw new WritingError("내용을 추출하지 못한 문서는 제외하거나 다시 첨부해주세요.");
    return { id: `attachment-${i + 1}`, kind, name: str(a.name, 240, true), text: kind === "url" ? publicUrl(text) : text };
  });
  if (attachments.filter(a => a.kind === "url").length > 6) throw new WritingError("참고 웹 주소는 최대 6개까지 첨부해주세요.");
  if (attachments.reduce((n, a) => n + a.text.length, 0) > 100000) throw new WritingError("첨부 자료가 너무 깁니다. 문서를 나누어 작성해주세요 (총 10만 자 이하).");
  if (!topic && !experience && !attachments.length) throw new WritingError("주제나 자료를 입력해주세요.");
  const length = b.length ?? "auto";
  if (!["auto", "short", "standard", "long"].includes(String(length))) throw new WritingError("분량 설정이 올바르지 않습니다.");
  return { topic, experience, audience: str(b.audience, 300), length: length as Brief["length"], attachments };
}
export function parseStrategy(value: unknown): Strategy {
  const s = record(value);
  if (s.voice !== "full" && s.voice !== "light") throw new WritingError("문체 설정이 올바르지 않습니다.");
  if (typeof s.length !== "number" || !Number.isFinite(s.length) || s.length < 500 || s.length > 8000) throw new WritingError("목표 분량은 500~8,000자여야 합니다.");
  const outline = strings(s.outline, 12, 200);
  if (!outline.length) throw new WritingError("목차가 비어 있습니다.");
  return { domain: str(s.domain, 100, true), intent: str(s.intent, 100, true), audience: str(s.audience, 300, true), question: str(s.question, 500, true), angle: str(s.angle, 1000, true), keywords: strings(s.keywords, 8, 80), outline, length: Math.round(s.length), voice: s.voice, limitations: strings(s.limitations, 12, 500) };
}
export function parseArticle(value: unknown): Article {
  const a = record(value);
  if (!Array.isArray(a.sections) || !a.sections.length || a.sections.length > 16) throw new WritingError("본문 구성이 불완전합니다. 다시 시도해주세요.");
  const sections = a.sections.map((raw): Section => {
    const s = record(raw);
    if (!Array.isArray(s.facts) || s.facts.length > 20) throw new WritingError("정보표 형식이 올바르지 않습니다.");
    return { id: str(s.id, 80, true), heading: str(s.heading, 200), paragraphs: strings(s.paragraphs, 20, 3000), sourceIds: strings(s.sourceIds, 30, 80), experienceIds: strings(s.experienceIds, 20, 80), imageIds: strings(s.imageIds, 20, 80), facts: s.facts.map(f => { const r = record(f); return { label: str(r.label, 100, true), value: str(r.value, 1000, true) }; }) };
  });
  if (new Set(sections.map(s => s.id)).size !== sections.length) throw new WritingError("본문 구역 ID가 중복됐습니다.");
  return { titles: strings(a.titles, 8, 200), sections, hashtags: strings(a.hashtags, 15, 100) };
}
