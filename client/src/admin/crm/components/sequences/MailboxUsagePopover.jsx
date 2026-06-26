import { useEffect, useRef, useState } from 'react';
import { Info } from 'lucide-react';
import { cn } from '../ui/primitives.jsx';

export default function MailboxUsagePopover({ usage, className = '' }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    function onDocClick(e) {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  const dailyCap = usage?.dailyCap || 150;
  const sentToday = usage?.sentToday || 0;
  const usedPercent = usage?.usedPercent ?? Math.round((sentToday / dailyCap) * 100);
  const breakdown = usage?.breakdown || [];

  return (
    <div ref={rootRef} className={cn('relative inline-flex', className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-7 w-7 items-center justify-center rounded-full border border-[var(--color-line)] bg-white text-neutral-400 transition hover:border-brand/40 hover:text-brand"
        aria-label="Daily send usage"
        title="Daily mailbox usage"
      >
        <Info className="h-3.5 w-3.5" />
      </button>

      {open && (
        <div className="crm-seq-usage-popover absolute right-0 top-full z-50 mt-2 w-64 rounded-xl border border-[var(--color-line)] bg-white p-3 shadow-xl">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">Today&apos;s mailbox</p>
          <div className="mt-2 flex items-end justify-between gap-2">
            <p className="text-lg font-bold tabular-nums text-[var(--color-ink)]">
              {sentToday}
              <span className="text-sm font-medium text-neutral-400"> / {dailyCap}</span>
            </p>
            <span className="text-xs font-semibold text-brand">{usedPercent}%</span>
          </div>

          <div className="mt-2 h-2 overflow-hidden rounded-full bg-neutral-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand to-orange-400 transition-all duration-300"
              style={{ width: `${Math.min(100, usedPercent)}%` }}
            />
          </div>

          <p className="mt-2 text-[11px] text-neutral-500">
            {usage?.remaining ?? Math.max(0, dailyCap - sentToday)} sends remaining today (GST)
          </p>

          {breakdown.length > 0 && (
            <div className="mt-3 space-y-1.5 border-t border-[var(--color-line)] pt-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">By campaign</p>
              {breakdown.map((row) => (
                <div key={String(row.campaignId)} className="space-y-1">
                  <div className="flex items-center justify-between gap-2 text-[11px]">
                    <span className="truncate text-neutral-600">{row.campaignName}</span>
                    <span className="shrink-0 font-semibold tabular-nums text-neutral-800">{row.percent}%</span>
                  </div>
                  <div className="h-1 overflow-hidden rounded-full bg-neutral-100">
                    <div
                      className="h-full rounded-full bg-sky-400"
                      style={{ width: `${row.percent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
