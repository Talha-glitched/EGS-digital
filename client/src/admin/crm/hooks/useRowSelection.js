import { useCallback, useEffect, useMemo, useState } from 'react';

/**
 * Row selection for CRM tables. Prunes stale IDs when items change.
 */
export function useRowSelection(items = [], getId = (item) => item._id) {
  const [selectedIds, setSelectedIds] = useState(() => new Set());

  const itemIds = useMemo(() => items.map(getId), [items, getId]);

  useEffect(() => {
    setSelectedIds((prev) => {
      const valid = new Set(itemIds);
      const next = new Set([...prev].filter((id) => valid.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [itemIds]);

  const selectionCount = selectedIds.size;
  const allSelected = items.length > 0 && items.every((item) => selectedIds.has(getId(item)));
  const someSelected = selectionCount > 0;

  const toggleSelect = useCallback((id, event) => {
    event?.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback((event) => {
    event?.stopPropagation();
    setSelectedIds((prev) => {
      if (items.length > 0 && items.every((item) => prev.has(getId(item)))) {
        return new Set();
      }
      return new Set(itemIds);
    });
  }, [items, getId, itemIds]);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const isSelected = useCallback((id) => selectedIds.has(id), [selectedIds]);

  const selectedArray = useMemo(() => [...selectedIds], [selectedIds]);

  return {
    selectedIds,
    selectedArray,
    selectionCount,
    allSelected,
    someSelected,
    toggleSelect,
    toggleSelectAll,
    clearSelection,
    isSelected,
  };
}
