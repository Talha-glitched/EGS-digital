import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

const DURATION_MS = 30000;

export default function AutoSaveCloseNotice({ open }) {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (!open) {
      setProgress(100);
      return undefined;
    }
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      setProgress(Math.max(0, 100 - (elapsed / DURATION_MS) * 100));
    };
    tick();
    const id = window.setInterval(tick, 200);
    return () => window.clearInterval(id);
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="crm-autosave-close-notice" role="status" aria-live="polite">
      <Loader2 className="h-4 w-4 shrink-0 animate-spin text-brand" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-[var(--color-ink)]">Saving your changes — closing when done…</p>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-neutral-100">
          <div className="h-full bg-brand transition-all duration-200" style={{ width: `${progress}%` }} />
        </div>
      </div>
    </div>,
    document.body,
  );
}
