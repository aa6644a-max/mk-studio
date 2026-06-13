import Anthropic from "@anthropic-ai/sdk";
import type { PostDraft } from "@/lib/types";
import { getRecentPosts } from "@/lib/google-sheets";
import { buildMoviePrompt } from "@/lib/prompts/movie";

/**
 * Claude 포스팅 생성. PRD §6: Sonnet 4.6, 스트리밍 없이 완성 후 반환이지만
 * 생성이 길어(1~2분) HTTP 타임아웃 방지 위해 SDK 스트리밍 + finalMessage 사용.
 * adaptive thinking. 키 없으면 mock HTML 반환.
 */

const MODEL = "claude-sonnet-4-6"; // PRD 명시 모델

export function isClaudeConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export async function generatePost(draft: PostDraft): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return mockHtml(draft);
  }

  // 문체 레퍼런스 (RAG-lite)
  const references = await getRecentPosts(3).catch(() => []);
  const { system, user } = buildMoviePrompt(draft, references);

  const client = new Anthropic();
  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: 16000,
    thinking: { type: "adaptive" },
    output_config: { effort: "medium" },
    system,
    messages: [{ role: "user", content: user }],
  });

  const final = await stream.finalMessage();
  const html = final.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();

  return stripFence(html);
}

/** 코드펜스로 감싸 나오면 제거. */
function stripFence(s: string): string {
  const m = s.match(/^```(?:html)?\s*([\s\S]*?)\s*```$/);
  return m ? m[1].trim() : s;
}

function mockHtml(draft: PostDraft): string {
  const title = draft.title || draft.movieTitle || "포스팅";
  const stars = draft.rating ? "★".repeat(draft.rating) : "";
  return `
<div style="font-family:'Pretendard',-apple-system,sans-serif;color:#2c2c2c;line-height:1.8;font-size:16px">
  <p>(데모 출력 — <strong>ANTHROPIC_API_KEY</strong> 미설정. 실제 생성은 키 설정 후 동작합니다.)</p>
  <h3 style="font-size:20px;font-weight:700;color:#171719;margin:32px 0 12px">${title}</h3>
  <p>장르: ${draft.genres.join(", ") || "미지정"} · 타입: ${draft.postType}</p>
  ${draft.body ? `<p>${draft.body}</p>` : ""}
  <div style="background:#f7f7f8;border-left:4px solid #0066ff;padding:16px 20px;border-radius:8px;margin:20px 0">
    한 줄 총평이 여기에 들어갑니다. ${stars}
  </div>
</div>`.trim();
}
