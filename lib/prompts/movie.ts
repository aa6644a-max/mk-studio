/**
 * 영화 계열 프롬프트 (V2 PromptBuilder 1:1 이식).
 * 리뷰 / 프리뷰 / 큐레이션 / 정주행 / 뉴스 / HTML 변환.
 */
import type { CurationItem, MovieDetails, PostDraft } from "@/lib/types";
import {
  getCommonConstraints,
  getDesignSystem,
  nowParts,
  referenceText,
  type PromptResult,
} from "./base";

const MAX_STILLS = 5;

function buildImageHtml(url: string | undefined, alt: string): string {
  if (!url) return "";
  return `<div style="text-align: center; margin: 25px 0;"><img src="${url}" alt="${alt}" style="max-width: 100%; height: auto; border-radius: 12px; box-shadow: 0 4px 10px rgba(0,0,0,0.1);"></div>`;
}

function buildPlaceholderHtml(text: string): string {
  return `<p style="text-align: center; color: #888; font-size: 14px; background: #eee; padding: 10px;">{{사진: ${text}}}</p>`;
}

function generateMediaPrompts(
  d: MovieDetails,
  isPreview: boolean,
): { posterHtml: string; stillsPromptText: string; ticketHtml: string } {
  const title = d.title ?? "";
  let posterHtml = buildImageHtml(d.posterUrl, `${title} 메인 포스터`);
  if (!posterHtml) posterHtml = buildPlaceholderHtml(`영화 '${title}' 메인 포스터`);

  const capped = (d.backdropUrls ?? []).slice(0, MAX_STILLS);
  const stills: string[] = capped.map((url, i) =>
    buildImageHtml(url, `${title} 공식 스틸컷 ${i + 1}`),
  );
  for (let i = stills.length; i < MAX_STILLS; i++) {
    stills.push(buildPlaceholderHtml(`${title} 주요 장면 ${i + 1} (관련 텍스트 삽입)`));
  }

  const parts = stills.map((html, i) => {
    let hint: string;
    if (i === 0) hint = "(배치 위치: 줄거리 요약 직후)";
    else if (i === 1) hint = "(배치 위치: 본론 첫 번째 소제목 단락 아래)";
    else if (i === 2) hint = "(배치 위치: 본론 두 번째 소제목 단락 아래)";
    else if (i === 3) hint = "(배치 위치: 본론 세 번째 소제목 단락 아래)";
    else hint = "(배치 위치: 본론 마지막 소제목 단락 아래 또는 관전 포인트 박스 직전)";
    return `        - [스틸컷 ${i + 1}] ${hint}: ${html}`;
  });
  const stillsPromptText = parts.join("\n");

  if (isPreview) return { posterHtml, stillsPromptText, ticketHtml: "" };
  const ticketHtml = buildPlaceholderHtml(`${title} 영화관 관람 인증샷 (티켓 등)`);
  return { posterHtml, stillsPromptText, ticketHtml };
}

function referencePromptMovie(refText: string): string {
  if (!refText) return "";
  return `
        [🚨 절대 준수: MK 문체 및 '시각적 구조' 완벽 복제 지침]
        아래 제공된 [나의 과거 레퍼런스 글]은 이 블로그의 주인장인 제가 직접 쓴 글입니다.
        당신은 AI의 기계적인 작문 습관을 모두 버리고, 무조건 이 레퍼런스의 '말투', '단어 선택', '문장 끝맺음', '비유 방식'을 100% 똑같이 흉내 내서 빙의해야 합니다.

        * ⭕ 시각적 리듬 복제:
          레퍼런스에서 한두 문장 만에 줄바꿈(엔터)을 하여 여백을 주었다면, 새 글에서도 그 짧고 속도감 있는 문단 구조를 똑같이 따라 하세요.
          문장이 길어지기 전에 <p> 태그를 닫고 새로 열어주는 글쓴이 특유의 엔터 타이밍을 완벽히 파악하세요.

        * ⭕ 굵은 글씨 패턴 복제:
          레퍼런스에서 <b> 태그로 강조한 위치와 방식을 파악하세요.
          단순 명사 강조가 아니라 그 단락의 핵심 주장이나 결론 구절을 굵게 처리하는 패턴을 그대로 따르세요.

        * ⭕ 작성자 목소리 복제:
          레퍼런스에서 "~이지 않을까 싶어요", "그도 그럴 것이", "어떻게 보면" 같은 표현들이 나오는 빈도와 위치를 파악하고,
          새 글에서도 같은 밀도와 리듬으로 작성자의 목소리를 녹여내세요.

        * ❌ AI 금지어 (절대 사용 금지):
          "결론적으로", "요약하자면", "이 영화는 ~라는 점에서 큰 의미를 가집니다",
          "~의 향연", "~할 수밖에 없습니다", "과언이 아닙니다", "시각적 즐거움", "흥미로운".

        * 🚨 [초강력 경고: 내용 인용 금지]
          레퍼런스 글에 등장하는 과거의 영화 제목, 배우 이름, 특정 사건 내용 등을 절대로 새 글에 가져오거나 언급하지 마세요.
          오직 "말투와 글을 전개하는 방식"이라는 껍데기만 훔쳐오고, 알맹이는 완전히 새로운 영화에 맞춰서 작성해야 합니다.

        [나의 과거 레퍼런스 글]
        ${refText}
        `;
}

