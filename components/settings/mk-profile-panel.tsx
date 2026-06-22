"use client";

import { useEffect, useState } from "react";

type Group = "movie" | "photo" | "info";

type Profile = {
  profileText: string;
  quotes: string[];
  updatedAt: string;
};

const GROUPS: { key: Group; label: string; desc: string }[] = [
  { key: "movie", label: "🎬 영화군", desc: "리뷰·프리뷰·큐레이션·정주행 — 취향·평가기준·관점·문체" },
  { key: "photo", label: "📸 사진군", desc: "사진 포스팅 — 장소·공간 취향·묘사 톤" },
  { key: "info", label: "📢 정보군", desc: "로컬소식·PDF — 문체·톤" },
];

export default function MkProfilePanel({ sheetsOk }: { sheetsOk: boolean }) {
  return (
    <section className="rounded-2xl border border-[var(--panel-border)] bg-white p-5">
      <h2 className="mb-1 text-sm font-bold text-[var(--text-primary)]">🧠 MK 프로필 (인터뷰 누적 개인화)</h2>
      <p className="mb-4 text-xs text-[var(--text-secondary)] leading-relaxed">
        포스팅을 저장할 때마다 인터뷰 내용이 그룹별 프로필로 누적됩니다. AI는 전략·인터뷰·생성 단계에서 이 프로필을 참고해 점점 더 MK답게 글을 씁니다.
        {!sheetsOk && " (현재 Google Sheets 미연결 — 메모리 mock, 재시작 시 초기화)"}
      </p>
      <div className="space-y-4">
        {GROUPS.map((g) => (
          <GroupCard key={g.key} group={g.key} label={g.label} desc={g.desc} />
        ))}
      </div>
    </section>
  );
}

function GroupCard({ group, label, desc }: { group: Group; label: string; desc: string }) {
  const [loading, setLoading] = useState(true);
  const [profileText, setProfileText] = useState("");
  const [quotesText, setQuotesText] = useState(""); // 한 줄당 인용구 1개
  const [updatedAt, setUpdatedAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [open, setOpen] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/workflow/profile?group=${group}`);
      const data = await res.json();
      const p: Profile | null = data.profile;
      setProfileText(p?.profileText ?? "");
      setQuotesText((p?.quotes ?? []).join("\n"));
      setUpdatedAt(p?.updatedAt ?? "");
    } catch {
      setMsg("불러오기 실패");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function save() {
    setSaving(true);
    setMsg("");
    try {
      const quotes = quotesText.split("\n").map((q) => q.trim()).filter(Boolean);
      const res = await fetch("/api/workflow/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ set: true, group, profileText, quotes }),
      });
      if (!res.ok) throw new Error();
      setMsg("저장됨 ✓");
      load();
    } catch {
      setMsg("저장 실패");
    } finally {
      setSaving(false);
    }
  }

  async function clear() {
    if (!confirm(`${label} 프로필을 초기화할까요? 되돌릴 수 없습니다.`)) return;
    setSaving(true);
    setMsg("");
    try {
      const res = await fetch("/api/workflow/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clear: true, group }),
      });
      if (!res.ok) throw new Error();
      setProfileText("");
      setQuotesText("");
      setUpdatedAt("");
      setMsg("초기화됨 ✓");
    } catch {
      setMsg("초기화 실패");
    } finally {
      setSaving(false);
    }
  }

  const hasData = !!profileText.trim();

  return (
    <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--page)] p-4">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between text-left"
      >
        <div>
          <span className="text-sm font-semibold text-[var(--text-primary)]">{label}</span>
          <span className="ml-2 text-xs text-[var(--text-secondary)]">
            {loading ? "불러오는 중…" : hasData ? `학습됨${updatedAt ? ` · ${updatedAt.slice(0, 10)}` : ""}` : "아직 학습 데이터 없음"}
          </span>
        </div>
        <span className="text-xs text-[var(--text-secondary)]">{open ? "▲" : "▼"}</span>
      </button>
      <p className="mt-1 text-xs text-[var(--text-secondary)]">{desc}</p>

      {open && (
        <div className="mt-3 space-y-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-[var(--text-primary)]">프로필 요약</label>
            <textarea
              value={profileText}
              onChange={(e) => setProfileText(e.target.value)}
              rows={6}
              placeholder="아직 학습된 내용이 없습니다. 포스팅을 저장하면 자동으로 채워집니다."
              className="w-full resize-y rounded-lg border border-[var(--panel-border)] bg-white p-2 text-xs leading-relaxed text-[var(--text-primary)] outline-none focus:border-blue-400"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-[var(--text-primary)]">대표 말투 표본 (한 줄당 1개)</label>
            <textarea
              value={quotesText}
              onChange={(e) => setQuotesText(e.target.value)}
              rows={4}
              placeholder="MK의 실제 말투가 드러나는 문장들"
              className="w-full resize-y rounded-lg border border-[var(--panel-border)] bg-white p-2 text-xs leading-relaxed text-[var(--text-primary)] outline-none focus:border-blue-400"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={save}
              disabled={saving}
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
            >
              {saving ? "처리 중…" : "저장"}
            </button>
            <button
              onClick={clear}
              disabled={saving || !hasData}
              className="rounded-lg border border-[var(--panel-border)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] disabled:opacity-40"
            >
              초기화
            </button>
            {msg && <span className="text-xs text-emerald-600">{msg}</span>}
          </div>
        </div>
      )}
    </div>
  );
}
