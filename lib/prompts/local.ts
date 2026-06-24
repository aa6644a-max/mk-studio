/**
 * 로컬소식/공고문 프롬프트 (V2 LocalNewsPromptBuilder 1:1 이식).
 * 교육/채용/공모전/지원사업 공고문 기반. 감상 도입 없이 직접 선언 구조.
 */
import type { PostDraft } from "@/lib/types";
import { getHashtagRule, nowParts, referenceText, type PromptResult } from "./base";

const SYSTEM = "당신은 네이버 인플루언서 'MK'입니다. 아래 공고 데이터와 디자인 시스템을 100% 준수하여 대구 로컬 소식 포스팅 HTML을 작성하세요.";

function designSystem(brandColor: string): string {
  return `
[🎨 MK LINK 디자인 시스템 — 반드시 준수]

━━ 1. 상단 헤더 박스 (모집/행사 제목 선언) ━━
<table width="100%" border="0" cellpadding="22" cellspacing="0" bgcolor="${brandColor}" style="margin-bottom:24px;">
  <tr><td>
    <p style="margin:0 0 6px 0; font-size:12px; color:#90b4d4; letter-spacing:2px; font-weight:bold;">[기관명 · 주최]</p>
    <p style="margin:0; font-size:20px; color:#ffffff; font-weight:bold; word-break:keep-all; line-height:1.5;"><b>[모집/공고 제목]</b></p>
  </td></tr>
</table>

━━ 2. 섹션 헤더 (H2 대체 — font-size 19px 고정) ━━
<table width="100%" border="0" cellpadding="12" cellspacing="0" bgcolor="${brandColor}" style="margin-bottom:0;">
  <tr><td><b style="color:#ffffff; font-size:19px;">[아이콘] [섹션명]</b></td></tr>
</table>

━━ 3. 경고/마감 박스 (⚠️ 인원 한정, 지역 제한 등) ━━
<table width="100%" border="0" cellpadding="14" cellspacing="0" bgcolor="#fffbf0" style="border-left:4px solid #f59e0b; margin-bottom:24px;">
  <tr><td style="font-size:14px; color:#78530a;">⚠️ [내용]</td></tr>
</table>

━━ 4. 안내/대상 박스 (💡) ━━
<table width="100%" border="0" cellpadding="14" cellspacing="0" bgcolor="#f0f5ff" style="border-left:4px solid #2563eb; margin-bottom:24px;">
  <tr><td style="font-size:14px; color:#1e3a8a;">💡 [내용]</td></tr>
</table>

━━ 5. 정보 테이블 (2열, 모바일 안전) ━━
헤더 바로 아래에 이어서 border-top:none 으로 붙임.
<table width="100%" border="0" cellpadding="0" cellspacing="0" style="border:1px solid #dde3ed; border-top:none; margin-bottom:28px; font-size:14px;">
  <tr>
    <td width="30%" bgcolor="#f4f7fb" style="padding:13px 14px; font-weight:bold; color:${brandColor}; border-bottom:1px solid #eef0f5; border-right:1px solid #eef0f5; vertical-align:top;"><b>[항목명]</b></td>
    <td style="padding:13px 14px; border-bottom:1px solid #eef0f5;">[내용]</td>
  </tr>
</table>

━━ 6. 일정/커리큘럼 카드 (다열 테이블 금지 — 날짜별 세로 쌓기) ━━
날짜 배지(파란 배경) + 오전/오후 블록을 세로로 쌓는 구조.
<table width="100%" border="0" cellpadding="0" cellspacing="0" bgcolor="#e8f0fe" style="margin-bottom:2px;">
  <tr><td style="padding:10px 14px;"><b style="color:${brandColor}; font-size:14px;">[N일차 · 월 일(요일)]</b></td></tr>
</table>
<table width="100%" border="0" cellpadding="0" cellspacing="0" style="border:1px solid #dde3ed; border-top:none; margin-bottom:12px;">
  <tr>
    <td style="padding:14px 16px; border-bottom:1px solid #eef0f5;">
      <span style="font-size:12px; color:#2563eb; font-weight:bold; display:block; margin-bottom:4px;">[시간대]</span>
      <b style="font-size:14px; color:#222;">[모듈명]</b>
      <p style="margin:6px 0 0 0; font-size:13px; color:#666; line-height:1.7;">[주요 내용]</p>
    </td>
  </tr>
</table>

━━ 7. 혜택 카드 (단일 컬럼 — 항목 수만큼 세로 나열) ━━
<table width="100%" border="0" cellpadding="18" cellspacing="0" bgcolor="#f0fdf4" style="border:1px solid #86efac; margin-bottom:8px;">
  <tr><td>
    <p style="margin:0 0 4px 0; font-size:20px;">[이모지]</p>
    <p style="margin:0 0 4px 0; font-weight:bold; color:#166534; font-size:15px;"><b>[혜택명]</b></p>
    <p style="margin:0; font-size:13px; color:#4b7a55;">[상세 설명]</p>
  </td></tr>
</table>
※ 2번째 카드: bgcolor="#eff6ff", border-color:#93c5fd, 글자색:#1e40af/#3b6fcf
※ 3번째 카드: bgcolor="#fdf4ff", border-color:#d8b4fe, 글자색:#6b21a8/#7e3eb5

━━ 8. 신청 단계 (1→2→3 세로 플로우) ━━
<table width="100%" border="0" cellpadding="22" cellspacing="0" style="border:1px solid #dde3ed; border-top:none; margin-bottom:16px;">
  <tr><td style="text-align:center;">
    <table width="80%" border="0" cellpadding="14" cellspacing="0" bgcolor="#f4f7fb" style="border:1px solid #dde3ed; margin:0 auto 6px auto;">
      <tr><td style="font-size:14px; color:#555; text-align:center;">1. [단계명]</td></tr>
    </table>
    <p style="margin:4px 0; font-size:20px; color:#ccc; text-align:center;">↓</p>
    <table width="80%" border="0" cellpadding="14" cellspacing="0" bgcolor="#f4f7fb" style="border:1px solid #dde3ed; margin:6px auto;">
      <tr><td style="font-size:14px; color:#555; text-align:center;">2. [단계명]</td></tr>
    </table>
    <p style="margin:4px 0; font-size:20px; color:#ccc; text-align:center;">↓</p>
    <table width="80%" border="0" cellpadding="14" cellspacing="0" bgcolor="#f4f7fb" style="border:1px solid #dde3ed; margin:6px auto 22px auto;">
      <tr><td style="font-size:14px; color:#555; text-align:center;">3. [단계명]</td></tr>
    </table>
    <p style="margin:0 0 4px 0; font-size:13px; color:#888; text-align:center;">신청하기</p>
    <p style="margin:0; font-size:14px; color:#2563eb; word-break:break-all; text-align:center;">[신청 URL]</p>
  </td></tr>
</table>

(※ MK LINK 협업 시그니처는 시스템이 글 하단에 자동 삽입하므로 직접 작성하지 마세요.)
`;
}

