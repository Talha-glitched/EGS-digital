import { cn } from './primitives';

export function SplitPaneLayout({ children, className = '' }) {
  return (
    <div className={cn('crm-split-pane-layout flex h-[calc(100vh-64px)] w-full overflow-hidden bg-[var(--color-canvas)]', className)}>
      {children}
    </div>
  );
}

export function SplitPaneList({ children, className = '' }) {
  return (
    <aside className={cn('crm-split-pane-list flex w-[320px] shrink-0 flex-col border-r border-[var(--color-line)] bg-white overflow-hidden', className)}>
      {children}
    </aside>
  );
}

export function SplitPaneReader({ children, className = '' }) {
  return (
    <main className={cn('crm-split-pane-reader flex min-w-[680px] flex-1 flex-col bg-white overflow-hidden relative', className)}>
      {children}
    </main>
  );
}

export function SplitPaneHeader({ title, subtitle, badge, actions, className = '' }) {
  return (
    <header className={cn('flex h-14 shrink-0 items-center justify-between border-b border-[var(--color-line)] px-5 bg-white/90 backdrop-blur-sm', className)}>
      <div className="flex items-center gap-3 min-w-0">
        <div>
          {title && <h2 className="text-base font-bold tracking-tight text-[var(--color-ink)] truncate">{title}</h2>}
          {subtitle && <p className="text-xs text-[var(--color-ink-muted)] truncate">{subtitle}</p>}
        </div>
        {badge}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </header>
  );
}
