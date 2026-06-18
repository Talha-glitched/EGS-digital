import { Mail, CheckCircle, AlertTriangle, XCircle, Send } from 'lucide-react';
import { cn } from '../ui/primitives.jsx';

const STATUS_CONFIG = {
  'Pending Inqueue': { className: 'bg-amber-50 text-amber-800 ring-amber-200/70', icon: Mail, short: 'Pending' },
  'Emailed Outbound': { className: 'bg-sky-50 text-sky-800 ring-sky-200/70', icon: Send, short: 'Emailed' },
  'Bounced / Invalid': { className: 'bg-red-50 text-red-800 ring-red-200/70', icon: AlertTriangle, short: 'Bounced' },
  'Opted Out': { className: 'bg-neutral-100 text-neutral-700 ring-neutral-200/70', icon: XCircle, short: 'Opted out' },
  Replied: { className: 'bg-emerald-50 text-emerald-800 ring-emerald-200/70', icon: CheckCircle, short: 'Replied' },
};

export function DeliveryStatusBadge({ status }) {
  const config = STATUS_CONFIG[status] || {
    className: 'bg-neutral-100 text-neutral-600 ring-neutral-200/70',
    icon: null,
    short: status,
  };
  const Icon = config.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset',
        config.className
      )}
    >
      {Icon && <Icon className="h-3 w-3" strokeWidth={2} />}
      {config.short}
    </span>
  );
}

const SOURCE_STYLES = {
  Apollo: 'bg-violet-50 text-violet-700 ring-violet-200/60',
  Hunter: 'bg-orange-50 text-orange-700 ring-orange-200/60',
  Lusha: 'bg-cyan-50 text-cyan-700 ring-cyan-200/60',
  Manual: 'bg-neutral-100 text-neutral-600 ring-neutral-200/60',
};

export function SourceAttributionChips({ sources = [], primarySource }) {
  if (!sources.length) return <span className="text-xs text-neutral-300">—</span>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {sources.map((source) => {
        const isPrimary = source === primarySource;
        return (
          <span
            key={source}
            className={cn(
              'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset',
              SOURCE_STYLES[source] || SOURCE_STYLES.Manual,
              isPrimary && 'ring-2 ring-current/30'
            )}
            title={isPrimary ? 'Primary source' : 'Also found via'}
          >
            {source}
            {isPrimary && <span className="h-1 w-1 rounded-full bg-current opacity-70" />}
          </span>
        );
      })}
    </div>
  );
}
