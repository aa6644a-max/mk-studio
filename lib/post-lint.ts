/**
 * 포스팅 규칙 린터.
 *
 * 프롬프트의 🚨 지시만으로는 규칙 준수를 보장할 수 없으므로,
 * 기계 검사 가능한 규칙(해시태그 형식·금지어·이미지 연속 배치·글자수·SEO 제목)을
 * 생성 후 코드로 검증한다. 위반 목록은 1회 수정 요청 프롬프트에 사용된다.
 */
import type { PostType } from "@/lib/types";

export type LintIssue = { rule: string; message: string };

/** 프롬프트에서 금지한 AI 상투 표현. */
const FORBIDDEN_PHRASES = [
  "결론적으로",
  "요약하자면",
  "의 향연",
  "과언이 아닙니다",
  "시각적 즐거움",
  "안녕하세요",
  "반갑습니다",
];

/** 순수 텍스트 기준 글자수 허용 범위 (여유 있게 잡아 수정 루프 공회전 방지). */
const LENGTH_RANGES: Partial<Record<PostType, [number, number]>> = {
  review: [2000, 3300],
  preview: [2000, 3300],
  photo: [1200, 2400],
  pdf: [1200, 2700],
};

function pureText(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z#0-9]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function lintPost(
  html: string,
  postType: PostType,
  titles: string[],
): LintIssue[] {
  const issues: LintIssue[] = [];
  const text = pureText(html);

  // 1. SEO 제목 주석
  if (titles.length < 3) {
    issues.push({
      rule: "titles",
      message: `SEO 제목이 ${titles.length}개뿐입니다. 맨 마지막 줄에 <!-- TITLES: 제목1||제목2||제목3||제목4||제목5 --> 형식으로 5개를 제안하세요.`,
    });
  }

  // 2. 해시태그 — 텍스트 기준으로 검사 (style 속성의 hex 색상 오탐 방지)
  const hashtags = text.match(/#[^\s#]+/g) ?? [];
  if (hashtags.length < 5) {
    issues.push({
      rule: "hashtags",
      message: `해시태그가 ${hashtags.length}개입니다. 글 맨 마지막에 <p>#키워드1 #키워드2 ...</p> 형태로 5~10개를 넣으세요 (본문 중간 # 금지, 쉼표 나열 금지).`,
    });
  } else if (hashtags.length > 12) {
    issues.push({
      rule: "hashtags",
      message: `해시태그가 ${hashtags.length}개로 과다합니다. 5~10개로 줄이세요.`,
    });
  }

  // 3. AI 금지어
  for (const phrase of FORBIDDEN_PHRASES) {
    if (text.includes(phrase)) {
      issues.push({
        rule: "forbidden",
        message: `금지 표현 "${phrase}"이(가) 본문에 있습니다. 자연스러운 다른 표현으로 교체하세요.`,
      });
    }
  }

  // 4. 이미지 연속 배치 (리뷰/프리뷰 — 스틸컷 몰아넣기 금지)
  if (postType === "review" || postType === "preview") {
    const segments = html.split(/<img[^>]*>/i);
    for (let i = 1; i < segments.length - 1; i++) {
      if (pureText(segments[i]).length < 15) {
        issues.push({
          rule: "image-cluster",
          message:
            "이미지 2장 이상이 사이 텍스트 없이 연속 배치되어 있습니다. 각 이미지 사이에 본문 단락이나 캡션을 넣어 분산 배치하세요.",
        });
        break;
      }
    }
  }

  // 5. 글자수
  const range = LENGTH_RANGES[postType];
  if (range) {
    const [min, max] = range;
    if (text.length < min) {
      issues.push({
        rule: "length",
        message: `순수 텍스트가 ${text.length}자로 기준(${min}자)에 못 미칩니다. 각 소제목 단락의 분석을 더 구체적으로 전개해 분량을 채우세요 (문장 늘리기 금지, 내용 심화).`,
      });
    } else if (text.length > max) {
      issues.push({
        rule: "length",
        message: `순수 텍스트가 ${text.length}자로 기준(${max}자)을 초과합니다. 중복되는 서술을 정리해 압축하세요.`,
      });
    }
  }

  return issues;
}

/** 위반 목록 → 1회 수정 요청 프롬프트. */
export function buildFixPrompt(issues: LintIssue[]): string {
  const list = issues.map((v, i) => `${i + 1}. [${v.rule}] ${v.message}`).join("\n");
  return `방금 작성한 HTML에서 아래 위반사항이 발견되었습니다. 위반사항만 수정하고 나머지는 그대로 유지한 채, 전체 HTML을 처음부터 끝까지 다시 출력하세요.

[위반사항]
${list}

[출력 규칙]
- 마크다운 코드펜스(\`\`\`) 절대 금지, 순수 HTML만 출력
- 맨 마지막 줄의 <!-- TITLES: 제목1||...||제목5 --> 주석 반드시 포함
- 위반사항과 무관한 문장·구조·이미지 배치는 변경하지 말 것`;
}