function getBaseGuideline(postType: "review" | "preview" | "news"): string {
  const { year, month, season } = nowParts();
  const timeContext = `현재 시점은 ${year}년 ${month}월(${season})입니다.`;
  const designSystem = getDesignSystem("#1a1a1a");
  const commonConstraints = getCommonConstraints(season);

  let introGuideline = "";
  let mediaGuideline = "";

  if (postType === "preview") {
    introGuideline = `- [서론 - 도입부 공식 절대 준수]:
              1. "최근 영화 <[영화 제목]>의 개봉(또는 관련) 소식이 제 호기심을 자극했습니다." 혹은 이와 유사하게 시작하세요.
              2. 하단에 제공되는 [포스팅 계기/이유]를 녹여내어 이 영화를 프리뷰하게 된 명확한 동기를 밝히세요.
              3. "그래서 오늘은 개봉에 앞서 이 영화의 기대 포인트에 대해 미리 알아보도록 하겠습니다."로 본론을 여세요.`;
    mediaGuideline = `- 제공된 [메인 포스터]와 [스틸컷 1~N개] HTML 코드는 본문에 모두 1번씩 그대로 복사하여 삽입해야 합니다.
            - 💡 [융통성 발휘]: 개봉 전 프리뷰이므로, 부가적인 정보 사진이 들어가면 좋은 위치에는 언제든지 \`<p style="text-align: center; color: #888; font-size: 14px; background: #eee; padding: 10px;">{{사진: 필요한 실제 사진/상황에 대한 구체적 설명}}</p>\` 코드를 사용하세요.`;
  } else if (postType === "review") {
    introGuideline = `- [서론 - 도입부 공식 절대 준수]:
              1. "최근 영화 <[영화 제목]>을(를) 관람했습니다." 혹은 이와 유사하게 흥미를 유발하며 시작하세요.
              2. 하단에 제공되는 [포스팅 계기/관람 이유]를 녹여내어 영화를 보게 된 동기나 강렬한 첫인상을 밝히세요.
              3. "그래서 오늘은 이 영화에 대한 솔직한 감상과 리뷰를 남겨보려 합니다."로 본론을 여세요.
              4. 서론 마지막 문장 직후에 아래 구분선 코드를 삽입하세요.
                 <p style="text-align:center; color:#bbb; letter-spacing: 8px;">• • • • •</p>
              5. 구분선 바로 아래에 [관람 인증샷] 코드를 삽입하세요.

            - [줄거리 요약 섹션 - 구분선+인증샷 직후 반드시 작성]:
              아래 HTML 소제목 스타일을 그대로 복사하여 줄거리 섹션을 여세요.
              (🚨 H2, H3 태그 및 border-bottom 방식 사용 절대 금지 — 반드시 아래 table 구조만 사용)
              <table width="100%" border="0" cellpadding="15" bgcolor="#1a1a1a"><tr><td><b style="color:#ffffff; font-size:18px;">■ 어떤 이야기인가요?</b></td></tr></table>
              - 제공된 [줄거리] 데이터를 바탕으로 결말·반전을 드러내지 않는 선에서 3~4문장으로 압축 정리합니다.
              - 영화의 배경, 주인공 상황, 핵심 갈등 구조만 간결하게 소개하세요.
              - 줄거리 요약 직후에 [스틸컷 1] 코드를 삽입하세요.

            - [본론 소제목 스타일 - 🚨 반드시 아래 table 형식만 사용]:
              모든 본론 소제목은 위 디자인 시스템(1번 항목)에서 정의한 table 구조를 그대로 사용하세요.
              H2, H3 태그 및 border-bottom 방식은 절대 사용 금지.
              <table width="100%" border="0" cellpadding="15" bgcolor="#1a1a1a"><tr><td><b style="color:#ffffff; font-size:18px;">[소제목 내용]</b></td></tr></table>

            - [본론 구성 - 🚨 아래 조건 전부 필수]:
              소제목 주제는 영화의 특성과 감상평에서 가장 강조할 포인트를 자유롭게 설정하세요. 단, 아래 조건은 반드시 지키세요.

              • 🚨 [소제목 개수 — 절대 준수]:
                본론 소제목은 반드시 4~5개를 사용하세요. 3개는 부족합니다.
                각 소제목은 영화의 서로 다른 층위(서사, 연기, 연출, 감정, 세계관, 주제의식 등)를
                각각 다른 각도에서 분석하는 내용으로 구성하세요.
                같은 내용을 다른 말로 반복하는 소제목은 절대 금지입니다.

              • 🚨 [단락 호흡 — 절대 준수]:
                한 단락은 반드시 2~3문장으로 끊으세요. 4문장 이상 이어지는 단락은 금지입니다.
                문장이 이어지고 싶어도 <p> 태그를 닫고 새로 열어서 여백을 확보하세요.
                이것이 이 블로그 특유의 리듬감이며, 독자가 스크롤하며 편하게 읽을 수 있는 핵심 요소입니다.
                단, 단락 수를 늘려서 분량을 채우세요. 소제목 하나당 최소 3개 단락(p 태그 기준)을 작성하고,
                분석할 내용이 충분하다면 4~5개 단락까지 전개해도 좋습니다.

              • 🚨 [작성자 목소리 — 절대 준수]:
                단순히 영화 내용을 설명하는 서술에 그치지 말고, 반드시 작성자 본인의 시선과 의견을 녹여내세요.
                아래 표현 패턴을 자연스럽게 활용하세요.
                - 조심스러운 분석: "~이지 않을까 싶어요", "~라고 생각됩니다", "~인 것 같기도 하네요"
                - 독자에게 말 걸기: "과연 ~일지", "어떻게 보면 ~이기도 하죠", "그도 그럴 것이 ~"
                - 솔직한 감정 표현: "~부분은 솔직히 아쉬움을 감출 수 없었는데요", "~장면에서는 저도 모르게 ~했습니다"
                각 소제목 단락 안에 이런 표현이 최소 1개 이상 반드시 포함되어야 합니다.

              • 🚨 [굵은 글씨 강조 — 절대 준수]:
                각 단락에서 핵심이 되는 키워드나 결론 문장은 반드시 <b> 태그로 굵게 처리하세요.
                단순 명사 강조가 아니라, 그 단락에서 가장 중요한 포인트를 담은 구절을 선택하세요.
                예시: "이 장면에서 감독이 말하려는 바는 결국 <b>권력 앞에서 무너지는 인간성</b>이 아닐까 싶어요."
                단락당 1~2개를 넘기지 않도록 하세요. 남발하면 효과가 사라집니다.

              • 복잡한 요소를 설명하는 구간에는 아래 인용구 박스를 1~2개 삽입하세요.
                <blockquote style="border-left:4px solid #333; margin:20px 0; padding:10px 20px; background:#f9f9f9; color:#444; font-size:15px;">
                  [핵심 분석 문장이나 인상적인 표현을 한 문장으로]
                </blockquote>

              • 🚨 [스틸컷 분산 배치 필수]:
                스틸컷은 반드시 각 소제목 단락 사이에 1장씩 고르게 분산하세요.
                절대로 후반부에 연달아 몰아 배치하지 마세요. 스틸컷 2장 이상이 연속으로 붙어 있으면 안 됩니다.

            - [관전 포인트 섹션 - 본론 마지막에 반드시 삽입]:
              마지막 본론 스틸컷 이후, 결론 전에 아래 형식의 관전 포인트 박스를 삽입하세요.
              <div style="background:#f5f5f5; border:1px solid #ddd; border-radius:8px; padding:16px 20px; margin:30px 0;">
                <p style="margin:0 0 8px; font-size:13px; color:#e53e3e; font-weight:bold;">🔎 관전 포인트</p>
                <p style="margin:0; font-size:14px; color:#555;">[이 영화를 어떤 마음으로 보면 좋을지, 주목할 점, 추천 대상을 2~3문장으로 솔직하게 작성. 여기서도 작성자의 개인적인 시선을 담을 것]</p>
              </div>

            - [결론 - 🚨 아래 톤으로 마무리]:
              "결론적으로"나 "요약하자면" 같은 AI 말투는 절대 금지.
              전체 감상을 2~3문장으로 자연스럽게 갈무리하되, 마지막 문장은 독자에게 말을 거는 형식으로 끝내세요.
              예시: "아직 이 작품을 접하지 못하셨다면, 한번쯤 들여다볼 만한 가치가 충분히 있는 영화라고 생각됩니다."
              `;
    mediaGuideline = `- 하단에 제공되는 이미지 HTML 코드 목록([메인 포스터], [관람 인증샷], [스틸컷 1~N개]) 전체를 무조건 한 번씩 본문에 1글자도 수정하지 말고 그대로 복사해서 배치해야 합니다.
            - 🚨 [스틸컷 배치 순서 — 절대 준수]:
              • [스틸컷 1]은 줄거리 요약 섹션 직후에 배치하세요.
              • [스틸컷 2]부터는 반드시 각 본론 소제목 단락 아래에 1장씩 배치하세요.
              • 남은 스틸컷이 소제목 수보다 많을 경우, 긴 단락 중간에 1장씩 분산하세요.
              • 🚫 절대 금지: 스틸컷 2장 이상을 텍스트 없이 연속으로 배치하는 것은 엄격히 금지합니다.
              • 🚫 절대 금지: 글 후반부(결론 앞)에 스틸컷을 몰아서 배치하는 것은 엄격히 금지합니다.
            - 각 스틸컷 바로 아래에 해당 장면의 분위기나 연출 의도를 설명하는 1~2문장 캡션을 <p style="text-align:center; color:#666; font-size:14px; font-style:italic;"> 태그로 덧붙이세요.
            - AI 임의로 이미지 태그를 줄이거나 생략하지 마세요.`;
  } else {
    introGuideline = `- [서론 - 도입부 공식 절대 준수]:
              1. "최근 영화계에서 [관련 뉴스 주제]에 관한 흥미로운 소식을 접했습니다." 혹은 이와 유사하게 시작하세요.
              2. "그래서 오늘은 이 이슈가 어떤 의미를 가지는지 함께 알아보려 합니다."로 본론을 여세요.`;
    mediaGuideline = `- 본문에 적절한 이미지가 들어갈 자리에 \`<p style="text-align: center; color: #888; font-size: 14px; background: #eee; padding: 10px;">{{사진: 문맥에 맞는 사진 설명}}</p>\` 코드를 삽입하세요.`;
  }

  return `
        [작성 지침]
        ${timeContext}

        ${designSystem}

        ${commonConstraints}

        1. 어조 및 페르소나 (Tone of Voice):
            - 정중하고 친근한 경어체("~습니다", "~해요", "~죠")를 자연스럽게 섞어 쓰세요.
            - 전문 용어나 복잡한 내용은 정보 전달자로서 친절하게 풀어서 설명하세요.
            - 영화의 정서를 다룰 때는 서정적이고 감성적인 어휘를 활용하여 분위기를 풍성하게 만드세요.
            - 🚨 [MK 문체 핵심]: 확정적인 단정보다 조심스러운 분석 어투를 기본으로 사용하세요.
              "~입니다" 단정보다 "~이지 않을까 싶어요", "~라고 생각됩니다"를 자주 활용하세요.
              독자가 함께 생각하게 만드는 문체가 이 블로그의 핵심 정체성입니다.

        2. 전체 분량 및 구조:
            - 🚨 [글자수 필수 준수]: 공백·HTML 태그·이미지 코드를 제외한 순수 텍스트 기준으로 반드시 2,200 ~ 2,800자를 채워야 합니다.
              이 분량은 네이버 블로그 상위노출 기준을 충족하면서 영화 리뷰로서 충분한 분석 깊이를 확보하기 위한 기준입니다.
              분량이 부족하다면 각 소제목 단락에서 분석을 더 구체적으로 전개하세요. 단순히 문장을 늘리는 것이 아니라, 해당 소제목에서 말하고 싶은 포인트를 끝까지 파고드세요.
            - [최상단]: 시선 끄는 첫 문장으로 시작하고, 바로 아래에 [메인 포스터] HTML 코드를 삽입하세요. 스포일러 경고 문구도 잊지 마세요.
            - 🚨 [영화 정보 박스 필수 삽입]: 메인 포스터 바로 밑에는 반드시 아래 HTML 형태의 정보 박스를 삽입하여 영화 기본 정보를 정리하세요. 부족한 정보(러닝타임, 쿠키영상 등)는 스스로 검색하여 정확히 채워 넣으세요.
              <div style="background-color: #f8f9fa; border-radius: 10px; padding: 20px; border: 1px solid #eee; margin: 20px 0; font-size: 15px; line-height: 1.8;">
                <p style="margin: 0;">📽️ <b>원제</b> : [원제]</p>
                <p style="margin: 0;">🎞️ <b>장르</b> : [장르]</p>
                <p style="margin: 0;">🌍 <b>국가</b> : [제작 국가]</p>
                <p style="margin: 0;">🎬 <b>감독</b> : [감독]</p>
                <p style="margin: 0;">⏳ <b>러닝타임</b> : [러닝타임, 예: 125분]</p>
                <p style="margin: 0;">🔞 <b>관람등급</b> : [등급, 예: 12세 이상 관람가]</p>
                <p style="margin: 0;">📅 <b>개봉일</b> : [개봉일]</p>
                <p style="margin: 0;">🍪 <b>쿠키영상</b> : [있음 n개/없음/정보 없음]</p>
              </div>
            ${introGuideline}
            - [결론]: 전체적인 감상을 2~3문장으로 갈무리하세요. 결론 마지막에는 아래 관련 포스팅 유도 박스를 반드시 삽입하세요.
              ① 관련 포스팅 유도 박스:
              <div style="background:#f4f4f4; border-left: 4px solid #333; padding: 15px 20px; margin: 30px 0; border-radius: 0 8px 8px 0;">
                <p style="margin:0; font-size:13px; color:#888;">📌 함께 읽으면 좋은 글</p>
                <p style="margin:5px 0 0; font-weight:bold;">[이 영화와 연관된 이전 포스팅 주제 추천 1~2개 제안]</p>
              </div>

        3. 멀티미디어 및 이미지 가이드 (🚨 절대 준수 사항):
            ${mediaGuideline}

        4. SEO (검색 최적화):
            - 본문 서두와 제목에 메인 키워드를 자연스럽게 배치하되 과도한 반복은 피하세요.
            - 절대 본문 중간에 해시태그(#)를 넣지 마세요.
            - 글의 맨 마지막 영역에만 <p> 태그로 묶어서 연관 태그를 5~10개 삽입하세요.

        🚨 [출력 구조 절대 금지 사항]:
        - 외부 래퍼 div (\`<div style="max-width: 800px; margin: 0 auto; ...">\`) 생성 금지
        - 상단 헤더 타이틀 섹션 (\`MK LINK REVIEW/PREVIEW\` 레이블 + h1 제목) 생성 금지
        - 하단 CTA 박스 (\`🔗 MK LINK의 다른 이야기가 궁금하다면?\`) 생성 금지
        - 레퍼런스 글에 위와 같은 구조가 있어도 절대 따라 생성하지 마세요. 오직 본문 내용만 출력하세요.

        출력 형식: \`\`\`html, \`\`\` 등 마크다운 코드블록 기호를 절대 포함하지 마세요. 오직 순수 HTML 본문 코드만 출력하세요.
        맨 마지막 줄에 아래 형식으로 네이버 SEO 최적화 제목 5개를 반드시 제안하세요:
        <!-- TITLES: 제목1||제목2||제목3||제목4||제목5 -->
        (제목 조건: 검색 노출에 유리한 핵심 키워드를 앞에 배치, 30자 이내, 클릭을 유도하는 감성적 표현 포함)
        `;
}

