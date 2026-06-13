/**
 * 영화 계열 포스팅 프롬프트 (V2 PromptBuilder 이식).
 * 영화 리뷰 / 개봉 프리뷰 / 큐레이션 / 정주행.
 */
import type { PostDraft, Post } from "@/lib/types";
import {
  getCommonConstraints,
  getDesignSystem,
  getReferencePrompt,
} from "./base";

export type PromptResult = { system: string; user: string };

export function buildMoviePrompt(
  draft: PostDraft,
  references: Post[],
): PromptResult {
  const system = [
    "당신은 영화 평론가 'MK'의 글쓰기 어시스턴트다. MK의 문체로 네이버 블로그용 HTML 포스팅을 작성한다.",
    getCommonConstraints(),
    getDesignSystem(),
    getReferencePrompt(references),
  ]
    .filter(Boolean)
    .join("\n\n");

  const user = byType(draft);
  return { system, user };
}

function byType(d: PostDraft): string {
  const genres = d.genres.length ? d.genres.join(", ") : "미지정";
  const memo = d.body.trim() ? `\n[작성자 메모/지시]\n${d.body.trim()}` : "";

  switch (d.postType) {
    case "review":
      return `
영화 리뷰를 작성하라.
- 영화: ${d.movieTitle || d.title}
- 평점: ${d.rating ? "★".repeat(d.rating) : "미정"} (${d.rating}/5)
- 장르: ${genres}
- 관람 계기: ${d.watchReason || "미기재"}

구성: 도입(관람 계기/첫인상) → 줄거리 요약(스포 절제) → 연출·연기·주제 분석 2~3 단락 → 한 줄 총평 + 별점.${memo}
`.trim();

    case "preview":
      return `
개봉 프리뷰(기대작 소개)를 작성하라.
- 영화: ${d.movieTitle || d.title}
- 장르: ${genres}
- 개봉일: ${d.releaseDate || "미정"}
- 기대 포인트: ${d.expectPoints || "미기재"}

구성: 작품 개요 → 기대 포인트 → 감독/배우 맥락 → 개봉 전 한 줄 기대평.${memo}
`.trim();

    case "curation":
      return `
큐레이션 리스트(테마 추천 모음)를 작성하라.
- 테마/제목: ${d.title}
- 장르: ${genres}
- 추천 영화 목록: ${d.items.length ? d.items.join(", ") : "(자유 선정)"}

구성: 테마 도입 → 추천작 각각 소제목 + 짧은 추천사 → 마무리 한 줄.${memo}
`.trim();

    case "binge":
      return `
정주행 추천(시리즈)을 작성하라.
- 시리즈/제목: ${d.title}
- 장르: ${genres}
- 회차 구성: ${d.items.length ? d.items.join(", ") : "미기재"}

구성: 시리즈 개요 → 정주행 포인트 → 회차 구성/볼거리 → 한 줄 추천평.${memo}
`.trim();

    default:
      return `${d.title} 포스팅을 작성하라. 장르: ${genres}.${memo}`;
  }
}
