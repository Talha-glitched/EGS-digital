import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Mail,
  Search,
  RefreshCw,
  CheckCircle2,
  BarChart3,
  Link2,
  Zap,
  MessageSquare,
  ArrowDownLeft,
} from 'lucide-react';
import {
  Alert,
  Card,
  CardHeader,
  EmptyState,
  MetricGrid,
  StatCard,
  Badge,
  cn,
} from '../ui/primitives.jsx';
import Drawer from '../ui/Drawer.jsx';
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
  const [selectedEmail, setSelectedEmail] = useState(null);

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
      const replyText = String(email.reply?.text || '');
      const haystack = `${to} ${subject} ${from} ${replyText}`.toLowerCase();
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

  const recipientDisplay = (to) => (Array.isArray(to) ? to.join(', ') : to);

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
          subtitle="Outbound delivery logs sent through the Resend API."
          action={(
            <button
              type="button"
              onClick={onRefresh}
              disabled={refreshing}
              className="crm-btn-secondary flex items-center gap-1.5 !py-1.5 text-xs"
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
              placeholder="Search recipient, subject, from address, or reply body…"
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
                <tr className="border-b border-[var(--color-line)] bg-neutral-50/50 text-2xs font-semibold uppercase tracking-wider text-neutral-500">
                  <th className="px-4 py-2.5">To</th>
                  <th className="px-4 py-2.5">Subject</th>
                  <th className="px-4 py-2.5">From</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5">Date sent</th>
                  <th className="px-4 py-2.5 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-line)]">
                {filteredEmails.map((email) => {
                  const isReceived = email.status === 'received' || Boolean(email.reply);
                  return (
                    <tr
                      key={email.id}
                      onClick={() => setSelectedEmail(email)}
                      className={cn(
                        'cursor-pointer transition hover:bg-neutral-50/80',
                        isReceived && 'bg-emerald-50/30 hover:bg-emerald-50/60'
                      )}
                    >
                      <td className="max-w-[180px] truncate px-4 py-2.5 font-medium text-[var(--color-ink)]">
                        {recipientDisplay(email.to)}
                      </td>
                      <td className="max-w-[280px] truncate px-4 py-2.5 text-neutral-600">
                        {email.subject || '(No subject)'}
                      </td>
                      <td className="max-w-[200px] truncate px-4 py-2.5 text-neutral-500">
                        {email.from}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <ResendStatusBadge status={email.status} />
                          {isReceived && (
                            <span className="inline-flex items-center gap-1 text-2xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                              <MessageSquare className="h-3 w-3" />
                              Replied
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-neutral-400">
                        {formatSentAt(email.createdAt)}
                      </td>
                      <td className="px-4 py-2.5 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedEmail(email);
                          }}
                          className={cn(
                            'text-xs font-semibold transition',
                            isReceived
                              ? 'text-emerald-700 hover:text-emerald-900 underline'
                              : 'text-neutral-500 hover:text-neutral-800'
                          )}
                        >
                          {isReceived ? 'View Reply' : 'View'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!loading && filteredEmails.length > 0 && (
          <div className="border-t border-[var(--color-line)] px-4 py-2.5 text-xs text-neutral-400">
            Showing {filteredEmails.length} of {metrics.emails?.length || 0} emails
          </div>
        )}
      </Card>

      {/* Reply & Email Details Drawer */}
      <Drawer
        open={Boolean(selectedEmail)}
        onClose={() => setSelectedEmail(null)}
        title="Email Delivery Details"
        subtitle={`Resend Message ID: ${selectedEmail?.id || '—'}`}
        size="lg"
      >
        {selectedEmail && (
          <div className="space-y-6">
            {/* Outbound Email Metadata Card */}
            <div className="bg-neutral-50 border border-[var(--color-line)] rounded-xl p-4 space-y-3 text-xs">
              <div className="flex items-center justify-between border-b border-neutral-200 pb-2">
                <span className="font-bold text-[var(--color-ink)] uppercase tracking-wider text-xs">Outbound Outreach</span>
                <ResendStatusBadge status={selectedEmail.status} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-neutral-600">
                <div>
                  <span className="block text-2xs text-neutral-400 font-semibold uppercase">To</span>
                  <span className="font-medium text-[var(--color-ink)]">{recipientDisplay(selectedEmail.to)}</span>
                </div>
                <div>
                  <span className="block text-2xs text-neutral-400 font-semibold uppercase">From</span>
                  <span className="font-medium text-[var(--color-ink)]">{selectedEmail.from}</span>
                </div>
                <div className="sm:col-span-2">
                  <span className="block text-2xs text-neutral-400 font-semibold uppercase">Subject</span>
                  <span className="font-medium text-[var(--color-ink)]">{selectedEmail.subject || '(No subject)'}</span>
                </div>
                <div>
                  <span className="block text-2xs text-neutral-400 font-semibold uppercase">Sent At</span>
                  <span className="font-medium text-[var(--color-ink)]">{formatSentAt(selectedEmail.createdAt)}</span>
                </div>
              </div>
              {selectedEmail.body && (
                <div className="pt-2 border-t border-neutral-200">
                  <span className="block text-2xs text-neutral-400 font-semibold uppercase mb-1.5">Outbound Message Body</span>
                  <div className="bg-white border border-neutral-200 rounded-lg p-3 text-xs text-neutral-800 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto font-mono">
                    {selectedEmail.body}
                  </div>
                </div>
              )}
            </div>

            {/* Inbound Prospect Reply Section */}
            {selectedEmail.reply ? (
              <div className="border border-emerald-200 bg-emerald-50/40 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-emerald-200/80 pb-2">
                  <div className="flex items-center gap-2">
                    <ArrowDownLeft className="h-4 w-4 text-emerald-600" />
                    <span className="font-bold text-emerald-900 text-xs">Inbound Prospect Reply</span>
                  </div>
                  <Badge tone={selectedEmail.reply.intent === 'Interested' ? 'success' : selectedEmail.reply.intent === 'Opt Out' ? 'critical' : 'info'}>
                    {selectedEmail.reply.intent || 'Neutral'}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-neutral-600">
                  <div>
                    <span className="block text-2xs text-neutral-400 font-semibold uppercase">Replied From</span>
                    <span className="font-medium text-[var(--color-ink)]">{selectedEmail.reply.from || recipientDisplay(selectedEmail.to)}</span>
                  </div>
                  <div>
                    <span className="block text-2xs text-neutral-400 font-semibold uppercase">Received Date</span>
                    <span className="font-medium text-[var(--color-ink)]">{formatSentAt(selectedEmail.reply.receivedAt)}</span>
                  </div>
                  {selectedEmail.reply.subject && (
                    <div className="sm:col-span-2">
                      <span className="block text-2xs text-neutral-400 font-semibold uppercase">Reply Subject</span>
                      <span className="font-medium text-[var(--color-ink)]">{selectedEmail.reply.subject}</span>
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-emerald-200/60">
                  <span className="block text-2xs text-neutral-400 font-semibold uppercase mb-1.5">Reply Body</span>
                  <div className="bg-white border border-emerald-200 rounded-lg p-3 text-xs text-neutral-800 whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto font-mono">
                    {(selectedEmail.reply.text && selectedEmail.reply.text.trim() !== '')
                      ? selectedEmail.reply.text
                      : '(No text body provided in inbound email)'}
                  </div>
                </div>
              </div>
            ) : selectedEmail.status === 'received' ? (
              <div className="p-4 rounded-xl bg-sky-50 border border-sky-200 text-xs text-sky-800 space-y-1">
                <span className="font-bold block">Reply Registered</span>
                <p>Prospect replied to this outreach email. Details are synced in lead interaction history.</p>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 text-xs text-neutral-500 text-center">
                No inbound reply received for this outreach email yet.
              </div>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}
