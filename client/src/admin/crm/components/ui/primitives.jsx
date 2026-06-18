export function cn(...parts) {
  return parts.filter(Boolean).join(' ');
}

export function PageShell({ children, className = '' }) {
  return (
    <div className={cn('crm-animate-in mx-auto w-full max-w-[1440px] space-y-6 p-5 lg:p-8', className)}>
      {children}
    </div>
  );
}

export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="max-w-2xl">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--color-ink)]">{title}</h1>
        {subtitle && <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-ink-muted)]">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function Card({ children, className = '' }) {
  return <div className={cn('crm-card overflow-hidden', className)}>{children}</div>;
}

export function CardHeader({ title, subtitle, action, className = '' }) {
  return (
    <div className={cn('flex items-center justify-between gap-3 border-b border-[var(--color-line)] px-5 py-4', className)}>
      <div className="min-w-0">
        <h3 className="text-[15px] font-semibold text-[var(--color-ink)]">{title}</h3>
        {subtitle && <p className="mt-0.5 text-sm text-neutral-500">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function StatCard({ label, value, icon: Icon, tone = 'neutral', helpText }) {
  const tones = {
    neutral: { icon: 'bg-neutral-100 text-neutral-600', value: 'text-[var(--color-ink)]' },
    brand: { icon: 'bg-brand-soft text-brand', value: 'text-[var(--color-ink)]' },
    success: { icon: 'bg-emerald-50 text-emerald-600', value: 'text-[var(--color-ink)]' },
    info: { icon: 'bg-sky-50 text-sky-600', value: 'text-[var(--color-ink)]' },
  };
  const t = tones[tone] || tones.neutral;

  return (
    <div className="crm-card crm-card-hover p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[13px] font-medium text-neutral-500">{label}</p>
        {Icon && (
          <div className={cn('crm-stat-icon shrink-0', t.icon)}>
            <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
          </div>
        )}
      </div>
      <p className={cn('mt-2 text-[26px] font-bold leading-none tracking-tight tabular-nums', t.value)}>{value}</p>
      {helpText && <p className="mt-2.5 text-[12.5px] leading-relaxed text-neutral-400">{helpText}</p>}
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
              'rounded-lg px-4 py-2 text-sm font-medium transition',
              active === item.id ? 'crm-tab-active' : 'crm-tab-idle'
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
      {activeItem?.description && (
        <p className="max-w-3xl text-sm leading-relaxed text-neutral-500">{activeItem.description}</p>
      )}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      {Icon && (
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-400">
          <Icon className="h-7 w-7" strokeWidth={1.5} />
        </div>
      )}
      <h3 className="text-lg font-semibold text-[var(--color-ink)]">{title}</h3>
      {description && <p className="mt-1.5 max-w-md text-sm leading-relaxed text-neutral-500">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function LoadingState({ label = 'Loading…' }) {
  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 text-sm text-neutral-500">
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
  return <div className={cn('rounded-lg border px-4 py-3 text-sm leading-relaxed', styles[tone] || styles.error)}>{children}</div>;
}

export function Toast({ message, onDismiss }) {
  if (!message) return null;
  return (
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
    </div>
  );
}

export function StepIndicator({ steps, current, meta = [] }) {
  return (
    <ol className="flex flex-col gap-2 sm:flex-row sm:items-stretch sm:gap-2">
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current;
        const detail = meta[i]?.description;
        return (
          <li
            key={label}
            className={cn(
              'flex flex-1 items-start gap-3 rounded-xl border px-4 py-3 transition-colors',
              active
                ? 'border-brand/30 bg-brand-soft/50'
                : done
                ? 'border-emerald-200 bg-emerald-50/50'
                : 'border-[var(--color-line)] bg-neutral-50/60'
            )}
          >
            <div
              className={cn(
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                active ? 'bg-brand text-white' : done ? 'bg-emerald-600 text-white' : 'bg-neutral-200 text-neutral-500'
              )}
            >
              {done ? '✓' : i + 1}
            </div>
            <div className="min-w-0">
              <p className={cn('text-sm font-semibold', active ? 'text-[var(--color-ink)]' : 'text-neutral-600')}>{label}</p>
              {detail && <p className="mt-0.5 text-xs leading-relaxed text-neutral-500">{detail}</p>}
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
      {title && <p className="mb-1 font-semibold">{title}</p>}
      <div className="leading-relaxed text-sky-900/90">{children}</div>
    </div>
  );
}

export function WorkflowGuide({ steps }) {
  return (
    <div className="crm-card divide-y divide-[var(--color-line)] overflow-hidden">
      {steps.map((step, i) => (
        <div key={step.title} className="flex gap-4 px-5 py-4">
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
    <label className="block space-y-1.5">
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

export function Badge({ children, tone = 'neutral' }) {
  const tones = {
    neutral: 'bg-neutral-100 text-neutral-700 ring-neutral-200/70',
    brand: 'bg-brand-soft text-brand ring-red-200/60',
    success: 'bg-emerald-50 text-emerald-700 ring-emerald-200/70',
    warning: 'bg-amber-50 text-amber-800 ring-amber-200/70',
    info: 'bg-sky-50 text-sky-700 ring-sky-200/70',
  };
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset', tones[tone] || tones.neutral)}>
      {children}
    </span>
  );
}
