import type { PostDraft, Post } from "@/lib/types";
import { buildMoviePrompt, type PromptResult } from "./movie";
import { buildDailyPrompt } from "./daily";
import { buildLocalPrompt } from "./local";

/** 포스팅 타입에 맞는 프롬프트 빌더로 분기. */
export function buildPrompt(
  draft: PostDraft,
  references: Post[],
): PromptResult {
  switch (draft.postType) {
    case "review":
    case "preview":
    case "curation":
    case "binge":
      return buildMoviePrompt(draft, references);
    case "photo":
    case "pdf":
      return buildDailyPrompt(draft, references);
    case "local":
      return buildLocalPrompt(draft, references);
  }
}

export type { PromptResult };
