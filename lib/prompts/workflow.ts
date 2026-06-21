/**
 * 워크플로우 V4 프롬프트:
 * 1. buildStrategySystem/User  — 전략 카드 생성 (JSON)
 * 2. buildInterviewSystem      — 인터뷰 진행 (SSE 스트리밍)
 * 3. buildWorkflowGeneratePrompt — 인터뷰 기반 포스팅 생성
 */
import type { ChatMessage, StrategyCard } from "@/lib/workflow-store";
import type { PostType } from "@/lib/types";
import {
  getDesignSystem,
  getCommonConstraints,
  nowParts,
  referenceText,
} from "./base";

// ──────────────────────────────────────────────
// 1. 전략 카드
// ──────────────────────────────────────────────

const STRATEGY_SYSTEM = `당신은 MK LINK 전담 콘텐츠 전략가입니다.
사용자가 블로그 포스팅 주제를 던지면, 아래 마케팅 프레임워크를 적용해 전략 카드 JSON을 반환하세요.

## 포스팅 타입 판단 기준
- 영화·드라마 제목 + 리뷰/후기/감상 → "review"
- 영화·드라마 개봉 예정 + 기대/소개 → "preview"
- 여러 작품 묶음 추천 → "curation"
- 드라마·애니 정주행 추천 → "binge"
- 장소·맛집·사진·일상 → "photo"
- 공고문·행사·로컬소식·지원사업 → "local"
- PDF 문서 요약 → "pdf"

## Searchable vs Shareable 판단
- Searchable: 검색 수요 있음 (영화명+리뷰, 지역+행사 등)
- Shareable: 인사이트·감정·스토리 중심 (큐레이션, 에세이형)
- both: 둘 다 해당

## 네이버 SEO 키워드 원칙
- 실제 네이버에서 검색될 만한 한국어 키워드 2~4개
- 영화면 "영화제목 리뷰", "영화제목 줄거리 결말" 등
- 로컬소식이면 "지역명 행사명", "지원사업명" 등

## 응답 형식 (JSON만, 설명 없음)
{
  "postType": "review",
  "keywords": ["키워드1", "키워드2", "키워드3"],
  "target": "구체적인 타겟 독자 (나이대, 관심사, 상황)",
  "angle": "콘텐츠 각도 및 구조 제안 (1~2문장)",
  "contentType": "searchable"
}`;

export function buildStrategyUser(topic: string, trendText: string): string {
  return `포스팅 주제: "${topic}"

${trendText ? `[네이버 트렌드 참고]\n${trendText}` : ""}

위 주제로 최적의 블로그 포스팅 전략을 JSON으로 반환하세요.`;
}

export { STRATEGY_SYSTEM };

// ──────────────────────────────────────────────
// 2. 인터뷰
// ──────────────────────────────────────────────

export function buildInterviewSystem(
  strategy: StrategyCard,
  rssText: string,
  refText: string,
): string {
  const typeLabel: Record<PostType, string> = {
    review: "영화 리뷰",
    preview: "개봉 프리뷰",
    curation: "큐레이션 리스트",
    binge: "정주행 추천",
    photo: "사진 포스팅",
    local: "로컬소식/공고문",
    pdf: "PDF 요약",
  };

  const requiredInfo: Record<PostType, string> = {
    review: "영화 정확한 제목, 관람 계기/상황, 가장 기억에 남는 장면이나 캐릭터, 평점(1~5), 추천 대상",
    preview: "영화 정확한 제목, 개봉일(알면), 기대 포인트 2~3가지",
    curation: "테마 키워드, 추천 작품 3개 이상(제목+추천이유)",
    binge: "시리즈 정확한 제목, 회차 구성, 정주행 포인트, 추천 대상",
    photo: "장소명, 카테고리(맛집/일상/여행/전시), 분위기와 특징, 방문 계기",
    local: "공고/행사 핵심 정보 (PDF 업로드 필요)",
    pdf: "PDF 핵심 내용, 카테고리, 독자에게 전달할 핵심 메시지",
  };

  const autoTerminate = strategy.postType === "local" || strategy.postType === "pdf";

  return `당신은 MK 블로그 포스팅 인터뷰어입니다.

## 포스팅 정보
- 타입: ${typeLabel[strategy.postType]}
- SEO 키워드: ${strategy.keywords.join(", ")}
- 타겟 독자: ${strategy.target}
- 콘텐츠 각도: ${strategy.angle}

## 수집해야 할 정보
${requiredInfo[strategy.postType]}

## 인터뷰 규칙
1. 질문은 **한 번에 하나씩**, 짧고 자연스럽게 (반말 아닌 존댓말)
2. 이미 답변된 내용 재질문 금지
3. 추가 컨텍스트가 필요하면 자연스럽게 팔로업
4. 위 "수집해야 할 정보"가 충분히 모이면 반드시 아래 문장으로 종료:
   **"좋아요, 이 정도면 충분해요. 포스팅 생성 시작할게요! ✍️"**
5. 종료 선언 후 추가 질문 절대 금지
${autoTerminate ? "6. 이 타입은 PDF 업로드가 필요해서 인터뷰 없이 바로 포스팅 생성할게요 — 첫 메시지에서 바로 종료 선언" : ""}

## MK 문체 참고 (인터뷰 질문 스타일에만 참고)
${rssText ? rssText.slice(0, 500) : "자연스럽고 친근한 대화체"}

${refText ? `## 동일 타입 기존 포스팅 구조 참고\n${refText.slice(0, 300)}` : ""}`;
}

