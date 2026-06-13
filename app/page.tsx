import Link from "next/link";
import Header from "@/components/header";
import StatCard from "@/components/dashboard/stat-card";
import RecentReviewCard from "@/components/dashboard/recent-review-card";
import { getRecentPosts, getStats } from "@/lib/google-sheets";
import { getBoxOffice } from "@/lib/kobis";

export const dynamic = "force-dynamic"; // Sheets/KOBIS 실시간 조회

export default async function HomePage() {
  const [stats, recent, boxoffice] = await Promise.all([
    getStats().catch(() => ({ total: 0, thisMonth: 0, publishedRatio: 0 })),
    getRecentPosts(3).catch(() => []),
    getBoxOffice(5).catch(() => []),
  ]);

  const today = new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(new Date());

  return (
    <>
      <Header
        title="홈"
        actions={
          <Link
            href="/write"
            className="rounded-lg bg-[var(--accent)] px-3.5 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            새 리뷰
          </Link>
        }
      />
      <div className="space-y-6 p-6">
        {/* 인사 */}
        <div>
          <h2 className="text-2xl font-extrabold text-[var(--text-primary)]">
            안녕하세요, 평론가 MK 님
          </h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">{today}</p>
        </div>

        {/* 통계 3칸 */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard label="총 리뷰 수" value={stats.total} suffix="편" />
          <StatCard label="이번 달 작성" value={stats.thisMonth} suffix="편" />
          <StatCard label="발행 비율" value={stats.publishedRatio} suffix="%" />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* 박스오피스 */}
          <section className="panel p-5">
            <h3 className="mb-3 font-bold text-[var(--text-primary)]">
              박스오피스 TOP 5{" "}
              <span className="text-xs font-normal text-[var(--text-secondary)]">
                (전일 기준)
              </span>
            </h3>
            <ol className="space-y-2">
              {boxoffice.length === 0 && (
                <li className="text-sm text-[var(--text-secondary)]">
                  데이터 없음
                </li>
              )}
              {boxoffice.map((m) => (
                <li key={m.rank} className="flex items-center gap-3 text-sm">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-[var(--accent)] text-xs font-bold text-white">
                    {m.rank}
                  </span>
                  <span className="flex-1 truncate font-medium">
                    {m.movieNm}
                  </span>
                  <span className="text-xs text-[var(--text-secondary)]">
                    누적 {Number(m.audiAcc).toLocaleString()}명
                  </span>
                </li>
              ))}
            </ol>
          </section>

          {/* 최근 리뷰 */}
          <section>
            <h3 className="mb-3 font-bold text-[var(--text-primary)]">
              최근 리뷰
            </h3>
            {recent.length === 0 ? (
              <div className="panel p-8 text-sm text-[var(--text-secondary)]">
                아직 작성한 리뷰가 없습니다.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                {recent.map((p) => (
                  <RecentReviewCard key={p.timestamp} post={p} />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
