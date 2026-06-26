import { cn } from './primitives.jsx';

export const PAGE_SIZE_OPTIONS = [25, 50, 100, 200];

export default function TablePagination({
  page,
  limit,
  total,
  onPageChange,
  onLimitChange,
  noun = 'records',
  className = '',
}) {
  if (!total) return null;

  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);
  const canPrev = page > 1;
  const canNext = page * limit < total;

  return (
    <div className={cn('crm-table-pagination', className)}>
      <span className="crm-table-pagination-summary">
        Showing {start}–{end} of {total} {noun}
      </span>
      <div className="crm-table-pagination-controls">
        <label className="crm-table-pagination-size">
          <span className="crm-table-pagination-size-label">Rows per page</span>
          <select
            className="crm-select crm-table-pagination-select"
            value={limit}
            onChange={(e) => onLimitChange(Number(e.target.value))}
            aria-label="Rows per page"
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
        </label>
        <button
          type="button"
          disabled={!canPrev}
          onClick={() => onPageChange(page - 1)}
          className="crm-btn-secondary crm-table-pagination-btn"
        >
          Previous
        </button>
        <button
          type="button"
          disabled={!canNext}
          onClick={() => onPageChange(page + 1)}
          className="crm-btn-secondary crm-table-pagination-btn"
        >
          Next
        </button>
      </div>
    </div>
  );
}
