const STATUS_CONFIGS = {
  sent: { bg: 'bg-neutral-100 text-neutral-700', label: 'Sent' },
  delivered: { bg: 'bg-emerald-50 text-emerald-700', label: 'Delivered' },
  opened: { bg: 'bg-sky-50 text-sky-700', label: 'Opened' },
  clicked: { bg: 'bg-violet-50 text-violet-700', label: 'Clicked' },
  bounced: { bg: 'bg-red-50 text-red-700', label: 'Bounced' },
  complained: { bg: 'bg-amber-50 text-amber-800', label: 'Spam' },
  failed: { bg: 'bg-red-100 text-red-800', label: 'Failed' },
  received: { bg: 'bg-teal-50 text-teal-700', label: 'Received' },
};

export default function ResendStatusBadge({ status }) {
  const key = String(status || '').toLowerCase();
  const config = STATUS_CONFIGS[key] || { bg: 'bg-neutral-100 text-neutral-700', label: status || 'Unknown' };

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${config.bg}`}>
      {config.label}
    </span>
  );
}
