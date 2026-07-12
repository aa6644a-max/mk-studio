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
  getHashtagRule,
  nowParts,
  referenceText,
  safeSlice,
} from "./base";

// ──────────────────────────────────────────────
// 1. 전략 카드
// ──────────────────────────────────────────────

const STRATEGY_SYSTEM = `You are a Korean blog content strategist. Analyze the given topic and return ONLY a JSON object with no additional text.

postType selection:
- "공고/지원사업/모집/행사/소식/공모" in topic → "local"
- "정주행/몰아보기" + series title in topic → "binge"
- "큐레이션/추천목록/모음" in topic → "curation"
- "개봉/기대예정" + movie in topic → "preview"
- "PDF/요약" in topic → "pdf"
- place/food/cafe/travel in topic → "photo"
- movie/drama + "리뷰/후기/감상" in topic → "review"
- default → "review"

keywords: Extract the EXACT proper nouns from the topic (movie title, place name, event name) and use them as the base for 2-3 Naver search keywords. NEVER use generic words unrelated to the topic.`;

export function buildStrategyUser(topic: string, _trendText: string): string {
  return `Topic: "${topic}"

Return ONLY this JSON (no explanation):
{"postType":"<type>","keywords":["<keyword using exact words from topic>","<keyword2>"],"target":"<specific audience in Korean>","angle":"<content angle in Korean, 1 sentence>","contentType":"<searchable|shareable|both>"}`;
}


// ──────────────────────────────────────────────
// 2. 인터뷰
// ──────────────────────────────────────────────

