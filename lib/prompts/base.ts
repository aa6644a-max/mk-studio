/**
 * 프롬프트 공통 기반 (V2 BasePromptBuilder 1:1 이식).
 * 디자인 시스템 / 공통 제약 / 시즌 컨텍스트.
 */

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

        3. 노션 스타일 '콜아웃' 박스:
           - 팁(Tip), 주의사항, 쿠키 영상 유무 등 부가 정보는 박스 처리를 하세요.
           - 구조: <div style="background-color: #f8f9fa; border-radius: 10px; padding: 20px; border: 1px solid #eee; margin: 20px 0;">💡 [정보 제목]<br><span style="color: #666; font-size: 14px;">[상세 내용]</span></div>

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

export type PromptResult = { system: string; user: string };

/** Post[] → 레퍼런스 텍스트 (최근 N개 본문 결합). */
export function referenceText(
  posts: { movieTitle: string; content: string }[],
  n = 3,
): string {
  if (!posts.length) return "";
  return posts
    .slice(0, n)
    .map((p, i) => `--- 레퍼런스 ${i + 1} (${p.movieTitle}) ---\n${p.content}`)
    .join("\n\n");
}
