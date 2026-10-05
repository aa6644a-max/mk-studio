import { MK_LINK_SIGNATURE } from "@/lib/html-formatter";
import { MK_BANNED_WORDS } from "@/lib/prompts/base";
import { normalizeBold, type Run, type Article, type Issue } from "./types";
import { sourceImages, stillsAfterParagraph } from "./movie-media";
import { WATCH_HEADING, isSynopsis, isWatchPoints, lintMovieFrame, movieFrame } from "./movie-frame";

export function escapeHtml(s: string) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;"); }
function rich(s: string) { return escapeHtml(normalizeBold(s)).replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>").replace(/\n/g, "<br>"); }
function safeHref(s?: string) { try { const u = new URL(s || ""); return ["http:", "https:"].includes(u.protocol) && !u.username && !u.password ? u.href : ""; } catch { return ""; } }
const FACT_ICONS: [string, string][] = [
  ["원제", "📽️"], ["제목", "📽️"], ["장르", "🎞️"], ["국가", "🌍"],
  ["감독", "🎬"], ["연출", "🎬"], ["출연", "👤"], ["배우", "👤"],
  ["러닝타임", "⏳"], ["개봉", "📅"], ["공개", "📅"], ["시즌", "📺"],
  ["화수", "📺"], ["관람등급", "🔞"], ["등급", "🔞"], ["쿠키", "🍪"],
];
function factIcon(label: string) { return (FACT_ICONS.find(([k]) => label.includes(k)) || ["", "📌"])[1]; }
const FACTS_TABLE = (facts: { label: string; value: string }[]) => `<table width="100%" border="0" cellpadding="20" cellspacing="0" bgcolor="#f8f9fa" style="border:1px solid #eee;border-radius:8px;margin:20px 0"><tr><td style="font-size:15px;line-height:2">${facts.map(f => `<p style="margin:0">${factIcon(f.label)} <b>${escapeHtml(f.label)}</b> : ${rich(f.value)}</p>`).join("")}</td></tr></table>`;
// 네이버 에디터에서 직접 붙이는 요소는 자리만 표시한다.
const SLOT = (text: string) => `<table width="100%" cellpadding="12" bgcolor="#fff3cd" style="border:2px dashed #f0ad4e;margin:20px 0"><tr><td style="text-align:center;color:#8a6d3b;font-size:13px">${escapeHtml(text)}</td></tr></table>`;
const WATCH_BOX = (paragraphs: string[]) => `<table width="100%" border="0" cellpadding="18" cellspacing="0" bgcolor="#f5f5f5" style="border:1px solid #ddd;margin:30px 0"><tr><td><p style="margin:0 0 8px;font-size:13px;color:#e53e3e;font-weight:bold"><b>${escapeHtml(WATCH_HEADING)}</b></p>${paragraphs.map(p => `<p style="margin:0 0 8px;font-size:14px;color:#555;line-height:1.8">${rich(p)}</p>`).join("")}</td></tr></table>`;
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
  // 작품이 하나면 정보표·링크카드 자리·줄거리·관전 포인트를 고정 위치에 둔다. 정보표는 포스터가 있는 구역(없으면 첫 구역) 맨 위.
  const frame = movieFrame(run);
  const holder = frame ? (a.sections.find(s => s.imageIds.some(id => mediaById.get(id)?.kind === "poster")) || a.sections[0]) : undefined;
  const body = a.sections.map(s => {
    if (frame && isWatchPoints(s)) return WATCH_BOX(s.paragraphs);
    const stills = stillsAfterParagraph(s.imageIds.filter(id => mediaById.get(id)?.kind === "still"), s.paragraphs.length);
    const posters = s.imageIds.filter(id => mediaById.get(id)?.kind === "poster");
    // 포스터가 있는 섹션은 포스터 바로 밑이 정보 박스 자리다. 나머지는 본문 뒤에 붙인다.
    const modelFacts = s.facts.length ? `<table width="100%" border="0" cellpadding="20" cellspacing="0" bgcolor="#f8f9fa" style="border:1px solid #eee;border-radius:8px;margin:20px 0"><tr><td style="font-size:15px;line-height:2">${s.facts.map(f => `<p style="margin:0">${factIcon(f.label)} <b>${escapeHtml(f.label)}</b> : ${rich(f.value)}</p>`).join("")}</td></tr></table>` : "";
    const isHolder = !!frame && s === holder;
    const factsHtml = isHolder ? `${FACTS_TABLE(frame!.facts)}
${SLOT(`🎬 네이버 영화 링크카드 자리 — 글쓰기의 ‘영화’ 첨부에서 「${frame!.title}」을(를) 검색해 넣어주세요`)}` : modelFacts;
    const beforeSynopsis = frame && isSynopsis(s) ? `${SLOT("💡 스포일러 안내 박스 자리 — 필요하면 직접 추가해주세요")}
<hr style="border:0;border-top:1px solid #ddd;margin:24px 0">
` : "";
    return `${beforeSynopsis}${s.heading ? `<table width="100%" border="0" cellpadding="15" bgcolor="#1a2e4a" style="margin:28px 0 18px"><tr><td><b style="color:#fff;font-size:18px">${escapeHtml(s.heading)}</b></td></tr></table>` : ""}
${posters.map(imageHtml).join("\n")}
${posters.length || isHolder ? factsHtml : ""}
${s.paragraphs.map((p, i) => `<p style="margin:16px 0;line-height:1.9">${rich(p)}</p>${stills.has(i) ? imageHtml(stills.get(i)!) : ""}`).join("\n")}
${s.highlight ? `<div style="border-left:5px solid #1a2e4a;padding-left:15px;margin:20px 0;color:#555;line-height:1.8">${rich(s.highlight)}</div>` : ""}
${s.tipTitle ? `<table width="100%" border="0" cellpadding="16" cellspacing="0" bgcolor="#f8f9fa" style="border:1px solid #eee;border-radius:8px;margin:20px 0"><tr><td style="line-height:1.8">💡 <b>${escapeHtml(s.tipTitle)}</b>${s.tipBody ? `<br><span style="color:#666;font-size:14px">${rich(s.tipBody)}</span>` : ""}</td></tr></table>` : ""}
${posters.length || isHolder ? "" : factsHtml}
${s.imageIds.map(id => run.brief.attachments.find(x => x.id === id && x.kind === "photo")).filter(Boolean).map(p => `<table width="100%" cellpadding="12" bgcolor="#fff3cd" style="border:2px dashed #f0ad4e;margin:20px 0"><tr><td style="text-align:center;color:#8a6d3b;font-size:13px">📷 ${escapeHtml(p!.name)}${p!.text ? ` — ${escapeHtml(p!.text)}` : ""}</td></tr></table>`).join("\n")}`;
  }).join("\n");
  return `<div style="max-width:800px;margin:0 auto;font-family:'NanumSquare','나눔스퀘어',sans-serif;color:#333;line-height:1.8;word-break:keep-all;overflow-wrap:anywhere">
<div style="text-align:center;padding:32px 16px;border-bottom:2px solid #222"><p style="font-size:12px;letter-spacing:3px;color:#777">${frame ? (frame.preview ? "MK LINK PREVIEW" : "MK LINK REVIEW") : "MK LINK"}</p><h1 style="font-size:26px">${escapeHtml(a.titles[titleIndex] || a.titles[0] || run.brief.topic)}</h1></div>
${body}
${references.length ? `<div style="margin:28px 0;color:#777;font-size:12px"><b>참고 자료</b>${references.map(s => `<p>${safeHref(s.url) ? `<a href="${escapeHtml(safeHref(s.url))}" target="_blank" rel="noopener noreferrer">${escapeHtml(s.title)}</a>` : escapeHtml(s.title)}${s.kind === "snippet" ? " (검색 요약)" : ""}</p>`).join("")}</div>` : ""}
<p style="color:#777;font-size:13px">${a.hashtags.map(t => `#${escapeHtml(t.replace(/^#/, ""))}`).join(" ")}</p>
${MK_LINK_SIGNATURE}</div>`;
}
export function articleText(a: Article) { return a.sections.map(s => [s.heading, ...s.paragraphs, s.highlight, s.tipTitle, s.tipBody, ...s.facts.map(f => `${f.label} ${f.value}`)].filter(Boolean).join("\n")).join("\n\n"); }
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
    if (section.facts.length > 10) add("format", "정보표 항목이 많습니다. 모바일에서 읽히도록 핵심 정보만 남겨주세요.", section.id, "warning");
    if (/<\/?[a-z][^>]*>/i.test([section.heading, ...section.paragraphs, section.highlight, section.tipTitle, section.tipBody, ...section.facts.map(f => f.value)].join(" "))) add("format", "HTML 코드 대신 본문 텍스트를 작성해야 합니다.", section.id);
    if (section.paragraphs.some(p => (p.match(/[.!?。！？](?:\s|$)/g) || []).length >= 4)) add("voice", "긴 문단을 2~3문장 호흡으로 나눠주세요.", section.id);
    if (/#[가-힣\w]+/.test(section.paragraphs.join(" "))) add("format", "본문 중간 해시태그를 제거해주세요.", section.id);
  }
  for (const f of lintMovieFrame(run)) add("format", f.message, f.sectionId, f.severity);
  const usedImages = a.sections.flatMap(s => s.imageIds);
  for (const image of movieMedia) if (usedImages.filter(id => id === image.id).length > 1) add("format", "같은 TMDB 이미지를 중복 배치하지 마세요.");
  for (const image of images) if (usedImages.filter(id => id === image.id).length !== 1) add("format", `사진 “${image.name}”은 한 번씩 배치해야 합니다.`);
  const target = run.strategy?.length || 2000;
  if (text.length < target * 0.6 || text.length > target * 1.5) add("format", `본문 ${text.length.toLocaleString()}자: 목표 ${target.toLocaleString()}자와 차이가 큽니다. 근거를 보존하며 분량을 조절해주세요.`, undefined, "warning");
  return issues;
}
