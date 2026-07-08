import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

export const maxDuration = 120;

const MODEL = "claude-sonnet-5";

const TONE_GUIDE: Record<string, string> = {
  emotional: "감성적이고 여운이 남는 톤. 짧은 문장, 서정적 표현. 이모지 절제해서 1~2개.",
  informative: "정보 전달 중심. 작품/장면의 핵심 포인트를 명확하고 담백하게. 과장 없이.",
  punchy: "짧고 힙하게. 위트 있고 밈 감각. 문장 짧게, 임팩트 있게.",
};

type MediaType = "image/jpeg" | "image/png" | "image/webp" | "image/gif";

function parseDataUrl(u: string): { mt: MediaType; data: string } | null {
  const m = /^data:(image\/(?:jpeg|png|webp|gif));base64,(.+)$/.exec(u);
  if (!m) return null;
  return { mt: m[1] as MediaType, data: m[2] };
}

export async function POST(req: Request) {
  try {
    const { images, hint, tone } = (await req.json()) as {
      images: string[];
      hint?: string;
      tone?: string;
    };

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({
        caption:
          "(데모 출력 — ANTHROPIC_API_KEY 미설정. 실제 생성은 키 설정 후 동작합니다.)\n\n오늘의 한 장 🎬\n\n#영화 #영화추천 #무비스타그램",
      });
    }

    const imgs = (images ?? []).slice(0, 6).map(parseDataUrl).filter(Boolean) as {
      mt: MediaType;
      data: string;
    }[];
    if (!imgs.length) {
      return NextResponse.json({ error: "이미지가 없습니다." }, { status: 400 });
    }

    const toneGuide = TONE_GUIDE[tone ?? "emotional"] ?? TONE_GUIDE.emotional;
    const system = [
      "너는 인스타그램 캡션을 쓰는 한국어 카피라이터다.",
      "여러 장의 이미지는 하나의 캐러셀(넘겨보는 한 게시물)이다. 전체를 아우르는 캡션 하나만 작성한다.",
      "규칙:",
      "- 첫 줄은 시선을 끄는 후킹 문장.",
      "- 본문은 2~5줄, 줄바꿈으로 읽기 좋게.",
      "- 마지막 줄에 해시태그 5~10개(한국어+필요시 영어), 관련성 높게.",
      "- 이미지에 실제로 보이는 것에 근거해서 쓴다. 없는 사실을 지어내지 않는다.",
      "- 캡션 텍스트만 출력한다. 설명이나 머리말 없이.",
    ].join("\n");

    const userText = [
      hint?.trim() ? `참고 힌트(제목/키워드/원하는 내용): ${hint.trim()}` : "참고 힌트: 없음",
      `톤: ${toneGuide}`,
      "위 이미지들에 어울리는 인스타 캡션을 작성해줘.",
    ].join("\n");

    const client = new Anthropic();
    const content = [
      ...imgs.map((i) => ({
        type: "image" as const,
        source: { type: "base64" as const, media_type: i.mt, data: i.data },
      })),
      { type: "text" as const, text: userText },
    ];

    const res = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system,
      messages: [{ role: "user", content }],
    });
    const block = res.content.find((b) => b.type === "text");
    const caption = block && block.type === "text" ? block.text.trim() : "";
    return NextResponse.json({ caption });
  } catch (e) {
    console.error("[/api/insta-caption]", e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
