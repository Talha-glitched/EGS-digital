import { Trash2 } from 'lucide-react';
import { cn } from './primitives.jsx';

export default function DeleteIconButton({
  onClick,
  label = 'Delete',
  disabled = false,
  className = '',
  size = 'sm',
}) {
  // Visible box grows toward the 44px touch-target floor without the icon glyph
  // itself getting bigger — 'sm' is used in tight kanban cards where a full 44px
  // button would overwhelm the layout, so it gets the largest bump that still fits.
  const sizeClass = size === 'sm' ? 'h-9 w-9' : 'h-11 w-11';
  const iconClass = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        'crm-icon-btn inline-flex items-center justify-center rounded-md text-neutral-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40',
        sizeClass,
        className,
      )}
    >
      <Trash2 className={iconClass} strokeWidth={2} />
    </button>
  );
}
