import Anthropic from "@anthropic-ai/sdk";
import { getRssLatestText } from "@/lib/rss-client";
import { buildClass101Prompt, type Class101Angle } from "@/lib/prompts/class101";
import type { ChatMessage } from "@/lib/workflow-store";

export const maxDuration = 300;

const EXTRACT_SYSTEM = `인터뷰 대화에서 아래 JSON 필드를 추출하세요. 없으면 기본값 사용.
{
  "category": "AI·업무자동화",  // 카테고리 (기본: "AI·업무자동화")
  "courseName": "",             // 강의명 (없으면 빈 문자열)
  "angle": 1,                  // 1=구독계기, 2=강의리뷰, 3=활용아이디어 (기본: 1)
  "userNotes": ""              // 추가 메모나 강조점
}
JSON만 반환. 설명 없음.`;

export async function POST(req: Request) {
  try {
    const { messages } = (await req.json()) as { messages: ChatMessage[] };

    const conversation = messages
      .map((m) => `[${m.role === "assistant" ? "인터뷰어" : "MK"}] ${m.content}`)
      .join("\n");

    // Step 1: 인터뷰에서 구조화된 데이터 추출
    const client = new Anthropic();
    const extractRes = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 256,
      system: EXTRACT_SYSTEM,
      messages: [{ role: "user", content: conversation }],
    });

    let extracted = {
      category: "AI·업무자동화",
      courseName: "",
      angle: 1 as Class101Angle,
      userNotes: "",
    };

    try {
      const raw =
        extractRes.content.find((b) => b.type === "text")?.text ?? "{}";
      const parsed = JSON.parse(raw.replace(/```json?\n?|\n?```/g, "").trim());
      extracted = {
        category: parsed.category || "AI·업무자동화",
        courseName: parsed.courseName || "",
        angle: ([1, 2, 3].includes(parsed.angle) ? parsed.angle : 1) as Class101Angle,
        userNotes: parsed.userNotes || "",
      };
    } catch {}

    // Step 2: RSS + 기존 Class101 프롬프트로 생성
    const rssText = await getRssLatestText("shock552", 3).catch(() => "");
    const { system, user } = buildClass101Prompt(
      extracted.angle,
      extracted.category,
      extracted.courseName,
      extracted.userNotes,
      rssText,
    );

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let fullText = "";

        try {
          const anthropicStream = client.messages.stream({
            model: "claude-sonnet-4-6",
            max_tokens: 6000,
            system,
            messages: [{ role: "user", content: user }],
          });

          for await (const event of anthropicStream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              const chunk = event.delta.text;
              fullText += chunk;
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ text: chunk })}\n\n`,
                ),
              );
            }
          }

          // TITLE 추출
          const cleaned = fullText
            .replace(/^```html?\s*\n?/i, "")
            .replace(/\n?```\s*$/i, "")
            .trim();
          const titleMatch = cleaned.match(/<!--\s*TITLE:\s*([^\-\->]+?)\s*-->/i);
          const title = titleMatch ? titleMatch[1].trim() : "";
          const html = cleaned.replace(/<!--\s*TITLE:[^\-\->]*-->/i, "").trim();

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ done: true, html, titles: title ? [title] : [] })}\n\n`,
            ),
          );
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
    console.error("[/api/workflow/generate-class101]", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
