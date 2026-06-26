import Anthropic from "@anthropic-ai/sdk";
import {
  buildClass101InterviewSystem,
  type Class101Angle,
} from "@/lib/prompts/class101";
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

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response("ANTHROPIC_API_KEY 미설정", { status: 500 });
  }

  const {
    messages = [],
    angle = 1,
    category = "AI·업무자동화",
    materialPdfBase64 = "",
    materialText = "",
  } = (await req.json().catch(() => ({}))) as {
    messages?: ChatMessage[];
    angle?: Class101Angle;
    category?: string;
    materialPdfBase64?: string;
    materialText?: string;
  };

  const system = buildClass101InterviewSystem(angle as Class101Angle, category);

  // seed: 자료 + 인터뷰 시작 지시 → 이후 클라이언트 대화 turn 이어붙임
  const seedContent: Anthropic.ContentBlockParam[] = [
    ...materialBlocks(materialPdfBase64, materialText),
    {
      type: "text",
      text: "위 강의 자료를 참고해 인터뷰를 진행하세요. 자료에 없는 제 개인 경험을 물어봐 주세요. 첫 질문부터 시작하세요.",
    },
  ];

  const anthropicMessages: Anthropic.MessageParam[] = [
    { role: "user", content: seedContent },
    ...messages.map((m) => ({ role: m.role, content: m.content })),
  ];

  const client = new Anthropic();
  const stream = client.messages.stream({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system,
    messages: anthropicMessages,
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`),
            );
          }
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } catch (e) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: String(e) })}\n\n`),
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
