import { MK_LINK_SIGNATURE } from "@/lib/html-formatter";
import { MK_BANNED_WORDS } from "@/lib/prompts/base";
import type { Run, Article, Issue } from "./types";
import { sourceImages, stillsAfterParagraph } from "./movie-media";

export function escapeHtml(s: string) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;"); }
function rich(s: string) { return escapeHtml(s).replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>").replace(/\n/g, "<br>"); }
function safeHref(s?: string) { try { const u = new URL(s || ""); return ["http:", "https:"].includes(u.protocol) && !u.username && !u.password ? u.href : ""; } catch { return ""; } }
export function renderArticle(run: Pick<Run, "article" | "sources" | "brief">, titleIndex = 0): string {
  const a = run.article;
  if (!a) return "";
  const media = sourceImages(run.sources), mediaById = new Map(media.map(i => [i.id, i]));
  const rendered = new Set<string>();
  function imageHtml(id: string) {
    const image = mediaById.get(id);
    if (!image || rendered.has(id)) return "";
    rendered.add(id);
    return `<div style="text-align:center;margin:25px 0"><img src="${escapeHtml(image.url)}" alt="${escapeHtml(image.alt)}" loading="lazy" style="display:block;width:100%;max-width:${image.kind === "poster" ? "420" : "800"}px;height:auto;margin:0 auto;border-radius:12px"><p style="text-align:center;color:#777;font-size:12px;margin:8px 0">${escapeHtml(image.alt)} · ${safeHref(image.sourceUrl) ? `<a href="${escapeHtml(safeHref(image.sourceUrl))}" target="_blank" rel="noopener noreferrer">이미지 출처: TMDB</a>` : "이미지 출처: TMDB"}</p></div>`;
  }
  const used = new Set(a.sections.flatMap(s => [...s.sourceIds, ...s.imageIds.flatMap(id => mediaById.get(id)?.sourceId ? [mediaById.get(id)!.sourceId] : [])]));
  const references = run.sources.filter(s => used.has(s.id));
  const body = a.sections.map(s => {
    const stills = stillsAfterParagraph(s.imageIds.filter(id => mediaById.get(id)?.kind === "still"), s.paragraphs.length);
    return `${s.heading ? `<table width="100%" border="0" cellpadding="15" bgcolor="#1a2e4a" style="margin:28px 0 18px"><tr><td><b style="color:#fff;font-size:18px">${escapeHtml(s.heading)}</b></td></tr></table>` : ""}
${s.imageIds.filter(id => mediaById.get(id)?.kind === "poster").map(imageHtml).join("\n")}
${s.paragraphs.map((p, i) => `<p style="margin:16px 0;line-height:1.9">${rich(p)}</p>${stills.has(i) ? imageHtml(stills.get(i)!) : ""}`).join("\n")}
${s.facts.length ? `<table width="100%" cellpadding="12" cellspacing="0" style="border:1px solid #e2e8f0;margin:20px 0">${s.facts.map(f => `<tr><td width="30%" bgcolor="#f1f5f9" style="border-bottom:1px solid #e2e8f0"><b>${escapeHtml(f.label)}</b></td><td style="border-bottom:1px solid #e2e8f0">${rich(f.value)}</td></tr>`).join("")}</table>` : ""}
${s.imageIds.map(id => run.brief.attachments.find(x => x.id === id && x.kind === "photo")).filter(Boolean).map(p => `<table width="100%" cellpadding="12" bgcolor="#fff3cd" style="border:2px dashed #f0ad4e;margin:20px 0"><tr><td style="text-align:center;color:#8a6d3b;font-size:13px">📷 ${escapeHtml(p!.name)}${p!.text ? ` — ${escapeHtml(p!.text)}` : ""}</td></tr></table>`).join("\n")}`;
  }).join("\n");
  return `<div style="max-width:800px;margin:0 auto;font-family:'NanumSquare','나눔스퀘어',sans-serif;color:#333;line-height:1.8;word-break:keep-all;overflow-wrap:anywhere">
<div style="text-align:center;padding:32px 16px;border-bottom:2px solid #222"><p style="font-size:12px;letter-spacing:3px;color:#777">MK LINK</p><h1 style="font-size:26px">${escapeHtml(a.titles[titleIndex] || a.titles[0] || run.brief.topic)}</h1></div>
${body}
${references.length ? `<div style="margin:28px 0;color:#777;font-size:12px"><b>참고 자료</b>${references.map(s => `<p>${safeHref(s.url) ? `<a href="${escapeHtml(safeHref(s.url))}" target="_blank" rel="noopener noreferrer">${escapeHtml(s.title)}</a>` : escapeHtml(s.title)}${s.kind === "snippet" ? " (검색 요약)" : ""}</p>`).join("")}</div>` : ""}
<p style="color:#777;font-size:13px">${a.hashtags.map(t => `#${escapeHtml(t.replace(/^#/, ""))}`).join(" ")}</p>
${MK_LINK_SIGNATURE}</div>`;
}
export function articleText(a: Article) { return a.sections.map(s => [s.heading, ...s.paragraphs, ...s.facts.map(f => `${f.label} ${f.value}`)].join("\n")).join("\n\n"); }
export function lintArticle(run: Run): Issue[] {
  const a = run.article; if (!a) return [{ kind: "format", severity: "error", message: "본문이 없습니다." }];
  const issues: Issue[] = [];
  const add = (kind: Issue["kind"], message: string, sectionId?: string, severity: Issue["severity"] = "error") => issues.push({ kind, severity, message, sectionId });
  if (a.titles.length !== 5 || new Set(a.titles).size !== 5 || a.titles.some(t => Array.from(t).length > 30)) add("format", "서로 다른 제목 5개를 각각 30자 이내로 작성해야 합니다.");
  if (a.hashtags.length < 5 || a.hashtags.length > 10 || new Set(a.hashtags).size !== a.hashtags.length || a.hashtags.some(t => /[\s#<>]/.test(t))) add("format", "해시태그는 #·공백 없는 서로 다른 단어 5~10개여야 합니다.");
  const text = articleText(a);
  for (const word of [...MK_BANNED_WORDS, "안녕하세요", "반갑습니다"]) if (text.includes(word)) add("voice", `MK 금지 표현: “${word}”`);
  const experiences = new Set(["experience", "topic", ...run.questions.filter(q => q.answer !== undefined).map(q => q.id), ...run.brief.attachments.filter(p => p.kind === "photo").map(p => p.id)]);
  const images = run.brief.attachments.filter(p => p.kind === "photo");
  const movieMedia = sourceImages(run.sources);
  for (const section of a.sections) {
    if (!section.paragraphs.length && !section.facts.length) add("format", "내용이 없는 구역입니다.", section.id);
    for (const id of section.sourceIds) if (!run.sources.some(s => s.id === id)) add("evidence", `존재하지 않는 출처: ${id}`, section.id);
    for (const id of section.experienceIds) if (!experiences.has(id) || (id === "experience" && !run.brief.experience)) add("experience", "확인되지 않은 사용자 경험을 참조했습니다.", section.id);
    if (section.sourceIds.some(id => run.sources.find(s => s.id === id)?.kind === "snippet")) add("evidence", "검색 요약을 근거로 사용한 부분입니다. 원문 확인이 필요합니다.", section.id, "warning");
    for (const id of section.imageIds) if (!images.some(p => p.id === id) && !movieMedia.some(p => p.id === id)) add("format", "첨부·수집하지 않은 이미지를 참조했습니다.", section.id);
    if (section.imageIds.filter(id => movieMedia.some(m => m.id === id && m.kind === "still")).length > section.paragraphs.length) add("format", "스틸컷 사이에 본문 문단을 배치해주세요.", section.id);
    if (/<\/?[a-z][^>]*>/i.test([section.heading, ...section.paragraphs, ...section.facts.map(f => f.value)].join(" "))) add("format", "HTML 코드 대신 본문 텍스트를 작성해야 합니다.", section.id);
    if (section.paragraphs.some(p => (p.match(/[.!?。！？](?:\s|$)/g) || []).length >= 4)) add("voice", "긴 문단을 2~3문장 호흡으로 나눠주세요.", section.id);
    if (/#[가-힣\w]+/.test(section.paragraphs.join(" "))) add("format", "본문 중간 해시태그를 제거해주세요.", section.id);
  }
  const usedImages = a.sections.flatMap(s => s.imageIds);
  for (const image of movieMedia) if (usedImages.filter(id => id === image.id).length > 1) add("format", "같은 TMDB 이미지를 중복 배치하지 마세요.");
  for (const image of images) if (usedImages.filter(id => id === image.id).length !== 1) add("format", `사진 “${image.name}”은 한 번씩 배치해야 합니다.`);
  const target = run.strategy?.length || 2000;
  if (text.length < target * 0.6 || text.length > target * 1.5) add("format", `본문 ${text.length.toLocaleString()}자: 목표 ${target.toLocaleString()}자와 차이가 큽니다. 근거를 보존하며 분량을 조절해주세요.`, undefined, "warning");
  return issues;
}
