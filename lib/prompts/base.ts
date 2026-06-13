/**
 * 프롬프트 공통 기반 (V2 BasePromptBuilder 이식).
 * - 디자인 시스템 (네이버 블로그 HTML 스타일)
 * - 공통 제약
 * - 문체 학습용 레퍼런스 주입 (RAG-lite)
 */
import type { Post } from "@/lib/types";

/** 생성 HTML 의 인라인 디자인 시스템 (네이버 블로그 붙여넣기용). */
export function getDesignSystem(): string {
  return `
[HTML 디자인 규칙 — 네이버 블로그 붙여넣기 대상]
- 모든 스타일은 인라인 style 속성으로. <style> 태그·외부 CSS 금지.
- 본문 폰트: font-family:'Pretendard',-apple-system,sans-serif; 색상 #2c2c2c; line-height:1.8; font-size:16px.
- 소제목(h3): font-size:20px; font-weight:700; color:#171719; margin:32px 0 12px.
- 강조: <strong> 또는 color:#0066ff 인라인.
- 인용/포인트 박스: background:#f7f7f8; border-left:4px solid #0066ff; padding:16px 20px; border-radius:8px; margin:20px 0.
- 문단 사이 충분한 여백(margin:16px 0). 이미지 자리표시는 [이미지] 텍스트로 표기하지 말 것.
- 결과는 <body> 안에 들어갈 HTML 조각만. <html>/<head>/<body> 래퍼 금지.
`.trim();
}

/** 모든 포스팅 공통 제약. */
export function getCommonConstraints(): string {
  return `
[공통 작성 규칙]
- 평론가 'MK'의 1인칭 시점. 과장된 호들갑 없이 단정하고 통찰적인 어조.
- 클릭베이트·이모지 남발 금지. 진중하되 읽기 쉬운 문장.
- 스포일러는 핵심 반전에 한해 절제. 필요 시 "(스포일러 주의)" 라벨.
- 마지막에 한 줄 총평 + 별점(★) 표기.
- 출력은 HTML 조각만. 설명·머리말·코드펜스 금지.
`.trim();
}

/** Google Sheets 최근 포스팅을 문체 레퍼런스로 주입. */
export function getReferencePrompt(referencePosts: Post[]): string {
  if (!referencePosts.length) return "";
  const samples = referencePosts
    .slice(0, 3)
    .map((p, i) => {
      const text = stripHtml(p.content).slice(0, 600);
      return `--- 레퍼런스 ${i + 1} (${p.movieTitle}) ---\n${text}`;
    })
    .join("\n\n");
  return `
[문체 학습 — 아래는 MK의 기존 포스팅이다. 어휘·리듬·문단 구성을 참고하되 내용은 복제하지 말 것.]
${samples}
`.trim();
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
