import Link from "next/link";
import Header from "@/components/header";
import TrendDashboard from "@/components/dashboard/trend-dashboard";

export const dynamic = "force-dynamic";

const QUICK_LINKS = [
  { href: "/write", label: "리뷰·포스팅 작성", desc: "영화·로컬·PDF 글쓰기", icon: "✏️" },
  { href: "/images", label: "이미지 작업실", desc: "썸네일·갤러리", icon: "🖼️" },
  { href: "/marketing", label: "마케팅 전략", desc: "키워드·트렌드 분석", icon: "📣" },
  { href: "/partnerships/class101", label: "클래스101 파트너스", desc: "제휴 콘텐츠", icon: "📦" },
];

export default function HomePage() {
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

        <TrendDashboard />
      </div>
    </>
  );
}