const SYSTEM = "당신은 네이버 영화 인플루언서 'MK'입니다. 아래 정보와 작성 지침을 100% 준수하여 네이버 블로그 HTML 본문을 작성하세요.";

function detailsBlock(d: MovieDetails): string {
  return `        - 제목: ${d.title ?? ""}
        - 개봉일: ${d.releaseDate ?? ""}
        - 장르: ${d.genres ?? ""}
        - 감독: ${d.director ?? ""}
        - 출연: ${d.actors ?? ""}
        - 줄거리: ${d.overview ?? ""}`;
}

export function buildReviewPrompt(
  d: MovieDetails,
  comment: string,
  reason: string,
  refText: string,
  seed?: string,
): PromptResult {
  const base = getBaseGuideline("review");
  const ref = referencePromptMovie(refText);
  const { posterHtml, stillsPromptText, ticketHtml } = generateMediaPrompts(d, false);

  const seedText = seed?.trim() ?? "";
  // 감상평이 있으면 = 사용자가 직접 쓴 리뷰 문장. 골격으로 보존하고 AI는 살만 붙임.
  const seedBlock = seedText
    ? `        [🚨 내가 직접 쓴 감상평 — 이 글의 골격, 최대한 보존]
        ${seedText}

        [인터뷰로 보강한 디테일 — 위 감상평 사이사이에 자연스럽게 녹일 재료]
        ${comment || "(없음)"}
`
    : `        [나의 주관적 감상평]
        ${comment}
`;
  const seedDirective = seedText
    ? `        - 🚨 위 [내가 직접 쓴 감상평]은 글쓴이 본인의 실제 문장입니다. 그 표현·감정·판단을 통째로 다시 쓰지 말고 **핵심 문장과 어휘를 최대한 살려** 본문 골격으로 삼으세요. AI는 도입·전환·작품 정보·디자인과 인터뷰에서 보강한 디테일만 채워 살을 붙입니다.
        - 감상평이 짧거나 거칠면 그 톤을 유지한 채 인터뷰 디테일로 자연스럽게 확장하세요. 매끄럽게 다듬는다고 글쓴이 목소리를 지우지 마세요.`
    : `        - 감상평에 담긴 저의 솔직한 감정을 본문에 자연스럽게 녹여내 주세요.`;

  const user = `
        영화를 직접 관람한 후 작성하는 상세 리뷰 원고를 작성하세요.

        [영화 실제 데이터]
${detailsBlock(d)}

        [포스팅 계기/관람 이유]
        - ${reason}

${seedBlock}
        ${ref}

        [제공되는 실제 이미지 HTML 코드]
        - [메인 포스터]: ${posterHtml}
        - [관람 인증샷]: ${ticketHtml}
${stillsPromptText}

        [특이사항]
${seedDirective}

        ${base}
        `;
  return { system: SYSTEM, user };
}

