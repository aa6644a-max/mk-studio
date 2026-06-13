"use client";

import { useState } from "react";
import Header from "@/components/header";
import Gallery from "./gallery";
import ThumbnailMaker from "./thumbnail-maker";

type Tab = "gallery" | "thumbnail";

export default function ImagesView() {
  const [tab, setTab] = useState<Tab>("gallery");

  return (
    <>
      <Header
        title="이미지 작업실"
        actions={
          <div className="flex gap-1">
            {(
              [
                ["gallery", "갤러리"],
                ["thumbnail", "썸네일 제작기"],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                onClick={() => setTab(k)}
                className={`rounded-lg px-3.5 py-1.5 text-sm font-semibold ${
                  tab === k
                    ? "bg-[var(--accent)] text-white"
                    : "bg-panel text-[var(--text-secondary)]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        }
      />
      <div className="p-6">
        {tab === "gallery" ? <Gallery /> : <ThumbnailMaker />}
      </div>
    </>
  );
}
