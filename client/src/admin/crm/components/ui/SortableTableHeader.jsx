import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { cn } from './primitives.jsx';
import { TableHeaderLabel } from './InfoTip.jsx';

function SortIcon({ active, direction }) {
  if (!active) {
    return <ArrowUpDown className="crm-sort-icon is-idle" aria-hidden />;
  }
  if (direction === 'desc') {
    return <ArrowDown className="crm-sort-icon is-active" aria-hidden />;
  }
  return <ArrowUp className="crm-sort-icon is-active" aria-hidden />;
}

export function SortableTableHeader({
  label,
  sortKey,
  activeKey,
  direction,
  onSort,
  align = 'left',
  className,
  hint,
  disabled = false,
}) {
  const active = activeKey === sortKey;
  const ariaSort = active ? (direction === 'asc' ? 'ascending' : 'descending') : 'none';

  return (
    <th
      className={cn(
        'crm-sortable-th',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        className,
      )}
      aria-sort={ariaSort}
    >
      <button
        type="button"
        className={cn('crm-sortable-btn', active && 'is-active', align === 'right' && 'is-right', align === 'center' && 'is-center')}
        onClick={() => !disabled && onSort?.(sortKey)}
        disabled={disabled}
        title={active ? `Sorted ${direction === 'asc' ? 'ascending' : 'descending'}. Click to reverse.` : `Sort by ${label}`}
      >
        <span className="crm-sortable-label">
          {hint ? (
            <TableHeaderLabel label={label} hint={hint} align={align} />
          ) : (
            label
          )}
        </span>
        <SortIcon active={active} direction={direction} />
      </button>
    </th>
  );
}

export function TableSortIndicator({ sortKey, sortDir, sortLabel, onToggle, onClear, className }) {
  if (!sortKey) return null;

  return (
    <div className={cn('crm-table-sort-indicator', className)}>
      <span className="crm-table-sort-indicator-label">Sorted by {sortLabel || sortKey}</span>
      <button type="button" className="crm-table-sort-indicator-btn" onClick={onToggle}>
        {sortDir === 'asc' ? 'Reverse ↓' : 'Reverse ↑'}
      </button>
      <button type="button" className="crm-table-sort-indicator-clear" onClick={onClear}>
        Clear
      </button>
    </div>
  );
}
