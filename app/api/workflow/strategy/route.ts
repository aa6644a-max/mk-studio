import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { formatTmdbDetailsText, type TmdbSelectionRef } from "@/lib/tmdb";
import { getProfile } from "@/lib/google-sheets";
import { groupOf, buildProfileInjection } from "@/lib/prompts/profile";

export const maxDuration = 60;

type TmdbSel = TmdbSelectionRef;

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
        enum: ["맛집카페", "일상기록", "여행나들이", "전시문화", "제품리뷰"],
        description: "postType이 photo일 때만 설정. 사용자가 직접 고른 카테고리가 제공되면 그것을 그대로 사용. 없으면 사진·주제로 분류: 음식/카페/식당→맛집카페, 일기/소소한기록→일상기록, 여행/나들이/명소→여행나들이, 전시/공연/축제/박물관→전시문화, 구매한 제품/사용기/언박싱→제품리뷰. photo가 아니면 생략",
      },
      hook: {
        type: "string",
        description: "영화 타입(review/preview/curation/binge)일 때만 설정. 제공된 작품 데이터(줄거리·장르·감독)를 근거로 이 포스팅만의 후킹 한 줄. 단일 작품=이 작품이 독자를 끌어당기는 단 하나의 지점, 다중·테마=이 리스트를 묶는 매력. 일반론 금지, 반드시 이 작품(들)에만 해당하는 구체적 한 줄",
      },
      watchPoints: {
        type: "array",
        items: { type: "string" },
        description: "영화 타입일 때만 설정. 관전 포인트 후보 2~3개. 단일 작품=이 작품에서 주목할 지점(연출·서사·연기·세계관 등 작품 고유), 다중·테마=묶음 관점 또는 작품별 핵심. TMDB 줄거리·장르에서 도출, 뻔한 표현 금지",
      },
      differentiator: {
        type: "string",
        description: "영화 타입일 때만 설정. 차별화 각도 한 줄. 단일 작품=흔한 리뷰나 비슷한 장르 작품과 다르게 이 글이 잡을 관점, 다중·테마=이 큐레이션만의 관점. 어떤 영화든 통하는 일반 각도 금지",
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

photoCategory: postType이 photo일 때만 반드시 설정. 사용자가 직접 고른 카테고리가 있으면 그대로 사용. 없으면 사진·캡션·주제로 분류: 음식/카페/식당→맛집카페, 개인 일상/소소한 기록→일상기록, 여행/나들이/명소 방문→여행나들이, 전시/공연/축제/박물관/문화행사→전시문화, 구매·사용한 제품 후기/언박싱→제품리뷰

🎬 영화 타입(review/preview/curation/binge) 차별화 전략 — 반드시 준수:
- [작품 데이터]가 제공되면 그 줄거리·장르·감독·출연을 근거로 hook/watchPoints/differentiator를 채운다. 작품 데이터 없이는 절대 일반론으로 채우지 말 것.
- 핵심 원칙: "어떤 영화에 갖다 붙여도 말이 되는 문장"은 실패다. 이 작품(들)의 구체적 내용에서만 나올 수 있는 각도를 잡아라.
- 나쁜 예(금지): hook="감동적인 스토리와 뛰어난 연출", watchPoints=["배우의 열연","화려한 영상미"]
- 좋은 예: 작품의 실제 설정·테마·인물 관계에서 끌어낸 구체적 문장
- 단일 작품(review/binge)은 그 작품 자체에, 다중·테마(curation/preview)는 묶음의 관점에 초점을 맞춘다.`;

export async function POST(req: Request) {
  try {
    const {
      topic,
      selectedType,
      pdfText,
      imageInfo,
      tmdbSelections,
      seed,
      photoCategory,
    } = (await req.json()) as {
      topic?: string;
      selectedType?: string;
      pdfText?: string;
      imageInfo?: string;
      tmdbSelections?: TmdbSel[]; // 영화 타입: 선택된 작품 (서버에서 TMDB 상세 조회)
      seed?: string; // 사용자가 직접 쓴 감상평 — hook/watchPoints/differentiator 추출 근거
      photoCategory?: string; // 사진 타입: 사용자가 직접 고른 카테고리 (AI 자동분류 대체)
    };

    const tmdbData = tmdbSelections?.length ? await formatTmdbDetailsText(tmdbSelections).catch(() => "") : "";
    const seedText = seed?.trim() ?? "";

    let userContent = "";
    if (tmdbData) {
      const seedBlock = seedText
        ? `\n\n[사용자의 실제 감상평 — 전략의 핵심 근거]\n${seedText.slice(0, 3000)}\n\n🎯 감상평이 제공되었다. hook·watchPoints·differentiator는 AI 상상이 아니라 위 [사용자의 실제 감상평]에서 직접 도출하라. 감상평이 짚은 지점·감정·관점을 전략 각도로 승격시키고, 감상평에 없는 일반론으로 채우지 마라. keywords·target만 [작품 데이터]에서 뽑는다.`
        : "";
      userContent = `사용자가 선택한 포스팅 타입: ${selectedType ?? "review"}\n포스팅 주제/테마: "${topic ?? ""}"\n\n[작품 데이터]\n${tmdbData.slice(0, 4000)}${seedBlock}\n\n🚨 필수: 이것은 영화 타입이므로 create_strategy 호출 시 hook, watchPoints(2~3개 배열), differentiator 세 필드를 반드시 모두 포함하라. ${seedText ? "감상평 기반으로" : "위 [작품 데이터]의 실제 줄거리·장르·인물에서만"} 도출되는 구체적 내용으로 채우고, 어떤 영화에나 해당될 일반론(예: "감동적 스토리", "뛰어난 연출")은 절대 금지.`;
    } else if (pdfText) {
      userContent = `사용자가 선택한 포스팅 타입: ${selectedType ?? "local"}\n\nPDF 내용 (주제 자동 추출 필요):\n${pdfText.slice(0, 3000)}`;
    } else if (imageInfo) {
      const catLine = photoCategory ? `\n사용자가 직접 고른 카테고리: ${photoCategory} (이 카테고리를 photoCategory로 그대로 사용)` : "";
      const topicLine = topic ? `\n포스팅 주제: "${topic}"` : "";
      userContent = `사용자가 선택한 포스팅 타입: ${selectedType ?? "photo"}${catLine}${topicLine}\n\n업로드된 사진 정보:\n${imageInfo}`;
    } else {
      userContent = `사용자가 선택한 포스팅 타입: ${selectedType ?? "review"}\n포스팅 주제: "${topic}"`;
    }

    // MK 프로필 주입 — 누적 취향이 keywords/target/angle/hook에 반영되도록
    const profile = await getProfile(groupOf(selectedType ?? "review")).catch(() => null);
    userContent += buildProfileInjection(profile);

    const client = new Anthropic();
    const res = await client.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 1200,
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
    // 사진 타입: 사용자가 직접 고른 카테고리를 AI 자동분류보다 우선 적용
    if (selectedType === "photo" && photoCategory) {
      input.photoCategory = photoCategory;
    }

    return NextResponse.json(input);
  } catch (e) {
    console.error("[/api/workflow/strategy]", e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
