"use client";

import { useCallback, useState } from "react";
import Header from "@/components/header";
import MetaPanel from "./meta-panel";
import Editor from "./editor";
import { emptyDraft, type PostDraft } from "@/lib/types";

export default function WriteWorkspace() {
  const [draft, setDraft] = useState<PostDraft>(() => emptyDraft());
  const [busy, setBusy] = useState<null | "save" | "publish">(null);
  const [msg, setMsg] = useState("");

  const patch = useCallback(
    (p: Partial<PostDraft>) => setDraft((d) => ({ ...d, ...p })),
    [],
  );

  async function savePost(status: PostDraft["status"], content: string) {
    const res = await fetch("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        movieTitle: draft.title || draft.movieTitle || "(제목 없음)",
        postType: draft.postType,
        content,
        status,
      }),
    });
    if (!res.ok) throw new Error("저장 실패");
  }

  async function handleSaveDraft() {
    setBusy("save");
    setMsg("");
    try {
      await savePost("draft", draft.generatedHtml || draft.body);
      setMsg("임시저장 완료");
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function handlePublish() {
    setBusy("publish");
    setMsg("Claude 생성 중… (1~2분 소요)");
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      if (!res.ok) throw new Error("생성 실패");
      const { html } = await res.json();
      patch({ generatedHtml: html, status: "published" });
      await savePost("published", html);
      setMsg("발행 완료 — HTML 복사 후 네이버 붙여넣기");
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <Header
        title="리뷰 작성"
        actions={
          <>
            {msg && (
              <span className="mr-2 text-xs text-[var(--text-secondary)]">
                {msg}
              </span>
            )}
            <button
              onClick={handleSaveDraft}
              disabled={busy !== null}
              className="rounded-lg border border-[var(--panel-border)] bg-panel px-3.5 py-2 text-sm font-semibold text-[var(--text-primary)] hover:bg-page disabled:opacity-50"
            >
              {busy === "save" ? "저장 중…" : "임시저장"}
            </button>
            <button
              onClick={handlePublish}
              disabled={busy !== null}
              className="rounded-lg bg-[var(--accent)] px-3.5 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
            >
              {busy === "publish" ? "생성 중…" : "발행하기"}
            </button>
          </>
        }
      />
      <div className="flex flex-col md:flex-row md:h-[calc(100vh-var(--header-height))]">
        <MetaPanel draft={draft} onChange={patch} />
        <Editor draft={draft} onChange={patch} />
      </div>
    </>
  );
}
