import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 300;

/**
 * 블로그 리뷰 전문 → 리뷰 카드뉴스 문구 생성.
 * 본문 3장(헤드라인+발췌) + 엔딩 카드(훅·팔로우 문구) + 인스타 캡션.
 */

const MODEL = "claude-sonnet-5";

type SlidesRequest = {
  movieTitle?: string;
  reviewTitle?: string;
  reviewText?: string;
  triggerKeyword?: string;
};

export type ReviewSlides = {
  slides: { headline: string; quote: string }[];
  ending: { hook: string; followLine: string };
  caption: string;
  dm: { opening: string; button: string; linkMessage: string };
};

function stripFences(text: string): string {
  return text.replace(/^```(?:json)?\s*/m, "").replace(/```\s*$/m, "").trim();
}

export async function POST(req: Request) {
  try {
    const { movieTitle, reviewTitle, reviewText, triggerKeyword } =
      (await req.json()) as SlidesRequest;
    if (!reviewText?.trim()) {
      return NextResponse.json({ error: "리뷰 본문이 비어 있습니다." }, { status: 400 });
    }
    const keyword = triggerKeyword?.trim() || "리뷰";

    const client = new Anthropic();
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: 2500,
      system: `당신은 영화 블로거 MK의 인스타그램 카드뉴스 에디터입니다. MK의 블로그 리뷰 전문에서 카드뉴스 문구를 뽑습니다.

원칙:
- 본문 카드 3장: 리뷰의 핵심 논점 3개를 골라, 각각 headline(카드 상단 큰 글씨, 18자 이내, 호기심 유발)과 quote(리뷰 원문의 문장을 최대한 살려 다듬은 발췌, 2~3문장 90~160자)로.
- quote는 새로 창작하지 말고 원문 표현을 우선 사용. 스포일러 수위는 원문을 따름.
- ending.hook: 엔딩 카드 상단 문구, 25자 이내 (예: "이 리뷰의 전문이 궁금하다면?").
- ending.followLine: 팔로우 유도 한 줄, 30자 이내.
- caption: 인스타 게시글 캡션. 구성 = 🎬 영화제목+한줄 소감 / 빈 줄 / 카드 요약 2~3줄 / 빈 줄 / 💬 "댓글에 '${keyword}' 남기면 DM으로 리뷰 전문 링크를 보내드려요" / 빈 줄 / 해시태그 6~8개(#영화추천 #영화리뷰 포함).
- dm: Manychat 댓글 자동화용 DM 문구 3종.
  - dm.opening: 오프닝 DM. 첫 줄은 인사가 아니라 용건(리뷰 내용 포인트 하나를 살짝 흘려 클릭 유도), 둘째 줄에 "아래 버튼 누르시면 리뷰 전문 링크 보내드려요 👇". 2줄, 이모지 1~2개.
  - dm.button: 버튼명. 행동 동사 포함 12자 이내 (예: "📖 리뷰 전문 받기").
  - dm.linkMessage: 링크와 함께 보낼 한 줄 멘트. 링크 URL은 포함하지 말 것. 팔로우 유도 자연스럽게 (예: "여기요! 재밌게 읽으시고 다른 리뷰도 궁금하면 팔로우해주세요 🎬").
- JSON만 출력: {"slides":[{"headline":"...","quote":"..."},...3개],"ending":{"hook":"...","followLine":"..."},"caption":"...","dm":{"opening":"...","button":"...","linkMessage":"..."}}`,
      messages: [
        {
          role: "user",
          content: `[영화] ${movieTitle ?? ""}\n[리뷰 제목] ${reviewTitle ?? ""}\n[댓글 트리거 키워드] ${keyword}\n\n[리뷰 전문]\n${reviewText.slice(0, 8000)}`,
        },
      ],
    });
    const block = res.content.find((b) => b.type === "text");
    const raw = block && block.type === "text" ? block.text : "";

    let parsed: ReviewSlides;
    try {
      parsed = JSON.parse(stripFences(raw));
    } catch {
      return NextResponse.json({ error: "문구 생성 결과 파싱 실패 — 다시 시도해주세요." }, { status: 502 });
    }
    if (!parsed.slides?.length || !parsed.ending) {
      return NextResponse.json({ error: "문구 생성 결과가 불완전합니다." }, { status: 502 });
    }
    parsed.slides = parsed.slides.slice(0, 3);
    return NextResponse.json(parsed);
  } catch (e) {
    console.error("[/api/card-news/slides]", e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
