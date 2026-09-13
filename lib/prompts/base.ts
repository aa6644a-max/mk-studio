/**
 * 프롬프트 공통 기반 (V2 BasePromptBuilder 1:1 이식).
 * 디자인 시스템 / 공통 제약 / 시즌 컨텍스트.
 */
import { htmlToStyleText, sampleStyleText } from "@/lib/style-text";

export function getSeason(d = new Date()): string {
  const m = d.getMonth() + 1;
  if (m >= 3 && m <= 5) return "봄";
  if (m >= 6 && m <= 8) return "여름";
  if (m >= 9 && m <= 11) return "가을";
  return "겨울";
}

export function nowParts(d = new Date()) {
  return { year: d.getFullYear(), month: d.getMonth() + 1, season: getSeason(d) };
}

/**
 * 서로게이트 쌍 안전 슬라이스. `.slice(0, n)`은 UTF-16 코드유닛 기준이라
 * 이모지(RSS·리뷰·PDF 텍스트에 흔함) 중간에서 잘리면 짝 없는 서로게이트가 남는다.
 * 이 상태로 Anthropic API에 보내면 "no low surrogate in string" 400 에러 발생 →
 * 스트림이 즉시 끊겨 인터뷰 채팅창에서 AI가 아무 말도 안 하는 것처럼 보인다.
 */
export function safeSlice(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  let end = maxLen;
  const code = text.charCodeAt(end - 1);
  if (code >= 0xd800 && code <= 0xdbff) end -= 1; // 짝 없는 상위 서로게이트 제거
  return text.slice(0, end);
}

/** [🎨 MK CINELAB 디자인 시스템] — 네이버 블로그 시각 장치. */
export function getDesignSystem(brandColor = "#333333"): string {
  return `
        1. 소제목(H2) 시각화:
           - 단순 텍스트 대신 1x1 표를 활용한 '타이틀 박스'를 만드세요.
          - 구조: <table width="100%" border="0" cellpadding="15" bgcolor="${brandColor}"><tr><td><b style="color:#ffffff; font-size:18px;">[소제목 내용]</b></td></tr></table>
           - 모든 주요 단락의 시작은 이 타이틀 박스로 시작하세요.

        2. 버티컬 라인 (포인트 강조):
           - 영화의 명대사, 핵심 요약, 혹은 강조하고 싶은 문구는 반드시 아래 코드로 감싸세요.
           - 구조: <div style="border-left: 5px solid ${brandColor}; padding-left: 15px; margin: 20px 0; color: #555; line-height: 1.8;">[강조 문구]</div>

        3. 노션 스타일 '콜아웃' 박스 (🚨 네이버는 div 배경색을 무시하므로 반드시 table bgcolor 사용):
           - 팁(Tip), 주의사항, 쿠키 영상 유무 등 부가 정보는 박스 처리를 하세요.
           - 구조: <table width="100%" border="0" cellpadding="16" cellspacing="0" bgcolor="#f8f9fa" style="border:1px solid #eee; margin:20px 0;"><tr><td style="line-height:1.8;">💡 <b>[정보 제목]</b><br><span style="color:#666; font-size:14px;">[상세 내용]</span></td></tr></table>

        4. 여백과 정렬 (시각적 리듬):
           - 문단 사이에는 <p style="text-align: center;">&nbsp;</p>를 넣어 충분한 여백을 확보하세요.
           - 정보 전달은 좌측 정렬, 서정적인 감상은 중앙 정렬(<p style="text-align: center;">)을 적절히 섞어 지루함을 방지하세요.
        `;
}

// ──────────────────────────────────────────────
// MK 페르소나 코어 — 단일 소스
// 어투·단락 리듬·금지어를 여기서만 정의한다. 각 포스팅 빌더
// (movie/daily/local/market/class101/workflow)는
// getMkVoiceBlock / getBannedWordsLine / buildStyleReference 를 호출만 한다.
// 이전에는 같은 문구가 6개 파일에 조금씩 다르게 하드코딩돼 있었다.
// ──────────────────────────────────────────────