export function buildInterviewSystem(
  strategy: StrategyCard,
  rssText: string,
  refText: string,
  fileContent?: string,
  imageInfo?: string,
  seed?: string,
  tmdbDetail?: string,
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
    photo: "방문/경험 계기, 각 사진 순간의 상황과 느낌, 전체적으로 강조하고 싶은 포인트, 실용 정보(영업시간·주차·입장료·동선 등 알면)",
    local: "이 소식을 전하는 이유/기록 목적, 특히 강조하고 싶은 혜택·자격 요건, 타겟 독자에게 전달할 핵심 메시지 (날짜·장소·신청링크는 PDF에서 자동 추출하니 재질문 금지)",
    pdf: "이 자료를 들여다보는 상황/기록 목적, 내용 중 가장 중요한 포인트, 독자에게 전달할 핵심 메시지 (세부 사실은 PDF에서 자동 추출하니 재질문 금지)",
  };

  const hasFileContent = !!(fileContent || imageInfo);
  const autoTerminate = false; // 파일 업로드 타입도 인터뷰 진행

  // ── 심화 모드 ── 감상평 시드가 있으면 "수집 체크리스트" 대신 "감상평 파고들기"로 전환
  const seedText = seed?.trim() ?? "";
  if (seedText) {
    return `당신은 MK 블로그 포스팅 인터뷰어입니다. 사용자(MK)는 이미 ${typeLabel[strategy.postType]}를 위한 **감상평을 직접 작성**했습니다. 당신의 임무는 정보 수집이 아니라, 그 감상평을 **더 깊고 구체적으로 끌어내는 것**입니다.

## MK가 쓴 감상평 (대화의 출발점)
${seedText}

${tmdbDetail ? `## 작품 실제 데이터 (TMDB 조사 — 감상평과 교차해 질문)\n${safeSlice(tmdbDetail, 2500)}` : ""}

## 포스팅 전략 (감상평에서 도출됨)
- 타입: ${typeLabel[strategy.postType]}
- 타겟 독자: ${strategy.target}
- 콘텐츠 각도: ${strategy.angle}
${strategy.hook ? `- 후킹 포인트: ${strategy.hook}` : ""}
${strategy.watchPoints?.length ? `- 관전 포인트: ${strategy.watchPoints.join(" / ")}` : ""}
${strategy.differentiator ? `- 차별화 각도: ${strategy.differentiator}` : ""}

## 인터뷰 목표 — 심화(수집 ❌)
1. 감상평에서 **가장 흥미롭거나 구체화 여지가 큰 지점**을 골라 파고드세요. (예: "후반부가 늘어진다" → 어느 장면에서, 왜 그렇게 느꼈는지)
2. **작품 데이터와 교차**하세요. 감독·배우·설정 등 조사된 사실을 감상평과 엮어, MK 본인도 미처 안 쓴 디테일을 끌어내세요. (예: "이 감독 전작과 톤이 어땠나요?")
3. 이미 감상평에 충분히 담긴 내용은 **재질문 금지**. 모르는 것을 묻지 말고, 쓴 것을 더 깊게 만드세요.
4. 추상적이면 구체적 일화·감정·장면으로, 단정적이면 "왜 그렇게 느꼈는지"로 캐세요.

## 인터뷰 규칙
1. 질문은 **한 번에 하나씩**, 짧고 자연스럽게 (존댓말)
2. 매 질문은 직전 답변과 감상평에 **실제로 반응**해야 함 — 정해진 순서로 묻는 체크리스트 금지
3. 3~5턴 정도 깊이를 만든 뒤, 글로 쓸 재료가 충분해지면 아래 문장으로 정확히 종료:
   **"좋아요! 포스팅 생성 시작할게요 ✍️"**
4. 종료 선언 후 추가 질문 절대 금지. 이 문장 외 다른 종료 표현 금지.
5. 감상평에 **평점·추천 대상**이 안 보이면, 종료 직전 그 두 가지만 가볍게 확인하세요. (이미 있으면 묻지 말 것)

## MK 문체 참고 (질문 스타일에만)
${rssText ? safeSlice(rssText, 500) : "자연스럽고 친근한 대화체"}
${refText ? `\n## 동일 타입 기존 포스팅 구조 참고\n${safeSlice(refText, 300)}` : ""}`;
  }

  return `당신은 MK 블로그 포스팅 인터뷰어입니다.
${hasFileContent && fileContent ? `\n## 업로드된 파일 정보 (이미 파악됨)\n${safeSlice(fileContent, 2000)}\n파일 내용을 기반으로 구체적인 질문을 하세요.` : ""}
${hasFileContent && imageInfo ? `\n## 업로드된 사진 정보 (이미 파악됨)\n${imageInfo}\n사진 정보를 기반으로 장소/분위기/경험에 대해 질문하세요.` : ""}

## 포스팅 정보
- 타입: ${typeLabel[strategy.postType]}
- SEO 키워드: ${strategy.keywords.join(", ")}
- 타겟 독자: ${strategy.target}
- 콘텐츠 각도: ${strategy.angle}
${strategy.hook ? `- 후킹 포인트: ${strategy.hook}` : ""}
${strategy.watchPoints?.length ? `- 관전 포인트: ${strategy.watchPoints.join(" / ")}` : ""}
${strategy.differentiator ? `- 차별화 각도: ${strategy.differentiator}` : ""}
${strategy.hook || strategy.watchPoints?.length || strategy.differentiator ? "\n위 후킹·관전·차별화 각도는 이미 작품 데이터로 수립된 전략입니다. 인터뷰 질문은 이 각도를 사용자의 실제 경험·감상으로 채우는 방향으로 하세요 (예: 관전 포인트에 대한 사용자의 실제 반응, 차별화 각도에 맞는 개인적 일화)." : ""}

## 수집해야 할 정보
${requiredInfo[strategy.postType]}

## 인터뷰 규칙
1. 질문은 **한 번에 하나씩**, 짧고 자연스럽게 (반말 아닌 존댓말)
2. 이미 답변된 내용 재질문 금지
3. 추가 컨텍스트가 필요하면 자연스럽게 팔로업
4. 위 "수집해야 할 정보"가 충분히 모이면 반드시 아래 문장으로 종료 (정확히 이 문장):
   **"좋아요! 포스팅 생성 시작할게요 ✍️"**
5. 종료 선언 후 추가 질문 절대 금지. 이 문장 외 다른 종료 표현 사용 금지.
${autoTerminate ? "6. 이 타입은 PDF 업로드가 필요해서 인터뷰 없이 바로 포스팅 생성할게요 — 첫 메시지에서 바로 종료 선언" : ""}

## MK 문체 참고 (인터뷰 질문 스타일에만 참고)
${rssText ? safeSlice(rssText, 500) : "자연스럽고 친근한 대화체"}

${refText ? `## 동일 타입 기존 포스팅 구조 참고\n${safeSlice(refText, 300)}` : ""}`;
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
  fileContent?: string,
  imageInfo?: string,
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

${fileContent ? `━━━━━━━━━━━━━━━━━━━━━━━━━\n[업로드된 PDF 원문 — 이 내용을 포스팅에 반영]\n━━━━━━━━━━━━━━━━━━━━━━━━━\n${safeSlice(fileContent, 4000)}` : ""}

${imageInfo ? `━━━━━━━━━━━━━━━━━━━━━━━━━\n[업로드된 사진 목록 — 포스팅에 플레이스홀더로 삽입]\n━━━━━━━━━━━━━━━━━━━━━━━━━\n${imageInfo}\n사진은 HTML에 <p style="text-align:center;color:#aaa;font-size:13px;">[사진: 파일명]</p> 형태로 적재적소에 삽입하세요.` : ""}

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
- 🚨 본문 텍스트 분량: 순수 읽기 텍스트 기준 2,500~3,000자 (HTML 태그 제외). 이 이상 쓰지 말 것.
${getHashtagRule()}
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
