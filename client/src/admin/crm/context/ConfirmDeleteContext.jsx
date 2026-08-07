import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Modal } from '../components/ui/Modal.jsx';

const ConfirmDeleteContext = createContext(null);

export function ConfirmDeleteProvider({ children }) {
  const [dialog, setDialog] = useState(null);
  const resolverRef = useRef(null);

  const closeDialog = useCallback((result) => {
    resolverRef.current?.(result);
    resolverRef.current = null;
    setDialog(null);
  }, []);

  const confirmDelete = useCallback(
    ({
      title = 'Delete this item?',
      message = 'This cannot be undone immediately, but you can restore it within 30 seconds.',
      confirmLabel = 'Delete',
      icon = Trash2,
      accent = 'danger',
      confirmClass = 'crm-btn-danger',
      footerNote = 'After deleting, an undo notification will appear at the bottom of the screen for 30 seconds.',
    } = {}) =>
      new Promise((resolve) => {
        resolverRef.current = resolve;
        setDialog({ title, message, confirmLabel, icon, accent, confirmClass, footerNote });
      }),
    [],
  );

  const value = useMemo(() => ({ confirmDelete }), [confirmDelete]);

  return (
    <ConfirmDeleteContext.Provider value={value}>
      {children}
      <Modal
        open={Boolean(dialog)}
        onClose={() => closeDialog(false)}
        title={dialog?.title || 'Delete this item?'}
        subtitle={dialog?.message}
        size="md"
        icon={dialog?.icon || Trash2}
        accent={dialog?.accent || 'danger'}
        footer={(
          <div className="flex justify-end gap-3">
            <button type="button" className="crm-btn-secondary" onClick={() => closeDialog(false)}>
              Cancel
            </button>
            <button type="button" className={dialog?.confirmClass || 'crm-btn-danger'} onClick={() => closeDialog(true)}>
              {dialog?.confirmLabel || 'Delete'}
            </button>
          </div>
        )}
      >
        <p className="text-sm leading-relaxed text-neutral-600">
          {dialog?.footerNote || 'After deleting, an undo notification will appear at the bottom of the screen for 30 seconds.'}
        </p>
      </Modal>
    </ConfirmDeleteContext.Provider>
  );
}

export function useConfirmDeleteDialog() {
  const ctx = useContext(ConfirmDeleteContext);
  if (!ctx) {
    throw new Error('useConfirmDeleteDialog must be used within ConfirmDeleteProvider');
  }
  return ctx;
}
