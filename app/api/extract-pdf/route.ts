import { NextResponse } from "next/server";

export const runtime = "nodejs";

// POST multipart (file=PDF) → { text, name }
export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "파일 없음" }, { status: 400 });
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    // pdf-parse v2: PDFParse 클래스. 동적 import (번들 이슈 회피)
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    await parser.destroy();
    return NextResponse.json({ name: file.name, text: result.text });
  } catch (e) {
    console.error("[/api/extract-pdf]", e);
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 },
    );
  }
}
