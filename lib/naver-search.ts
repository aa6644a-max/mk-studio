/**
 * Naver 뉴스 검색 API. 에세이(GV 후기·행사 참석기 등) 작성 시 관련 작품·행사의
 * 보도자료/뉴스를 조사 재료로 수집 — DataLab과 동일한 NAVER_CLIENT_ID/SECRET 사용
 * (Naver 개발자센터 애플리케이션에 "검색" API 제품이 함께 등록돼 있어야 함).
 */

export type NewsResult = {
  title: string;
  link: string;
  description: string;
  pubDate: string;
};

function stripTags(s: string): string {
  return s
    .replace(/<\/?b>/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

export function isNaverSearchConfigured(): boolean {
  return Boolean(process.env.NAVER_CLIENT_ID && process.env.NAVER_CLIENT_SECRET);
}

/** 뉴스 검색 (관련성순 상위 N개). 키 없거나 실패 시 빈 배열. */
export async function searchNews(query: string, display = 5): Promise<NewsResult[]> {
  const q = query.trim();
  if (!q) return [];

  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;
  if (!clientId || !clientSecret) return [];

  const usp = new URLSearchParams({ query: q, display: String(display), sort: "sim" });
  const res = await fetch(`https://openapi.naver.com/v1/search/news.json?${usp.toString()}`, {
    headers: {
      "X-Naver-Client-Id": clientId,
      "X-Naver-Client-Secret": clientSecret,
    },
    next: { revalidate: 3600 },
  });
  if (!res.ok) return [];

  const data = (await res.json()) as {
    items?: { title: string; link: string; description: string; pubDate: string }[];
  };
  return (data.items ?? []).map((it) => ({
    title: stripTags(it.title),
    link: it.link,
    description: stripTags(it.description),
    pubDate: it.pubDate ?? "",
  }));
}

/** 프롬프트 삽입용 텍스트 포맷. */
export function formatNewsForPrompt(results: NewsResult[]): string {
  if (!results.length) return "";
  return results
    .map((r, i) => `${i + 1}. ${r.title}${r.pubDate ? ` (${r.pubDate.slice(0, 16)})` : ""}\n${r.description}`)
    .join("\n\n");
}
