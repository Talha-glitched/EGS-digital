import { cn } from './primitives.jsx';

const LABELS = {
  pending: 'Editing…',
  saving: 'Saving…',
  saved: 'All changes saved',
  error: 'Couldn’t save — check errors above',
};

export default function AutoSaveIndicator({ status, className = '' }) {
  if (!status || status === 'idle') return null;
  const label = LABELS[status];
  if (!label) return null;

  return (
    <span
      className={cn(
        'text-xs font-medium',
        status === 'error' ? 'text-red-600' : 'text-neutral-500',
        className,
      )}
      aria-live="polite"
    >
      {label}
    </span>
  );
}
