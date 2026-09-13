import type { NextRequest } from "next/server";
import { checkOrigin, errorResponse, json, owner } from "@/lib/writing/http";
import { WritingError } from "@/lib/writing/types";

export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(req: NextRequest) {
  try {
    checkOrigin(req); owner(req);
    if (Number(req.headers.get("content-length") || 0) > 11 * 1024 * 1024) throw new WritingError("문서는 10MB 이하로 첨부해주세요.", 413);
    const form = await req.formData(), file = form.get("file");
    if (!(file instanceof File) || file.size > 10 * 1024 * 1024) throw new WritingError("10MB 이하 PDF·텍스트 파일을 첨부해주세요.");
    let text: string;
    if (/\.pdf$/i.test(file.name)) {
      const buffer = Buffer.from(await file.arrayBuffer());
      if (buffer.subarray(0, 5).toString() !== "%PDF-") throw new WritingError("PDF 파일 형식을 확인해주세요.");
      const { PDFParse } = await import("pdf-parse");
      const parser = new PDFParse({ data: buffer });
      try { text = (await parser.getText()).text; } finally { await parser.destroy(); }
    } else if (/\.(txt|md)$/i.test(file.name)) text = await file.text();
    else throw new WritingError("PDF, TXT, Markdown 문서를 지원합니다.");
    if (!text.trim()) throw new WritingError("텍스트를 추출하지 못했습니다. 필요한 내용을 직접 붙여넣어주세요.");
    if (text.length > 40000) throw new WritingError("추출된 문서가 4만 자를 넘습니다. 필요한 부분을 나누어 첨부해주세요.");
    return json({ name: file.name, text });
  } catch (e) { return errorResponse(e); }
}
