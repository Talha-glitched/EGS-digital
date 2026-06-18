import { X } from 'lucide-react';
import { cn } from './primitives.jsx';

export function Modal({ open, onClose, title, subtitle, children, footer, size = 'lg' }) {
  if (!open) return null;

  const sizes = {
    md: 'max-w-2xl',
    lg: 'max-w-3xl',
    xl: 'max-w-4xl',
  };

  return (
    <div
      className="crm-modal-overlay crm-root"
      role="dialog"
      aria-modal="true"
      aria-labelledby="crm-modal-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div className={cn('crm-modal-panel', sizes[size] || sizes.lg)}>
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-[var(--color-line)] px-6 py-5">
          <div className="min-w-0 pr-2">
            <h2 id="crm-modal-title" className="text-lg font-bold tracking-tight text-[var(--color-ink)]">
              {title}
            </h2>
            {subtitle && <p className="mt-1 text-[13px] leading-relaxed text-neutral-500">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--color-line)] text-neutral-500 transition hover:bg-neutral-50 hover:text-[var(--color-ink)]"
            aria-label="Close"
          >
            <X className="h-[18px] w-[18px]" />
          </button>
        </div>

        <div className="crm-scroll flex-1 overflow-y-auto px-6 py-6">{children}</div>

        {footer && <div className="shrink-0 border-t border-[var(--color-line)] bg-neutral-50/60 px-6 py-4">{footer}</div>}
      </div>
    </div>
  );
}
