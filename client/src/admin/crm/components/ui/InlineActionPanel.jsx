import { X } from 'lucide-react';
import { cn } from './primitives';

export function InlineActionPanel({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  width = 'w-[420px]',
  className = '',
}) {
  if (!open) return null;

  return (
    <aside
      className={cn(
        'crm-inline-action-panel flex h-full shrink-0 flex-col border-l border-[var(--color-line)] bg-white shadow-xl transition-all duration-200 ease-in-out z-10',
        width,
        className
      )}
      role="region"
      aria-label={title || 'Inline Action'}
    >
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-[var(--color-line)] px-5 bg-neutral-50/80">
        <div className="min-w-0 flex-1 pr-2">
          <h3 className="text-base font-bold text-[var(--color-ink)] truncate">{title}</h3>
          {subtitle && <p className="text-xs text-[var(--color-ink-muted)] truncate">{subtitle}</p>}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="crm-btn-ghost flex h-11 w-11 items-center justify-center rounded-lg p-0 text-neutral-500 hover:text-neutral-800"
          aria-label="Close panel"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="crm-scroll flex-1 overflow-y-auto p-5">
        {children}
      </div>

      {footer && (
        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-[var(--color-line)] p-4 bg-neutral-50/50">
          {footer}
        </div>
      )}
    </aside>
  );
}
