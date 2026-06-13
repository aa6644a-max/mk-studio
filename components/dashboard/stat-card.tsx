export default function StatCard({
  label,
  value,
  suffix,
}: {
  label: string;
  value: string | number;
  suffix?: string;
}) {
  return (
    <div className="panel p-5">
      <div className="text-xs font-semibold text-[var(--text-secondary)]">
        {label}
      </div>
      <div className="mt-2 text-3xl font-extrabold text-[var(--text-primary)]">
        {value}
        {suffix && (
          <span className="ml-1 text-base font-semibold text-[var(--text-secondary)]">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}
