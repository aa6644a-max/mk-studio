import Anthropic from "@anthropic-ai/sdk";
import { buildMarketingPrompt } from "@/lib/prompts/marketing";

export const maxDuration = 300;

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response("ANTHROPIC_API_KEY 미설정", { status: 500 });
  }

  const { topic } = (await req.json()) as { topic: string };
  if (!topic?.trim()) {
    return new Response("주제를 입력해주세요", { status: 400 });
  }

  const { system, user } = buildMarketingPrompt(topic.trim());
  const client = new Anthropic();

  const stream = client.messages.stream({
    model: "claude-sonnet-5",
    max_tokens: 8192,
    system,
    messages: [{ role: "user", content: user }],
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
