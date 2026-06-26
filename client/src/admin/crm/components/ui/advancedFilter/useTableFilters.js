import { useMemo, useState } from 'react';
import {
  applyTableFilters,
  countActiveFilters,
  createEmptyFilters,
} from './filterEngine.js';

export function useTableFilters(items = [], schema) {
  const [filters, setFiltersState] = useState(() => createEmptyFilters(schema));
  const [matchMode, setMatchMode] = useState('all');

  const filtered = useMemo(
    () => applyTableFilters(items, filters, schema, { match: matchMode }),
    [items, filters, schema, matchMode],
  );

  const activeCount = useMemo(
    () => countActiveFilters(filters, schema),
    [filters, schema],
  );

  const setFilters = (nextFilters, nextMatchMode = matchMode) => {
    setFiltersState(nextFilters);
    if (nextMatchMode) setMatchMode(nextMatchMode);
  };

  const resetFilters = () => {
    setFiltersState(createEmptyFilters(schema));
    setMatchMode('all');
  };

  return {
    filters,
    setFilters,
    matchMode,
    filtered,
    activeCount,
    resetFilters,
    hasActiveFilters: activeCount > 0,
  };
}

export default useTableFilters;
