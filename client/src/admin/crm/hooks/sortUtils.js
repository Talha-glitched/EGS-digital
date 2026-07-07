export function normalizeSortValue(value) {
  if (value == null) return null;
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const asDate = Date.parse(trimmed);
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed) && !Number.isNaN(asDate)) return asDate;
    return trimmed.toLowerCase();
  }
  return String(value).toLowerCase();
}

export function compareSortValues(a, b, direction = 'asc') {
  const left = normalizeSortValue(a);
  const right = normalizeSortValue(b);
  const factor = direction === 'desc' ? -1 : 1;

  if (left == null && right == null) return 0;
  if (left == null) return 1;
  if (right == null) return -1;

  if (typeof left === 'number' && typeof right === 'number') {
    return (left - right) * factor;
  }

  return String(left).localeCompare(String(right), undefined, { numeric: true, sensitivity: 'base' }) * factor;
}

export function sortRows(items = [], accessors = {}, sortKey = '', sortDir = 'asc') {
  if (!sortKey || !accessors[sortKey]) return items;
  const getValue = accessors[sortKey];
  return [...items].sort((a, b) => compareSortValues(getValue(a), getValue(b), sortDir));
}
