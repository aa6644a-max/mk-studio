import Anthropic from "@anthropic-ai/sdk";
import { getRssLatestText } from "@/lib/rss-client";
import { getPostsByType } from "@/lib/google-sheets";
import { searchMovies, getMovieDetails, searchTv, getTvDetails } from "@/lib/tmdb";
import {
  buildWorkflowGenerateSystem,
  buildWorkflowGenerateUser,
} from "@/lib/prompts/workflow";
import {
  buildReviewPrompt,
  buildPreviewPrompt,
  buildCurationPrompt,
  buildBingePrompt,
  formatCurationItems,
  formatBingeItems,
} from "@/lib/prompts/movie";
import { referenceText } from "@/lib/prompts/base";
import type { StrategyCard, ChatMessage, TmdbSelection } from "@/lib/workflow-store";
import type { MovieDetails, TvDetails, CurationItem } from "@/lib/types";

export const maxDuration = 300;

const MOVIE_TYPES = ["review", "preview", "curation", "binge"];
const TV_TYPES = ["binge"];

export async function POST(req: Request) {
  try {
    const { messages, strategy, topic, fileContent, imageInfo, tmdbSelections } = (await req.json()) as {
      messages: ChatMessage[];
      strategy: StrategyCard;
      topic: string;
      fileContent?: string;
      imageInfo?: string;
      tmdbSelections?: TmdbSelection[];
    };

    const [rssText, references] = await Promise.all([
      getRssLatestText("shock552", 5).catch(() => ""),
      getPostsByType(strategy.postType, 3).catch(() => []),
    ]);

    let systemPrompt: string;
    let userPrompt: string;

    if (MOVIE_TYPES.includes(strategy.postType) && tmdbSelections?.length) {
      // V3 상세 프롬프트 사용 (소제목 4-5개, 이미지 배치, 문체 규칙 등)
      const refText = referenceText(references, rssText);
      const conversationText = formatConversation(messages);

      if (strategy.postType === "review") {
        const details = await fetchMovieDetailsList(tmdbSelections);
        if (details.length > 0) {
          const { system, user } = buildReviewPrompt(details[0], conversationText, topic, refText);
          systemPrompt = system;
          userPrompt = user;
        } else {
          ({ systemPrompt, userPrompt } = await fallbackWorkflowPrompt(topic, messages, strategy, references, rssText, fileContent, imageInfo));
        }
      } else if (strategy.postType === "preview") {
        const details = await fetchMovieDetailsList(tmdbSelections);
        if (details.length > 0) {
          const { system, user } = buildPreviewPrompt(details[0], conversationText, topic, refText);
          systemPrompt = system;
          userPrompt = user;
        } else {
          ({ systemPrompt, userPrompt } = await fallbackWorkflowPrompt(topic, messages, strategy, references, rssText, fileContent, imageInfo));
        }
      } else if (strategy.postType === "binge") {
        const tvDetails = await fetchTvDetailsList(tmdbSelections);
        const themeWithContext = conversationText
          ? `${topic}\n\n[인터뷰 내용]\n${conversationText}`
          : topic;
        const items: CurationItem[] = tvDetails.map((d) => ({
          title: d.title,
          originalTitle: d.originalTitle,
          posterUrl: d.posterUrl ?? null,
          cast: d.cast,
          genres: d.genres,
          numberOfEpisodes: d.numberOfEpisodes,
          numberOfSeasons: d.numberOfSeasons,
          episodeRuntime: d.episodeRuntime,
          totalWatchTime: d.totalWatchTime,
          overview: d.overview,
          reason: "",
        }));
        const { system, user } = buildBingePrompt(themeWithContext, formatBingeItems(items), refText);
        systemPrompt = system;
        userPrompt = user;
      } else {
        // curation
        const details = await fetchMovieDetailsList(tmdbSelections);
        const themeWithContext = conversationText
          ? `${topic}\n\n[인터뷰 내용]\n${conversationText}`
          : topic;
        const items: CurationItem[] = details.map((d) => ({
          title: d.title,
          originalTitle: d.originalTitle,
          posterUrl: d.posterUrl ?? null,
          country: d.country,
          releaseDate: d.releaseDate,
          director: d.director,
          actors: d.actors,
          genres: d.genres,
          overview: d.overview,
          reason: "",
        }));
        const { system, user } = buildCurationPrompt(themeWithContext, formatCurationItems(items), refText);
        systemPrompt = system;
        userPrompt = user;
      }
    } else {
      // 비영화 타입 또는 TMDB 미선택 → V4 워크플로우 프롬프트
      const extraData = MOVIE_TYPES.includes(strategy.postType)
        ? await fetchExtraData(topic, strategy.postType).catch(() => "")
        : "";
      systemPrompt = buildWorkflowGenerateSystem();
      userPrompt = buildWorkflowGenerateUser(topic, messages, strategy, references, rssText, extraData, fileContent, imageInfo);
    }

    const client = new Anthropic();
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        let fullText = "";

        try {
          const anthropicStream = client.messages.stream({
            model: "claude-sonnet-4-6",
            max_tokens: 6000,
            system: systemPrompt,
            messages: [{ role: "user", content: userPrompt }],
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

function formatConversation(messages: ChatMessage[]): string {
  if (!messages.length) return "";
  return messages
    .map((m) => `${m.role === "user" ? "MK" : "AI"}: ${m.content}`)
    .join("\n");
}

async function fallbackWorkflowPrompt(
  topic: string,
  messages: ChatMessage[],
  strategy: StrategyCard,
  references: { movieTitle: string; content: string }[],
  rssText: string,
  fileContent?: string,
  imageInfo?: string,
) {
  const extraData = await fetchExtraData(topic, strategy.postType).catch(() => "");
  return {
    systemPrompt: buildWorkflowGenerateSystem(),
    userPrompt: buildWorkflowGenerateUser(topic, messages, strategy, references, rssText, extraData, fileContent, imageInfo),
  };
}

async function fetchMovieDetailsList(selections: TmdbSelection[]): Promise<MovieDetails[]> {
  const results = await Promise.all(
    selections.map((sel) =>
      sel.mediaType !== "tv" ? getMovieDetails(sel.id).catch(() => null) : Promise.resolve(null),
    ),
  );
  return results.filter((d): d is MovieDetails => d !== null);
}

async function fetchTvDetailsList(selections: TmdbSelection[]): Promise<TvDetails[]> {
  const results = await Promise.all(
    selections.map((sel) =>
      sel.mediaType === "tv" ? getTvDetails(sel.id).catch(() => null) : Promise.resolve(null),
    ),
  );
  return results.filter((d): d is TvDetails => d !== null);
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

function formatMovieData(d: MovieDetails): string {
  const stills = (d.backdropUrls ?? [])
    .slice(0, 3)
    .map((url, i) => `스틸컷${i + 1}: ${url}`)
    .join("\n");
  return `제목: ${d.title} (${d.originalTitle ?? ""})
감독: ${d.director ?? "정보없음"}
배우: ${d.actors ?? "정보없음"}
장르: ${d.genres ?? "정보없음"}
개봉: ${d.releaseDate ?? "정보없음"}
제작국: ${d.country ?? "정보없음"}
줄거리: ${d.overview ?? ""}
포스터: ${d.posterUrl ?? ""}
${stills}`;
}

function formatTvData(d: TvDetails): string {
  return `제목: ${d.title} (${d.originalTitle ?? ""})
장르: ${d.genres ?? "정보없음"}
첫 방영: ${d.firstAirDate ?? "정보없음"}
총 에피소드: ${d.numberOfEpisodes ?? "정보없음"}
시즌: ${d.numberOfSeasons ?? "정보없음"}
출연: ${d.cast ?? "정보없음"}
포스터: ${d.posterUrl ?? ""}`;
}
