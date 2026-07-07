import { useCallback, useMemo, useState } from 'react';
import { sortRows } from './sortUtils.js';

export function useTableSort({ defaultKey = '', defaultDir = 'asc', accessors = {} } = {}) {
  const [sortKey, setSortKey] = useState(defaultKey);
  const [sortDir, setSortDir] = useState(defaultDir);

  const toggleSort = useCallback((key) => {
    if (!key) return;
    setSortKey((currentKey) => {
      if (currentKey === key) {
        setSortDir((currentDir) => (currentDir === 'asc' ? 'desc' : 'asc'));
        return currentKey;
      }
      setSortDir('asc');
      return key;
    });
  }, []);

  const clearSort = useCallback(() => {
    setSortKey('');
    setSortDir('asc');
  }, []);

  const sortItems = useCallback(
    (items) => sortRows(items, accessors, sortKey, sortDir),
    [accessors, sortKey, sortDir],
  );

  const sortedItems = useCallback(
    (items) => sortItems(items),
    [sortItems],
  );

  const sortLabel = useMemo(() => {
    if (!sortKey) return '';
    const label = accessors[`${sortKey}Label`] || sortKey;
    return `${label} (${sortDir === 'asc' ? 'A→Z' : 'Z→A'})`;
  }, [accessors, sortKey, sortDir]);

  return {
    sortKey,
    sortDir,
    sortLabel,
    toggleSort,
    clearSort,
    sortItems,
    sortedItems,
    setSortKey,
    setSortDir,
  };
}
