/**
 * 마켓·플리마켓 후기 프롬프트.
 *
 * 기존 photo(사진 포스팅)·local(공고문)로는 안 되는 이유:
 *  - photo는 사진 순서대로 이어 쓰는 선형 구조 + 2,000자 상한이라
 *    참여 팀 10~15팀을 균등한 반복 카드로 담을 수 없다.
 *  - local은 모집 공고 선언형이라 다녀온 후기가 아니다.
 *
 * 이 빌더는 [장소 소개 → 시리즈 소개 → 부스 배치 → 참여 팀 반복 카드 → 남은 일정 → 마무리]
 * 구조를 고정하고, 팀 카드는 전부 같은 무게로 뽑는다.
 * 팀별 사진은 실제 업로드 대신 자리표시자 마커만 넣고, 발행 시 사람이 직접 삽입한다.
 */
import type { MarketHost, PostDraft } from "@/lib/types";
import {
  getCommonConstraints,
  getHashtagRule,
  nowParts,
  referenceText,
  safeSlice,
  type PromptResult,
} from "./base";

const SYSTEM =
  "당신은 네이버 인플루언서 'MK'입니다. 아래 현장 기록과 디자인 시스템을 100% 준수하여 마켓 후기 포스팅 HTML을 작성하세요.";

/** 참여 팀 수에 맞춘 목표 분량. 팀당 약 180자 + 공통 섹션 1,600자. */
function lengthTarget(hostCount: number): { min: number; max: number } {
  const min = 1600 + hostCount * 150;
  const max = 2400 + hostCount * 260;
  return { min, max };
}

function designSystem(brandColor: string): string {
  return `
[🎨 MK MARKET 디자인 시스템 — 반드시 이 코드 그대로 사용]

━━ A. 대분류 섹션 헤더 (진한 박스 — 글 전체 구조를 만드는 4~6개만) ━━
<table width="100%" border="0" cellpadding="14" cellspacing="0" bgcolor="${brandColor}" style="margin:36px 0 16px 0;"><tr><td><b style="color:#ffffff; font-size:19px;">[아이콘] [섹션명]</b></td></tr></table>

━━ B. 참여 팀 카드 (연한 경량 카드 — 팀 수만큼 반복) ━━
🚨 팀마다 A(진한 박스)를 쓰지 마세요. 모바일에서 색면이 화면을 다 먹습니다.
<table width="100%" border="0" cellpadding="16" cellspacing="0" bgcolor="#faf6f8" style="border-left:4px solid ${brandColor}; margin:28px 0 12px 0;"><tr><td>
  <p style="margin:0 0 4px 0; font-size:17px; color:#222;"><b>[이모지] [팀명]</b></p>
  <p style="margin:0; font-size:13px; color:#8a8a8a;">@[핸들][ · 역할이 있으면 추가]</p>
</td></tr></table>

━━ C. 사진 자리표시자 (실제 <img> 태그 절대 만들지 마세요) ━━
<table width="100%" border="0" cellpadding="12" cellspacing="0" bgcolor="#fff3cd" style="border:2px dashed #f0ad4e; margin:16px 0;"><tr><td style="text-align:center; font-size:13px; color:#8a6d3b;">📷 [폴더/구분] / [파일명] — [무엇이 찍혔는지]</td></tr></table>
- 노란 점선이라 붙여넣은 뒤 남은 마커가 눈에 띕니다. 회색으로 바꾸지 마세요.
- 파일명은 아래 제공된 목록에 있는 것만 쓰고, 없는 파일명을 지어내지 마세요.
- 사진 아래 별도 캡션 문단은 만들지 마세요. 사진 설명은 본문 문장에 녹입니다.

━━ D. 2열 정보 테이블 (장소 정보·일정 라인업 등 항목형) ━━
<table width="100%" border="0" cellpadding="0" cellspacing="0" style="border:1px solid #e6d5de; margin-bottom:28px; font-size:14px;">
  <tr>
    <td width="34%" bgcolor="#faf6f8" style="padding:13px 14px; font-weight:bold; color:${brandColor}; border-bottom:1px solid #f0e6eb; border-right:1px solid #f0e6eb; vertical-align:top;"><b>[항목]</b></td>
    <td style="padding:13px 14px; border-bottom:1px solid #f0e6eb;">[내용]</td>
  </tr>
</table>
(마지막 행은 border-bottom 없이)

━━ E. 콜아웃 박스 (💡 기본 정보·구경 팁) ━━
<table width="100%" border="0" cellpadding="16" cellspacing="0" bgcolor="#f8f9fa" style="border:1px solid #eee; margin:20px 0;"><tr><td style="line-height:1.8;">💡 <b>[제목]</b><br><span style="color:#666; font-size:14px;">[내용]</span></td></tr></table>

━━ F. 강조 인용 (현장에서 읽은 문구·슬로건·책 문장) ━━
<div style="border-left: 5px solid ${brandColor}; padding-left: 15px; margin: 20px 0; color: #555; line-height: 1.8;">[문구]</div>

━━ G. 일정 강조 박스 (남은 일정·마감) ━━
<table width="100%" border="0" cellpadding="14" cellspacing="0" bgcolor="#fffbf0" style="border-left:4px solid #f59e0b; margin-bottom:24px;">
  <tr><td style="font-size:14px; color:#78530a;">⚠️ [내용]</td></tr>
</table>

━━ H. 신청·안내 박스 (💡 파란색) ━━
<table width="100%" border="0" cellpadding="16" cellspacing="0" bgcolor="#f0f5ff" style="border-left:4px solid #2563eb; margin-bottom:24px;">
  <tr><td style="font-size:14px; color:#1e3a8a;">💡 [내용]</td></tr>
</table>

━━ I. 구분선 (팀 카드 전체가 끝난 뒤 1회만) ━━
<div style="height:2px; background:linear-gradient(to right,#ffffff,#e6c3d5,#ffffff); margin:50px 0;"></div>

(※ MK LINK 협업 시그니처와 상단 헤더는 시스템이 자동 삽입하므로 직접 작성하지 마세요.)
`;
}

