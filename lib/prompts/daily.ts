/**
 * 일상/PDF 계열 프롬프트 (V2 DailyPromptBuilder 1:1 이식).
 * 사진 포스팅 / PDF 요약.
 */
import type { PostDraft } from "@/lib/types";
import {
  getCommonConstraints,
  getDesignSystem,
  nowParts,
  referenceText,
  type PromptResult,
} from "./base";

const SYSTEM = "당신은 네이버 인플루언서 'MK'입니다. 아래 데이터와 지침을 100% 준수하여 네이버 블로그 HTML 본문을 작성하세요.";

function baseGuideline(): string {
  const { year, month, season } = nowParts();
  const timeContext = `현재 시점은 ${year}년 ${month}월(${season})입니다.`;
  const designSystem = getDesignSystem("#2e7d32");
  const common = getCommonConstraints(season);
  return `
        [작성 지침]
        ${timeContext}

        ${designSystem}

        ${common}

        1. 어조 및 페르소나 (Tone of Voice):
            - 정중하고 친근한 경어체("~습니다", "~해요", "~죠")를 자연스럽게 섞어 쓰세요.
            - 확정적 표현 대신 조심스러운 분석("~이지 않을까 싶어요", "~라고 생각됩니다")을 사용하여 독자의 공감을 유도하세요.
            - 전문 용어는 정보 전달자로서 친절하게 풀어서 설명하세요.

        2. 전체 분량 및 가독성 (Layout & Readability):
            - 정보의 밀도를 높여 공백 제외 1,500 ~ 2,000자 내외로 작성하세요. (절대 2,000자 초과 금지)

        3. SEO (검색 최적화):
            - 본문 서두와 제목에 메인 키워드를 자연스럽게 배치하세요.
            - 절대 본문 중간에 해시태그(#)를 넣지 마세요.
            - 글의 맨 마지막 영역에만 <p> 태그로 묶어서 연관 태그(장소, 주제, 관련 키워드 등)를 5~10개 삽입하세요.
        `;
}

function referencePromptDaily(refText: string): string {
  if (!refText) return "";
  return `
        [🚨 절대 준수: MK 문체 및 '시각적 구조' 완벽 복제 지침]
        당신은 AI의 빽빽하고 기계적인 작문 습관을 버려야 합니다. 제공된 레퍼런스의 '말투'와 '단어 선택'뿐만 아니라 **단락을 나누는 방식(엔터 빈도)과 시각적인 호흡**까지 100% 복제하세요.

        * ⭕ 시각적 리듬 복제: 레퍼런스에서 한두 문장 만에 줄바꿈(엔터)을 하여 여백을 주었다면, 새 글에서도 그 짧고 속도감 있는 문단 구조를 똑같이 따라 하세요. 문장이 길어지기 전에 <p> 태그를 닫고 새로 열어주는 글쓴이 특유의 엔터 타이밍을 완벽히 파악하세요.
        * ❌ AI 금지어: "결론적으로", "요약하자면", "의 향연", "할 수밖에 없습니다", "과언이 아닙니다", "흥미로운".

        [나의 과거 레퍼런스 글]
        ${refText}
        `;
}

export function buildPdfSummaryPrompt(
  pdfText: string,
  userContext: string,
  refText: string,
): PromptResult {
  const base = baseGuideline();
  const ref = referencePromptDaily(refText);
  const user = `
        아래 제공된 [원본 데이터(PDF)]를 바탕으로 포스팅을 작성하세요.

        [🚨 도입부 작성 공식: 무조건 준수]
        1. "최근 [주제/상황]이 제 호기심을 자극했습니다."로 시작하세요.
        2. [나의 상황 및 기록 목적]을 녹여내어 이 자료를 들여다보게 된 동기를 밝히세요.
        3. "그래서 오늘은 [PDF의 핵심 내용]에 대해서 한번 알아보도록 하겠습니다."로 본론을 시작하세요.
        4. 절대 "안녕하세요", "반갑습니다", "MK입니다" 같은 상투적인 인사는 하지 마세요.

        [🚨 초강력 지침: 노트북LM 모드]
        - 외부 검색을 차단하고 오직 아래 제공된 [원본 데이터(PDF)]의 내용만 사용하세요.
        - 본론 구성: 소제목(H2, H3)은 딱 3개만 사용하세요.

        [🖼️ 이미지 배치 가이드]
        - 본문 흐름에 맞게 최소 5곳에 아래 코드를 삽입하세요:
          <p style="text-align: center; color: #888; font-size: 14px; background: #eee; padding: 10px;">{{사진: 해당 문맥에 어울리는 이미지 설명}}</p>

        [원본 데이터 (PDF 추출 텍스트)]
        ${pdfText}

        [나의 상황 및 기록 목적]
        ${userContext}

        ${ref}

        ${base}

        출력 형식: \`\`\`html, \`\`\` 등 마크다운 코드블록 기호를 절대 포함하지 마세요. 오직 순수 HTML 본문 코드만 출력하세요.
        맨 마지막 줄에 아래 형식으로 네이버 SEO 최적화 제목 5개를 반드시 제안하세요:
        <!-- TITLES: 제목1||제목2||제목3||제목4||제목5 -->
        (제목 조건: 검색 노출에 유리한 핵심 키워드를 앞에 배치, 30자 이내, 클릭을 유도하는 감성적 표현 포함)
        `;
  return { system: SYSTEM, user };
}

