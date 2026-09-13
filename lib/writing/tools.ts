import { readFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { getMovieDetails, getTvDetails, searchMovies, searchTv, isTmdbConfigured } from "@/lib/tmdb";
import { htmlToStyleText } from "@/lib/style-text";
import { readPublicPage } from "./read-url";
import { publicUrl, record, str, WritingError, type ResearchTask, type Source, type Question, type ToolId, type MovieCandidate } from "./types";

export const TOOL_CATALOG: Record<ToolId, { label: string; description: string; wiki: string; available: () => boolean }> = {
  naver_web: { label: "웹 자료 검색", description: "일반 주제의 공식 문서·기관 공지·제품 정보 후보. 검색 요약만 반환.", wiki: "naver-search.md", available: () => !!(process.env.NAVER_CLIENT_ID && process.env.NAVER_CLIENT_SECRET) },
  naver_news: { label: "뉴스 검색", description: "시의성 있는 보도 후보. 보도일과 원문 링크, 검색 요약 반환.", wiki: "naver-search.md", available: () => !!(process.env.NAVER_CLIENT_ID && process.env.NAVER_CLIENT_SECRET) },
  tmdb_search: { label: "작품 검색·확인", description: "영화·TV 작품을 식별해 상세 조회. 동명이작은 사용자 확인. query는 정확한 작품명만.", wiki: "tmdb.md", available: isTmdbConfigured },
  read_url: { label: "원문 읽기", description: "입력되거나 검색 결과에 있는 공개 웹 주소의 본문을 확인. PDF는 첨부로 받음.", wiki: "read-url.md", available: () => true },
};
export function toolSummary() {
  return Object.entries(TOOL_CATALOG).map(([id, t]) => ({ id, description: t.description, available: t.available() }));
}
export async function toolWiki(ids: ToolId[]) {
  const names = [...new Set(ids.map(id => TOOL_CATALOG[id].wiki))];
  return (await Promise.all(names.map(n => readFile(path.join(process.cwd(), "docs", "writing-tools", n), "utf8")))).join("\n\n");
}
export function parseTasks(value: unknown): ResearchTask[] {
  if (!Array.isArray(value) || value.length > 6) throw new WritingError("조사 계획은 최대 6개 도구 호출로 구성해야 합니다.");
  return value.map(raw => {
    const t = record(raw), tool = str(t.tool, 40, true) as ToolId;
    if (!Object.hasOwn(TOOL_CATALOG, tool)) throw new WritingError("등록되지 않은 조사 도구입니다.");
    const query = str(t.query, 2000, true);
    if (tool === "read_url") publicUrl(query);
    return { tool, query, reason: str(t.reason, 500, true), mediaType: t.mediaType === "tv" ? "tv" : "movie", status: "pending" as const };
  });
}
function source(values: Omit<Source, "id" | "retrievedAt">): Source {
  return { ...values, id: `src-${randomUUID()}`, retrievedAt: new Date().toISOString() };
}
export async function movieSource(candidate: MovieCandidate): Promise<Source> {
  if (!isTmdbConfigured()) throw new WritingError("TMDB 연결이 설정되지 않았습니다. 예제 데이터는 사용하지 않습니다.");
  const detail = candidate.mediaType === "tv" ? await getTvDetails(candidate.id) : await getMovieDetails(candidate.id);
  if (!detail) throw new WritingError("작품 상세를 찾지 못했습니다.");
  const data: Record<string, unknown> = { ...detail };
  // Legacy TV client estimates these when unavailable; do not present them as verified facts.
  if (candidate.mediaType === "tv") { delete data.episodeRuntime; delete data.totalWatchTime; }
  delete data.backdropUrls; delete data.posterUrl;
  return source({ kind: "tmdb", title: `${candidate.title} (${candidate.year || candidate.mediaType})`, url: `https://www.themoviedb.org/${candidate.mediaType}/${candidate.id}`, text: JSON.stringify(data), note: "작품 메타데이터. 실제 장면 분석이나 MK의 시청 경험을 증명하지 않습니다." });
}
export async function executeTool(task: ResearchTask): Promise<{ sources: Source[]; question?: Question; followups?: ResearchTask[] }> {
  if (!TOOL_CATALOG[task.tool].available()) throw new WritingError(`${TOOL_CATALOG[task.tool].label} 연결이 설정되지 않았습니다.`);
  if (task.tool === "read_url") {
    const page = await readPublicPage(task.query);
    return { sources: [source({ kind: "web", title: page.title, url: page.url, text: page.text, note: page.truncated ? "원문 앞 14,000자만 확인. 뒤쪽 조건은 추가 확인 필요." : "공개 페이지에서 추출한 본문. 발행일은 원문 확인 필요." })] };
  }
  if (task.tool === "tmdb_search") {
    const mediaType = task.mediaType || "movie";
    const results = mediaType === "tv" ? await searchTv(task.query) : await searchMovies(task.query);
    const candidates: MovieCandidate[] = results.slice(0, 6).map(r => ({ id: r.id, title: r.title, year: r.year, posterUrl: r.posterUrl, mediaType }));
    if (!candidates.length) throw new WritingError(`“${task.query}” 작품을 찾지 못했습니다.`);
    if (candidates.length === 1) return { sources: [await movieSource(candidates[0])] };
    return { sources: [], question: { id: `q-${randomUUID()}`, kind: "movie", text: `“${task.query}”에서 다룰 작품을 골라주세요.`, options: [], candidates } };
  }
  const kind = task.tool === "naver_news" ? "news" : "webkr";
  const params = new URLSearchParams({ query: task.query, display: "4", ...(kind === "news" ? { sort: "date" } : {}) });
  const response = await fetch(`https://openapi.naver.com/v1/search/${kind}.json?${params}`, {
    headers: { "X-Naver-Client-Id": process.env.NAVER_CLIENT_ID!, "X-Naver-Client-Secret": process.env.NAVER_CLIENT_SECRET! },
    signal: AbortSignal.timeout(12000), cache: "no-store",
  });
  if (!response.ok) throw new WritingError(`검색 서비스 응답 오류 (${response.status}).`);
  const data = await response.json() as { items?: { title: string; description: string; link: string; originallink?: string; pubDate?: string }[] };
  const sources = (data.items || []).map(item => source({ kind: "snippet", title: htmlToStyleText(item.title), text: htmlToStyleText(item.description), url: publicUrl(item.originallink || item.link), publishedAt: item.pubDate, note: "검색 결과 요약입니다. 기사·문서 전문은 아직 확인하지 않았습니다." }));
  return { sources };
}
