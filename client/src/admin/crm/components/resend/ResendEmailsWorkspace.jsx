import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Mail,
  Search,
  RefreshCw,
  CheckCircle2,
  BarChart3,
  Link2,
  Zap,
} from 'lucide-react';
import {
  Alert,
  Card,
  CardHeader,
  EmptyState,
  MetricGrid,
  StatCard,
  cn,
} from '../ui/primitives.jsx';
import ResendStatusBadge from './ResendStatusBadge.jsx';

const STATUS_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'delivered', label: 'Delivered' },
  { id: 'opened', label: 'Opened' },
  { id: 'clicked', label: 'Clicked' },
  { id: 'received', label: 'Received' },
  { id: 'bounced', label: 'Bounced' },
  { id: 'failed', label: 'Failed' },
];

function formatSentAt(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-AE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function MetricsSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-hidden="true">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-24 animate-pulse rounded-xl bg-neutral-100" />
      ))}
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="space-y-2 p-4" aria-hidden="true">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-10 animate-pulse rounded bg-neutral-100" />
      ))}
    </div>
  );
}

export default function ResendEmailsWorkspace({
  metrics,
  loading = false,
  refreshing = false,
  onRefresh,
  search = '',
  onSearchChange,
  statusFilter = 'all',
  onStatusFilterChange,
}) {
  const filteredEmails = useMemo(() => {
    const emails = metrics?.emails || [];
    const query = search.trim().toLowerCase();

    return emails.filter((email) => {
      const status = String(email.status || '').toLowerCase();
      if (statusFilter !== 'all' && status !== statusFilter) return false;

      if (!query) return true;

      const to = Array.isArray(email.to) ? email.to.join(' ') : String(email.to || '');
      const subject = String(email.subject || '');
      const from = String(email.from || '');
      const haystack = `${to} ${subject} ${from}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [metrics?.emails, search, statusFilter]);

  if (metrics?.error) {
    return (
      <Alert tone="warning">
        Failed to communicate with Resend API: {metrics.error}. Check if your RESEND_API_KEY is configured in your server environment.
      </Alert>
    );
  }

  if (!metrics?.configured) {
    return (
      <EmptyState
        icon={Zap}
        title="Resend API key not configured"
        description="Add RESEND_API_KEY to your server environment variables to view delivery logs."
        action={(
          <Link to="/admin/crm/settings/email" className="crm-btn-primary text-xs">
            Open email settings
          </Link>
        )}
      />
    );
  }

  return (
    <div className="space-y-4">
      {loading && !metrics ? (
        <MetricsSkeleton />
      ) : (
        <MetricGrid cols={4}>
          <StatCard label="Total sent" value={metrics.total} icon={Mail} tone="brand" />
          <StatCard
            label="Deliverability"
            value={metrics.rates.deliverability}
            icon={CheckCircle2}
            tone="success"
            helpText={`${metrics.delivered} of ${metrics.total} delivered`}
          />
          <StatCard
            label="Open rate"
            value={metrics.rates.open}
            icon={BarChart3}
            tone="info"
            helpText={`${metrics.opened} opens tracked`}
          />
          <StatCard
            label="Click rate"
            value={metrics.rates.click}
            icon={Link2}
            tone="success"
            helpText={`${metrics.clicked} link clicks`}
          />
        </MetricGrid>
      )}

      <Card>
        <CardHeader
          title="Resend deliveries"
          subtitle="Latest 100 emails sent through the Resend API."
          action={(
            <button
              type="button"
              onClick={onRefresh}
              disabled={refreshing}
              className="crm-btn-secondary flex items-center gap-1.5 !py-1.5 text-[11px]"
            >
              <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />
              {refreshing ? 'Refreshing…' : 'Refresh'}
            </button>
          )}
        />

        <div className="border-b border-[var(--color-line)] px-4 py-3">
          <div className="flex flex-wrap gap-2">
            {STATUS_FILTERS.map((filter) => (
              <button
                key={filter.id}
                type="button"
                onClick={() => onStatusFilterChange(filter.id)}
                className={cn(
                  'rounded-lg border px-3 py-1.5 text-xs font-semibold transition duration-200',
                  statusFilter === filter.id
                    ? 'border-brand/30 bg-brand-soft text-brand'
                    : 'border-[var(--color-line)] bg-white text-neutral-600 hover:border-neutral-300',
                )}
              >
                {filter.label}
              </button>
            ))}
          </div>

          <label className="relative mt-3 block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search recipient, subject, or from address…"
              className="crm-input w-full py-2 pl-9 text-xs"
            />
          </label>
        </div>

        {loading && !metrics?.emails?.length ? (
          <TableSkeleton />
        ) : filteredEmails.length === 0 ? (
          <EmptyState
            icon={Mail}
            title={search || statusFilter !== 'all' ? 'No matching emails' : 'No recent sends'}
            description={
              search || statusFilter !== 'all'
                ? 'Try adjusting your search or status filter.'
                : 'Campaign messages sent through Resend will appear here once processed.'
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-[var(--color-line)] bg-neutral-50/50 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                  <th className="px-4 py-2.5">To</th>
                  <th className="px-4 py-2.5">Subject</th>
                  <th className="px-4 py-2.5">From</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5">Date sent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-line)]">
                {filteredEmails.map((email) => (
                  <tr key={email.id} className="transition hover:bg-neutral-50/50">
                    <td className="max-w-[180px] truncate px-4 py-2.5 font-medium text-[var(--color-ink)]">
                      {Array.isArray(email.to) ? email.to.join(', ') : email.to}
                    </td>
                    <td className="max-w-[280px] truncate px-4 py-2.5 text-neutral-600">
                      {email.subject || '(No subject)'}
                    </td>
                    <td className="max-w-[200px] truncate px-4 py-2.5 text-neutral-500">
                      {email.from}
                    </td>
                    <td className="px-4 py-2.5">
                      <ResendStatusBadge status={email.status} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-neutral-400">
                      {formatSentAt(email.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && filteredEmails.length > 0 && (
          <div className="border-t border-[var(--color-line)] px-4 py-2.5 text-[11px] text-neutral-400">
            Showing {filteredEmails.length} of {metrics.emails?.length || 0} emails
          </div>
        )}
      </Card>
    </div>
  );
}
