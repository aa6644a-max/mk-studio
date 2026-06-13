"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/lib/nav";

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="hidden md:flex flex-col shrink-0 text-white"
      style={{ width: "var(--sidebar-width)", background: "var(--sidebar-bg)" }}
    >
      {/* 로고 */}
      <div className="flex items-center gap-2 px-5 h-[52px] shrink-0">
        <span className="text-[17px] font-extrabold tracking-tight">
          MK Studio
        </span>
      </div>

      {/* 네비 */}
      <nav className="flex-1 px-3 py-3 space-y-1">
        {NAV_ITEMS.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                active
                  ? "bg-[var(--accent)] text-white font-semibold"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              <span className="text-base leading-none">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* 하단 설정/유저 */}
      <div className="px-3 py-3 border-t border-white/10 space-y-1">
        <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-white/70 hover:bg-white/10 hover:text-white transition-colors">
          <span className="text-base leading-none">⚙️</span>
          설정
        </button>
        <div className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-white/70">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15 text-xs font-bold">
            MK
          </span>
          평론가 MK
        </div>
      </div>
    </aside>
  );
}
