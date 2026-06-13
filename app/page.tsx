import Link from "next/link";
import Header from "@/components/header";

export default function HomePage() {
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
      <div className="p-6">
        <div className="panel p-8 text-[var(--text-secondary)]">
          홈 대시보드 — 박스오피스 · 통계 · 최근 리뷰 (issue #3)
        </div>
      </div>
    </>
  );
}