function constraints(minLen: number, maxLen: number): string {
  const { season } = nowParts();
  return `
[🚫 마켓 후기 절대 금지 사항]

사실 관계 — 가장 중요:
  - 제공된 [참여 팀 현장 메모]에 없는 내용을 지어내지 마세요.
  - 특히 "구매했다 / 대화를 나눴다 / 작가님이 말씀하셨다 / 맛있었다"처럼
    메모에 근거가 없는 행위·발언은 절대 쓰지 마세요.
  - 가격은 언급하지 마세요. 행사 당일 한정 할인일 수 있어 나중에 판매자에게 문제가 됩니다.
  - 계좌번호·연락처·와이파이 비밀번호 같은 정보는 어떤 경우에도 본문에 넣지 마세요.
  - 참여 팀 수를 임의로 바꾸지 말고, 제공된 팀을 순서 그대로 전부 다루세요. 누락·중복 금지.

유사문서 방지:
  - 팀 소개를 공식 공지문 문구로 채우지 마세요. 같은 마켓 예고글과 문장이 겹치면
    이 글이 예고글에 밀립니다. 반드시 [현장 메모]의 관찰 내용으로 쓰세요.

HTML 구조:
  - <div> background/bgcolor 금지 → 반드시 <table bgcolor> 사용
  - flex / grid / display:inline-block 금지
  - 3열 이상 다열 테이블 금지
  - <img> 태그 생성 금지 → 반드시 [C. 사진 자리표시자]만 사용
  - 팀 카드에 진한 섹션 헤더(A) 사용 금지 → 반드시 경량 카드(B)

문체:
  - "안녕하세요", "반갑습니다", "${season} 인사" 등 인사말 금지
  - "결론적으로", "요약하자면", "의 향연", "과언이 아닙니다", "흥미로운" 금지
  - 팀마다 같은 문장 틀 반복 금지 ("~가 인상적이었습니다"를 10번 쓰지 말 것).
    관찰한 내용의 성격에 따라 문장 구조를 바꾸세요.

분량:
  - 순수 텍스트 ${minLen.toLocaleString()}~${maxLen.toLocaleString()}자.
    참여 팀이 많으므로 기존 사진 포스팅보다 훨씬 깁니다. 짧게 줄이려 하지 마세요.
`;
}

