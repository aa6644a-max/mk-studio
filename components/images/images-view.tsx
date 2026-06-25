"use client";

import Header from "@/components/header";

export default function ImagesView() {
  return (
    <div className="flex h-full flex-col">
      <Header title="카드뉴스 제작소" />
      <iframe
        src="/studio/MK_STUDIO.html"
        className="flex-1 w-full border-0"
        title="MK STUDIO 카드뉴스 제작소"
        allow="clipboard-write"
      />
    </div>
  );
}
