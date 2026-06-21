import Anthropic from "@anthropic-ai/sdk";
import { getRssLatestText } from "@/lib/rss-client";
import { getPostsByType } from "@/lib/google-sheets";
import { referenceText } from "@/lib/prompts/base";
import { buildInterviewSystem } from "@/lib/prompts/workflow";
import type { StrategyCard, ChatMessage } from "@/lib/workflow-store";

export const maxDuration = 120;

export async function POST(req: Request) {
  try {
    const { messages, strategy, topic, customSystem } = (await req.json()) as {
      messages: ChatMessage[];
      strategy: StrategyCard;
      topic: string;
      customSystem?: string;
    };

    let system: string;
    if (customSystem) {
      system = customSystem;
    } else {
      const [rssText, references] = await Promise.all([
        getRssLatestText("shock552", 3).catch(() => ""),
        getPostsByType(strategy.postType, 2).catch(() => []),
      ]);
      const refText = referenceText(references, "");
      system = buildInterviewSystem(strategy, rssText, refText);
    }

    const client = new Anthropic();
    const encoder = new TextEncoder();

    // Build message history for Claude (first turn injects the topic)
    const claudeMessages: { role: "user" | "assistant"; content: string }[] =
      messages.length === 0
        ? [{ role: "user", content: `포스팅 주제: "${topic}"` }]
        : messages.map((m) => ({ role: m.role, content: m.content }));

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const anthropicStream = client.messages.stream({
            model: "claude-sonnet-4-6",
            max_tokens: 512,
            system,
            messages: claudeMessages,
          });

          for await (const event of anthropicStream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ text: event.delta.text })}\n\n`,
                ),
              );
            }
          }

          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        } catch (e) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: String(e) })}\n\n`,
            ),
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (e) {
    console.error("[/api/workflow/interview]", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
