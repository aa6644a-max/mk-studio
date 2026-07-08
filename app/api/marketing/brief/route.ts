import Anthropic from "@anthropic-ai/sdk";
import { getRssLatestText } from "@/lib/rss-client";
import { fetchTrends, formatTrendsForPrompt } from "@/lib/naver-datalab";
import { MK_LINK_CONTEXT } from "@/lib/mk-link-context";

export const maxDuration = 120;

export interface BriefSuggestion {
  topic: string;
  reason: string;
  trend: "up" | "down" | "stable";
  badge: string;
}

export async function GET() {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: "ANTHROPIC_API_KEY 미설정" }, { status: 500 });
  }

  const today = new Date().toLocaleDateString("ko-KR", {
    year: "numeric", month: "long", day: "numeric", weekday: "long",
  });

  const [rssText, trends] = await Promise.allSettled([
    getRssLatestText("shock552", 10),
    fetchTrends(),
  ]);

  const rss = rssText.status === "fulfilled" ? rssText.value : "RSS 로드 실패";
  const trendData = trends.status === "fulfilled" ? trends.value : [];
  const trendText = trendData.length > 0
    ? formatTrendsForPrompt(trendData)
    : "DataLab 트렌드 로드 실패 (NAVER API 키 확인 필요)";

  const system = `너는 MK LINK 전용 마케팅 브리핑 에이전트야.
아래 데이터를 분석해서 지금 당장 MK LINK가 집중해야 할 마케팅 주제 3개를 추천해.

## 분석 기준
1. 검색 트렌드가 상승 중인 키워드와 블로그 공백을 연결
2. 현재 날짜/계절에 맞는 콘텐츠
3. MK LINK 플랫폼 강점을 살릴 수 있는 주제
4. 최근 블로그에서 다루지 않은 주제 우선

## 출력 형식 (반드시 이 JSON만 출력, 다른 텍스트 없이)
[
  {
    "topic": "마케팅 주제 (구체적인 제목 형태, 20자 이내)",
    "reason": "이 주제를 추천하는 이유 (트렌드 + 블로그 공백 + 계절 근거, 2~3줄)",
    "trend": "up | down | stable",
    "badge": "트렌드 상승 | 콘텐츠 공백 | 시즌 맞춤 | 플랫폼 홍보 중 하나"
  }
]`;

  const user = `오늘 날짜: ${today}

## 네이버 DataLab 검색 트렌드 (최근 4주)
${trendText}

## 최근 블로그 포스팅 (최근 10개)
${rss}

## MK LINK 플랫폼 현황
${MK_LINK_CONTEXT}`;

  const client = new Anthropic();
  const res = await client.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 1024,
    system,
    messages: [{ role: "user", content: user }],
  });

  const block = res.content.find((b) => b.type === "text");
  const raw = block?.type === "text" ? block.text.trim() : "[]";

  try {
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    const suggestions: BriefSuggestion[] = JSON.parse(jsonMatch?.[0] ?? "[]");
    return Response.json({ suggestions, generatedAt: today });
  } catch {
    return Response.json({ error: "파싱 오류", raw }, { status: 500 });
  }
}