function constraints(): string {
  return `
[🚫 로컬 소식 포스팅 절대 금지 사항]

HTML 구조:
  - <div> background/bgcolor 사용 금지 → 반드시 <table bgcolor> 사용
  - flex / grid / display:inline-block 레이아웃 금지
  - 3열 이상 다열 테이블 금지 → 단일 컬럼 카드로 분해
  - border-radius 는 <table>에 적용해도 네이버에서 무시될 수 있음 (생략 권장)

문체:
  - "호기심을 자극했습니다" 류의 영화 리뷰 투 도입 금지
  - "안녕하세요", "반갑습니다" 등 인사말 금지
  - "결론적으로", "요약하자면", "의 향연", "과언이 아닙니다" AI 금지어

정보:
  - PDF에 명시된 날짜 · 장소 · 신청링크 · 연락처는 반드시 포함
  - 정보를 임의로 추가하거나 변형하지 말 것
  - 소제목(섹션 헤더) 개수는 PDF 구조에 맞게 유연하게 조정
`;
}

export function buildAnnouncementPrompt(
  pdfText: string,
  userContext: string,
  refText: string,
  brandColor = "#1a2e4a",
): PromptResult {
  const { year, month, season } = nowParts();
  const timeContext = `현재 시점은 ${year}년 ${month}월(${season})입니다.`;
  const refSection = refText
    ? `
[🚨 MK 문체 참고 — 말투와 줄바꿈 리듬 복제]
${refText}
`
    : "";

  const user = `
아래 [원본 공고 데이터(PDF)]를 바탕으로 대구 로컬 소식 포스팅을 작성하세요.

${timeContext}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[🚨 도입부 공식 — 무조건 준수]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- 인사말 없이 상단 헤더 박스로 바로 시작
- 헤더 박스 아래 도입 문장은 "~이 열립니다", "~을 모집합니다", "~이 진행됩니다" 형태로 직접 선언
- 도입은 2~3문장으로 짧게: 소식의 핵심 + 이 소식이 누구에게 유용한지만 언급

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[🚨 포스팅 구조 공식 — 무조건 준수]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PDF 내용을 분석해 아래 순서로 구성하세요.
없는 항목은 생략, 필요하면 추가 가능.

  1. 상단 헤더 박스 (table bgcolor 선언형 제목)
  2. 짧은 도입 (2~3문장)
  3. ⚠️ 경고 박스 (인원 제한, 지역 조건, 마감 등)
  4. 📋 교육/행사 개요 (섹션 헤더 + 2열 정보 테이블)
  5. 💡 대상 안내 박스
  6. 📅 일정/커리큘럼 (날짜별 세로 카드 — 다열 테이블 절대 금지)
  7. 🎁 혜택 (단일 컬럼 카드 × 항목 수)
  8. 📌 시험/결과 안내 박스 (해당 시)
  9. 📮 신청 방법 (섹션 헤더 + 1→2→3 플로우 + 링크)
  10. 문의 정보 박스
  (※ MK LINK 협업 시그니처는 시스템이 자동 삽입 — 직접 작성 금지)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[원본 공고 데이터 (PDF)]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${pdfText}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[나의 기록 목적 및 컨텍스트]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${userContext}

${designSystem(brandColor)}
${constraints()}
${getHashtagRule()}
${refSection}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[출력 형식]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- \`\`\`html 마크다운 기호 절대 포함 금지
- 전체를 <div style="font-family:'NanumSquare','나눔스퀘어',sans-serif; color:#333; line-height:1.8;"> 로 감싸기
- 오직 순수 HTML 본문 코드만 출력
- 맨 마지막 줄에 반드시:
<!-- TITLES: 제목1||제목2||제목3||제목4||제목5 -->
(핵심 키워드 앞 배치, 30자 이내, 클릭 유도)
`;
  return { system: SYSTEM, user };
}

export function buildLocalPrompt(
  draft: PostDraft,
  references: { movieTitle: string; content: string }[],
  rssText = "",
): PromptResult {
  return buildAnnouncementPrompt(
    draft.pdfText,
    draft.purpose || draft.body || draft.title || "로컬 소식 안내",
    referenceText(references, rssText),
    draft.brandColor || "#1a2e4a",
  );
}
