import { createPortal } from 'react-dom';
import { Check } from 'lucide-react';

export function cn(...parts) {
  return parts.filter(Boolean).join(' ');
}

export function PageShell({ children, className = '', compact = false }) {
  return (
    <div className={cn('crm-page-shell', compact && 'is-compact', className)}>
      {children}
    </div>
  );
}

export function PageSection({ children, className = '' }) {
  return <section className={cn('crm-page-section', className)}>{children}</section>;
}

export function PageToolbar({ start, meta, actions, className = '' }) {
  return (
    <div className={cn('crm-toolbar', className)}>
      {start ? <div className="crm-toolbar-start">{start}</div> : null}
      {meta ? <div className="crm-toolbar-meta">{meta}</div> : null}
      {actions ? <div className="crm-toolbar-actions">{actions}</div> : null}
    </div>
  );
}

export function ToolbarCount({ children }) {
  return <span className="crm-toolbar-count">{children}</span>;
}

export function MetricGrid({ children, cols = 4, className = '' }) {
  return (
    <div className={cn('crm-metric-grid', cols === 3 && 'cols-3', cols === 4 && 'cols-4', className)}>
      {children}
    </div>
  );
}

export function SplitGrid({ children, className = '' }) {
  return <div className={cn('crm-split-grid', className)}>{children}</div>;
}

export function ListBody({ children, className = '' }) {
  return <div className={cn('divide-y divide-[var(--color-line)]', className)}>{children}</div>;
}

export function ListRow({ children, className = '', as: Tag = 'div', ...props }) {
  return (
    <Tag className={cn('crm-list-row', className)} {...props}>
      {children}
    </Tag>
  );
}

export function StatBand({ children, className = '' }) {
  return <div className={cn('crm-card crm-stat-band overflow-hidden', className)}>{children}</div>;
}

