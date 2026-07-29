function normalizeText(value) {
  return String(value ?? '').trim().toLowerCase();
}

export function buildDistinctFieldOptions(rows = [], accessor, limit = 300) {
  const values = new Set();
  for (const row of rows) {
    const raw = typeof accessor === 'function' ? accessor(row) : row?.[accessor];
    const text = String(raw ?? '').trim();
    if (text) values.add(text);
    if (values.size >= limit) break;
  }
  return Array.from(values)
    .sort((a, b) => a.localeCompare(b))
    .map((value) => ({ value, label: value }));
}

export function buildDistinctFieldOptionsFromArrays(rows = [], accessor, limit = 300) {
  const values = new Set();
  for (const row of rows) {
    const raw = typeof accessor === 'function' ? accessor(row) : row?.[accessor];
    const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
    for (const item of list) {
      const text = String(item ?? '').trim();
      if (!text) continue;
      values.add(text);
      if (values.size >= limit) break;
    }
    if (values.size >= limit) break;
  }
  return Array.from(values)
    .sort((a, b) => a.localeCompare(b))
    .map((value) => ({ value, label: value }));
}

function getNestedValue(row, path) {
  if (!path) return undefined;
  if (typeof path === 'function') return path(row);
  return String(path).split('.').reduce((acc, key) => (acc == null ? acc : acc[key]), row);
}

function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function matchText(value, filterValue, operator = 'contains') {
  const hay = normalizeText(value);
  const needle = normalizeText(filterValue);
  if (!needle) return true;
  switch (operator) {
    case 'equals':
      return hay === needle;
    case 'starts_with':
      return hay.startsWith(needle);
    case 'not_contains':
      return !hay.includes(needle);
    case 'is_empty':
      return !hay;
    case 'is_not_empty':
      return Boolean(hay);
    default:
      return hay.includes(needle);
  }
}

function matchTriState(actual, expected) {
  if (!expected || expected === 'any') return true;
  const truthy = Boolean(actual);
  return expected === 'yes' ? truthy : !truthy;
}

function matchSelect(value, selected = []) {
  if (!selected?.length) return true;
  const normalized = normalizeText(value);
  return selected.some((item) => normalizeText(item) === normalized);
}

function matchMultiContains(value, selected = []) {
  if (!selected?.length) return true;
  const hay = normalizeText(value);
  return selected.some((item) => hay.includes(normalizeText(item)));
}

function matchNumberRange(value, { min, max } = {}) {
  const num = Number(value);
  if (!Number.isFinite(num)) return !min && !max;
  if (min !== '' && min != null && num < Number(min)) return false;
  if (max !== '' && max != null && num > Number(max)) return false;
  return true;
}

function matchDateRange(value, { from, to } = {}) {
  const date = parseDate(value);
  if (!from && !to) return true;
  if (!date) return false;
  const fromDate = parseDate(from);
  const toDate = parseDate(to);
  if (fromDate && date < fromDate) return false;
  if (toDate) {
    const end = new Date(toDate);
    end.setHours(23, 59, 59, 999);
    if (date > end) return false;
  }
  return true;
}

function matchArrayIncludes(values = [], selected = []) {
  if (!selected?.length) return true;
  const set = new Set((values || []).map((item) => normalizeText(item)));
  return selected.some((item) => set.has(normalizeText(item)));
}

export function createEmptyFilters(schema) {
  const empty = {};
  schema.groups.forEach((group) => {
    group.fields.forEach((field) => {
      if (field.type === 'section') return;
      empty[field.key] = field.defaultValue ?? (
        field.type === 'multi' || field.type === 'arrayIncludes' || field.type === 'multiContains' ? [] :
        field.type === 'tri' ? 'any' :
        field.type === 'range' ? { min: '', max: '' } :
        field.type === 'dateRange' ? { from: '', to: '' } :
        ''
      );
    });
  });
  return empty;
}

export function countActiveFilters(filters, schema) {
  if (!schema?.groups || !Array.isArray(schema.groups) || !filters) return 0;
  let count = 0;
  schema.groups.forEach((group) => {
    (group.fields || []).forEach((field) => {
      if (field.type === 'section') return;
      if (isFilterActive(filters[field.key], field)) count += 1;
    });
  });
  return count;
}

