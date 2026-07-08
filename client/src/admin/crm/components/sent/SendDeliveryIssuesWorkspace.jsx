import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  Clock3,
  Mail,
  Search,
  SendHorizontal,
  XCircle,
} from 'lucide-react';
import { cn, EmptyState } from '../ui/primitives.jsx';

function formatWhen(value) {
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

function severityTone(severity) {
  if (severity === 'error') return 'danger';
  if (severity === 'warning') return 'warning';
  return 'info';
}

function IssueBadge({ issue }) {
  const tone = severityTone(issue?.error?.severity);
  return (
    <span className={cn(
      'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
      tone === 'danger' && 'bg-red-50 text-red-700',
      tone === 'warning' && 'bg-amber-50 text-amber-800',
      tone === 'info' && 'bg-sky-50 text-sky-700',
    )}
    >
      {issue?.error?.title || issue?.statusLabel || 'Issue'}
    </span>
  );
}

function DeliveryIssueDetail({ issue }) {
  if (!issue) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
        <AlertTriangle className="mb-3 h-8 w-8 text-neutral-300" strokeWidth={1.5} />
        <p className="text-sm font-medium text-neutral-500">Select a delivery issue to see what went wrong.</p>
      </div>
    );
  }

  const error = issue.error || {};
  const contactName = issue.lead?.name || issue.recipientEmail || 'Contact';

  return (
    <div className="crm-scroll flex min-h-0 flex-1 flex-col overflow-y-auto">
      <div className="border-b border-[var(--color-line)] bg-white px-6 py-5 shrink-0">
        <div className="flex flex-wrap items-center gap-2">
          <IssueBadge issue={issue} />
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
            {issue.statusLabel} · Step {issue.stepNumber}
          </span>
        </div>
        <h2 className="mt-2 text-lg font-semibold leading-snug text-[var(--color-ink)]">
          {error.title || 'Delivery issue'}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-neutral-600">
          {error.description || issue.errorMessage || 'No details recorded for this delivery attempt.'}
        </p>
        {error.action ? (
          <p className="mt-3 rounded-lg border border-amber-200/80 bg-amber-50/70 px-3 py-2 text-xs leading-relaxed text-amber-900">
            <span className="font-semibold">Suggested fix: </span>
            {error.action}
          </p>
        ) : null}

        <dl className="mt-4 grid gap-3 text-xs sm:grid-cols-2">
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">Contact</dt>
            <dd className="mt-0.5 font-medium text-[var(--color-ink)]">{contactName}</dd>
            <dd className="text-neutral-500">{issue.recipientEmail || issue.lead?.email || '—'}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">Updated</dt>
            <dd className="mt-0.5 font-medium text-[var(--color-ink)]">{formatWhen(issue.updatedAt || issue.scheduledFor)}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">Company</dt>
            <dd className="mt-0.5 text-[var(--color-ink)]">{issue.company?.companyName || '—'}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">Sequence</dt>
            <dd className="mt-0.5 text-[var(--color-ink)]">{issue.sequence?.name || '—'}</dd>
          </div>
        </dl>

        {issue.errorMessage && issue.errorMessage !== error.description ? (
          <p className="mt-4 rounded-lg border border-[var(--color-line)] bg-neutral-50 px-3 py-2 text-[11px] font-mono text-neutral-600">
            {issue.errorMessage}
          </p>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2">
          {issue.campaign?._id ? (
            <Link to={`/admin/crm/projects/${issue.campaign._id}`} className="crm-btn-secondary !py-1.5 text-[11px]">
              Open campaign
            </Link>
          ) : null}
          {issue.sequence?._id ? (
            <Link to={`/admin/crm/sequences?edit=${issue.sequence._id}`} className="crm-btn-secondary !py-1.5 text-[11px]">
              Open sequence
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function SendDeliveryIssuesWorkspace({
  issues = [],
  total = 0,
  summary = {},
  campaigns = [],
  campaignId = '',
  onCampaignChange,
  search = '',
  onSearchChange,
  page = 1,
  pages = 0,
  onPageChange,
  loading = false,
  view = 'failed',
}) {
  const [activeId, setActiveId] = useState('');

  useEffect(() => {
    if (!issues.length) {
      setActiveId('');
      return;
    }
    if (!issues.some((row) => row._id === activeId)) {
      setActiveId(issues[0]._id);
    }
  }, [issues, activeId]);

  const activeIssue = useMemo(
    () => issues.find((row) => row._id === activeId) || issues[0] || null,
    [activeId, issues],
  );

  const title = view === 'queued' ? 'Queued sends' : 'Failed & blocked sends';
  const Icon = view === 'queued' ? Clock3 : XCircle;

  return (
    <div className="crm-card flex min-h-[560px] flex-col overflow-hidden md:h-[calc(100vh-168px)] md:flex-row">
      <aside className="flex h-80 w-full shrink-0 flex-col border-b border-[var(--color-line)] bg-neutral-50/40 md:h-auto md:w-[380px] md:border-b-0 md:border-r">
        <div className="border-b border-[var(--color-line)] bg-white px-5 py-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-[var(--color-ink)]">
            <Icon className="h-4 w-4 text-brand" strokeWidth={1.75} />
            {title}
            <span className="text-xs font-medium text-neutral-400">({total})</span>
          </h2>
          <p className="mt-1 text-[11px] text-neutral-500">
            {view === 'queued'
              ? `${summary.queued || 0} queued · ${summary.processing || 0} sending now`
              : `${summary.failed || 0} failed · ${summary.cancelled || 0} cancelled`}
          </p>

          <div className="mt-3 space-y-2">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
              <input
                type="search"
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search contact, company, error…"
                className="crm-input w-full py-2 pl-9 text-xs"
              />
            </label>
            <select
              value={campaignId}
              onChange={(e) => onCampaignChange(e.target.value)}
              className="crm-input w-full py-2 text-xs"
            >
              <option value="">All campaigns</option>
              {campaigns.map((campaign) => (
                <option key={campaign._id} value={campaign._id}>
                  {campaign.projectName || 'Campaign'}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="crm-scroll flex-1 overflow-y-auto">
          {loading && issues.length === 0 ? (
            <div className="p-6 text-center text-xs text-neutral-400">Loading delivery issues…</div>
          ) : issues.length === 0 ? (
            <EmptyState
              icon={view === 'queued' ? Clock3 : Mail}
              title={view === 'queued' ? 'Nothing in the send queue' : 'No failed sends'}
              body={view === 'queued'
                ? 'Pending sequence steps will appear here while they wait for the send worker.'
                : 'When a sequence send fails, the error and suggested fix will show up here.'}
            />
          ) : (
            issues.map((issue) => {
              const selected = activeIssue?._id === issue._id;
              return (
                <button
                  key={issue._id}
                  type="button"
                  onClick={() => setActiveId(issue._id)}
                  className={cn(
                    'block w-full border-b border-[var(--color-line)] px-5 py-4 text-left transition',
                    selected ? 'bg-white shadow-[inset_3px_0_0_0_var(--color-brand)]' : 'hover:bg-white/70',
                  )}
                >
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <IssueBadge issue={issue} />
                    <span className="shrink-0 text-[10px] text-neutral-400">Step {issue.stepNumber}</span>
                  </div>
                  <p className="truncate text-sm font-semibold text-[var(--color-ink)]">
                    {issue.lead?.name || issue.recipientEmail || 'Contact'}
                  </p>
                  <p className="truncate text-xs text-neutral-500">
                    {issue.company?.companyName || issue.sequence?.name || 'Sequence send'}
                  </p>
                  <p className="mt-1 text-[10px] text-neutral-400">{formatWhen(issue.updatedAt || issue.scheduledFor)}</p>
                </button>
              );
            })
          )}
        </div>

        {pages > 1 && (
          <div className="flex items-center justify-between border-t border-[var(--color-line)] bg-white px-4 py-3">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => onPageChange(page - 1)}
              className="crm-btn-ghost !py-1.5 text-[11px] disabled:opacity-40"
            >
              Previous
            </button>
            <span className="text-[11px] text-neutral-500">Page {page} of {pages}</span>
            <button
              type="button"
              disabled={page >= pages || loading}
              onClick={() => onPageChange(page + 1)}
              className="crm-btn-ghost !py-1.5 text-[11px] disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}
      </aside>

      <section className="flex min-h-[480px] min-w-0 flex-1 flex-col bg-white md:min-h-0">
        <DeliveryIssueDetail issue={activeIssue} />
      </section>
    </div>
  );
}

export function SequenceDeliveryAlert({ summary, compact = false }) {
  if (!summary) return null;
  const failed = summary.stats?.failed || 0;
  const queued = summary.stats?.queued || 0;
  const topError = summary.topError;

  if (compact && !failed) return null;
  if (!compact && !failed && !queued) return null;

  if (compact) {
    return (
      <div className="rounded-lg border border-red-200/80 bg-red-50/60 px-3 py-2.5">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold text-red-800">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          {failed ? `${failed} send${failed === 1 ? '' : 's'} failed` : null}
          {failed && queued ? ' · ' : null}
          {queued ? `${queued} queued` : null}
        </p>
        {topError?.title ? (
          <p className="mt-1 text-[10px] leading-relaxed text-red-700/90">
            Latest: {topError.title}
            {topError.action ? ` — ${topError.action}` : ''}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-red-200/80 bg-red-50/50 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-700">
          <SendHorizontal className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-red-900">Delivery issues detected</p>
          <p className="mt-1 text-xs leading-relaxed text-red-800/90">
            {failed ? `${failed} message${failed === 1 ? '' : 's'} failed to send.` : ''}
            {failed && queued ? ' ' : ''}
            {queued ? `${queued} message${queued === 1 ? ' is' : 's are'} still queued.` : ''}
          </p>
          {topError?.title ? (
            <p className="mt-2 text-xs font-medium text-red-900">
              Most recent: {topError.title}
            </p>
          ) : null}
          {topError?.action ? (
            <p className="mt-1 text-[11px] leading-relaxed text-red-800/80">{topError.action}</p>
          ) : null}
          <Link to="/admin/crm/sent?view=failed" className="mt-3 inline-flex text-[11px] font-semibold text-red-900 underline underline-offset-2">
            Review all delivery issues
          </Link>
        </div>
      </div>
    </div>
  );
}
