import { CheckCircle2, UserRound } from 'lucide-react';
import { cn } from '../ui/primitives.jsx';
import { getPocOption } from '../../constants/pocQualification.js';

const TONE_CLASSES = {
  neutral: 'bg-neutral-100 text-neutral-600 ring-neutral-200/70',
  success: 'bg-emerald-50 text-emerald-700 ring-emerald-200/70',
  info: 'bg-sky-50 text-sky-700 ring-sky-200/70',
  warning: 'bg-amber-50 text-amber-800 ring-amber-200/70',
  danger: 'bg-red-50 text-red-700 ring-red-200/70',
};

export function PocQualificationBadge({ status = 'Unverified', compact = false }) {
  const option = getPocOption(status || 'Unverified');
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-semibold ring-1 ring-inset',
        compact ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-[11px]',
        TONE_CLASSES[option.tone] || TONE_CLASSES.neutral,
      )}
      title={option.description}
    >
      {option.value === 'Confirmed' && <CheckCircle2 className="h-3 w-3" strokeWidth={2} />}
      {option.value === 'Unverified' && <UserRound className="h-3 w-3" strokeWidth={2} />}
      {compact ? option.label.replace('Redirected — ', '↪ ').replace('Not verified yet', 'Unverified') : option.label}
    </span>
  );
}

export default PocQualificationBadge;