export function buildPreviewPrompt(
  d: MovieDetails,
  point: string,
  reason: string,
  refText: string,
): PromptResult {
  const base = getBaseGuideline("preview");
  const ref = referencePromptMovie(refText);
  const { posterHtml, stillsPromptText } = generateMediaPrompts(d, true);
  const user = `
        아래 정보를 바탕으로 프리뷰 원고를 작성하세요.

        [영화 실제 데이터]
${detailsBlock(d)}

        [핵심 주제 및 강조 포인트]
        - ${point}

        [포스팅 계기/이유]
        - ${reason}

        ${ref}

        [제공되는 실제 이미지 HTML 코드]
        - [메인 포스터]: ${posterHtml}
${stillsPromptText}

        [특이사항]
        - 반드시 제공된 [영화 실제 데이터]를 바탕으로 작성하여 거짓 정보(할루시네이션)를 만들지 마세요.

        ${base}
        `;
  return { system: SYSTEM, user };
}

export function buildCurationPrompt(
  theme: string,
  moviesDataText: string,
  refText: string,
): PromptResult {
  const ref = referencePromptMovie(refText);
  const { year, month, season } = nowParts();
  const user = `
        여러 영화를 묶어서 소개하는 '영화 큐레이션(리스트형)' 블로그 포스팅을 작성하세요.

        현재 시점은 ${year}년 ${month}월(${season})입니다.

        [포스팅 메인 테마 및 요청사항]
        - 테마: ${theme}

        ${ref}

        [수집된 영화 상세 데이터 (TMDB 정보 + 네이버 최신 뉴스 결합)]
        ${moviesDataText}

        [🚨 큐레이션 작성 핵심 규칙 (글자 수 제한)]
        - 독자가 스크롤을 내리며 가볍게 읽을 수 있도록, 영화 1편당 설명은 매우 짧고 간결해야 합니다.
        - 정보 박스를 제외하고, '영화 소개글'과 '관전 포인트'를 모두 합쳐서 영화 1편당 공백 포함 200자 ~ 250자 내외로 타이트하게 요약하세요. 절대 장황하게 쓰지 마세요.

        [🚨 절대 준수: MK LINK 큐레이션 HTML 레이아웃]
        아래의 HTML 구조를 100% 동일하게 따라야 합니다. 제공된 영화 목록의 개수만큼 <영화 섹션>을 반복해서 생성하세요.

        <p>최근 <b>${theme}</b>에 관한 영화들이 눈길을 끕니다. 그래서 오늘은 이 주제에 맞는 영화들을 모아 소개해보려 합니다. [🚨 절대 "안녕하세요", "반갑습니다" 등의 인사는 금지]</p>
        <p style="text-align: center;">&nbsp;</p>

        <h2 style="border-bottom: 2px solid #333; padding-bottom: 5px;">[영화 제목]</h2>
        <p style="color: #666; font-weight: bold; font-size: 18px;">[영화의 분위기를 요약하는 감각적인 부제 1줄]</p>

        [수집된 영화 데이터에 포함된 <메인 포스터 HTML 코드>를 여기에 반드시 삽입]

        <div style="background: #f9f9f9; padding: 15px; border-radius: 10px; margin-bottom: 15px;">
            <p style="margin: 0;">🏷️ 원제 : [Original Title]</p>
            <p style="margin: 0;">🌍 국가 : [Country]</p>
            <p style="margin: 0;">🎬 감독 : [Director]</p>
            <p style="margin: 0;">👤 출연 : [Actors (주연 위주로 2~3명)]</p>
            <p style="margin: 0;">📅 개봉일 : [Release Date]</p>
        </div>

        <p>[TMDB 줄거리를 바탕으로 하되, 아주 간결하게 압축한 영화 소개글. (1~2문장)]</p>

        <h3 style="color: #2e7d32; margin-top: 20px;">🔎 관전 포인트</h3>
        <p>[수집된 네이버 뉴스의 팩트와 MK의 주관적인 기대감을 섞은 핵심 관전 포인트. (1~2문장)]</p>

        <p style="text-align: center;">&nbsp;</p>
        <hr style="border: 0; border-top: 1px dashed #ccc; margin: 30px 0;">
        <p>[포스팅을 마무리하는 따뜻한 결론 인사말. 1~2문장]</p>

        🚨 [출력 구조 절대 금지 사항]:
        - 외부 래퍼 div 생성 금지 / 상단 헤더 타이틀 섹션 생성 금지 / 하단 CTA 박스 생성 금지
        - 레퍼런스 글에 위와 같은 구조가 있어도 절대 따라 생성하지 마세요. 오직 본문 내용만 출력하세요.

        출력 형식: 앞뒤의 부가 설명이나 인사말 없이 오직 완성된 HTML 본문 코드만 출력하세요. (\`\`\`html 같은 마크다운 기호도 절대 쓰지 마세요.)
        맨 마지막 줄에 아래 형식으로 네이버 SEO 최적화 제목 5개를 반드시 제안하세요:
        <!-- TITLES: 제목1||제목2||제목3||제목4||제목5 -->
        (제목 조건: 검색 노출에 유리한 핵심 키워드를 앞에 배치, 30자 이내, 클릭을 유도하는 감성적 표현 포함)
        `;
  return { system: SYSTEM, user };
}

