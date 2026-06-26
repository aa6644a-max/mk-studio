import { readFile } from "node:fs/promises";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { buildClass101Prompt } from "@/lib/prompts/class101";
import { getRssLatestText } from "@/lib/rss-client";

export const maxDuration = 300;

const PDF_PATH = path.join(process.cwd(), "assets", "class101-course.pdf");

// 강의 PDF는 매번 동일 → 모듈 스코프에서 1회만 읽어 base64 캐시.
let pdfBase64Cache: string | null = null;
async function getCoursePdfBase64(): Promise<string | null> {
  if (pdfBase64Cache !== null) return pdfBase64Cache;
  try {
    const buf = await readFile(PDF_PATH);
    pdfBase64Cache = buf.toString("base64");
  } catch {
    pdfBase64Cache = "";
  }
  return pdfBase64Cache || null;
}

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response("ANTHROPIC_API_KEY 미설정", { status: 500 });
  }

  const {
    category = "AI·업무자동화",
    courseName = "",
    secondaryKeyword = "",
    userNotes = "",
  } = await req.json().catch(() => ({}));

  const [rssText, pdfBase64] = await Promise.all([
    getRssLatestText("shock552", 5).catch(() => ""),
    getCoursePdfBase64(),
  ]);

  const { system, user } = buildClass101Prompt(
    category,
    courseName,
    secondaryKeyword,
    userNotes,
    rssText,
  );

  const userContent: Anthropic.ContentBlockParam[] = [];
  if (pdfBase64) {
    userContent.push({
      type: "document",
      source: { type: "base64", media_type: "application/pdf", data: pdfBase64 },
      cache_control: { type: "ephemeral" },
    });
  }
  userContent.push({ type: "text", text: user });

  const client = new Anthropic();
  const stream = client.messages.stream({
    model: "claude-sonnet-4-6",
    max_tokens: 8192,
    system,
    messages: [{ role: "user", content: userContent }],
  });

  const readable = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      try {
        for await (const chunk of stream) {
          if (
            chunk.type === "content_block_delta" &&
            chunk.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(chunk.delta.text));
          }
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
      "Cache-Control": "no-cache",
    },
  });
}
