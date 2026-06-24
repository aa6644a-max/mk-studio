import Link from "next/link";
import Header from "@/components/header";
import { getRssLatestPosts, type BlogPost } from "@/lib/rss-client";
import { getBoxOffice } from "@/lib/kobis";
import { posterColor } from "@/lib/colors";

export const dynamic = "force-dynamic";

const QUICK_LINKS = [
  { href: "/write", label: "리뷰·포스팅 작성", desc: "영화·로컬·PDF 글쓰기", icon: "✏️" },
  { href: "/images", label: "이미지 작업실", desc: "썸네일·갤러리", icon: "🖼️" },
  { href: "/marketing", label: "마케팅 전략", desc: "키워드·트렌드 분석", icon: "📣" },
  { href: "/partnerships/class101", label: "클래스101 파트너스", desc: "제휴 콘텐츠", icon: "📦" },
];

export default async function HomePage() {
  const [rssPosts, boxoffice] = await Promise.all([
    getRssLatestPosts("shock552", 6).catch(() => [] as BlogPost[]),
    getBoxOffice(5).catch(() => []),
  ]);

  return (
    <>
      <Header title="홈" />

      {/* 히어로 */}
      <div className="border-b border-[var(--panel-border)] bg-gradient-to-br from-[var(--accent)]/10 to-transparent px-6 py-12">
        <div className="mx-auto max-w-3xl text-center">
          <div className="text-xs font-bold tracking-[0.3em] text-[var(--accent)]">
            MK STUDIO
          </div>
          <h1 className="mt-3 text-3xl font-extrabold text-[var(--text-primary)] sm:text-4xl">
            AI 블로그 포스팅 스튜디오
          </h1>
          <p className="mt-3 text-sm text-[var(--text-secondary)] sm:text-base">
            주제만 던지면 전략 수립 → 인터뷰 → 완성된 포스팅까지. MK의 문체 그대로.
          </p>
          <div className="mt-7 flex justify-center">
            <Link
              href="/write"
              className="rounded-xl bg-[var(--accent)] px-7 py-3.5 text-base font-bold text-white shadow-lg shadow-[var(--accent)]/20 transition hover:opacity-90"
            >
              새 포스팅 쓰기 →
            </Link>
          </div>
        </div>
      </div>

      <div className="space-y-8 p-6">
        {/* 빠른 이동 */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {QUICK_LINKS.map((q) => (
            <Link
              key={q.href}
              href={q.href}
              className="panel flex flex-col gap-1 p-4 transition-colors hover:border-[var(--accent)]"
            >
              <span className="text-2xl">{q.icon}</span>
              <span className="mt-1 text-sm font-bold text-[var(--text-primary)]">
                {q.label}
              </span>
              <span className="text-xs text-[var(--text-secondary)]">{q.desc}</span>
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* 최근 블로그 포스팅 (RSS) */}
          <section>
            <h3 className="mb-3 font-bold text-[var(--text-primary)]">
              내 블로그 최근 글
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
                      className="panel flex items-center gap-3 p-3 transition-colors hover:border-[var(--accent)]"
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

          {/* 박스오피스 */}
          <section>
            <h3 className="mb-3 font-bold text-[var(--text-primary)]">
              박스오피스 TOP 5{" "}
              <span className="text-xs font-normal text-[var(--text-secondary)]">
                (전일 기준)
              </span>
            </h3>
            <div className="panel p-5">
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
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
