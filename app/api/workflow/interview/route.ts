import Anthropic from "@anthropic-ai/sdk";
import { getRssLatestText } from "@/lib/rss-client";
import { getPostsByType } from "@/lib/google-sheets";
import { referenceText } from "@/lib/prompts/base";
import { buildInterviewSystem } from "@/lib/prompts/workflow";
import { getProfile } from "@/lib/google-sheets";
import { groupOf, buildProfileInjection } from "@/lib/prompts/profile";
import { safeSlice } from "@/lib/prompts/base";
import { formatTmdbDetailsText, type TmdbSelectionRef } from "@/lib/tmdb";
import type { StrategyCard, ChatMessage } from "@/lib/workflow-store";

export const maxDuration = 120;

export async function POST(req: Request) {
  try {
    const { messages, strategy, topic, customSystem, fileContent, imageInfo, tmdbTitles, tmdbSelections, seed } = (await req.json()) as {
      messages: ChatMessage[];
      strategy: StrategyCard;
      topic: string;
      customSystem?: string;
      fileContent?: string;
      imageInfo?: string;
      tmdbTitles?: string;
      tmdbSelections?: TmdbSelectionRef[]; // 작품 상세(줄거리·감독·출연) 조회용 — 감상 × 조사 교차 질문
      seed?: string; // 사용자가 쓴 감상평 — 인터뷰 시드(콜드스타트 제거)
    };

    const seedText = seed?.trim() ?? "";
    const tmdbDetail = tmdbSelections?.length
      ? await formatTmdbDetailsText(tmdbSelections).catch(() => "")
      : "";

    let system: string;
    if (customSystem) {
      system = customSystem;
    } else {
      const [rssText, references] = await Promise.all([
        getRssLatestText("shock552", 3).catch(() => ""),
        getPostsByType(strategy.postType, 2).catch(() => []),
      ]);
      const refText = referenceText(references, "");
      system = buildInterviewSystem(strategy, rssText, refText, fileContent, imageInfo, seedText, tmdbDetail);
      // MK 프로필 주입 — 아는 취향 재질문 회피 + 더 깊은 질문 (질문 전략에 활용)
      const profile = await getProfile(groupOf(strategy.postType)).catch(() => null);
      system += buildProfileInjection(profile, "interview");
    }

    const client = new Anthropic();
    const encoder = new TextEncoder();

    // 첫 턴: topic + 파일/TMDB 내용 + 감상평 시드 주입
    let firstUserContent = `포스팅 주제: "${topic}"`;
    if (tmdbTitles) {
      firstUserContent += `\n\n[선택된 작품: ${tmdbTitles}]`;
    }
    if (seedText) {
      firstUserContent += `\n\n[내가 쓴 감상평]\n${safeSlice(seedText, 3000)}`;
    }
    if (fileContent) {
      firstUserContent += `\n\n[업로드된 PDF 내용]\n${safeSlice(fileContent, 4000)}`;
    } else if (imageInfo) {
      firstUserContent += `\n\n[업로드된 사진 정보]\n${imageInfo}`;
    }

    const claudeMessages: { role: "user" | "assistant"; content: string }[] =
      messages.length === 0
        ? [{ role: "user", content: firstUserContent }]
        : messages.map((m) => ({ role: m.role, content: m.content }));

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const anthropicStream = client.messages.stream({
            model: "claude-sonnet-5",
            max_tokens: 512,
            // Sonnet 5는 미지정 시 adaptive thinking이 켜져 짧은 예산을 잠식 → 명시 비활성
            thinking: { type: "disabled" },
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
