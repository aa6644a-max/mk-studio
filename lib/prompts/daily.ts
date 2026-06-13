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

export function buildPhotoPostPrompt(
  category: string,
  vibe: string,
  placeInfoText: string,
  photoContextsText: string,
  refText: string,
  pdfText = "",
): PromptResult {
  const base = baseGuideline();
  const ref = referencePromptDaily(refText);
  const pdfSection = pdfText.trim()
    ? `
[📄 사전 조사 자료]
방문 전 직접 조사한 자료입니다. 브랜드 소개 단락과 자연스럽게 연결하되,
조사 내용을 그대로 나열하지 말고 방문 경험의 흐름 속에 녹여내세요.

${pdfText}
`
    : "";

  const user = `
아래 제공된 [사전 조사 자료], [장소 정보], [사진 메모], [실제 사진]을 바탕으로
MK 특유의 문체와 구조로 포스팅을 완성하세요.

[기록 기본 설정]
- 포스팅 주제: ${category}
- 전반적인 분위기: ${vibe}

${placeInfoText}

${pdfSection}

[📸 사진 메모 (순서 그대로)]
${photoContextsText}

======================================
[🔑 MK 문체 핵심 규칙 — 절대 준수]

1. 인트로: 발견 스토리로 시작
   - "SNS에서 한번씩 봤던", "지나칠 때마다 궁금했던", "집 근처에 생겼다고 해서" 같은
     자연스러운 발견 동기 + 이번에 드디어 가게 된 계기로 시작하세요.
   - 인사말("안녕하세요", "MK입니다") 절대 금지. 바로 본론.

2. 브랜드/장소 소개 단락
   - PDF 조사 자료가 있으면 이 단락에 녹이세요.
   - 💡 콜아웃 박스와 불릿 리스트로 핵심 정보를 정리하세요.
   - 과장 금지: '최고', '강추', '인생맛집', '핫플' 사용 불가.

3. 방문 묘사: 공간의 첫인상
   - 외관, 인테리어, 동선을 간결하게 묘사.
   - 주소/위치는 자연스럽게 본문에 녹이세요.

4. 메뉴/경험: 감각 묘사 중심
   - 가격 언급 자연스럽게 포함.
   - SNS에서 봤던 것 vs 실제 눈앞에 있는 것의 비교.
   - 질감, 온도, 냄새, 시각적 특징을 구체적 비유로 표현.
   - "맛있어요"가 아니라 "이런 느낌이었다"로 쓰세요.
   - 사진 흐름에 맞춰 문단 전개.

5. 실용 팁
   - 자연스러운 흐름 중에 💡 팁 박스 1~2개 삽입.

6. 마무리
   - 억지 추천 없이 "또 가겠냐"에 대한 솔직한 결론.
   - 누구에게 어울릴지 구체적으로.

7. 문장 리듬
   - "~하는데요", "~했어요", "~이긴 했어요", "~싶었어요" 섞어 쓰기.
   - 두세 문장마다 단락 전환. AI 특유의 긴 문단 금지.
   - AI 금지어: "결론적으로", "요약하자면", "의 향연", "과언이 아닙니다", "흥미로운".

${base}
======================================

[🎨 HTML 출력 가이드]
1. 전체: \`<div style="font-family: 'Nanum Gothic', '나눔고딕', sans-serif; color: #333; line-height: 1.8;">\` 로 감싸기.

2. 소제목: 아래 타이틀 박스 사용
   <table width="100%" border="0" cellpadding="15" bgcolor="#2e7d32"><tr><td><b style="color:#ffffff; font-size:18px;">[소제목]</b></td></tr></table>

3. 콜아웃 박스 (브랜드 정보, 실용 팁):
   <div style="background-color:#f8f9fa; border-radius:10px; padding:20px; border:1px solid #eee; margin:20px 0;">💡 [제목]<br><span style="color:#666; font-size:14px;">[내용]</span></div>

4. 이미지 삽입 (절대 준수):
   - 사진 순서 그대로 해당 문단 사이에 삽입:
   <div style="text-align:center; margin:25px 0;"><img src="[PHOTO_번호]" alt="[설명]" style="max-width:100%; height:auto; border-radius:12px; box-shadow:0 4px 10px rgba(0,0,0,0.1);"></div>

5. 구분선 (단락 전환 시 1~2회):
   <div style="height:2px; background:linear-gradient(to right,#ffffff,#a5d6a7,#ffffff); margin:50px 0;"></div>

${ref}

출력 형식: 오직 완성된 HTML 본문 코드만 출력. (\`\`\`html 마크다운 기호 제외)
맨 마지막 줄에 네이버 SEO 최적화 제목 5개:
<!-- TITLES: 제목1||제목2||제목3||제목4||제목5 -->
(핵심 키워드 앞에 배치, 30자 이내, 클릭 유도)
`;
  return { system: SYSTEM, user };
}

/** draft → 사진/PDF 분기. */
export function buildDailyPrompt(
  draft: PostDraft,
  references: { movieTitle: string; content: string }[],
): PromptResult {
  const refText = referenceText(references);
  if (draft.postType === "photo") {
    const placeInfo = draft.placeName ? `[장소 정보]\n- ${draft.placeName}` : "";
    const photoMemos = draft.imageNames.length
      ? draft.imageNames.map((n, i) => `${i + 1}. ${n}`).join("\n")
      : "(사진 메모 없음)";
    return buildPhotoPostPrompt(
      draft.category || draft.title || "방문 기록",
      draft.purpose || draft.body || "담백한 기록",
      placeInfo,
      photoMemos,
      refText,
      draft.pdfText,
    );
  }
  // pdf 요약
  return buildPdfSummaryPrompt(
    draft.pdfText,
    draft.body || draft.category || draft.title,
    refText,
  );
}
