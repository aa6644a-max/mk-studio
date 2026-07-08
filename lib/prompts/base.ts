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

/** [🚫 공통 제약 사항] — 모든 포스팅 절대 금지. */
export function getCommonConstraints(season: string): string {
  return `
        [🚫 공통 제약 사항]
        - 인사말 절대 금지: "안녕하세요", "반갑습니다", "${season} 인사를 전해요" 등 상투적 표현은 생략하고 바로 본론으로 들어갑니다.
        - AI 말투 제거: "결론적으로", "요약하자면", "~의 향연", "과언이 아닙니다" 등의 기계적인 표현을 쓰지 마세요.
        - 전문성 유지: 건축 전공자 특유의 꼼꼼함과 영화 애호가의 섬세한 시선이 느껴지는 단어(구조, 질감, 시선 등)를 사용하세요.
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
