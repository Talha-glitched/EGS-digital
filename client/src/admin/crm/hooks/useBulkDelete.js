import { useCallback } from 'react';
import { useConfirmDeleteDialog } from '../context/ConfirmDeleteContext.jsx';
import { useUndoToast } from '../context/UndoToastContext.jsx';
import { pluralize } from '../constants/pluralForms.js';

/**
 * Bulk delete with confirm modal and per-item undo toasts (same safety as single delete).
 */
export function useBulkDelete({
  resourceType,
  bulkDeleteFn,
  getLabelForId,
  defaultConfirm = 'You can undo each deletion within 30 seconds.',
  onRemoved,
  onRestored,
}) {
  const { confirmDelete } = useConfirmDeleteDialog();
  const { pushDeleteUndo } = useUndoToast();

  return useCallback(async function runBulkDelete(ids, options = {}) {
    if (!ids?.length) return null;

    const count = ids.length;
    const noun = options.noun || resourceType;
    const label = pluralize(noun, count);

    const ok = await confirmDelete({
      title: options.title || `Delete ${label}?`,
      message: options.confirmMessage || defaultConfirm,
      confirmLabel: options.confirmLabel || 'Delete',
    });
    if (!ok) return null;

    const result = await bulkDeleteFn(ids);
    const succeeded = (result.results || []).filter((row) => row.ok);

    succeeded.forEach((row) => {
      pushDeleteUndo({
        id: row.id,
        resourceType,
        label: getLabelForId?.(row.id) || row.label || `Deleted ${noun}`,
        onRestored: () => onRestored?.(row.id),
      });
    });

    onRemoved?.(succeeded.map((row) => row.id), result);
    return result;
  }, [resourceType, bulkDeleteFn, getLabelForId, defaultConfirm, onRemoved, onRestored, confirmDelete, pushDeleteUndo]);
}
