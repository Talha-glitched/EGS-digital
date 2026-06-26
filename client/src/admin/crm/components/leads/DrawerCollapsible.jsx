import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../ui/primitives.jsx';

export default function DrawerCollapsible({
  title,
  subtitle,
  defaultOpen = false,
  children,
  className = '',
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={cn('crm-drawer-accordion', open && 'is-open', className)}>
      <button
        type="button"
        className="crm-drawer-accordion-trigger"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
      >
        <span className="min-w-0 flex-1 text-left">
          <span className="block text-[13px] font-semibold text-[var(--color-ink)]">{title}</span>
          {subtitle && <span className="mt-0.5 block text-xs text-neutral-500">{subtitle}</span>}
        </span>
        <ChevronDown className={cn('crm-drawer-accordion-chevron h-4 w-4 shrink-0 text-neutral-400', open && 'is-open')} />
      </button>
      <div className="crm-drawer-accordion-panel">
        <div className="crm-drawer-accordion-inner">{children}</div>
      </div>
    </div>
  );
}
