/**
 * 범용 정보 시각 블록 — 정보성 포스팅(PDF 요약 등)의 표·박스·카드 어휘.
 * local.ts의 공고문 전용 컴포넌트와 별개의 범용 라이브러리.
 * 네이버 블로그 호환(table 기반·모바일 안전), brandColor만 주입.
 */

/**
 * 정보 블록 HTML 템플릿 모음 (프롬프트 주입용).
 * AI가 PDF 내용을 분석해 적합한 블록을 골라 쓰도록 안내.
 */
export function getInfoBlocks(brandColor = "#1f3a5f"): string {
  return `
[🎨 정보 시각화 블록 — 내용에 맞는 것을 골라 사용]
아래 블록들은 줄글을 정보 단위로 끊어 가독성을 높이는 도구입니다.
PDF 내용을 분석해 성격에 맞는 블록을 선택하세요. 모든 블록을 다 쓸 필요는 없습니다.

━━ A. 섹션 헤더 (소제목 — 모든 주요 단락의 시작) ━━
<table width="100%" border="0" cellpadding="13" cellspacing="0" bgcolor="${brandColor}" style="margin:28px 0 0;">
  <tr><td><b style="color:#ffffff; font-size:18px;">[아이콘] [섹션명]</b></td></tr>
</table>

━━ B. 2열 정보 테이블 (수치·항목·스펙 정리 — 날짜/금액/조건/제원 등) ━━
헤더(A) 바로 아래 border-top:none으로 이어 붙이면 깔끔합니다.
<table width="100%" border="0" cellpadding="0" cellspacing="0" style="border:1px solid #dde3ed; border-top:none; margin-bottom:24px; font-size:14px;">
  <tr>
    <td width="32%" bgcolor="#f4f7fb" style="padding:13px 14px; font-weight:bold; color:${brandColor}; border-bottom:1px solid #eef0f5; border-right:1px solid #eef0f5; vertical-align:top;"><b>[항목명]</b></td>
    <td style="padding:13px 14px; border-bottom:1px solid #eef0f5;">[내용]</td>
  </tr>
</table>

━━ C. 핵심 요약 콜아웃 (꼭 기억할 한두 가지 — 💡) ━━
<table width="100%" border="0" cellpadding="16" cellspacing="0" bgcolor="#f0f5ff" style="border-left:4px solid ${brandColor}; margin:20px 0;">
  <tr><td style="font-size:14px; color:#1e3a5f; line-height:1.8;">💡 <b>[요약 제목]</b><br>[핵심 내용]</td></tr>
</table>

━━ D. 주의/유의 박스 (놓치면 안 되는 조건·예외 — ⚠️) ━━
<table width="100%" border="0" cellpadding="14" cellspacing="0" bgcolor="#fffbf0" style="border-left:4px solid #f59e0b; margin:20px 0;">
  <tr><td style="font-size:14px; color:#78530a; line-height:1.8;">⚠️ [내용]</td></tr>
</table>

━━ E. 단계/절차 플로우 (방법·순서가 있는 내용 — 1→2→3 세로) ━━
<table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin:16px 0;">
  <tr><td style="text-align:center;">
    <table width="82%" border="0" cellpadding="13" cellspacing="0" bgcolor="#f4f7fb" style="border:1px solid #dde3ed; margin:0 auto 6px;">
      <tr><td style="font-size:14px; color:#555; text-align:center;"><b style="color:${brandColor};">1.</b> [단계 내용]</td></tr>
    </table>
    <p style="margin:2px 0; font-size:18px; color:#ccc;">↓</p>
    <table width="82%" border="0" cellpadding="13" cellspacing="0" bgcolor="#f4f7fb" style="border:1px solid #dde3ed; margin:6px auto;">
      <tr><td style="font-size:14px; color:#555; text-align:center;"><b style="color:${brandColor};">2.</b> [단계 내용]</td></tr>
    </table>
  </td></tr>
</table>

━━ F. 비교/대조 (선택지·장단점 — 항목별 세로 카드) ━━
<table width="100%" border="0" cellpadding="15" cellspacing="0" style="border:1px solid #e3e8ef; border-radius:8px; margin:12px 0;">
  <tr><td>
    <p style="margin:0 0 6px; font-weight:bold; color:${brandColor}; font-size:15px;"><b>[항목명]</b></p>
    <p style="margin:0; font-size:14px; color:#555; line-height:1.7;">[설명]</p>
  </td></tr>
</table>

━━ G. 강조 인용 (핵심 문장·정의 — 버티컬 라인) ━━
<div style="border-left:5px solid ${brandColor}; padding:6px 0 6px 16px; margin:20px 0; color:#444; font-size:15px; line-height:1.8;">[강조 문구]</div>

[🚫 레이아웃 금지]
- <div>에 bgcolor/background-color 사용 금지 → 배경색은 반드시 <table bgcolor>
- flex / grid / display:inline-block 금지
- 3열 이상 다열 테이블 금지 → 2열 또는 단일 컬럼 카드로 분해
- border-radius는 <table>에서 네이버가 무시할 수 있음 (div 콜아웃에만 사용)
`;
}