export function countActiveFiltersByGroup(filters, schema) {
  if (!schema?.groups || !Array.isArray(schema.groups) || !filters) return {};
  const counts = {};
  schema.groups.forEach((group) => {
    counts[group.id] = (group.fields || []).filter((field) => {
      if (field.type === 'section') return false;
      return isFilterActive(filters[field.key], field);
    }).length;
  });
  return counts;
}

export function isFilterActive(value, field) {
  if (!field || value === undefined || value === null || value === '') return false;
  if ((field.type === 'select' || field.type === 'tri') && (value === 'any' || value === '')) return false;
  if (Array.isArray(value) && value.length === 0) return false;
  if (typeof value === 'object' && !Array.isArray(value)) {
    if (!value.min && !value.max && !value.from && !value.to && (value.value === undefined || value.value === '') && (!value.values || !value.values.length)) {
      return false;
    }
  }
  const baseline = field.defaultValue ?? (
    field.type === 'multi' || field.type === 'arrayIncludes' || field.type === 'multiContains' ? [] :
    field.type === 'tri' || field.type === 'select' ? 'any' :
    field.type === 'range' ? { min: '', max: '' } :
    field.type === 'dateRange' ? { from: '', to: '' } :
    ''
  );
  return JSON.stringify(value) !== JSON.stringify(baseline);
}

function matchField(row, field, filterValue) {
  if (!isFilterActive(filterValue, field)) return true;
  const raw = getNestedValue(row, field.accessor || field.key);

  switch (field.type) {
    case 'text':
    case 'combobox':
      return matchText(raw, filterValue, field.operator || 'contains');
    case 'tri':
      return matchTriState(raw, filterValue);
    case 'select':
      return matchSelect(raw, [filterValue].filter((item) => item && item !== 'any'));
    case 'multi':
      return matchSelect(raw, filterValue);
    case 'multiContains':
      return matchMultiContains(raw, filterValue);
    case 'arrayIncludes':
      return matchArrayIncludes(raw, filterValue);
    case 'range':
      return matchNumberRange(raw, filterValue);
    case 'dateRange':
      return matchDateRange(raw, filterValue);
    default:
      return true;
  }
}

export function applyTableFilters(items = [], filters = {}, schema, { match = 'all' } = {}) {
  if (!schema?.groups || !Array.isArray(schema.groups) || !filters) return items;
  const activeFields = [];
  schema.groups.forEach((group) => {
    (group.fields || []).forEach((field) => {
      if (field.type === 'section') return;
      if (isFilterActive(filters[field.key], field)) {
        activeFields.push(field);
      }
    });
  });

  if (!activeFields.length) return items;

  return items.filter((row) => {
    const checks = activeFields.map((field) => matchField(row, field, filters[field.key]));
    return match === 'any' ? checks.some(Boolean) : checks.every(Boolean);
  });
}

export function summarizeActiveFilters(filters, schema) {
  if (!schema?.groups || !Array.isArray(schema.groups) || !filters) return [];
  const summaries = [];
  schema.groups.forEach((group) => {
    (group.fields || []).forEach((field) => {
      if (field.type === 'section') return;
      const value = filters[field.key];
      if (!isFilterActive(value, field)) return;
      let label = field.label;
      if (field.type === 'text' && value) label += `: “${value}”`;
      else if (field.type === 'combobox' && value) label += `: “${value}”`;
      else if (field.type === 'tri' && value !== 'any') label += `: ${value === 'yes' ? 'Yes' : 'No'}`;
      else if ((field.type === 'multi' || field.type === 'arrayIncludes') && value?.length) {
        const displayLabels = value.map((val) => {
          const matchOpt = (field.options || []).find((opt) => String(opt.value) === String(val));
          return matchOpt ? matchOpt.label : val;
        });
        label += `: ${displayLabels.join(', ')}`;
      } else if (field.type === 'select' && value && value !== 'any') {
        const matchOpt = (field.options || []).find((opt) => String(opt.value) === String(value));
        label += `: ${matchOpt ? matchOpt.label : value}`;
      } else if (field.type === 'range' && (value?.min || value?.max)) {
        label += `: ${value.min || '…'} – ${value.max || '…'}`;
      } else if (field.type === 'dateRange' && (value?.from || value?.to)) {
        label += `: ${value.from || '…'} – ${value.to || '…'}`;
      }
      summaries.push({ key: field.key, label });
    });
  });
  return summaries;
}
