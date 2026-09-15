import type { MovieImage, Run, Source } from "./types";

export const MAX_MOVIE_STILLS = 5;
export function safeTmdbImageUrl(value: string): string {
  try {
    const u = new URL(value);
    return u.protocol === "https:" && u.hostname === "image.tmdb.org" && !u.port && !u.username && !u.password && !u.search && !u.hash && /^\/t\/p\/(original|w\d+)\/[\w-]+\.(jpg|jpeg|png|webp)$/i.test(u.pathname) ? u.href : "";
  } catch { return ""; }
}
export function movieImages(id: string, title: string, detail: { posterUrl?: string; backdropUrls?: string[] }): MovieImage[] {
  const images: MovieImage[] = [], seen = new Set<string>();
  const add = (raw: string, kind: MovieImage["kind"], number: number) => {
    const url = safeTmdbImageUrl(raw);
    if (!url || seen.has(new URL(url).pathname.split("/").pop()!)) return;
    seen.add(new URL(url).pathname.split("/").pop()!);
    images.push({ id: `${id}-${kind}-${number}`, kind, url, alt: `${title} ${kind === "poster" ? "포스터" : `스틸컷 ${number}`}` });
  };
  if (detail.posterUrl) add(detail.posterUrl, "poster", 1);
  for (const raw of detail.backdropUrls || []) {
    const count = images.filter(i => i.kind === "still").length;
    if (count >= MAX_MOVIE_STILLS) break;
    add(raw, "still", count + 1);
  }
  return images;
}
export function sourceImages(sources: Source[]) {
  return sources.filter(s => s.kind === "tmdb").flatMap(s => (s.images || []).filter(i => (i.kind === "poster" || i.kind === "still") && safeTmdbImageUrl(i.url)).map(i => ({ ...i, sourceId: s.id, sourceUrl: s.url })));
}

/** Preserve text and photo markers; repair missing/clustered movie image placements. */
export function placeMovieImages(run: Pick<Run, "sources" | "article">) {
  if (!run.article) return;
  const sections = run.article.sections, images = sourceImages(run.sources);
  const hints = new Map(images.map(image => [image.id, sections.find(s => s.imageIds.includes(image.id))?.id]));
  const known = new Set(images.map(i => i.id));
  for (const s of sections) s.imageIds = s.imageIds.filter(id => !known.has(id));
  const movies = run.sources.filter(s => s.kind === "tmdb");
  for (const movie of movies) {
    const linked = sections.filter(s => s.sourceIds.includes(movie.id) || (movie.images || []).some(i => hints.get(i.id) === s.id));
    // In a comparison, never move one film's stills into another film's section.
    const related = movies.length === 1 ? sections : linked;
    if (!related.length) continue;
    const available = images.filter(i => i.sourceId === movie.id);
    const poster = available.find(i => i.kind === "poster");
    if (poster) related[0].imageIds.unshift(poster.id);
    let body = related.filter(s => s.paragraphs.length && !/outro|conclusion|마무리|관전\s*포인트/i.test(s.id + " " + s.heading));
    if (related.length > 2) body = body.filter(s => s !== related[0] && !(s === related[related.length - 1] && !s.heading));
    if (!body.length) body = related.filter(s => s.paragraphs.length);
    const placed = new Map<string, number>();
    for (const s of body) {
      const count = s.imageIds.filter(id => images.some(image => image.id === id && image.kind === "still")).length;
      if (count) placed.set(s.id, count);
    }
    const capacity = body.reduce((n, s) => n + Math.max(0, s.paragraphs.length - (placed.get(s.id) || 0)), 0);
    const stills = available.filter(i => i.kind === "still").slice(0, capacity);
    stills.forEach((image, i) => {
      const free = body.filter(s => (placed.get(s.id) || 0) < s.paragraphs.length);
      const unused = free.filter(s => !placed.has(s.id));
      const choices = unused.length ? unused : free;
      const synopsis = i === 0 ? choices.find(s => /synopsis|plot|줄거리|어떤 이야기/i.test(s.id + " " + s.heading)) : undefined;
      const ideal = body[Math.floor(i * Math.max(0, body.length - 1) / Math.max(1, stills.length - 1))];
      const target = synopsis || choices.find(s => s.id === hints.get(image.id)) || choices.find(s => s === ideal) || choices[0];
      if (target) { target.imageIds.push(image.id); placed.set(target.id, (placed.get(target.id) || 0) + 1); }
    });
  }
}

/** A section may contain several stills, but a paragraph always separates them. */
export function stillsAfterParagraph(imageIds: string[], paragraphs: number) {
  const slots = new Map<number, string>();
  const selected = imageIds.slice(0, paragraphs);
  selected.forEach((id, i) => slots.set(Math.max(0, Math.ceil((i + 1) * paragraphs / selected.length) - 1), id));
  return slots;
}

export const MOVIE_WRITING_RULES = `영화·TV 작품 리뷰/프리뷰에는 기존 MK 영화 포스팅 구성 규칙을 적용하세요. 다른 분야 글에는 강제하지 않습니다.
- 도입에서 사용자가 제공한 관람 계기·관점을 살립니다. 프리뷰는 기대와 정보 중심으로, 보지 않은 작품을 관람한 것처럼 쓰지 않습니다.
- 도입에 포스터, 초반 facts 정보표에 확인된 원제·장르·감독/연출·출연·러닝타임·개봉/공개일을 정리합니다. 관람등급·국내 개봉일·쿠키영상은 별도 근거가 있을 때만 기재하며 TMDB 일반 개봉일을 국내 개봉일로 바꾸지 않습니다.
- 공식 줄거리는 배경·주인공 상황·핵심 갈등 위주로 짧게 소개합니다. 사용자가 결말 분석을 명시하지 않았다면 반전·결말을 노출하지 않습니다.
- 제공된 sources.images의 포스터·스틸컷 ID를 imageIds에 배치합니다. 포스터는 도입, 첫 스틸은 줄거리 뒤, 나머지는 본론 소제목 사이에 분산합니다. 한 작품 최대 5장, 짧은 글은 문단 수에 맞게 줄이고 사진 때문에 내용을 늘리지 않습니다.
- 본론은 감상평에서 중요하게 본 서사·연기·연출·감정 등 서로 다른 관점을 다룹니다. 마지막에는 '관전 포인트'와 추천 대상을 짧게 정리합니다. 사용자 목차·분량·스포일러 지시를 우선하며 소제목 수를 무조건 4~5개로 강제하지 않습니다.
- 이미지 URL만으로 특정 장면의 등장인물·행동·연출 의도를 알 수 없습니다. 보지 않은 장면 캡션을 만들지 마세요. 이미지 설명은 서버가 작품명·포스터/스틸컷 번호·TMDB 출처로 표시합니다. 관람 인증샷은 실제 사용자 첨부가 있을 때만 사용합니다.`;