/** 팀별 현장 메모 + 사진 파일명 → 프롬프트 블록. */
function hostsBlock(hosts: MarketHost[]): string {
  if (!hosts.length) return "(참여 팀 정보 없음)";
  return hosts
    .map((h, i) => {
      const handle = h.handle.replace(/^@/, "");
      const photos = h.photoNames.length
        ? h.photoNames.join(", ")
        : "(사진 없음 — 마커 생략)";
      return [
        `${i + 1}. ${h.emoji || "•"} ${h.name}${handle ? ` (@${handle})` : ""}`,
        `   현장 메모: ${safeSlice(h.note.trim() || "(메모 없음 — 이 팀은 2문장 이내로 간결히)", 1200)}`,
        `   사진 파일: ${photos}`,
      ].join("\n");
    })
    .join("\n\n");
}

/** 전경·장소 사진 (특정 팀에 속하지 않는 사진) → 프롬프트 블록. */
function venuePhotoBlock(names: string[], captions: string[]): string {
  if (!names.length) return "(전경 사진 없음)";
  return names
    .map((n, i) => {
      const c = captions?.[i]?.trim();
      return c ? `- ${n} — ${c}` : `- ${n}`;
    })
    .join("\n");
}

export function buildMarketPrompt(
  draft: PostDraft,
  references: { movieTitle: string; content: string }[],
  rssText = "",
): PromptResult {
  const { year, month, season } = nowParts();
  const hosts = draft.hosts ?? [];
  const { min, max } = lengthTarget(hosts.length);
  const brandColor = draft.brandColor || "#8E3B62";
  const refText = referenceText(references, rssText);
  const refSection = refText
    ? `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[🚨 MK 문체 참고 — 말투·단락 리듬 복제 (**표시** = 원문 굵은 글씨)]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
AI의 빽빽한 작문 습관을 버리고, 아래 원문의 엔터 타이밍과 문장 끝맺음을 그대로 따라가세요.
두세 문장마다 <p>를 닫고 새로 여는 리듬을 복제하세요.

${refText}
`
    : "";

  const venueRows = [
    draft.venueName && `- 장소명: ${draft.venueName}`,
    draft.venueAddress && `- 주소: ${draft.venueAddress}`,
    draft.eventDate && `- 행사 날짜: ${draft.eventDate}`,
    draft.eventTime && `- 운영 시간: ${draft.eventTime}`,
  ]
    .filter(Boolean)
    .join("\n");

  const user = `
아래 [현장 기록]을 바탕으로 마켓 후기 포스팅을 작성하세요.
현재 시점은 ${year}년 ${month}월(${season})입니다.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[🚨 포스팅 구조 공식 — 이 순서 그대로]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. 도입 (인사말 없이 3~4문장)
   - 언제 어디를 다녀왔는지 바로 밝히고, 이 글이 무엇을 정리한 글인지 알립니다.
   - 날씨·첫인상처럼 그날에만 있었던 감각을 한 문장 넣으세요.
2. [A] 📍 장소 소개
   - [장소 메모]를 근거로 이 공간이 어떤 곳인지 씁니다. 건물 이력·내부 구성처럼
     검색으로 이 글을 찾을 사람에게 쓸모 있는 정보를 담으세요.
   - 항목형 정보는 [D] 2열 테이블, 기본 정보는 [E] 콜아웃으로.
   - 현장에서 읽은 슬로건·문구가 있으면 [F] 강조 인용으로.
3. [A] 🎪 행사·시리즈 소개
   - 이 마켓이 어떤 성격인지, 일정이 어떻게 돌아가는지 3~5문장.
   - 일정 라인업은 [D] 2열 테이블로 정리.
   - 🚨 이미 예고글에서 다뤘을 내용이므로 길게 늘이지 말고 압축하세요.
4. [A] 🎨 현장 분위기 / 부스 배치
   - 전경 사진을 근거로 부스가 어떻게 놓여 있었는지 씁니다.
   - 구경하는 사람에게 도움이 되는 팁이 있으면 [E] 콜아웃 1개.
5. [A] 🖼️ 참여 팀 소개 — 이 글의 본체
   - 아래 [참여 팀 현장 메모]의 순서 그대로, 팀마다:
     ① [B] 경량 카드로 이름·핸들 → ② [C] 사진 마커 → ③ 관찰 서술 2~4문단
   - 🚨 모든 팀을 같은 무게로 다루세요. 특정 팀만 길게 쓰지 마세요.
     참여 팀 전원이 자기 단락을 각자 SNS에 공유할 수 있어야 합니다.
   - 각 팀의 서술은 "무엇이 놓여 있었는지 → 그중 눈에 남은 것 → 그게 왜 특이한지"
     흐름으로 쓰되, 팀마다 문장 틀을 바꿔 단조로움을 피하세요.
   - 팀 전체가 끝나면 [I] 구분선 1회.
6. [A] 📅 남은 일정 / 참여 안내
   - [시리즈·일정 메모]를 근거로 다음 일정을 안내합니다. [G] 일정 박스, [H] 신청 박스 활용.
   - 메모에 없는 날짜·조건을 지어내지 마세요.
7. [A] ✍️ 마무리
   - 팀들을 다 돌아본 뒤의 총평 4~5문단. 억지 교훈 금지.
   - 참여 팀들을 관통하는 공통점이나 대비를 한 가지 짚으면 글이 닫힙니다.
8. 해시태그 한 줄

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[행사 기본 정보]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${venueRows || "(입력 없음)"}
- 참여 팀 수: ${hosts.length}팀

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[장소 메모 — 2번 섹션 재료]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${safeSlice(draft.venueInfo.trim() || "(메모 없음 — 장소 소개는 기본 정보만 짧게)", 3000)}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[시리즈·일정 메모 — 3번 / 6번 섹션 재료]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${safeSlice(draft.seriesInfo.trim() || "(메모 없음 — 해당 섹션 생략)", 3000)}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[전경·장소 사진 파일 — 1·2·4번 섹션에 배치]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${venuePhotoBlock(draft.imageNames ?? [], draft.imageCaptions ?? [])}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[참여 팀 현장 메모 — 이 순서 그대로, 전원 누락 없이]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${hostsBlock(hosts)}

${draft.body.trim() ? `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n[✏️ 이번 포스팅 방향 지시]\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n${safeSlice(draft.body.trim(), 2000)}\n` : ""}
${designSystem(brandColor)}
${constraints(min, max)}
${getCommonConstraints(season)}
${getHashtagRule()}
${refSection}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[출력 형식]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- \`\`\`html 등 마크다운 코드펜스 절대 금지
- 전체를 <div style="font-family:'NanumSquare','나눔스퀘어',sans-serif; color:#333; line-height:1.8;"> 로 감싸기
- 오직 순수 HTML 본문만 출력
- 맨 마지막 줄에 반드시:
<!-- TITLES: 제목1||제목2||제목3||제목4||제목5 -->
(핵심 키워드 앞 배치, 30자 이내, 지역명 + 장소명 + 마켓 성격을 앞쪽에 몰아 배치)
`;
  return { system: SYSTEM, user };
}
