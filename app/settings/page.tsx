import Header from "@/components/header";
import BlogSyncPanel from "@/components/settings/blog-sync-panel";
import { isSheetsConfigured } from "@/lib/google-sheets";
import { isClaudeConfigured } from "@/lib/claude";

export default async function SettingsPage() {
  const sheetsOk = isSheetsConfigured();
  const claudeOk = isClaudeConfigured();

  return (
    <div className="flex h-screen flex-col">
      <Header title="설정" />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-2xl space-y-6">

          {/* 시스템 상태 */}
          <section className="rounded-2xl border border-[var(--panel-border)] bg-white p-5">
            <h2 className="mb-4 text-sm font-bold text-[var(--text-primary)]">시스템 연결 상태</h2>
            <div className="space-y-2">
              <StatusRow
                label="Claude API"
                ok={claudeOk}
                okText="연결됨 (ANTHROPIC_API_KEY)"
                failText="미설정 — 데모 모드로 동작"
              />
              <StatusRow
                label="Google Sheets"
                ok={sheetsOk}
                okText="연결됨 (GOOGLE_CREDENTIALS_JSON)"
                failText="미설정 — 메모리 mock 동작"
              />
            </div>
          </section>

          {/* 블로그 동기화 */}
          <BlogSyncPanel sheetsOk={sheetsOk} />

          {/* 블로그 읽기 로직 설명 */}
          <section className="rounded-2xl border border-[var(--panel-border)] bg-white p-5">
            <h2 className="mb-3 text-sm font-bold text-[var(--text-primary)]">블로그 참조 로직</h2>
            <div className="space-y-3 text-xs text-[var(--text-secondary)] leading-relaxed">
              <p>
                <strong className="text-[var(--text-primary)]">발행 시 자동 참조</strong><br />
                ✦ 발행하기 클릭 시 Sheets에 저장된 최근 글 3편을 Claude에게 참조로 전달합니다. Claude는 이 글들의 문체·구조를 학습해 일관된 MK 스타일을 유지합니다.
              </p>
              <p>
                <strong className="text-[var(--text-primary)]">블로그 동기화 용도</strong><br />
                ✦ 네이버 블로그 RSS에서 원본 글을 가져와 Sheets에 저장합니다. AI가 생성한 글뿐 아니라 직접 쓴 원문도 참조 풀에 포함되어 스타일이 더 풍부해집니다.
              </p>
              <p>
                <strong className="text-[var(--text-primary)]">스크래핑 방법</strong><br />
                ✦ RSS 피드(rss.blog.naver.com)에서 글 목록을 읽고, 모바일 URL(m.blog.naver.com)에서 전체 본문을 추출합니다. 네이버 API 제한 방지를 위해 글 당 1.5초 대기합니다.
              </p>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}

function StatusRow({
  label, ok, okText, failText,
}: {
  label: string; ok: boolean; okText: string; failText: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-[var(--page)] px-3 py-2">
      <span className="text-xs font-semibold text-[var(--text-primary)]">{label}</span>
      <span className={`text-xs ${ok ? "text-emerald-600" : "text-amber-600"}`}>
        {ok ? `✓ ${okText}` : `⚠ ${failText}`}
      </span>
    </div>
  );
}
