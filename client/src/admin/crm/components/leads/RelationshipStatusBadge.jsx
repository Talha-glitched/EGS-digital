import { cn } from '../ui/primitives.jsx';
import { getRelationshipOption } from '../../constants/relationshipProfile.js';

const TONE_CLASSES = {
  neutral: 'bg-neutral-100 text-neutral-600 ring-neutral-200/70',
  success: 'bg-emerald-50 text-emerald-700 ring-emerald-200/70',
  info: 'bg-sky-50 text-sky-700 ring-sky-200/70',
  warning: 'bg-amber-50 text-amber-800 ring-amber-200/70',
  danger: 'bg-red-50 text-red-700 ring-red-200/70',
};

export default function RelationshipStatusBadge({ status = 'New', compact = false }) {
  const option = getRelationshipOption(status);
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-semibold ring-1 ring-inset',
        compact ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-[11px]',
        TONE_CLASSES[option.tone] || TONE_CLASSES.neutral,
      )}
      title={option.description}
    >
      {option.label}
    </span>
  );
}
