import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 60;

const STRATEGY_TOOL: Anthropic.Tool = {
  name: "create_strategy",
  description: "블로그 포스팅 전략을 분석해 구조화된 데이터로 반환",
  input_schema: {
    type: "object" as const,
    properties: {
      topic: {
        type: "string",
        description: "포스팅 주제 (PDF/이미지에서 자동 추출하거나 사용자 입력 그대로)",
      },
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
      photoCategory: {
        type: "string",
        enum: ["맛집카페", "일상기록", "여행나들이", "전시문화"],
        description: "postType이 photo일 때만 설정. 사진 정보·주제로 카테고리 분류. 음식/카페/식당→맛집카페, 일기/소소한기록→일상기록, 여행/나들이/명소→여행나들이, 전시/공연/축제/박물관→전시문화. photo가 아니면 생략",
      },
    },
    required: ["topic", "postType", "keywords", "target", "angle", "contentType"],
  },
};

const STRATEGY_SYSTEM = `당신은 한국 블로그 포스팅 전략가입니다.
주어진 정보를 분석해 create_strategy 함수를 호출하세요.

postType 판단 (selectedType이 제공된 경우 그것을 사용):
- "공고/지원사업/모집/행사/소식/공모" 관련 → local
- "정주행/몰아보기" + 시리즈명 → binge
- "추천목록/큐레이션/모음" → curation
- "개봉/기대" + 영화명 → preview
- "PDF/요약" → pdf
- 장소/맛집/카페/여행/사진 → photo
- 영화·드라마 제목 + 리뷰/후기/감상 → review
- 기본값 → review

topic 추출:
- PDF 텍스트가 제공된 경우: 텍스트에서 핵심 주제를 2~3줄로 요약해 topic 설정
- 이미지 정보가 제공된 경우: 파일명과 캡션에서 장소/주제를 추론해 topic 설정
- 일반 텍스트 주제: 그대로 사용

keywords: 주제에서 고유명사(영화제목, 지역명, 행사명)를 그대로 추출해 검색 키워드 2~3개 생성

photoCategory: postType이 photo일 때만 반드시 설정. 사진 정보·캡션·주제를 보고 4개 중 하나로 분류. (음식/카페/식당→맛집카페, 개인 일상/소소한 기록→일상기록, 여행/나들이/명소 방문→여행나들이, 전시/공연/축제/박물관/문화행사→전시문화)`;

export async function POST(req: Request) {
  try {
    const {
      topic,
      selectedType,
      pdfText,
      imageInfo,
    } = (await req.json()) as {
      topic?: string;
      selectedType?: string;
      pdfText?: string;
      imageInfo?: string;
    };

    let userContent = "";
    if (pdfText) {
      userContent = `사용자가 선택한 포스팅 타입: ${selectedType ?? "local"}\n\nPDF 내용 (주제 자동 추출 필요):\n${pdfText.slice(0, 3000)}`;
    } else if (imageInfo) {
      userContent = `사용자가 선택한 포스팅 타입: ${selectedType ?? "photo"}\n\n업로드된 사진 정보 (장소/주제 추론 필요):\n${imageInfo}`;
    } else {
      userContent = `사용자가 선택한 포스팅 타입: ${selectedType ?? "review"}\n포스팅 주제: "${topic}"`;
    }

    const client = new Anthropic();
    const res = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 512,
      system: STRATEGY_SYSTEM,
      tools: [STRATEGY_TOOL],
      tool_choice: { type: "tool", name: "create_strategy" },
      messages: [{ role: "user", content: userContent }],
    });

    const toolUse = res.content.find((b) => b.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") {
      return NextResponse.json({ error: "tool_use not found" }, { status: 500 });
    }

    // selectedType이 명시된 경우 그것을 우선 적용
    const input = toolUse.input as Record<string, unknown>;
    if (selectedType) {
      input.postType = selectedType;
    }

    return NextResponse.json(input);
  } catch (e) {
    console.error("[/api/workflow/strategy]", e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
