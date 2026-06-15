/**
 * Naver DataLab 검색어 트렌드 API 클라이언트.
 * MK LINK 관련 키워드 트렌드를 분석해 마케팅 브리핑에 활용.
 */

export interface TrendResult {
  groupName: string;
  keywords: string[];
  trend: "up" | "down" | "stable";
  latestRatio: number;
  changePercent: number;
}

const KEYWORD_GROUPS = [
  {
    groupName: "대구 영화·독립영화",
    keywords: ["대구 영화", "대구 독립영화", "대구 영화제"],
  },
  {
    groupName: "대구 문화·행사",
    keywords: ["대구 문화", "대구 전시", "대구 공연", "대구 축제"],
  },
  {
    groupName: "대구 모임·커뮤니티",
    keywords: ["대구 모임", "대구 소모임", "대구 동호회", "대구 커뮤니티"],
  },
  {
    groupName: "대구 청년·크리에이터",
    keywords: ["대구 청년", "대구 크리에이터", "대구 작가"],
  },
  {
    groupName: "로컬 네트워킹",
    keywords: ["로컬 커뮤니티", "지역 문화", "동네 모임", "로컬 씬"],
  },
];

function getDateRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 28); // 최근 4주

  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { startDate: fmt(start), endDate: fmt(end) };
}

function calcTrend(data: { period: string; ratio: number }[]): {
  trend: "up" | "down" | "stable";
  latestRatio: number;
  changePercent: number;
} {
  if (data.length < 2) {
    return { trend: "stable", latestRatio: data[0]?.ratio ?? 0, changePercent: 0 };
  }
  const latest = data[data.length - 1].ratio;
  const prev = data[0].ratio;
  const changePercent = prev === 0 ? 0 : Math.round(((latest - prev) / prev) * 100);
  const trend =
    changePercent >= 10 ? "up" : changePercent <= -10 ? "down" : "stable";
  return { trend, latestRatio: Math.round(latest), changePercent };
}

export async function fetchTrends(): Promise<TrendResult[]> {
  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("NAVER_CLIENT_ID 또는 NAVER_CLIENT_SECRET 미설정");
  }

  const { startDate, endDate } = getDateRange();

  const body = {
    startDate,
    endDate,
    timeUnit: "week",
    keywordGroups: KEYWORD_GROUPS,
    device: "",
    ages: [],
    gender: "",
  };

  const res = await fetch("https://openapi.naver.com/v1/datalab/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Naver-Client-Id": clientId,
      "X-Naver-Client-Secret": clientSecret,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const msg = await res.text();
    throw new Error(`DataLab API 오류 ${res.status}: ${msg}`);
  }

  const json = (await res.json()) as {
    results: {
      title: string;
      keywords: string[];
      data: { period: string; ratio: number }[];
    }[];
  };

  return json.results.map((r, i) => {
    const { trend, latestRatio, changePercent } = calcTrend(r.data);
    return {
      groupName: KEYWORD_GROUPS[i]?.groupName ?? r.title,
      keywords: r.keywords,
      trend,
      latestRatio,
      changePercent,
    };
  });
}

export function formatTrendsForPrompt(trends: TrendResult[]): string {
  return trends
    .map((t) => {
      const arrow = t.trend === "up" ? "↑" : t.trend === "down" ? "↓" : "→";
      return `- ${t.groupName}: 검색량 ${t.latestRatio}/100, ${arrow} ${t.changePercent > 0 ? "+" : ""}${t.changePercent}% (최근 4주)`;
    })
    .join("\n");
}
