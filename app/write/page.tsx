import Header from "@/components/header";

export default function WritePage() {
  return (
    <>
      <Header
        title="리뷰 작성"
        actions={
          <>
            <button className="rounded-lg border border-[var(--panel-border)] bg-panel px-3.5 py-2 text-sm font-semibold text-[var(--text-primary)] hover:bg-page">
              임시저장
            </button>
            <button className="rounded-lg bg-[var(--accent)] px-3.5 py-2 text-sm font-semibold text-white hover:opacity-90">
              발행하기
            </button>
          </>
        }
      />
      <div className="p-6">
        <div className="panel p-8 text-[var(--text-secondary)]">
          리뷰 작성 — 메타패널 + 에디터 (issue #4, #5)
        </div>
      </div>
    </>
  );
}
