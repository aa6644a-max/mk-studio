import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { fetchTrends, formatTrendsForPrompt } from "@/lib/naver-datalab";
import { STRATEGY_SYSTEM, buildStrategyUser } from "@/lib/prompts/workflow";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { topic } = (await req.json()) as { topic: string };

    const trendText = await fetchTrends()
      .then(formatTrendsForPrompt)
      .catch(() => "");

    const client = new Anthropic();
    const res = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 512,
      system: STRATEGY_SYSTEM,
      messages: [{ role: "user", content: buildStrategyUser(topic, trendText) }],
    });

    const raw = res.content.find((b) => b.type === "text")?.text ?? "{}";
    const cleaned = raw.replace(/```json?\n?|\n?```/g, "").trim();
    const strategy = JSON.parse(cleaned);

    return NextResponse.json(strategy);
  } catch (e) {
    console.error("[/api/workflow/strategy]", e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