export function StatBandItem({ label, value, detail, icon: Icon, tone = 'neutral', as: Tag = 'div', className = '', ...props }) {
  const tones = {
    neutral: 'bg-neutral-100 text-neutral-600',
    brand: 'bg-brand-soft text-brand',
    success: 'bg-emerald-50 text-emerald-600',
    info: 'bg-sky-50 text-sky-600',
    warning: 'bg-amber-50 text-amber-700',
  };
  return (
    <Tag className={cn('crm-stat-band-item hover:bg-neutral-50/60', className)} {...props}>
      {Icon && (
        <div className={cn('crm-stat-icon shrink-0', tones[tone] || tones.neutral)}>
          <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">{label}</p>
        <p className="mt-0.5 text-sm font-bold leading-none tracking-tight tabular-nums text-[var(--color-ink)]">{value}</p>
        {detail && <p className="mt-1 text-[11px] leading-snug text-neutral-400">{detail}</p>}
      </div>
    </Tag>
  );
}

export function PageHeader({ title, subtitle, action }) {
  if (!title && !subtitle) {
    if (!action) return null;
    return <div className="flex flex-wrap justify-end gap-2">{action}</div>;
  }
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="max-w-2xl">
        <h1 className="text-base font-bold tracking-tight text-[var(--color-ink)]">{title}</h1>
        {subtitle && <p className="mt-0.5 text-xs leading-relaxed text-[var(--color-ink-muted)]">{subtitle}</p>}
      </div>
      {action && <div className="flex shrink-0 flex-wrap gap-2">{action}</div>}
    </div>
  );
}

export function Card({ children, className = '' }) {
  return <div className={cn('crm-card overflow-hidden', className)}>{children}</div>;
}

export function CardHeader({ title, subtitle, action, className = '' }) {
  return (
    <div className={cn('flex items-center justify-between gap-3 border-b border-[var(--color-line)] px-4 py-2.5', className)}>
      <div className="min-w-0">
        <h3 className="text-xs font-semibold text-[var(--color-ink)]">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs leading-relaxed text-neutral-500">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function StatCard({ label, value, icon: Icon, tone = 'neutral', helpText, compact = false }) {
  const tones = {
    neutral: { icon: 'bg-neutral-100 text-neutral-600', value: 'text-[var(--color-ink)]' },
    brand: { icon: 'bg-brand-soft text-brand', value: 'text-[var(--color-ink)]' },
    success: { icon: 'bg-emerald-50 text-emerald-600', value: 'text-[var(--color-ink)]' },
    info: { icon: 'bg-sky-50 text-sky-600', value: 'text-[var(--color-ink)]' },
    warning: { icon: 'bg-amber-50 text-amber-700', value: 'text-[var(--color-ink)]' },
  };
  const t = tones[tone] || tones.neutral;

  if (compact) {
    return (
      <div className="crm-card crm-stat-card crm-card-hover min-h-[64px]">
        {Icon && (
          <div className={cn('crm-stat-icon shrink-0', t.icon)}>
            <Icon className="h-4 w-4" strokeWidth={2} />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">{label}</p>
          <p className={cn('mt-0.5 text-sm font-bold leading-none tracking-tight tabular-nums', t.value)}>{value}</p>
          {helpText && <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-neutral-400">{helpText}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="crm-card crm-card-hover p-4 lg:p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">{label}</p>
          <p className={cn('mt-1.5 text-xl font-bold leading-none tracking-tight tabular-nums', t.value)}>{value}</p>
          {helpText && <p className="mt-2 text-xs leading-relaxed text-neutral-400">{helpText}</p>}
        </div>
        {Icon && (
          <div className={cn('crm-stat-icon shrink-0', t.icon)}>
            <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
          </div>
        )}
      </div>
    </div>
  );
}

export function Tabs({ items, active, onChange }) {
  const activeItem = items.find((t) => t.id === active);
  return (
    <div className="space-y-3">
      <div className="inline-flex flex-wrap gap-1 rounded-xl bg-neutral-100 p-1">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange(item.id)}
            className={cn(
              'rounded-lg px-3 py-1.5 text-xs font-medium transition',
              active === item.id ? 'crm-tab-active' : 'crm-tab-idle'
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
      {activeItem?.description && (
        <p className="max-w-3xl text-xs leading-relaxed text-neutral-500">{activeItem.description}</p>
      )}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      {Icon && (
        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-neutral-100 text-neutral-400">
          <Icon className="h-5 w-5" strokeWidth={1.5} />
        </div>
      )}
      <h3 className="text-sm font-semibold text-[var(--color-ink)]">{title}</h3>
      {description && <p className="mt-1 max-w-md text-xs leading-relaxed text-neutral-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function LoadingState({ label = 'Loading…' }) {
  return (
    <div className="flex min-h-[240px] flex-col items-center justify-center gap-2.5 text-xs text-neutral-500">
      <div className="crm-spinner" />
      <span>{label}</span>
    </div>
  );
}

export function Alert({ tone = 'error', children }) {
  const styles = {
    error: 'border-red-200 bg-red-50 text-red-800',
    warning: 'border-amber-200 bg-amber-50 text-amber-900',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    info: 'border-sky-200 bg-sky-50 text-sky-900',
  };
  return <div className={cn('rounded-lg border px-3 py-2 text-xs leading-relaxed', styles[tone] || styles.error)}>{children}</div>;
}

export function Toast({ message, onDismiss }) {
  if (!message) return null;
  return createPortal(
    <div className="fixed right-5 top-5 z-[100] crm-animate-in">
      <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-white px-4 py-3 text-sm font-medium text-emerald-800 shadow-lg ring-1 ring-black/5">
        <span className="h-2 w-2 rounded-full bg-emerald-500" />
        {message}
        {onDismiss && (
          <button type="button" onClick={onDismiss} className="ml-2 text-emerald-600/70 hover:text-emerald-800">
            ×
          </button>
        )}
      </div>
    </div>,
    document.body
  );
}

export function StepIndicator({ steps, current, meta = [] }) {
  return (
    <ol className="crm-wizard-steps">
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current;
        const detail = meta[i]?.description;
        return (
          <li
            key={label}
            className={cn(
              'crm-wizard-step',
              active && 'is-active',
              done && 'is-done',
            )}
          >
            <div className="crm-wizard-step-dot" aria-hidden="true">
              {done ? <Check className="h-3.5 w-3.5" strokeWidth={2.5} /> : i + 1}
            </div>
            <div className="min-w-0">
              <p className={cn('text-sm font-semibold', active ? 'text-[var(--color-ink)]' : 'text-neutral-600')}>{label}</p>
              {detail && <p className="mt-1 text-xs leading-relaxed text-neutral-500">{detail}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function InfoPanel({ title, children }) {
  return (
    <div className="crm-info-panel">
      {title && <p className="mb-1.5 font-semibold">{title}</p>}
      <div className="leading-relaxed text-sky-900/90">{children}</div>
    </div>
  );
}

export function WorkflowGuide({ steps }) {
  return (
    <div className="crm-card divide-y divide-[var(--color-line)] overflow-hidden">
      {steps.map((step, i) => (
        <div key={step.title} className="flex gap-4 px-6 py-5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-soft text-sm font-bold text-brand">
            {i + 1}
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--color-ink)]">{step.title}</p>
            <p className="mt-1 text-sm leading-relaxed text-neutral-500">{step.body}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function Field({ label, hint, required, children }) {
  return (
    <label className="block space-y-2">
      <span className="block text-sm font-semibold text-[var(--color-ink)]">
        {label}
        {required && <span className="ml-0.5 text-brand">*</span>}
      </span>
      {children}
      {hint && <span className="block text-xs leading-relaxed text-neutral-500">{hint}</span>}
    </label>
  );
}

export function ProgressBar({ value, tone = 'brand' }) {
  const fill = tone === 'success' ? 'bg-emerald-500' : 'bg-brand';
  return (
    <div className="h-2 overflow-hidden rounded-full bg-neutral-100">
      <div className={cn('h-full rounded-full transition-all duration-500', fill)} style={{ width: `${Math.min(value, 100)}%` }} />
    </div>
  );
}

export function Badge({ children, tone = 'neutral', className = '' }) {
  const tones = {
    neutral: 'bg-neutral-100 text-neutral-700 ring-neutral-200/70',
    brand: 'bg-brand-soft text-brand ring-red-200/60',
    success: 'bg-emerald-50 text-emerald-700 ring-emerald-200/70',
    warning: 'bg-amber-50 text-amber-800 ring-amber-200/70',
    info: 'bg-sky-50 text-sky-700 ring-sky-200/70',
    danger: 'bg-red-50 text-red-700 ring-red-200/70',
  };
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset whitespace-nowrap', tones[tone] || tones.neutral, className)}>
      {children}
    </span>
  );
}
