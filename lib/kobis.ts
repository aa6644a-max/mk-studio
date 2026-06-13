/**
 * KOBIS 박스오피스 (전일 기준 일별 TOP). KOBIS_API_KEY 사용.
 * 키 없으면 mock 폴백.
 */

export type BoxOfficeMovie = {
  rank: string;
  movieNm: string;
  audiAcc: string; // 누적 관객수
  openDt: string;
};

const MOCK_BOXOFFICE: BoxOfficeMovie[] = [
  { rank: "1", movieNm: "듄: 파트 2", audiAcc: "1820000", openDt: "2026-02-28" },
  { rank: "2", movieNm: "추락의 해부", audiAcc: "540000", openDt: "2026-05-31" },
  { rank: "3", movieNm: "가여운 것들", audiAcc: "430000", openDt: "2026-03-06" },
  { rank: "4", movieNm: "오펜하이머", audiAcc: "3230000", openDt: "2025-08-15" },
  { rank: "5", movieNm: "패스트 라이브즈", audiAcc: "310000", openDt: "2026-03-06" },
];

export function isKobisConfigured(): boolean {
  return Boolean(process.env.KOBIS_API_KEY);
}

function yesterdayYmd(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`;
}

export async function getBoxOffice(n = 5): Promise<BoxOfficeMovie[]> {
  const key = process.env.KOBIS_API_KEY;
  if (!key) return MOCK_BOXOFFICE.slice(0, n);

  const url = `http://www.kobis.or.kr/kobisopenapi/webservice/rest/boxoffice/searchDailyBoxOfficeList.json?key=${key}&targetDt=${yesterdayYmd()}`;
  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`KOBIS 실패: ${res.status}`);
  const data = (await res.json()) as {
    boxOfficeResult?: { dailyBoxOfficeList?: BoxOfficeMovie[] };
  };
  return (data.boxOfficeResult?.dailyBoxOfficeList ?? []).slice(0, n);
}
