import { getCommonConstraints, getDesignSystem, nowParts } from "./base";

const REFERRAL_LINK = "https://abr.ge/abkqd0";

const DISCLOSURE =
  '<p style="background-color: #f8f9fa; border: 1px solid #eee; border-radius: 8px; padding: 12px 16px; font-size: 12px; color: #888; margin: 20px 0;">📢 이 게시물은 클래스101 파트너스 활동의 일환으로, 이에 따른 일정액을 대가로 제공받을 수 있습니다.</p>';

const LINK_BTN = `<p style="text-align: center; margin: 24px 0;"><a href="${REFERRAL_LINK}" target="_blank" style="background-color: #26C6A4; color: #fff; padding: 13px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 15px;">👉 클래스101 구독 할인 링크 바로가기</a></p>`;

export type Class101Angle = 1 | 2 | 3;

export const ANGLE_LABELS: Record<Class101Angle, string> = {
  1: "구독 계기",
  2: "강의 리뷰",
  3: "활용 아이디어",
};

function angleDesc(angle: Class101Angle, category: string): string {
  const cat = category.trim() || "관심 분야";
  switch (angle) {
    case 1:
      return `${cat}에 관심 갖게 된 계기, 클래스101 구독을 시작한 흐름을 MK 시선으로 서술`;
    case 2:
      return `실제 수강한 ${cat} 관련 강의의 구체적 리뷰 — 어떤 점이 유용했는지, 무엇을 배웠는지`;
    case 3:
      return `클래스101 ${cat} 강의를 실생활(블로그 운영·대구 영화모임·콘텐츠 제작)에 적용하는 구체적 아이디어`;
  }
}

function buildHashtags(category: string): string {
  const cat = category.trim();
  const catTag = cat ? ` #${cat.replace(/[·\s·\/]/g, "")}` : "";
  return `#클래스101 #클래스101구독 #클래스101후기 #클래스101가격 #클래스101연간구독 #클래스101+ #클래스101구독료 #강의${catTag}`;
}

function rssSection(rssText: string): string {
  if (!rssText) return "";
  return `
[🚨 절대 준수: MK 문체 및 시각적 구조 완벽 복제 지침]
아래 [나의 과거 블로그 원문]은 이 블로그 주인장이 직접 쓴 글입니다.
AI의 기계적 작문 습관을 모두 버리고 이 레퍼런스의 말투·단어 선택·문장 끝맺음·비유 방식을 흉내 내서 빙의하세요.

* ⭕ 시각적 리듬 복제: 레퍼런스처럼 2~3문장 만에 <p> 태그를 닫고 새로 여세요. 긴 단락 금지.
* ⭕ 굵은 글씨 패턴: 단순 명사가 아니라 단락의 핵심 결론 구절에 <b> 태그 사용.
* ⭕ 조심스러운 분석체: "~이지 않을까 싶어요", "~라고 생각됩니다", "어떻게 보면 ~"을 자주 활용.
* ❌ AI 금지어: "결론적으로", "요약하자면", "~의 향연", "과언이 아닙니다", "흥미로운".
* 🚨 [내용 인용 금지]: 레퍼런스의 특정 사건·제품명은 절대 새 글에 가져오지 마세요. 말투 껍데기만 훔치고 내용은 완전히 새로 쓰세요.

[나의 과거 블로그 원문]
${rssText}
`;
}

