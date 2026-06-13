/**
 * 로컬소식/공고문 프롬프트 (V2 LocalNewsPromptBuilder 이식).
 */
import type { PostDraft, Post } from "@/lib/types";
import {
  getCommonConstraints,
  getDesignSystem,
  getReferencePrompt,
} from "./base";
import type { PromptResult } from "./movie";

export function buildLocalPrompt(
  draft: PostDraft,
  references: Post[],
): PromptResult {
  const system = [
    "당신은 동네 소식을 정리해 전하는 'MK'의 글쓰기 어시스턴트다. 네이버 블로그용 HTML 공지/소식 포스팅을 작성한다.",
    getCommonConstraints(),
    getDesignSystem(),
    getReferencePrompt(references),
  ]
    .filter(Boolean)
    .join("\n\n");

  const memo = draft.body.trim() ? `\n[작성자 메모]\n${draft.body.trim()}` : "";

  const user = `
아래 공고문/안내 내용을 주민이 읽기 쉽게 정리하는 로컬소식 포스팅을 작성하라.
- 제목: ${draft.title}
- 소개 목적: ${draft.purpose || "정보 전달"}

[공고문 추출 본문]
${draft.pdfText.slice(0, 12000) || "(추출된 텍스트 없음)"}

구성: 한 줄 요약 → 핵심 정보(일시/장소/대상/방법) 박스 정리 → 부연 설명 → 문의/마무리.${memo}
`.trim();
  return { system, user };
}