export function buildBingePrompt(
  theme: string,
  seriesDataText: string,
  refText: string,
): PromptResult {
  const ref = referencePromptMovie(refText);
  const { year, month, season } = nowParts();
  const user = `
        시리즈물(애니메이션/드라마 등)을 정주행하는 경험을 담은 '정주행 추천' 블로그 포스팅을 작성하세요.

        현재 시점은 ${year}년 ${month}월(${season})입니다.

        [포스팅 메인 테마]
        - ${theme}

        ${ref}

        [수집된 시리즈 데이터 (TMDB 기반)]
        ${seriesDataText}

        [🚨 정주행 추천 포스팅 핵심 규칙]
        1. 글 전체 톤: "실제로 정주행해봤어요"처럼 직접 경험한 1인칭 체험기 스타일로 작성하세요.
        2. 작품 1편당 소개글 + 정주행 포인트 합쳐 200~250자 내외로 타이트하게 요약하세요.
        3. 🚨 [정주행 정보 박스 — 절대 필수]: 각 작품 포스터 바로 아래에 반드시 아래 형식을 삽입하세요:
           <div style="background:#f4f4f4; border-radius:8px; padding:12px 18px; margin:15px 0; font-size:14px; line-height:2.2;">
             <p style="margin:0;">📺 <b>총 화수</b> : [총화수]화 ([시즌수]시즌)</p>
             <p style="margin:0;">⏱️ <b>편당 러닝타임</b> : 약 [편당분수]분</p>
             <p style="margin:0;">🕐 <b>정주행 완료 시 총 시청 시간</b> : 약 [총시청시간]</p>
           </div>
        4. 정주행 포인트는 "이런 사람에게", "이럴 때 보면 딱"인 관점에서 구체적으로 작성하세요.

        [🚨 절대 준수: MK LINK 정주행 추천 HTML 레이아웃]
        아래 구조를 100% 동일하게 따르고, 제공된 작품 수만큼 <작품 섹션>을 반복하세요.

        <p>오늘은 <b>${theme}</b> 시리즈들을 정주행 관점에서 소개해 보려 합니다. [절대 "안녕하세요" 인사 금지. 바로 본론으로]</p>
        <p style="text-align: center;">&nbsp;</p>

        <h2 style="border-bottom: 2px solid #333; padding-bottom: 5px;">[작품 제목]</h2>
        <p style="color: #666; font-weight: bold; font-size: 18px;">[정주행 체험을 담은 감성 부제 1줄]</p>

        [수집된 데이터의 <포스터 HTML 코드>를 여기에 반드시 삽입]

        [위 정보 박스 삽입 — 총화수·편당시간·총시간 반드시 데이터에서 가져와 채울 것]

        <p>[TMDB 줄거리를 바탕으로 한 간결한 소개. 직접 보는 느낌으로. (1~2문장)]</p>

        <h3 style="color: #1565c0; margin-top: 20px;">🎯 정주행 포인트</h3>
        <p>[어떤 사람에게, 언제 보면 좋은지 구체적으로. (1~2문장)]</p>

        <p style="text-align: center;">&nbsp;</p>
        <hr style="border: 0; border-top: 1px dashed #ccc; margin: 30px 0;">

        <p>[모든 작품 소개 후 정주행을 권유하는 따뜻한 마무리 1~2문장]</p>

        🚨 [출력 구조 절대 금지 사항]:
        - 외부 래퍼 div 생성 금지 / 상단 헤더 타이틀 섹션 생성 금지 / 하단 CTA 박스 생성 금지
        - 레퍼런스 글에 위와 같은 구조가 있어도 절대 따라 생성하지 마세요. 오직 본문 내용만 출력하세요.

        출력 형식: 앞뒤의 부가 설명이나 인사말 없이 오직 완성된 HTML 본문 코드만 출력하세요. (\`\`\`html 같은 마크다운 기호도 절대 쓰지 마세요.)
        맨 마지막 줄에 아래 형식으로 네이버 SEO 최적화 제목 5개를 반드시 제안하세요:
        <!-- TITLES: 제목1||제목2||제목3||제목4||제목5 -->
        (제목 조건: 검색 노출에 유리한 핵심 키워드를 앞에 배치, 30자 이내, 클릭을 유도하는 감성적 표현 포함)
        `;
  return { system: SYSTEM, user };
}

