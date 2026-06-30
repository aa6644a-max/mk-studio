"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { NAV_ITEMS } from "@/lib/nav";

export default function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // 라우트 이동 시 닫기
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <>
      {/* 햄버거 버튼 (모바일 전용, 우상단) */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="메뉴 열기"
        className="fixed right-3 top-2 z-40 flex h-9 w-9 items-center justify-center rounded-lg text-white shadow-lg md:hidden"
        style={{ background: "var(--sidebar-bg)" }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {/* 백드롭 */}
      <div
        onClick={() => setOpen(false)}
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity md:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      {/* 드로어 (우측 슬라이드) */}
      <aside
        className={`fixed right-0 top-0 z-50 flex h-full w-64 flex-col text-white shadow-2xl transition-transform duration-200 md:hidden ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        style={{ background: "var(--sidebar-bg)" }}
      >
        <div className="flex h-[52px] items-center justify-between px-5">
          <span className="text-[17px] font-extrabold tracking-tight">MK Studio</span>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="메뉴 닫기"
            className="text-white/60 hover:text-white"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-3">
          {NAV_ITEMS.map((item) => {
            const active =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm transition-colors ${
                  active
                    ? "bg-[var(--accent)] font-semibold text-white"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                <span className="text-base leading-none">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="space-y-1 border-t border-white/10 px-3 py-3">
          <Link
            href="/settings"
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
              pathname.startsWith("/settings")
                ? "bg-[var(--accent)] font-semibold text-white"
                : "text-white/70 hover:bg-white/10 hover:text-white"
            }`}
          >
            <span className="text-base leading-none">⚙️</span>
            설정
          </Link>
        </div>
      </aside>
    </>
  );
}
