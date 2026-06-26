import { cn } from './primitives.jsx';

export default function DataTableShell({ children, minWidth, className = '' }) {
  return (
    <div className={cn('crm-table-scroll', className)}>
      {minWidth ? (
        <div style={{ minWidth: typeof minWidth === 'number' ? `${minWidth}px` : minWidth }}>
          {children}
        </div>
      ) : (
        children
      )}
    </div>
  );
}
