const TYPE_LABEL: Record<string, string> = {
  review: "MK LINK REVIEW",
  preview: "MK LINK PREVIEW",
  curation: "MK LINK CURATION",
  binge: "MK LINK BINGE",
  photo: "MK LINK DAILY",
  local: "MK LINK LOCAL",
  pdf: "MK LINK DAILY",
};

export function wrapHtml(content: string, title: string, postType: string): string {
  const label = TYPE_LABEL[postType] ?? "MK LINK";
  return `<div style="max-width: 800px; margin: 0 auto; font-family: 'NanumSquare', sans-serif; line-height: 1.8; color: #333; text-align: center;">

    <div style="padding: 40px 20px; border-bottom: 2px solid #222; margin-bottom: 30px;">
        <span style="font-size: 13px; color: #777; letter-spacing: 3px; font-weight: bold;">${label}</span>
        <h1 style="margin: 15px 0 0 0; color: #111; font-size: 26px; word-break: keep-all;">${title}</h1>
    </div>

    <div style="text-align: left;">
        ${content}
    </div>

    ${MK_LINK_SIGNATURE}
</div>`;
}

/** 모든 포스팅 하단에 들어가는 MK LINK 협업/협찬 시그니처. */
export const MK_LINK_SIGNATURE = `<table width="100%" border="0" cellpadding="20" cellspacing="0" bgcolor="#f4f6f8" style="border-left:4px solid #26C6A4; margin-top:48px;"><tr><td style="text-align:left;">
        <p style="margin:0 0 8px 0; font-size:15px; color:#222; font-weight:bold;"><b>🔗 MK LINK | 협업 문의</b></p>
        <p style="margin:0; font-size:13px; color:#555; line-height:1.9;">브랜드 협업·제품 협찬·콘텐츠 제휴 환영합니다.<br>제안주실 내용이 있다면 댓글 또는 메일로 편하게 연락주세요.</p>
    </td></tr></table>`;

export function buildPreviewDoc(html: string): string {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link href="https://cdn.jsdelivr.net/gh/moonspam/NanumSquare@2.0/nanumfont.css" rel="stylesheet">
<style>
* { box-sizing: border-box; }
body { margin: 0; padding: 20px; background: #fff; }
img { max-width: 100% !important; height: auto !important; display: block; margin: 12px auto; }
</style>
</head>
<body>
${html}
</body>
</html>`;
}
