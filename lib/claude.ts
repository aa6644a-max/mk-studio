import Anthropic from "@anthropic-ai/sdk";
import type { PostDraft } from "@/lib/types";
import { getPostsByType } from "@/lib/google-sheets";
import { getRssLatestText } from "@/lib/rss-client";
import { buildPrompt } from "@/lib/prompts";
import { wrapHtml } from "@/lib/html-formatter";

/**
 * Claude 포스팅 생성 (V2 ClaudeClient 정렬).
 * Sonnet 4.6, max_tokens 8192, 429/529 재시도, 코드펜스 제거,
 * <!-- TITLES: --> 추출. 키 없으면 mock 반환.
 */

const MODEL = "claude-sonnet-4-6";
const MAX_RETRIES = 3;

export type GenerateResult = { html: string; titles: string[] };

export function isClaudeConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export async function generatePost(draft: PostDraft): Promise<GenerateResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { html: mockHtml(draft), titles: mockTitles(draft) };
  }

  // RSS 원문(문체 학습) + 같은 타입 Sheets 글(구조 참조) 병렬 로드
  const [rssText, references] = await Promise.all([
    getRssLatestText("shock552", 5).catch(() => ""),
    getPostsByType(draft.postType, 3).catch(() => []),
  ]);
  const { system, user } = buildPrompt(draft, references, rssText);
  const client = new Anthropic();

  let text = "";
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const res = await client.messages.create({
        model: MODEL,
        max_tokens: 8192,
        system,
        messages: [{ role: "user", content: user }],
      });
      const block = res.content.find((b) => b.type === "text");
      text = block && block.type === "text" ? block.text : "";
      break;
    } catch (e) {
      const msg = String((e as Error).message);
      const retryable = ["429", "529", "overloaded", "rate_limit"].some((k) =>
        msg.includes(k),
      );
      if (retryable && attempt < MAX_RETRIES - 1) {
        await sleep((attempt + 1) * 5000);
        continue;
      }
      throw e;
    }
  }

  const { html: rawHtml, titles } = splitTitles(stripFence(text.trim()));
  const wrappedTitle = draft.title || draft.movieTitle || "포스팅";
  const ensured = ensureLocalSignature(rawHtml, draft.postType);
  const html = wrapHtml(ensured, wrappedTitle, draft.postType);
  return { html, titles };
}

const MK_LINK_SIGNATURE = `<table width="100%" border="0" cellpadding="20" cellspacing="0" bgcolor="#f4f6f8" style="border-left:4px solid #26C6A4; margin-top:40px;"><tr><td><p style="margin:0 0 6px 0; font-size:14px; color:#333; font-weight:bold;"><b>🔗 MK LINK</b></p><p style="margin:0; font-size:13px; color:#555; line-height:1.8;">대구 로컬 소식·행사·공고를 전합니다.<br>공유할 소식 있으면 댓글로 알려주세요, MK LINK가 함께 전해드립니다.</p></td></tr></table>`;

/** local 타입에서 AI가 시그니처를 빠뜨렸을 때 코드로 보장. */
function ensureLocalSignature(html: string, postType: string): string {
  if (postType !== "local") return html;
  if (html.includes("MK LINK")) return html;
  return html + "\n" + MK_LINK_SIGNATURE;
}

/** 코드펜스 제거. */
function stripFence(s: string): string {
  return s
    .replace(/^```html?\s*\n?/i, "")
    .replace(/\n?```\s*$/i, "")
    .trim();
}

/** <!-- TITLES: a||b||c --> 추출 → {html(주석제거), titles[]}. */
function splitTitles(s: string): GenerateResult {
  const m = s.match(/<!--\s*TITLES:\s*([\s\S]*?)-->/i);
  const titles = m
    ? m[1]
        .split("||")
        .map((t) => t.trim())
        .filter(Boolean)
    : [];
  const html = s.replace(/<!--\s*TITLES:[\s\S]*?-->/i, "").trim();
  return { html, titles };
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function mockHtml(draft: PostDraft): string {
  const title = draft.title || draft.movieTitle || "포스팅";
  const raw = `<p>(데모 출력 — <strong>ANTHROPIC_API_KEY</strong> 미설정. 실제 생성은 키 설정 후 동작합니다.)</p>
<table width="100%" border="0" cellpadding="15" bgcolor="#1a1a1a"><tr><td><b style="color:#ffffff; font-size:18px;">${title}</b></td></tr></table>
<p>타입: ${draft.postType} · 장르: ${draft.genres.join(", ") || "미지정"}</p>
${draft.comment || draft.body ? `<p>${draft.comment || draft.body}</p>` : ""}`;
  return wrapHtml(raw, title, draft.postType);
}

function mockTitles(draft: PostDraft): string[] {
  const t = draft.title || draft.movieTitle || "포스팅";
  return [`${t} 리뷰`, `${t} 후기`, `${t} 줄거리 결말`, `${t} 추천 이유`, `${t} 정보`];
}
