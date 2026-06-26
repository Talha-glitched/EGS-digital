import { Trash2 } from 'lucide-react';
import { cn } from './primitives.jsx';

export default function DeleteIconButton({
  onClick,
  label = 'Delete',
  disabled = false,
  className = '',
  size = 'sm',
}) {
  const sizeClass = size === 'sm' ? 'h-7 w-7' : 'h-8 w-8';
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
