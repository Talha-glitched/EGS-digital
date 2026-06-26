import { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { useOverlayTransition } from '../ui/useOverlayTransition.js';
import { cn } from '../ui/primitives.jsx';

const TONE_STYLES = {
  success: {
    wrap: 'border-emerald-200/80 bg-white text-emerald-900 shadow-emerald-100/50',
    icon: 'text-emerald-500',
    Icon: CheckCircle2,
  },
  error: {
    wrap: 'border-red-200/80 bg-white text-red-900 shadow-red-100/50',
    icon: 'text-red-500',
    Icon: AlertCircle,
  },
  warning: {
    wrap: 'border-amber-200/80 bg-white text-amber-900 shadow-amber-100/50',
    icon: 'text-amber-500',
    Icon: Info,
  },
  info: {
    wrap: 'border-sky-200/80 bg-white text-sky-900 shadow-sky-100/50',
    icon: 'text-sky-500',
    Icon: Info,
  },
};

export default function SequenceStudioToast({
  message,
  tone = 'success',
  onDismiss,
  autoDismissMs = 4200,
}) {
  const open = Boolean(message);
  const { mounted, visible, exiting } = useOverlayTransition(open, { enterMs: 220, exitMs: 200 });
  const style = TONE_STYLES[tone] || TONE_STYLES.success;
  const Icon = style.Icon;

  useEffect(() => {
    if (!message || !onDismiss) return undefined;
    const timer = window.setTimeout(onDismiss, autoDismissMs);
    return () => clearTimeout(timer);
  }, [message, onDismiss, autoDismissMs]);

  if (!mounted) return null;

  return (
    <div
      className={cn(
        'crm-seq-studio-toast',
        visible && !exiting && 'is-visible',
        exiting && 'is-exiting',
      )}
      role="status"
      aria-live="polite"
    >
      <div className={cn('crm-seq-studio-toast-inner', style.wrap)}>
        <Icon className={cn('h-4 w-4 shrink-0', style.icon)} />
        <span className="text-sm font-medium leading-snug">{message}</span>
        <button type="button" onClick={onDismiss} className="crm-seq-studio-toast-dismiss" aria-label="Dismiss">
          ×
        </button>
      </div>
    </div>
  );
}
