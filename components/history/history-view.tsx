"use client";

import { useState } from "react";
import Header from "@/components/header";
import HistoryList from "./history-list";

export default function HistoryView() {
  const [query, setQuery] = useState("");

  return (
    <>
      <Header
        title="히스토리"
        actions={
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="제목 검색…"
            className="w-44 rounded-lg border border-[var(--panel-border)] bg-panel px-3 py-1.5 text-sm outline-none focus:border-[var(--accent)]"
          />
        }
      />
      <div className="p-6">
        <HistoryList query={query} />
      </div>
    </>
  );
}
