import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { notifyWorkspaceChanged, restoreRecord } from '../crmApi.js';

const UndoToastContext = createContext(null);
const UNDO_DURATION_MS = 30000;
const MAX_VISIBLE = 5;

export function UndoToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef(new Map());

  const dismissUndo = useCallback((id) => {
    const timer = timersRef.current.get(id);
    if (timer) clearTimeout(timer);
    timersRef.current.delete(id);
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const pushDeleteUndo = useCallback(
    ({ id, resourceType, label, onRestored }) => {
      const toastId = `${resourceType}-${id}-${Date.now()}`;
      const createdAt = Date.now();
      const toast = { id: toastId, resourceType, resourceId: id, label, createdAt, busy: false, onRestored };

      setToasts((prev) => [...prev, toast].slice(-20));

      const timer = setTimeout(() => dismissUndo(toastId), UNDO_DURATION_MS);
      timersRef.current.set(toastId, timer);

      return toastId;
    },
    [dismissUndo]
  );

  const undoDelete = useCallback(
    async (toastId) => {
      const toast = toasts.find((t) => t.id === toastId);
      if (!toast || toast.busy) return;

      setToasts((prev) => prev.map((t) => (t.id === toastId ? { ...t, busy: true } : t)));
      try {
        await restoreRecord(toast.resourceType, toast.resourceId);
        notifyWorkspaceChanged({ entity: toast.resourceType, action: 'restore', id: toast.resourceId });
        toast.onRestored?.();
        dismissUndo(toastId);
      } catch {
        setToasts((prev) => prev.map((t) => (t.id === toastId ? { ...t, busy: false } : t)));
      }
    },
    [toasts, dismissUndo]
  );

  const undoAllVisible = useCallback(async () => {
    const visible = toasts.slice(-MAX_VISIBLE);
    for (const toast of visible) {
      await undoDelete(toast.id);
    }
  }, [toasts, undoDelete]);

  const value = useMemo(
    () => ({
      toasts,
      pushDeleteUndo,
      dismissUndo,
      undoDelete,
      undoAllVisible,
      maxVisible: MAX_VISIBLE,
      durationMs: UNDO_DURATION_MS,
    }),
    [toasts, pushDeleteUndo, dismissUndo, undoDelete, undoAllVisible]
  );

  return <UndoToastContext.Provider value={value}>{children}</UndoToastContext.Provider>;
}

export function useUndoToast() {
  const ctx = useContext(UndoToastContext);
  if (!ctx) {
    throw new Error('useUndoToast must be used within UndoToastProvider');
  }
  return ctx;
}