/** AI 티가 나는 상투 표현 — 전 포스팅 타입 공통 금지. 기계 검사(post-lint)도 이 목록을 재사용. */
export const MK_BANNED_WORDS = [
  "결론적으로",
  "요약하자면",
  "의 향연",
  "할 수밖에 없습니다",
  "과언이 아닙니다",
  "시각적 즐거움",
  "흥미로운",
] as const;

/** 금지어를 프롬프트 한 줄로. */
export function getBannedWordsLine(): string {
  return `AI 금지어(절대 사용 금지): ${MK_BANNED_WORDS.map((w) => `"${w}"`).join(", ")}`;
}

/**
 * RSS 미연동 시 문체 감각을 잡아줄 골든 샘플.
 * 아래 문체 규칙이 실제로 어떻게 읽히는지 보여주는 예시 단락 (조심스러운 분석 + 짧은 호흡).
 */
export const MK_STYLE_SEED = `극장을 나서고도 한동안 자리에서 일어나지 못했습니다. 이야기가 대단해서라기보다, 마지막 장면의 여운이 생각보다 길게 남았던 탓이었어요.

돌이켜보면 이 작품의 힘은 화려한 장면에 있지 않은 것 같습니다. 오히려 인물이 말없이 창밖을 바라보는 짧은 순간에, 하고 싶은 말을 다 담아둔 게 아닐까 싶어요.

물론 아쉬운 지점도 있었는데요. 후반부에서 갈등을 서둘러 봉합하는 느낌은 솔직히 감출 수 없었습니다. 그럼에도 이 장면 하나만큼은 오래 기억에 남을 것 같네요.`;

/**
 * MK 문체 코어.
 * - full: 감상·경험이 들어가는 글 (리뷰·사진·에세이·마켓·협업)
 * - light: 객관 정보 전달 글 (공고·PDF 요약) — 감정 표현은 빼고 말투·리듬만
 */
export function getMkVoiceBlock(intensity: "full" | "light" = "full"): string {
  const common = `- 경어체 "~습니다 / ~해요 / ~죠"를 자연스럽게 섞어 씁니다.
- 단정("~입니다")보다 조심스러운 분석을 기본값으로: "~이지 않을까 싶어요", "~라고 생각됩니다", "~인 것 같기도 하네요".
- 단락 호흡: 2~3문장마다 <p>를 닫고 새로 엽니다. 4문장 이상 이어지는 단락 금지 — 이 리듬이 이 블로그의 핵심 가독성 장치입니다.
- 강조: <b>는 단순 명사가 아니라 그 단락의 핵심 주장·결론 구절에만. 단락당 1~2개, 남발 금지.`;
  if (intensity === "light") {
    return `[MK 문체 — 정보 전달체]
${common}
- 감상·감정 표현은 자제하고, 사실을 정보 전달자로서 친절하게 풀어 씁니다.`;
  }
  return `[MK 문체]
${common}
- 독자에게 말을 겁니다: "과연 ~일지", "어떻게 보면 ~이기도 하죠", "그도 그럴 것이 ~".
- 솔직한 감정을 드러냅니다: "~부분은 솔직히 아쉬움을 감출 수 없었는데요", "~장면에서는 저도 모르게 ~했습니다".
- 독자가 함께 생각하게 만드는 문체가 이 블로그의 정체성입니다.`;
}

/**
 * 문체 참조 블록. RSS/과거글 원문이 있으면 1차 소스로, 없거나 너무 적으면
 * 정적 문체 기준(getMkVoiceBlock) + 골든 샘플로 폴백한다.
 * 이전에는 원문이 없으면 "자연스럽고 친근한 대화체" 한 줄로 떨어져
 * "빙의" 수준의 지시와 실제 제공 정보의 간극이 컸다.
 *
 * @param refText RSS 원문 + 같은 타입 과거글이 합쳐진 참조 텍스트
 * @param opts.noQuoteDomain 새 글로 옮기면 안 되는 참조 글의 고유 정보 (영화 제목·제품명 등)
 * @param opts.intensity 문체 강도 (기본 full, 공고·요약은 light)
 */