export function buildClass101Prompt(
  angle: Class101Angle,
  category = "AI·업무자동화",
  courseName = "",
  userNotes = "",
  rssText = "",
): { system: string; user: string } {
  const cat = category.trim() || "AI·업무자동화";
  const hashtags = buildHashtags(cat);
  const { season } = nowParts();
  const designSystem = getDesignSystem("#1a2e4a");
  const commonConstraints = getCommonConstraints(season);

  const system = `당신은 네이버 인플루언서 'MK'입니다. 아래 지침을 100% 준수하여 네이버 블로그 HTML 본문을 작성하세요.

## 민케이 프로필
- 건축 전공자 출신, 영화·드라마 평론가, 네이버 블로그 "MK CINELAB" 운영
- 대구 영화모임 운영자
- 다양한 분야를 구조적으로 분석하는 스타일, 감성 있되 과장 없음

## 디자인 시스템
${designSystem}

## 공통 제약
${commonConstraints}

## 어조 및 페르소나
- 경어체("~습니다", "~해요", "~죠")와 구어체를 자연스럽게 섞으세요.
- 확정적 단정보다 조심스러운 분석 어투: "~이지 않을까 싶어요", "~라고 생각됩니다"
- 단락 호흡: 2~3문장마다 <p> 태그 닫고 새로 열기. 긴 단락 금지.
- 핵심 결론 구절에는 <b> 태그로 굵게 처리.

## Class101 파트너십 필수 조건
1. 제목 포함 키워드: 클래스101, 구독, 후기, ${cat}, 강의
2. 본문 키워드 각 5회 이상: 클래스101+, 연간구독, 후기, 가격, 구독료, ${cat}, 강의
3. 레퍼럴 링크 2회 삽입:
   - 1회: 도입부 바로 뒤 (첫 소제목 전)
   - 2회: 본문 마무리 직전
4. 필수 표기 문구: 본문 맨 마지막에 삽입 (아래 제공)
5. 해시태그: 본문 마지막 줄에 삽입 (아래 제공)

## 사진 배치 가이드
- 소제목 단락마다 아래 자리표시자 1개씩 삽입:
  <p style="text-align: center; color: #888; font-size: 14px; background: #eee; padding: 10px;">{{사진: 해당 단락 내용에 어울리는 사진 설명}}</p>
- 썸네일은 disclosure 바로 위, 본문 맨 마지막에 1개 배치:
  <p style="text-align: center; color: #888; font-size: 14px; background: #eee; padding: 10px;">{{썸네일}}</p>

## 링크 버튼 HTML (그대로 사용)
${LINK_BTN}

## 필수 표기 문구 (그대로 삽입)
${DISCLOSURE}

## 해시태그 (그대로 삽입)
<p style="color: #888; font-size: 13px;">${hashtags}</p>

## 출력 규칙
- 첫 줄: <!-- TITLE: [네이버 SEO 제목, 키워드 모두 포함, 40자 이내] -->
- 이후: 순수 HTML 본문만 출력
- \`\`\`html, \`\`\` 등 마크다운 코드블록 기호 절대 금지
- 외부 래퍼 <div> 생성 금지
- 전체를 <div style="font-family: 'Nanum Gothic', '나눔고딕', sans-serif; color: #333; line-height: 1.8;"> 로 감싸기

## Class101 서비스 정보 (사실 기반만 활용)
- 클래스101+ 연간구독: 6,400개↑ 강의 무제한, 145개 분야 (${cat} 포함)
- 타 사이트 강의 1개 평균 10만원↑ → 클래스101+ 구독료는 월 만원대
- 매월 평균 120개 신규 강의 추가
- 복권 이벤트: 매일 3회까지, 1강 수강 시 최대 100만 포인트 당첨`;

  const rss = rssSection(rssText);

  const user = `아래 앵글로 네이버 블로그 포스팅을 작성해줘.

## 카테고리
${cat}

## 수강 강의명
${courseName.trim() || "미입력 (카테고리 전반으로 자유롭게 작성)"}

## 포스팅 앵글
${angleDesc(angle, cat)}

## 추가 메모
${userNotes.trim() || "없음"}

${rss}

## 작성 기준
- 글 길이: 순수 텍스트 기준 1500~2000자
- 광고처럼 보이면 안 됨 — 실제 경험 기반처럼 자연스럽게
- 성장 스토리 흐름: 필요를 느낌 → 클래스101에서 배움 → 실제 적용
- 작성 완료 후 내부 점검: 필수 키워드 각 5회 이상인지 확인 후 출력`;

  return { system, user };
}
