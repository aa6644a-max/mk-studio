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

    <div style="background-color: #f4f6f8; padding: 25px; border-radius: 12px; text-align: center; margin-top: 50px;">
        <p style="margin: 0; font-size: 15px; color: #333; font-weight: bold;">🔗 MK LINK의 다른 이야기가 궁금하다면?</p>
        <p style="margin: 10px 0 0 0; font-size: 13px; color: #0066cc; text-decoration: underline; cursor: pointer;">[이곳에 이전 포스팅 링크를 삽입하세요]</p>
    </div>
</div>`;
}

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
