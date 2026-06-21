import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 60;

const STRATEGY_TOOL: Anthropic.Tool = {
  name: "create_strategy",
  description: "블로그 포스팅 전략을 분석해 구조화된 데이터로 반환",
  input_schema: {
    type: "object" as const,
    properties: {
      postType: {
        type: "string",
        enum: ["review", "preview", "curation", "binge", "photo", "local", "pdf"],
        description: "포스팅 타입",
      },
      keywords: {
        type: "array",
        items: { type: "string" },
        description: "네이버 SEO 키워드 2~3개. 반드시 주제에 언급된 고유명사(영화제목, 지역명 등)를 포함해야 함",
      },
      target: {
        type: "string",
        description: "타겟 독자 (나이대, 관심사, 상황 포함)",
      },
      angle: {
        type: "string",
        description: "콘텐츠 각도 및 구성 방향 (1~2문장)",
      },
      contentType: {
        type: "string",
        enum: ["searchable", "shareable", "both"],
        description: "검색형/공유형 판단",
      },
    },
    required: ["postType", "keywords", "target", "angle", "contentType"],
  },
};

const STRATEGY_SYSTEM = `당신은 한국 블로그 포스팅 전략가입니다.
주어진 포스팅 주제를 분석해 create_strategy 함수를 호출하세요.

postType 판단:
- 주제에 "공고/지원사업/모집/행사/소식/공모" → local
- 주제에 "정주행/몰아보기" + 시리즈명 → binge
- 주제에 "추천목록/큐레이션/모음" → curation
- 주제에 "개봉/기대" + 영화명 → preview
- 주제에 "PDF/요약" → pdf
- 주제에 장소/맛집/카페/여행 → photo
- 영화·드라마 제목 + 리뷰/후기/감상 → review
- 기본값 → review

keywords: 주제에서 고유명사(영화제목, 지역명, 행사명)를 그대로 추출해 검색 키워드 2~3개 생성`;

export async function POST(req: Request) {
  try {
    const { topic } = (await req.json()) as { topic: string };

    const client = new Anthropic();
    const res = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 512,
      system: STRATEGY_SYSTEM,
      tools: [STRATEGY_TOOL],
      tool_choice: { type: "tool", name: "create_strategy" },
      messages: [{ role: "user", content: `포스팅 주제: "${topic}"` }],
    });

    const toolUse = res.content.find((b) => b.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") {
      return NextResponse.json({ error: "tool_use not found" }, { status: 500 });
    }

    return NextResponse.json(toolUse.input);
  } catch (e) {
    console.error("[/api/workflow/strategy]", e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
