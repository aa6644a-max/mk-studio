import { fetchTrendsForGroups, type KeywordGroup } from "@/lib/naver-datalab";

export async function POST(req: Request) {
  let groups: KeywordGroup[];
  try {
    const body = (await req.json()) as { groups?: KeywordGroup[] };
    groups = body.groups ?? [];
  } catch {
    return Response.json({ error: "잘못된 요청 본문" }, { status: 400 });
  }

  if (groups.length === 0) {
    return Response.json({ trends: [] });
  }

  try {
    const trends = await fetchTrendsForGroups(groups);
    return Response.json({ trends });
  } catch (err) {
    const message = err instanceof Error ? err.message : "트렌드 조회 실패";
    return Response.json({ error: message }, { status: 500 });
  }
}
