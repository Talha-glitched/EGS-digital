import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useUndoToast } from '../../context/UndoToastContext.jsx';

function UndoToastItem({ toast, onUndo, onDismiss, durationMs }) {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const start = toast.createdAt;
    const tick = () => {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, 100 - (elapsed / durationMs) * 100);
      setProgress(remaining);
      if (remaining <= 0) onDismiss(toast.id);
    };
    tick();
    const id = setInterval(tick, 200);
    return () => clearInterval(id);
  }, [toast, durationMs, onDismiss]);

  return (
    <div className="crm-undo-toast flex min-w-[320px] max-w-md items-center gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3 shadow-lg">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-neutral-800">{toast.label}</p>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-neutral-100">
          <div className="h-full bg-brand transition-all duration-200" style={{ width: `${progress}%` }} />
        </div>
      </div>
      <button
        type="button"
        onClick={() => onUndo(toast.id)}
        disabled={toast.busy}
        className="crm-btn-primary shrink-0 !px-3 !py-1.5 text-xs"
      >
        {toast.busy ? 'Restoring…' : 'Undo'}
      </button>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export default function DeleteUndoToastStack() {
  const { toasts, undoDelete, dismissUndo, undoAllVisible, maxVisible, durationMs } = useUndoToast();

  if (!toasts.length) return null;

  const visible = toasts.slice(-maxVisible);
  const overflow = toasts.length - visible.length;

  return (
    <div className="pointer-events-none fixed bottom-6 left-1/2 z-[200] flex -translate-x-1/2 flex-col items-center gap-2">
      {overflow > 0 && (
        <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-600 shadow">
          <span>+{overflow} more deletions</span>
          <button type="button" onClick={undoAllVisible} className="font-semibold text-brand hover:underline">
            Undo all ({toasts.length})
          </button>
        </div>
      )}
      {visible.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <UndoToastItem toast={toast} onUndo={undoDelete} onDismiss={dismissUndo} durationMs={durationMs} />
        </div>
      ))}
    </div>
  );
}
