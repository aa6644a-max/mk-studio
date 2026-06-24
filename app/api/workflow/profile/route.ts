import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getProfile, upsertProfile, PROFILE_GROUPS } from "@/lib/google-sheets";
import type { ProfileGroup } from "@/lib/google-sheets";
import {
  groupOf,
  buildProfileMergeSystem,
  buildProfileMergeUser,
  PROFILE_MAX_QUOTES,
} from "@/lib/prompts/profile";
import type { ChatMessage } from "@/lib/workflow-store";

export const maxDuration = 60;

const MERGE_TOOL: Anthropic.Tool = {
  name: "update_profile",
  description: "MK의 그룹별 누적 프로필을 갱신해 반환",
  input_schema: {
    type: "object" as const,
    properties: {
      profileText: {
        type: "string",
        description: "갱신된 프로필 산문 요약 (600자 이내). 기존 프로필 + 이번 인터뷰 통합",
      },
      quotes: {
        type: "array",
        items: { type: "string" },
        description: `MK 말투가 드러나는 대표 발언 최대 ${PROFILE_MAX_QUOTES}개 (롤링)`,
      },
    },
    required: ["profileText", "quotes"],
  },
};

// 누적 프로필 조회 (?group=movie|photo|info 또는 ?postType=review 등)
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const groupParam = url.searchParams.get("group");
    const postTypeParam = url.searchParams.get("postType");
    const group = groupParam ?? (postTypeParam ? groupOf(postTypeParam) : null);
    if (group !== "movie" && group !== "photo" && group !== "info") {
      return NextResponse.json({ error: "group 또는 postType 필요" }, { status: 400 });
    }
    const profile = await getProfile(group).catch(() => null);
    return NextResponse.json({ group, profile });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      postType?: string;
      group?: ProfileGroup;
      messages?: ChatMessage[];
      topic?: string;
      seed?: string;
      clear?: boolean;
      set?: boolean;
      profileText?: string;
      quotes?: string[];
    };
    const { postType, messages, topic, seed, clear, set } = body;

    // group 직접 지정 우선, 없으면 postType에서 도출
    const resolveGroup = (): ProfileGroup =>
      body.group && PROFILE_GROUPS.includes(body.group) ? body.group : groupOf(postType ?? "review");

    // 프로필 직접 저장 (편집)
    if (set) {
      const g = resolveGroup();
      const quotes = Array.isArray(body.quotes) ? body.quotes.map(String).slice(0, PROFILE_MAX_QUOTES) : [];
      await upsertProfile(g, (body.profileText ?? "").slice(0, 800), quotes);
      return NextResponse.json({ ok: true, set: g });
    }

    // 프로필 초기화
    if (clear) {
      const g = resolveGroup();
      await upsertProfile(g, "", []);
      return NextResponse.json({ ok: true, cleared: g });
    }

    // 사용자 답변(인터뷰) 또는 감상평(seed)이 있어야 누적할 게 있음
    const seedText = seed?.trim() ?? "";
    const hasUserTurn = (messages ?? []).some((m) => m.role === "user" && m.content?.trim());
    if (!hasUserTurn && !seedText) {
      return NextResponse.json({ skipped: true, reason: "no user interview content" });
    }

    const group = groupOf(postType ?? "review");
    const existing = await getProfile(group).catch(() => null);

    const client = new Anthropic();
    const res = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: buildProfileMergeSystem(group),
      tools: [MERGE_TOOL],
      tool_choice: { type: "tool", name: "update_profile" },
      messages: [{ role: "user", content: buildProfileMergeUser(existing, messages ?? [], topic ?? "", seedText) }],
    });

    const toolUse = res.content.find((b) => b.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") {
      return NextResponse.json({ error: "tool_use not found" }, { status: 500 });
    }
    const input = toolUse.input as { profileText: string; quotes: string[] };
    const quotes = Array.isArray(input.quotes) ? input.quotes.slice(0, PROFILE_MAX_QUOTES) : [];

    await upsertProfile(group, (input.profileText ?? "").slice(0, 800), quotes);

    return NextResponse.json({ ok: true, group });
  } catch (e) {
    console.error("[/api/workflow/profile]", e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
