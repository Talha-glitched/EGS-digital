import { useUndoToast } from '../context/UndoToastContext.jsx';
import { useConfirmDeleteDialog } from '../context/ConfirmDeleteContext.jsx';

/**
 * Confirm + delete + push undo toast. Returns a handler: (id, label, confirmMessage?) => Promise
 */
export function useConfirmDelete({
  resourceType,
  deleteFn,
  onRemoved,
  onRestored,
  defaultConfirm = 'Delete this item?',
}) {
  const { pushDeleteUndo } = useUndoToast();
  const { confirmDelete } = useConfirmDeleteDialog();

  return async function runDelete(id, label, confirmMessage = defaultConfirm) {
    if (!id) return null;
    if (confirmMessage) {
      const ok = await confirmDelete({
        title: 'Confirm deletion',
        message: confirmMessage,
        confirmLabel: 'Delete',
      });
      if (!ok) return null;
    }

    const result = await deleteFn(id);
    const toastLabel = label || result?.label || `Deleted ${resourceType}`;
    onRemoved?.(id, result);
    pushDeleteUndo({
      id: result?.id || id,
      resourceType,
      label: toastLabel,
      onRestored: () => onRestored?.(result?.id || id),
    });
    return result;
  };
}
