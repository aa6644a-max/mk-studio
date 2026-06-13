/**
 * 일상/PDF 계열 프롬프트 (V2 DailyPromptBuilder 이식).
 * 사진 포스팅 / PDF 요약.
 */
import type { PostDraft, Post } from "@/lib/types";
import {
  getCommonConstraints,
  getDesignSystem,
  getReferencePrompt,
} from "./base";
import type { PromptResult } from "./movie";

export function buildDailyPrompt(
  draft: PostDraft,
  references: Post[],
): PromptResult {
  const system = [
    "당신은 평론가 'MK'의 글쓰기 어시스턴트다. MK의 문체로 네이버 블로그용 HTML 포스팅을 작성한다.",
    getCommonConstraints(),
    getDesignSystem(),
    getReferencePrompt(references),
  ]
    .filter(Boolean)
    .join("\n\n");

  const memo = draft.body.trim() ? `\n[작성자 메모]\n${draft.body.trim()}` : "";

  if (draft.postType === "photo") {
    const user = `
사진 포스팅(포토 에세이)을 작성하라.
- 제목: ${draft.title}
- 장소: ${draft.placeName || "미기재"}
- 사진 ${draft.imageNames.length}장: ${draft.imageNames.join(", ") || "없음"}

구성: 장소/상황 도입 → 사진 흐름에 맞춘 짧은 단락들 → 감상 마무리.
사진이 들어갈 위치에는 <p style="color:#999">[사진]</p> 자리표시를 넣어라.${memo}
`.trim();
    return { system, user };
  }

  // pdf 요약
  const user = `
아래 PDF 내용을 MK의 시선으로 요약·정리하는 포스팅을 작성하라.
- 제목: ${draft.title}
- 카테고리: ${draft.category || "일반"}

[PDF 추출 본문]
${draft.pdfText.slice(0, 12000) || "(추출된 텍스트 없음)"}

구성: 핵심 요약 → 주요 내용 단락 정리 → MK의 한 줄 코멘트.${memo}
`.trim();
  return { system, user };
}
