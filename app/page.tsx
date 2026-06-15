import Link from "next/link";
import Header from "@/components/header";
import StatCard from "@/components/dashboard/stat-card";
import { getRssLatestPosts, type BlogPost } from "@/lib/rss-client";
import { getBoxOffice } from "@/lib/kobis";
import { posterColor } from "@/lib/colors";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [rssPosts, boxoffice] = await Promise.all([
    getRssLatestPosts("shock552", 5).catch(() => [] as BlogPost[]),
    getBoxOffice(5).catch(() => []),
  ]);

  const today = new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(new Date());

  const ym = new Date().toISOString().slice(0, 7);
  const thisMonthCount = rssPosts.filter((p) => p.pubDate.startsWith(ym)).length;

  return (
    <>
      <Header
        title="홈"
        actions={
          <Link
            href="/write"
            className="rounded-lg bg-[var(--accent)] px-3.5 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            새 포스팅
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

        {/* 통계 */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <StatCard label="RSS 최신 글" value={rssPosts.length} suffix="편" />
          <StatCard label="이번 달 포스팅" value={thisMonthCount} suffix="편" />
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

          {/* 최근 블로그 포스팅 (RSS) */}
          <section>
            <h3 className="mb-3 font-bold text-[var(--text-primary)]">
              내 블로그 최근 포스팅
              <span className="ml-2 text-xs font-normal text-[var(--text-secondary)]">
                Naver 기준
              </span>
            </h3>
            {rssPosts.length === 0 ? (
              <div className="panel p-8 text-sm text-[var(--text-secondary)]">
                RSS 로드 실패 또는 포스팅 없음
              </div>
            ) : (
              <ul className="space-y-2">
                {rssPosts.map((p, i) => (
                  <li key={i}>
                    <a
                      href={p.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="panel flex items-center gap-3 p-3 hover:border-[var(--accent)] transition-colors"
                    >
                      {p.thumbnail ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={p.thumbnail}
                          alt=""
                          className="h-12 w-12 shrink-0 rounded object-cover"
                        />
                      ) : (
                        <div
                          className="flex h-12 w-12 shrink-0 items-center justify-center rounded text-xl"
                          style={{ background: posterColor(p.title) }}
                        >
                          ✍️
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-bold text-[var(--text-primary)]">
                          {p.title}
                        </div>
                        <div className="mt-0.5 line-clamp-1 text-xs text-[var(--text-secondary)]">
                          {p.excerpt}
                        </div>
                      </div>
                      <span className="shrink-0 text-xs text-[var(--text-secondary)]">
                        {p.pubDate}
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
