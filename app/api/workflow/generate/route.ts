import Anthropic from "@anthropic-ai/sdk";
import { getRssLatestText } from "@/lib/rss-client";
import { getPostsByType } from "@/lib/google-sheets";
import { searchMovies, getMovieDetails, searchTv, getTvDetails } from "@/lib/tmdb";
import {
  buildWorkflowGenerateSystem,
  buildWorkflowGenerateUser,
} from "@/lib/prompts/workflow";
import type { StrategyCard, ChatMessage } from "@/lib/workflow-store";

export const maxDuration = 300;

const MOVIE_TYPES = ["review", "preview", "curation", "binge"];
const TV_TYPES = ["binge"];

export async function POST(req: Request) {
  try {
    const { messages, strategy, topic, fileContent, imageInfo } = (await req.json()) as {
      messages: ChatMessage[];
      strategy: StrategyCard;
      topic: string;
      fileContent?: string;
      imageInfo?: string;
    };

    // 외부 데이터 병렬 로드
    const [rssText, references, extraData] = await Promise.all([
      getRssLatestText("shock552", 5).catch(() => ""),
      getPostsByType(strategy.postType, 3).catch(() => []),
      fetchExtraData(topic, strategy.postType).catch(() => ""),
    ]);

    const system = buildWorkflowGenerateSystem();
    const user = buildWorkflowGenerateUser(
      topic,
      messages,
      strategy,
      references,
      rssText,
      extraData,
      fileContent,
      imageInfo,
    );

    const client = new Anthropic();
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

          // TITLES만 추출해서 done 이벤트로 전송 (HTML은 클라이언트가 누적)
          const titleMatch = fullText.match(/<!--\s*TITLES:\s*([\s\S]*?)-->/i);
          const titles = titleMatch
            ? titleMatch[1]
                .split("||")
                .map((t) => t.trim())
                .filter(Boolean)
            : [];

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ done: true, titles, postType: strategy.postType })}\n\n`,
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
    console.error("[/api/workflow/generate]", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

async function fetchExtraData(topic: string, postType: string): Promise<string> {
  if (!MOVIE_TYPES.includes(postType)) return "";

  const query = topic.replace(/(리뷰|후기|감상|소개|추천|정주행|프리뷰|개봉)/g, "").trim();
  if (!query) return "";

  if (TV_TYPES.includes(postType)) {
    const results = await searchTv(query);
    if (!results.length) return "";
    const detail = await getTvDetails(results[0].id);
    if (!detail) return "";
    return formatTvData(detail);
  }

  const results = await searchMovies(query);
  if (!results.length) return "";
  const detail = await getMovieDetails(results[0].id);
  if (!detail) return "";
  return formatMovieData(detail);
}

function formatMovieData(d: Awaited<ReturnType<typeof getMovieDetails>>): string {
  if (!d) return "";
  const stills = (d.backdropUrls ?? [])
    .slice(0, 3)
    .map((url, i) => `스틸컷${i + 1}: ${url}`)
    .join("\n");
  return `제목: ${d.title} (${d.originalTitle})
감독: ${d.director ?? "정보없음"}
배우: ${d.actors ?? "정보없음"}
장르: ${d.genres ?? "정보없음"}
개봉: ${d.releaseDate ?? "정보없음"}
제작국: ${d.country ?? "정보없음"}
줄거리: ${d.overview ?? ""}
포스터: ${d.posterUrl ?? ""}
${stills}`;
}

function formatTvData(d: Awaited<ReturnType<typeof getTvDetails>>): string {
  if (!d) return "";
  return `제목: ${d.title} (${d.originalTitle})
장르: ${d.genres ?? "정보없음"}
첫 방영: ${d.firstAirDate ?? "정보없음"}
총 에피소드: ${d.numberOfEpisodes ?? "정보없음"}
시즌: ${d.numberOfSeasons ?? "정보없음"}
출연: ${d.cast ?? "정보없음"}
포스터: ${d.posterUrl ?? ""}`;
}

