import type { ReactNode } from "react";

export default function Header({
  title,
  actions,
}: {
  title: string;
  actions?: ReactNode;
}) {
  return (
    <header
      className="sticky top-0 z-10 flex shrink-0 items-center justify-between border-b border-[var(--panel-border)] bg-page/80 px-6 backdrop-blur"
      style={{ height: "var(--header-height)" }}
    >
      <h1 className="text-[15px] font-bold text-[var(--text-primary)]">
        {title}
      </h1>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </header>
  );
}