// ──────────────────────────────────────────────
// 3. 포스팅 생성 (인터뷰 기반)
// ──────────────────────────────────────────────

export function buildWorkflowGenerateSystem(): string {
  return "당신은 네이버 인플루언서 'MK'입니다. 인터뷰 대화를 바탕으로 블로그 포스팅 HTML을 작성하세요.";
}

export function buildWorkflowGenerateUser(
  topic: string,
  messages: ChatMessage[],
  strategy: StrategyCard,
  references: { movieTitle: string; content: string }[],
  rssText: string,
  extraData: string,
): string {
  const { year, month, season } = nowParts();
  const refText = referenceText(references, rssText);

  const conversation = messages
    .map((m) => `[${m.role === "assistant" ? "인터뷰어" : "MK"}] ${m.content}`)
    .join("\n");

  const { brandColor } = getBrandColor(strategy.postType);
  const ds = getDesignSystem(brandColor);
  const cc = getCommonConstraints(season);

  return `현재 시점: ${year}년 ${month}월(${season})

━━━━━━━━━━━━━━━━━━━━━━━━━
[포스팅 전략]
━━━━━━━━━━━━━━━━━━━━━━━━━
- 주제: ${topic}
- 타입: ${strategy.postType}
- SEO 키워드: ${strategy.keywords.join(", ")}
- 타겟 독자: ${strategy.target}
- 콘텐츠 각도: ${strategy.angle}

━━━━━━━━━━━━━━━━━━━━━━━━━
[인터뷰 내용 — 이것이 포스팅의 핵심 소재]
━━━━━━━━━━━━━━━━━━━━━━━━━
${conversation}

${extraData ? `━━━━━━━━━━━━━━━━━━━━━━━━━\n[외부 데이터 (TMDB/KOBIS)]\n━━━━━━━━━━━━━━━━━━━━━━━━━\n${extraData}` : ""}

━━━━━━━━━━━━━━━━━━━━━━━━━
[디자인 시스템 — 반드시 준수]
━━━━━━━━━━━━━━━━━━━━━━━━━
${ds}
${cc}

${refText ? `━━━━━━━━━━━━━━━━━━━━━━━━━\n[MK 문체 레퍼런스 — 이 말투와 리듬을 100% 복제]\n━━━━━━━━━━━━━━━━━━━━━━━━━\n${refText}` : ""}

━━━━━━━━━━━━━━━━━━━━━━━━━
[출력 형식]
━━━━━━━━━━━━━━━━━━━━━━━━━
- 인사말·도입 설명 없이 바로 본문 HTML
- \`\`\`html 마크다운 기호 절대 포함 금지
- 전체를 <div style="font-family:'NanumSquare','나눔스퀘어',sans-serif; color:#333; line-height:1.8;"> 로 감싸기
- 순수 HTML 본문 코드만 출력
- 맨 마지막 줄:
<!-- TITLES: 제목1||제목2||제목3||제목4||제목5 -->
(SEO 키워드 "${strategy.keywords[0] ?? ""}" 포함, 30자 이내, 클릭 유도)`;
}

function getBrandColor(postType: PostType): { brandColor: string } {
  const map: Record<PostType, string> = {
    review: "#1a2e4a",
    preview: "#1a2e4a",
    curation: "#2d1a4a",
    binge: "#1a3a2e",
    photo: "#4a1a2e",
    local: "#1a2e4a",
    pdf: "#1a1a4a",
  };
  return { brandColor: map[postType] ?? "#1a2e4a" };
}