function photoStructureGuide(photoCategory: string): string {
  switch (photoCategory) {
    case "일상기록":
      return `[🔑 글 구조 — 일상·기록]
1. 인트로: 오늘 한 일을 한두 문장으로 자연스럽게 시작. 인사말 금지.
2. 사진 순서대로 에피소드 전개 — 각 사진의 메모를 바탕으로 그 순간의 상황·감정·생각을 짧게.
3. 억지 교훈 없이 "오늘 느낀 것" 한두 줄로 마무리.
4. 전체 톤: 일기장 쓰듯 편안하게. 정보 전달보다 감각·감정 중심.`;

    case "여행나들이":
      return `[🔑 글 구조 — 여행·나들이]
1. 인트로: 어디 갔는지 + 가게 된 계기 한두 문장. 인사말 금지.
2. 코스 순서대로 전개 — 사진 메모 순서 = 동선 순서로 이해하고 묘사.
3. 교통·주차·소요시간 등 실용 팁을 💡 박스 1~2개로.
4. 마무리: 또 갈 만한지, 누구랑 어울리는지 솔직하게.`;

    case "전시문화":
      return `[🔑 글 구조 — 전시·문화]
1. 인트로: 어떤 전시/행사인지 한두 문장. 기대감 또는 방문 계기.
2. 현장 분위기 묘사 → 작품/프로그램별 인상 → 사진 메모 순서대로.
3. 실용 정보(관람 시간, 입장료, 위치) 💡 박스로.
4. 마무리: 어떤 사람에게 추천할 만한지 솔직하게.`;

    default: // 맛집카페
      return `[🔑 글 구조 — 맛집·카페]
1. 인트로: 발견 동기로 시작 ("SNS에서 봤던", "지나칠 때마다 궁금했던" 등). 인사말 금지.
2. 가게/카페 소개 — PDF 자료 있으면 이 단락에 녹이기. 과장 금지('인생맛집', '핫플' 불가).
3. 공간 묘사: 외관·인테리어·동선 간결하게.
4. 메뉴·음식: 질감·온도·비주얼을 구체적 비유로. "맛있어요" 금지 → "이런 느낌이었다"로.
5. 💡 팁 박스 1~2개 (웨이팅, 주차, 추천 메뉴 등).
6. 마무리: 또 갈 만한지, 누구에게 어울리는지 솔직하게.`;
  }
}

