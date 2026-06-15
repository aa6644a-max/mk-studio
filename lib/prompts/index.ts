import type { PostDraft, Post } from "@/lib/types";
import type { PromptResult } from "./base";
import { buildMoviePrompt } from "./movie";
import { buildDailyPrompt } from "./daily";
import { buildLocalPrompt } from "./local";

/** 포스팅 타입에 맞는 프롬프트 빌더로 분기. */
export function buildPrompt(
  draft: PostDraft,
  references: Post[],
  rssText = "",
): PromptResult {
  switch (draft.postType) {
    case "review":
    case "preview":
    case "curation":
    case "binge":
      return buildMoviePrompt(draft, references, rssText);
    case "photo":
    case "pdf":
      return buildDailyPrompt(draft, references, rssText);
    case "local":
      return buildLocalPrompt(draft, references, rssText);
  }
}

export type { PromptResult };
