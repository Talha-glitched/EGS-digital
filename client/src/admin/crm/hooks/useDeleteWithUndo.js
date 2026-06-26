import { useUndoToast } from '../context/UndoToastContext.jsx';

export function useDeleteWithUndo({ resourceType, deleteFn, onRemoved, onRestored }) {
  const { pushDeleteUndo } = useUndoToast();

  return async function runDelete(id, labelOverride) {
    const result = await deleteFn(id);
    const label = labelOverride || result?.label || `Deleted ${resourceType}`;
    onRemoved?.(id, result);
    pushDeleteUndo({
      id: result?.id || id,
      resourceType,
      label,
      onRestored: () => onRestored?.(result?.id || id),
    });
    return result;
  };
}
