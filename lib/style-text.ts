/**
 * HTML → 문체 학습용 텍스트 변환.
 *
 * 기존 stripHtml은 <p>·<b>를 전부 제거하고 공백을 하나로 뭉개서,
 * 프롬프트가 요구하는 "줄바꿈(엔터) 타이밍 복제"와 "<b> 강조 패턴 복제"에
 * 필요한 데이터 자체가 사라졌다. 이 모듈은 그 리듬을 보존한다:
 * - 블록 경계(</p>, <br> 등) → 줄바꿈 (단락 호흡 보존)
 * - <b>/<strong> → **텍스트** (강조 위치 보존)
 * - MK LINK 헤더 라벨·협업 시그니처 라인 제거 (문체 샘플 오염 방지)
 */

/** 참조 텍스트에서 제거할 시스템 삽입 라인 (wrapHtml 헤더/시그니처 잔재). */
const SIGNATURE_LINE_PATTERNS = [
  /MK LINK/i,
  /협업 문의/,
  /제품 협찬/,
  /콘텐츠 제휴/,
  /편하게 연락주세요/,
];

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

/** HTML을 단락 리듬·강조 패턴이 보이는 평문으로 변환. */
export function htmlToStyleText(html: string): string {
  let s = html;
  s = s.replace(/<!--[\s\S]*?-->/g, "");
  s = s.replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, "");
  // 강조 보존 (내부에 다른 태그가 있어도 텍스트만 남긴다)
  s = s.replace(
    /<(b|strong)\b[^>]*>([\s\S]*?)<\/\1>/gi,
    (_, __, inner: string) => `**${inner.replace(/<[^>]+>/g, "").trim()}**`,
  );
  // 블록 경계 → 줄바꿈
  s = s.replace(/<br\s*\/?>/gi, "\n");
  s = s.replace(/<\/(p|div|h[1-6]|li|tr|table|blockquote)>/gi, "\n");
  // 나머지 태그 제거
  s = s.replace(/<[^>]+>/g, " ");
  s = decodeEntities(s);

  const lines = s
    .split("\n")
    .map((l) => l.replace(/[ \t ]+/g, " ").trim())
    .filter((l) => !SIGNATURE_LINE_PATTERNS.some((re) => re.test(l)));

  // 연속 빈 줄은 하나로 (빈 줄 = 단락 경계 신호)
  const out: string[] = [];
  for (const line of lines) {
    if (line === "" && out[out.length - 1] === "") continue;
    out.push(line);
  }
  return out.join("\n").replace(/^\n+|\n+$/g, "").trim();
}

/**
 * 긴 참조 텍스트를 앞부분+뒷부분으로 샘플링.
 * 앞부분만 자르면 도입부 문체만 과대표집되고 결론·마무리 문체가 누락되므로
 * 머리와 꼬리를 함께 취한다. 잘린 경계는 줄 단위로 맞춘다.
 */
export function sampleStyleText(text: string, headChars = 1000, tailChars = 500): string {
  if (text.length <= headChars + tailChars + 120) return text;
  const head = text.slice(0, headChars).replace(/\n[^\n]*$/, "");
  const tail = text.slice(-tailChars).replace(/^[^\n]*\n/, "");
  return `${head}\n…(중략)…\n${tail}`;
}
