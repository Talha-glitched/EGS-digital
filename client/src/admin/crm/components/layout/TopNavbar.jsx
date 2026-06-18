import { Bell } from 'lucide-react';

export default function TopNavbar({ title, subtitle }) {
  return (
    <header className="sticky top-0 z-20 border-b border-[var(--color-line)] bg-white/85 backdrop-blur-md">
      <div className="flex h-16 items-center justify-between gap-4 px-5 lg:px-8">
        <div className="min-w-0">
          <h2 className="truncate text-[15px] font-semibold tracking-tight text-[var(--color-ink)]">{title}</h2>
          {subtitle && <p className="truncate text-[12.5px] text-[var(--color-ink-muted)]">{subtitle}</p>}
        </div>
        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--color-line)] bg-white text-neutral-500 transition hover:bg-neutral-50 hover:text-[var(--color-ink)]"
          aria-label="Notifications"
        >
          <Bell className="h-[17px] w-[17px]" strokeWidth={1.75} />
        </button>
      </div>
    </header>
  );
}
