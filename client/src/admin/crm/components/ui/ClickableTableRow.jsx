import { cn } from './primitives.jsx';

const INTERACTIVE_SELECTOR = 'a, button, input, select, textarea, [data-row-ignore]';

export function stopRowClick(event) {
  event.stopPropagation();
}

export default function ClickableTableRow({ onClick, className, children, ...props }) {
  const clickable = Boolean(onClick);

  function handleClick(event) {
    if (!onClick) return;
    if (event.target.closest(INTERACTIVE_SELECTOR)) return;
    onClick(event);
  }

  function handleKeyDown(event) {
    if (!onClick) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClick(event);
    }
  }

  return (
    <tr
      className={cn('crm-table-row', clickable && 'is-clickable', className)}
      onClick={handleClick}
      onKeyDown={clickable ? handleKeyDown : undefined}
      tabIndex={clickable ? 0 : undefined}
      role={clickable ? 'button' : undefined}
      {...props}
    >
      {children}
    </tr>
  );
}
