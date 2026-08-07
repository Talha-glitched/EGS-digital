import { Trash2, X } from 'lucide-react';
import { cn } from './primitives.jsx';
import { pluralize } from '../../constants/pluralForms.js';

export function BulkSelectCheckbox({
  checked,
  indeterminate = false,
  onChange,
  'aria-label': ariaLabel,
  className,
}) {
  return (
    <input
      type="checkbox"
      className={cn('crm-bulk-select-checkbox', className)}
      checked={checked}
      ref={(el) => {
        if (el) el.indeterminate = indeterminate;
      }}
      onChange={onChange}
      onClick={(e) => e.stopPropagation()}
      aria-label={ariaLabel}
    />
  );
}

export function BulkSelectHeaderCell({ selection, ariaLabel = 'Select all rows' }) {
  return (
    <th className="crm-bulk-select-col">
      <BulkSelectCheckbox
        checked={selection.allSelected}
        indeterminate={selection.someSelected && !selection.allSelected}
        onChange={selection.toggleSelectAll}
        aria-label={ariaLabel}
      />
    </th>
  );
}

export function BulkSelectRowCell({ id, selection, ariaLabel }) {
  return (
    <td className="crm-bulk-select-col" onClick={(e) => e.stopPropagation()}>
      <BulkSelectCheckbox
        checked={selection.isSelected(id)}
        onChange={(e) => selection.toggleSelect(id, e)}
        aria-label={ariaLabel}
      />
    </td>
  );
}

export function BulkSelectionBar({
  count,
  noun = 'item',
  onDelete,
  onClear,
  deleting = false,
  className,
}) {
  if (!count) return null;
  const label = pluralize(noun, count);

  return (
    <div className={cn('crm-bulk-selection-bar', className)} role="status">
      <span className="crm-bulk-selection-count">{label} selected</span>
      <div className="crm-bulk-selection-actions">
        <button
          type="button"
          onClick={onDelete}
          disabled={deleting}
          className="crm-bulk-selection-delete"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete
        </button>
        <button
          type="button"
          onClick={onClear}
          disabled={deleting}
          className="crm-bulk-selection-clear"
          aria-label="Clear selection"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
