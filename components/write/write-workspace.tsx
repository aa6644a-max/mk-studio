"use client";

import { useCallback, useEffect, useState } from "react";
import Header from "@/components/header";
import Wizard from "./wizard";
import { emptyDraft, type PostDraft } from "@/lib/types";
import { consumePendingPoster } from "@/lib/gallery-store";

export default function WriteWorkspace() {
  const [draft, setDraft] = useState<PostDraft>(() => emptyDraft());
  const [busy, setBusy]   = useState(false);
  const [msg, setMsg]     = useState("");

  const patch = useCallback(
    (p: Partial<PostDraft>) => setDraft((d) => ({ ...d, ...p })),
    [],
  );

  // 갤러리에서 인계된 포스터만 적용
  useEffect(() => {
    const poster = consumePendingPoster();
    if (poster) patch({ posterUrl: poster });
  }, [patch]);

  async function handlePublish() {
    setBusy(true);
    setMsg("Claude 생성 중… (1~2분 소요)");
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      if (!res.ok) throw new Error("생성 실패");
      const { html, titles } = await res.json();
      patch({ generatedHtml: html, seoTitles: titles ?? [], status: "published" });
      await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          movieTitle: draft.title || draft.movieTitle || "(제목 없음)",
          postType: draft.postType,
          content: html,
          status: "published",
        }),
      });
      setMsg("발행 완료");
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function handleReset() {
    setDraft(emptyDraft());
    setBusy(false);
    setMsg("");
  }

  return (
    <div className="flex h-screen flex-col">
      <Header title="리뷰 작성" />
      <div className="flex flex-1 overflow-hidden">
        <Wizard
          draft={draft}
          onChange={patch}
          onPublish={handlePublish}
          onReset={handleReset}
          busy={busy}
          msg={msg}
        />
      </div>
    </div>
  );
}
