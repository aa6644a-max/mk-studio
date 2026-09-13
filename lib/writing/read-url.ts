import { lookup } from "node:dns/promises";
import { request as httpsRequest } from "node:https";
import { request as httpRequest } from "node:http";
import { isIP } from "node:net";
import { publicUrl, WritingError } from "./types";
import { htmlToStyleText } from "@/lib/style-text";
import { safeSlice } from "@/lib/prompts/base";

export function isPublicIPv4(ip: string): boolean {
  if (isIP(ip) !== 4) return false;
  const [a, b, c] = ip.split(".").map(Number);
  return !(a === 0 || a === 10 || a === 127 || a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) || (a === 192 && (b === 168 || b === 0 || (b === 88 && c === 99))) ||
    (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) || (a === 203 && b === 0 && c === 113));
}

/** Validate every redirect and pin the validated address to prevent DNS rebinding. */
export async function readPublicPage(raw: string, redirects = 0): Promise<{ url: string; title: string; text: string; truncated: boolean }> {
  if (redirects > 3) throw new WritingError("문서의 주소 이동이 너무 많습니다.");
  const url = new URL(publicUrl(raw));
  const hostname = url.hostname.replace(/^\[|\]$/g, "");
  const addresses = isIP(hostname) ? [hostname] : (await lookup(hostname, { family: 4, all: true })).map(result => result.address);
  if (!addresses.length || addresses.some(ip => !isPublicIPv4(ip))) throw new WritingError("공개 인터넷 문서만 읽을 수 있습니다.");
  const result = await new Promise<{ location?: string; body?: string; type?: string }>((resolve, reject) => {
    const send = url.protocol === "https:" ? httpsRequest : httpRequest;
    const req = send(url, {
      agent: false, family: 4,
      lookup: (_host, _options, callback) => callback(null, addresses[0], 4),
      headers: { "User-Agent": "MKStudio/1.0 (public document reader)", Accept: "text/html,text/plain", "Accept-Encoding": "identity" },
    }, res => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode ?? 0)) { res.resume(); resolve({ location: res.headers.location }); return; }
      if (res.statusCode !== 200) { res.resume(); reject(new WritingError(`원문을 읽지 못했습니다 (HTTP ${res.statusCode}).`)); return; }
      const type = res.headers["content-type"] ?? "";
      if (!/text\/(html|plain)|application\/xhtml\+xml/i.test(type)) { res.resume(); reject(new WritingError("웹 텍스트만 읽을 수 있습니다. PDF는 파일로 첨부해주세요.")); return; }
      const chunks: Buffer[] = []; let size = 0;
      res.on("data", (chunk: Buffer) => {
        size += chunk.length;
        if (size > 1500000) { req.destroy(new WritingError("원문 크기가 너무 큽니다. 필요한 부분을 첨부해주세요.")); return; }
        chunks.push(chunk);
      });
      res.on("error", reject);
      res.on("end", () => resolve({ body: Buffer.concat(chunks).toString("utf8"), type }));
    });
    const timer = setTimeout(() => req.destroy(new WritingError("원문 읽기 시간이 초과됐습니다.")), 12000);
    req.on("close", () => clearTimeout(timer));
    req.on("error", reject); req.end();
  });
  if (result.location) return readPublicPage(new URL(result.location, url).href, redirects + 1);
  if (!result.body) throw new WritingError("읽을 수 있는 원문이 없습니다.");
  const title = htmlToStyleText(result.body.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || url.hostname);
  const main = result.body.match(/<(?:article|main)\b[^>]*>([\s\S]*?)<\/(?:article|main)>/i)?.[1] || result.body;
  const text = result.type?.includes("text/plain") ? main : htmlToStyleText(main.replace(/<(nav|header|footer|noscript)\b[^>]*>[\s\S]*?<\/\1>/gi, ""));
  if (text.trim().length < 120) throw new WritingError("본문을 충분히 읽지 못했습니다. 자료를 직접 첨부해주세요.");
  return { url: url.href, title, text: safeSlice(text, 14000), truncated: text.length > 14000 };
}