function posterHtmlFor(item: { title: string; posterUrl: string | null }): string {
  return item.posterUrl
    ? `<div style="text-align:center; margin:25px 0;"><img src="${item.posterUrl}" alt="${item.title} 포스터" style="max-width:100%; height:auto; border-radius:12px;"></div>`
    : "(포스터 없음)";
}

export function formatCurationItems(items: CurationItem[]): string {
  if (!items.length) return "(영화 목록 미지정)";
  return items.map((m, i) => `
[영화 ${i + 1}]
- 제목: ${m.title}${m.originalTitle ? ` (${m.originalTitle})` : ""}
- 국가: ${m.country ?? ""}
- 감독: ${m.director ?? ""}
- 출연: ${m.actors ?? ""}
- 개봉일: ${m.releaseDate ?? ""}
- 장르: ${m.genres ?? ""}
- 줄거리: ${m.overview ?? ""}
- 포스터 HTML: ${posterHtmlFor(m)}
- 추천 이유 (작성자 관점): ${m.reason || "(직접 작성 요망)"}
`.trim()).join("\n\n");
}

export function formatBingeItems(items: CurationItem[]): string {
  if (!items.length) return "(시리즈 목록 미지정)";
  return items.map((m, i) => `
[작품 ${i + 1}]
- 제목: ${m.title}${m.originalTitle ? ` (${m.originalTitle})` : ""}
- 국가: ${m.country ?? ""}
- 출연: ${m.cast ?? m.actors ?? ""}
- 장르: ${m.genres ?? ""}
- 총 화수: ${m.numberOfEpisodes ?? "?"}화 (${m.numberOfSeasons ?? "?"}시즌)
- 편당 러닝타임: 약 ${m.episodeRuntime ?? "?"}분
- 총 시청시간: 약 ${m.totalWatchTime ?? "?"}
- 줄거리: ${m.overview ?? ""}
- 포스터 HTML: ${posterHtmlFor(m)}
- 추천 이유 (작성자 관점): ${m.reason || "(직접 작성 요망)"}
`.trim()).join("\n\n");
}

/** draft → 영화 계열 프롬프트 분기. */
export function buildMoviePrompt(
  draft: PostDraft,
  references: { movieTitle: string; content: string }[],
  rssText = "",
): PromptResult {
  const refText = referenceText(references, rssText);
  const d: MovieDetails = draft.details ?? {
    title: draft.movieTitle || draft.title,
    posterUrl: draft.posterUrl ?? undefined,
    releaseDate: draft.releaseDate || undefined,
  };

  switch (draft.postType) {
    case "review":
      return buildReviewPrompt(d, draft.comment || draft.body, draft.watchReason, refText);
    case "preview":
      return buildPreviewPrompt(d, draft.expectPoints, draft.watchReason, refText);
    case "curation":
      return buildCurationPrompt(
        draft.theme || draft.title,
        formatCurationItems(draft.items),
        refText,
      );
    case "binge":
      return buildBingePrompt(
        draft.theme || draft.title,
        formatBingeItems(draft.items),
        refText,
      );
    default:
      return buildReviewPrompt(d, draft.comment || draft.body, draft.watchReason, refText);
  }
}
