import Anthropic from "@anthropic-ai/sdk";
import type { PostDraft } from "@/lib/types";
import { getPostsByType, getProfile } from "@/lib/google-sheets";
import { getRssLatestText } from "@/lib/rss-client";
import { buildPrompt } from "@/lib/prompts";
import { groupOf, buildProfileInjection } from "@/lib/prompts/profile";
import { lintPost, buildFixPrompt } from "@/lib/post-lint";
import { wrapHtml } from "@/lib/html-formatter";

/**
 * Claude 포스팅 생성.
 * Sonnet 5, 429/529 재시도, 코드펜스 제거, <!-- TITLES: --> 추출.
 * 생성 → 린트(post-lint) → 위반 시 1회 수정 요청 루프.
 * 키 없으면 mock 반환.
 */

const MODEL = "claude-sonnet-5";
// Sonnet 5 토크나이저는 동일 텍스트에 ~30% 더 많은 토큰을 쓰므로 여유 확보
const MAX_TOKENS = 16000;
const MAX_RETRIES = 3;

/** postType → RSS 문체 참조 우선 키워드 (같은 계열 글 우선 선별). */
const RSS_PREFER: Record<string, string[]> = {
  review: ["영화", "리뷰", "후기", "개봉"],
  preview: ["영화", "개봉", "기대", "프리뷰"],
  curation: ["영화", "추천", "큐레이션", "모음"],
  binge: ["정주행", "시리즈", "드라마", "몰아보기"],
  photo: ["카페", "맛집", "방문", "여행", "전시"],
  local: ["모집", "공고", "지원", "교육", "행사"],
  pdf: ["안내", "정리", "총정리", "소식"],
};

export type GenerateResult = { html: string; titles: string[]; warnings?: string[] };

export function isClaudeConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

type Msg = { role: "user" | "assistant"; content: string };

async function askClaude(
  client: Anthropic,
  system: string,
  messages: Msg[],
): Promise<string> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const res = await client.messages.create({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system,
        messages,
      });
      const block = res.content.find((b) => b.type === "text");
      return block && block.type === "text" ? block.text : "";
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
  return "";
}

export async function generatePost(draft: PostDraft): Promise<GenerateResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { html: mockHtml(draft), titles: mockTitles(draft) };
  }

  // RSS 원문(문체 학습, 같은 계열 글 우선) + 같은 타입 Sheets 글(구조 참조) + 누적 프로필 병렬 로드
  const [rssText, references, profile] = await Promise.all([
    getRssLatestText("shock552", 5, RSS_PREFER[draft.postType] ?? []).catch(() => ""),
    getPostsByType(draft.postType, 3).catch(() => []),
    getProfile(groupOf(draft.postType)).catch(() => null),
  ]);
  const { system, user } = buildPrompt(draft, references, rssText);
  const userWithProfile = user + buildProfileInjection(profile);
  const client = new Anthropic();

  // 1차 생성
  const firstRaw = await askClaude(client, system, [
    { role: "user", content: userWithProfile },
  ]);
  let { html: rawHtml, titles } = splitTitles(stripFence(firstRaw.trim()));

  // 린트 → 위반 시 1회 수정 요청
  let warnings: string[] = [];
  const issues = lintPost(rawHtml, draft.postType, titles);
  if (issues.length) {
    try {
      const fixedRaw = await askClaude(client, system, [
        { role: "user", content: userWithProfile },
        { role: "assistant", content: firstRaw },
        { role: "user", content: buildFixPrompt(issues) },
      ]);
      const fixed = splitTitles(stripFence(fixedRaw.trim()));
      // 수정본이 정상 출력일 때만 채택 (빈 응답·형식 붕괴 방어)
      if (fixed.html.length > rawHtml.length * 0.5) {
        rawHtml = fixed.html;
        titles = fixed.titles.length ? fixed.titles : titles;
      }
    } catch {
      // 수정 요청 실패 시 1차 결과 사용
    }
    const remaining = lintPost(rawHtml, draft.postType, titles);
    warnings = remaining.map((v) => v.message);
  }

  const wrappedTitle = draft.shortTitle || draft.title || draft.movieTitle || "포스팅";
  // MK LINK 협업 시그니처는 wrapHtml이 전 타입에 자동 삽입.
  const html = wrapHtml(rawHtml, wrappedTitle, draft.postType);
  return { html, titles, warnings: warnings.length ? warnings : undefined };
}

/** 코드펜스 제거. */
function stripFence(s: string): string {
  return s
    .replace(/^```html?\s*\n?/i, "")
    .replace(/\n?```\s*$/i, "")
    .trim();
}

/** <!-- TITLES: a||b||c --> 추출 → {html(주석제거), titles[]}. */
function splitTitles(s: string): { html: string; titles: string[] } {
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