export function buildPhotoPostPrompt(
  photoCategory: string,
  placeInfoText: string,
  photoContextsText: string,
  refText: string,
  pdfText = "",
  userBody = "",
  imageMode: "url" | "placeholder" = "url",
): PromptResult {
  const base = baseGuideline();
  const ref = referencePromptDaily(refText);
  const structureGuide = photoStructureGuide(photoCategory);
  const categoryLabel: Record<string, string> = {
    맛집카페: "맛집·카페 방문 후기",
    일상기록: "일상 기록",
    여행나들이: "여행·나들이",
    전시문화: "전시·문화 행사",
  };
  const label = categoryLabel[photoCategory] ?? "사진 포스팅";

  const pdfSection = pdfText.trim()
    ? `\n[📄 사전 조사 자료]\n방문 전 조사한 자료입니다. 브랜드 소개 단락에 자연스럽게 녹여내세요.\n${pdfText}\n`
    : "";

  const bodySection = userBody.trim()
    ? `\n[✏️ 포스팅 방향 지시]\n${userBody}\n`
    : "";

  const user = `
포스팅 카테고리: ${label}

${placeInfoText}
${pdfSection}
${bodySection}
[📸 사진 메모 (순서 = 포스팅 순서)]
${photoContextsText}

======================================
${structureGuide}

[공통 문체 규칙]
- "~하는데요", "~했어요", "~이긴 했어요", "~싶었어요" 자연스럽게 섞기.
- 두세 문장마다 단락 전환. AI 특유의 긴 문단 금지.
- AI 금지어: "결론적으로", "요약하자면", "의 향연", "과언이 아닙니다", "흥미로운".
- 어려운 전문용어 금지 — 처음 듣는 사람도 이해할 수 있는 표현으로.

${base}
======================================

[🎨 HTML 출력 가이드]
1. 전체: \`<div style="font-family: 'Nanum Gothic', '나눔고딕', sans-serif; color: #333; line-height: 1.8;">\` 로 감싸기.

2. 소제목:
   <table width="100%" border="0" cellpadding="15" bgcolor="#2e7d32"><tr><td><b style="color:#ffffff; font-size:18px;">[소제목]</b></td></tr></table>

3. 콜아웃 박스:
   <div style="background-color:#f8f9fa; border-radius:10px; padding:20px; border:1px solid #eee; margin:20px 0;">💡 [제목]<br><span style="color:#666; font-size:14px;">[내용]</span></div>

4. 이미지 삽입 (사진 순서 그대로):
${imageMode === "placeholder"
  ? `   🚨 [사진 플레이스홀더 — 절대 준수]: 실제 이미지 URL이 없으므로 <img> 태그를 만들지 마세요.
   대신 위 [📸 사진 메모]에 나온 사진을 순서대로, 글 흐름의 알맞은 위치에 아래 회색 박스로 삽입하세요.
   <p style="text-align:center; color:#888; font-size:14px; background:#eee; padding:10px;">{{사진: 파일명 — 캡션}}</p>
   - 파일명·캡션은 [📸 사진 메모]에 적힌 그대로 채우세요. 사진 1장당 박스 1개, 누락·중복 금지.
   - 박스 바로 아래에 그 사진 장면을 설명하는 1~2문장 캡션을 <p style="text-align:center; color:#666; font-size:14px; font-style:italic;"> 태그로 덧붙이세요.`
  : `   <div style="text-align:center; margin:25px 0;"><img src="[PHOTO_번호]" alt="[설명]" style="max-width:100%; height:auto; border-radius:12px; box-shadow:0 4px 10px rgba(0,0,0,0.1);"></div>`}

5. 구분선:
   <div style="height:2px; background:linear-gradient(to right,#ffffff,#a5d6a7,#ffffff); margin:50px 0;"></div>

${ref}

출력 형식: 순수 HTML 본문만. (\`\`\`html 마크다운 기호 제외)
맨 마지막 줄:
<!-- TITLES: 제목1||제목2||제목3||제목4||제목5 -->
(핵심 키워드 앞 배치, 30자 이내, 클릭 유도)
`;
  return { system: SYSTEM, user };
}

/** draft → 사진/PDF 분기. */
export function buildDailyPrompt(
  draft: PostDraft,
  references: { movieTitle: string; content: string }[],
  rssText = "",
): PromptResult {
  const refText = referenceText(references, rssText);
  if (draft.postType === "photo") {
    const placeInfo = draft.placeName ? `[장소 정보]\n- ${draft.placeName}` : "";
    const photoMemos = draft.imageNames.length
      ? draft.imageNames
          .map((n, i) => {
            const caption = draft.imageCaptions?.[i]?.trim();
            return caption ? `${i + 1}. ${n} — ${caption}` : `${i + 1}. ${n}`;
          })
          .join("\n")
      : "(사진 없음)";
    return buildPhotoPostPrompt(
      draft.photoCategory || "맛집카페",
      placeInfo,
      photoMemos,
      refText,
      draft.pdfText,
      draft.body,
    );
  }
  // pdf 요약
  return buildPdfSummaryPrompt(
    draft.pdfText,
    draft.body || draft.category || draft.title,
    refText,
  );
}
