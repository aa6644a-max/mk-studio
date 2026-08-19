import Anthropic from "@anthropic-ai/sdk";
import { getRssLatestText } from "@/lib/rss-client";
import { getPostsByType } from "@/lib/google-sheets";
import { referenceText } from "@/lib/prompts/base";
import { buildInterviewSystem } from "@/lib/prompts/workflow";
import { getProfile } from "@/lib/google-sheets";
import { groupOf, buildProfileInjection } from "@/lib/prompts/profile";
import { safeSlice } from "@/lib/prompts/base";
import { formatTmdbDetailsText, type TmdbSelectionRef } from "@/lib/tmdb";
import type { StrategyCard, ChatMessage, MarketInfo } from "@/lib/workflow-store";

export const maxDuration = 120;

/**
 * market 인터뷰 지시 블록.
 * 팀 목록·팀별 메모는 이미 구조화 입력으로 받았으므로, 인터뷰는
 * 그 메모로는 알 수 없는 것(방문 계기·전체 인상·특히 기억에 남은 팀)만 캔다.
 */
function buildMarketInterviewBlock(info: MarketInfo): string {
  const hostList = info.hosts
    .map((h) => `- ${h.name}${h.handle ? ` (@${h.handle})` : ""}${h.note.trim() ? " — 메모 있음" : " — 메모 없음"}`)
    .join("\n");
  const noteMissing = info.hosts.filter((h) => !h.note.trim()).map((h) => h.name);

  return `

━━━━━━━━━━━━━━━━━━━━━━━━━
[🎪 마켓 후기 — 이미 확보된 정보 (재질문 절대 금지)]
━━━━━━━━━━━━━━━━━━━━━━━━━
- 장소: ${info.venueName}${info.venueAddress ? ` (${info.venueAddress})` : ""}
- 일시: ${info.eventDate}${info.eventTime ? ` ${info.eventTime}` : ""}
- 참여 팀 ${info.hosts.length}팀:
${hostList}
${info.venueInfo.trim() ? `- 장소 메모 확보됨` : "- 장소 메모 없음"}
${info.seriesInfo.trim() ? `- 시리즈·일정 메모 확보됨` : "- 시리즈·일정 메모 없음"}

[이 인터뷰에서 물어야 할 것 — 위 목록으로는 알 수 없는 것만]
1. 이 마켓에 가게 된 계기 (예고글을 썼다면 그 연장인지 등)
2. 한 바퀴 돌고 난 전체 인상 — 팀들을 관통하는 공통점이나 대비되는 지점
3. 특히 기억에 남은 팀 1~2곳과 그 이유
4. 그날의 날씨·현장 분위기처럼 사진과 메모로는 안 잡히는 감각
${noteMissing.length ? `5. 현장 메모가 비어 있는 팀(${noteMissing.join(", ")})에 대해 기억나는 게 있는지 가볍게만 확인` : ""}

🚨 팀 목록·인스타 핸들·장소 주소·일정은 절대 다시 묻지 마세요. 이미 다 있습니다.
🚨 3~4턴 안에 마치고 종료 선언하세요. 참여 팀이 많아 인터뷰가 길어지면 사용자가 지칩니다.`;
}

export async function POST(req: Request) {
  try {
    const { messages, strategy, topic, customSystem, fileContent, imageInfo, tmdbTitles, tmdbSelections, seed, marketInfo } = (await req.json()) as {
      messages: ChatMessage[];
      strategy: StrategyCard;
      topic: string;
      customSystem?: string;
      fileContent?: string;
      imageInfo?: string;
      tmdbTitles?: string;
      tmdbSelections?: TmdbSelectionRef[]; // 작품 상세(줄거리·감독·출연) 조회용 — 감상 × 조사 교차 질문
      seed?: string; // 사용자가 쓴 감상평 — 인터뷰 시드(콜드스타트 제거)
      marketInfo?: MarketInfo; // market 타입: 참여 팀·장소가 이미 입력됨 → 재질문 방지용
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
      // market: 참여 팀·장소 메모가 입력 화면에서 이미 확보됐으므로 그것을 다시 묻지 않게 알려준다
      if (strategy.postType === "market" && marketInfo) {
        system += buildMarketInterviewBlock(marketInfo);
      }
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
