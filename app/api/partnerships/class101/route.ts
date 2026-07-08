import Anthropic from "@anthropic-ai/sdk";
import {
  buildClass101Prompt,
  type Class101Angle,
} from "@/lib/prompts/class101";
import { getRssLatestText } from "@/lib/rss-client";
import type { ChatMessage } from "@/lib/workflow-store";

export const maxDuration = 300;

/** 업로드된 자료(PDF base64 / 텍스트)를 Claude content 블록으로 변환. */
function materialBlocks(
  pdfBase64: string,
  text: string,
): Anthropic.ContentBlockParam[] {
  const blocks: Anthropic.ContentBlockParam[] = [];
  if (pdfBase64) {
    blocks.push({
      type: "document",
      source: { type: "base64", media_type: "application/pdf", data: pdfBase64 },
      cache_control: { type: "ephemeral" },
    });
  }
  if (text.trim()) {
    blocks.push({ type: "text", text: `[강의 자료 텍스트]\n${text.trim()}` });
  }
  return blocks;
}

/** 인터뷰 대화 → 프롬프트용 경험 텍스트. */
function interviewToText(messages: ChatMessage[]): string {
  return messages
    .filter((m) => m.content.trim())
    .map((m) => `[${m.role === "assistant" ? "질문" : "답변"}] ${m.content.trim()}`)
    .join("\n");
}

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response("ANTHROPIC_API_KEY 미설정", { status: 500 });
  }

  const {
    messages = [],
    angle = 1,
    category = "AI·업무자동화",
    secondaryKeyword = "",
    materialPdfBase64 = "",
    materialText = "",
  } = (await req.json().catch(() => ({}))) as {
    messages?: ChatMessage[];
    angle?: Class101Angle;
    category?: string;
    secondaryKeyword?: string;
    materialPdfBase64?: string;
    materialText?: string;
  };

  const rssText = await getRssLatestText("shock552", 5).catch(() => "");
  const interviewText = interviewToText(messages);

  const { system, user } = buildClass101Prompt(
    angle as Class101Angle,
    category,
    secondaryKeyword,
    interviewText,
    rssText,
  );

  const userContent: Anthropic.ContentBlockParam[] = [
    ...materialBlocks(materialPdfBase64, materialText),
    { type: "text", text: user },
  ];

  const client = new Anthropic();
  const stream = client.messages.stream({
    model: "claude-sonnet-5",
    max_tokens: 12000,
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