export function buildStyleReference(
  refText = "",
  opts: { noQuoteDomain?: string; intensity?: "full" | "light" } = {},
): string {
  const voice = getMkVoiceBlock(opts.intensity ?? "full");
  const noQuote = opts.noQuoteDomain
    ? `\n- 🚨 참조 글에 나오는 ${opts.noQuoteDomain}은(는) 절대 새 글로 가져오지 마세요. 말투와 전개 방식이라는 껍데기만 취하고, 알맹이는 이번 주제로 새로 채웁니다.`
    : "";
  const ref = refText.trim();

  if (ref.length >= 800) {
    return `[🎯 MK 문체 참조 — 아래 원문의 말투·문장 끝맺음·줄바꿈 리듬·<b> 강조 위치를 최대한 그대로 따르세요 (**표시** = 원문의 굵은 글씨)]
${voice}${noQuote}

[내 과거 블로그 원문]
${ref}`;
  }
  if (ref.length > 0) {
    return `[🎯 MK 문체 참조 — 아래 원문은 분량이 적으니 리듬·구조만 참고하고, 표현이 애매하면 위 문체 기준을 우선하세요]
${voice}${noQuote}

[내 과거 블로그 원문 (일부)]
${ref}

[문체 감각용 예시]
${MK_STYLE_SEED}`;
  }
  return `[🎯 MK 문체 기준 — 과거 원문 연동이 없어 정적 기준으로 작성합니다]
${voice}${noQuote}

[문체 감각용 예시]
${MK_STYLE_SEED}`;
}

/** [🚫 공통 제약 사항] — 모든 포스팅 절대 금지. */
export function getCommonConstraints(season: string): string {
  return `
        [🚫 공통 제약 사항]
        - 인사말 절대 금지: "안녕하세요", "반갑습니다", "${season} 인사를 전해요" 등 상투적 표현은 생략하고 바로 본론으로 들어갑니다.
        - ${getBannedWordsLine()}
        - 뭉뚱그린 인상 대신 질감·구조·동선처럼 만져지는 디테일로 구체적으로 쓰세요.
        `;
}

/**
 * [공통 해시태그 규칙] — 모든 포스팅 동일 형식 강제.
 * 본문 중간 # 금지, 맨 마지막 줄에만 #키워드 형태로 5~10개.
 */
export function getHashtagRule(): string {
  return `
        [🏷️ 해시태그 — 모든 포스팅 동일 형식 절대 준수]
        - 본문 중간에는 절대 해시태그(#)를 넣지 마세요.
        - 글 맨 마지막(SEO 제목 주석 바로 위)에 <p> 태그 하나로 묶어 해시태그를 5~10개 삽입하세요.
        - 🚨 반드시 각 단어 앞에 #을 붙이고 공백으로 구분하세요. 예: <p>#키워드1 #키워드2 #키워드3</p>
        - 쉼표 나열(키워드1, 키워드2)은 금지. 반드시 # 형식으로만 작성하세요.`;
}

export type PromptResult = { system: string; user: string };

/**
 * 참조 텍스트 생성.
 * rssText: 네이버 블로그 RSS 원문 (문체 학습 소스)
 * posts:   같은 타입 Sheets 저장글 (구조/레이아웃 참조)
 *
 * 과거글은 htmlToStyleText로 변환해 단락 리듬(줄바꿈)과 **강조** 패턴을 보존하고,
 * 앞부분+뒷부분을 함께 샘플링해 도입·마무리 문체를 모두 표집한다.
 */
export function referenceText(
  posts: { movieTitle: string; content: string }[],
  rssText = "",
  n = 3,
): string {
  const rssPart = rssText
    ? `[📡 내 네이버 블로그 최신 원문 — 말투·문체·줄바꿈 리듬 참조 (**표시** = 원문의 굵은 글씨)]\n${rssText}`
    : "";

  const sheetsPart = posts.length
    ? posts
        .slice(0, n)
        .map((p, i) => {
          const text = sampleStyleText(htmlToStyleText(p.content), 1400, 600);
          return `--- 같은 타입 과거글 ${i + 1} (${p.movieTitle}) ---\n${text}`;
        })
        .join("\n\n")
    : "";

  return [rssPart, sheetsPart].filter(Boolean).join("\n\n");
}
