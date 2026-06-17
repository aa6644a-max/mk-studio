import Anthropic from "@anthropic-ai/sdk";
import { buildClass101Prompt, type Class101Angle } from "@/lib/prompts/class101";

export const maxDuration = 300;

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response("ANTHROPIC_API_KEY 미설정", { status: 500 });
  }

  const { angle = 1, category = "AI·업무자동화", courseName = "", userNotes = "" } = await req.json().catch(() => ({}));
  const { system, user } = buildClass101Prompt(angle as Class101Angle, category, courseName, userNotes);
  const client = new Anthropic();

  const stream = client.messages.stream({
    model: "claude-sonnet-4-6",
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
