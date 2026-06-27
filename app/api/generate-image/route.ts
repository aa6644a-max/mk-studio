import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

// Replicate에서 실제 모델 ID 확인 후 교체 필요
// 실사: replicate.com/lucataco/realistic-vision-v5.1 → Versions 탭 → 최신 해시
// 애니: replicate.com/cjwbw/anything-v4.0 → Versions 탭 → 최신 해시
const MODELS: Record<string, string> = {
  realistic: "lucataco/realistic-vision-v5.1:2c8e954decbf70b7607a4414e5785ef9e4de4b8c51d50fb8b8b349160e0ef6bb",
  anime: "aisha-ai-official/wai-nsfw-illustrious-v12:0fc0fa9885b284901a6f9c0b4d67701fd7647d157b88371427d63f8089ce140e",
};

export async function POST(req: NextRequest) {
  const { prompt, model, ratio } = await req.json();

  if (!prompt || !model) {
    return NextResponse.json({ error: "prompt and model required" }, { status: 400 });
  }

  const RATIO_MAP: Record<string, { width: number; height: number }> = {
    portrait:  { width: 512, height: 768 },
    square:    { width: 512, height: 512 },
    landscape: { width: 768, height: 512 },
  };
  const { width, height } = RATIO_MAP[ratio] ?? RATIO_MAP.portrait;

  const modelId = MODELS[model] ?? MODELS.realistic;

  try {
    const output = await replicate.run(modelId as `${string}/${string}`, {
      input: {
        prompt,
        negative_prompt: "bad quality, blurry, watermark, deformed",
        width,
        height,
        steps: 30,
        cfg_scale: 7.5,
      },
    });

    const first = Array.isArray(output) ? output[0] : output;
    const urlObj = typeof (first as { url?: () => unknown }).url === "function"
      ? (first as { url: () => unknown }).url()
      : first;
    const imageUrl = urlObj instanceof URL ? urlObj.href : String(urlObj);
    return NextResponse.json({ url: imageUrl });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "생성 실패";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
