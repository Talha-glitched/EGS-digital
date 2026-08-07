import { useCallback, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { crmApiFetch, sendLaunchBatchJobs } from '../crmApi.js';
import EmailDetailsDrawer from '../components/leads/EmailDetailsDrawer.jsx';
import TablePagination from '../components/ui/TablePagination.jsx';
import DataTableShell from '../components/ui/DataTableShell.jsx';
import ClickableTableRow from '../components/ui/ClickableTableRow.jsx';
import { PageShell, PageSection, LoadingState, Alert, EmptyState, cn } from '../components/ui/primitives.jsx';
import {
  Send,
  Play,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Mail,
  ChevronLeft,
  Search,
  ShieldAlert,
} from 'lucide-react';

function StatusBadge({ status, rateLimited, resumesInMs }) {
  if (status === 'sent') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-2xs font-semibold text-emerald-800 ring-1 ring-inset ring-emerald-200/70">
        <CheckCircle2 className="h-3 w-3 text-emerald-600" />
        Sent
      </span>
    );
  }
  if (status === 'processing') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-2xs font-semibold text-blue-800 ring-1 ring-inset ring-blue-200/70">
        <RefreshCw className="h-3 w-3 animate-spin text-blue-600" />
        Sending...
      </span>
    );
  }
  if (status === 'pending' && rateLimited) {
    const mins = Math.ceil((resumesInMs || 0) / 60000);
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-2xs font-semibold text-amber-800 ring-1 ring-inset ring-amber-200/70">
        <Clock className="h-3 w-3 text-amber-600" />
        Rate Limited (Resumes in ~{mins}m)
      </span>
    );
  }
  if (status === 'pending') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50/60 px-2.5 py-0.5 text-2xs font-semibold text-amber-900 ring-1 ring-inset ring-amber-200/50">
        <Clock className="h-3 w-3 text-amber-700" />
        Pending
      </span>
    );
  }
  if (status === 'failed') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-2xs font-semibold text-red-800 ring-1 ring-inset ring-red-200/70">
        <AlertTriangle className="h-3 w-3 text-red-600" />
        Failed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2.5 py-0.5 text-2xs font-semibold text-neutral-600 ring-1 ring-inset ring-neutral-200">
      {status}
    </span>
  );
}

export default function LiveSendMonitorPage() {
  const { batchId } = useParams();
  const [progress, setProgress] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [notice, setNotice] = useState('');

  const fetchStatusAndJobs = useCallback(async (isSilent = false) => {
    if (!batchId) return;
    if (!isSilent) setLoading(true);
    try {
      const [prog, jobsData] = await Promise.all([
        crmApiFetch(`/api/admin/email/launch-batches/${batchId}/send-status`),
        crmApiFetch(`/api/admin/email/launch-batches/${batchId}/jobs`),
      ]);
      setProgress(prog);
      setJobs(jobsData.items || []);
    } catch (err) {
      console.error('Error fetching live batch status:', err);
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [batchId]);

  useEffect(() => {
    fetchStatusAndJobs(false);
  }, [fetchStatusAndJobs]);

  // High-frequency polling (every 2 seconds) for live stream updates
  useEffect(() => {
    const timer = setInterval(() => {
      fetchStatusAndJobs(true);
    }, 2000);
    return () => clearInterval(timer);
  }, [fetchStatusAndJobs]);

  async function handleSendNow() {
    if (sending || !batchId) return;
    setSending(true);
    setNotice('');
    try {
      const res = await sendLaunchBatchJobs(batchId, { maxCount: 1000 });
      setNotice(res.message || 'Released queued emails to send worker.');
      await fetchStatusAndJobs(true);
    } catch (err) {
      setNotice(err.message || 'Failed to release queue.');
    } finally {
      setSending(false);
    }
  }

  const filteredJobs = jobs.filter((job) => {
    if (statusFilter !== 'all' && job.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const recipient = String(job.recipientEmail || '').toLowerCase();
      const name = String(job.leadId?.name || '').toLowerCase();
      const subject = String(job.renderedSubject || '').toLowerCase();
      return recipient.includes(q) || name.includes(q) || subject.includes(q);
    }
    return true;
  });

  const paginatedJobs = filteredJobs.slice((page - 1) * limit, page * limit);

  if (loading && !progress) {
    return (
      <PageShell compact>
        <LoadingState label="Connecting to live send monitor..." />
      </PageShell>
    );
  }

  const info = progress?.info || {};
  const total = Number(progress?.total || 0);
  const sent = Number(progress?.sent || 0);
  const pending = Number(progress?.pending || 0);
  const failed = Number(progress?.failed || 0);
  const processing = Number(progress?.processing || 0);
  const percent = total > 0 ? Math.round((sent / total) * 100) : 0;

  const hourlySent = Number(progress?.hourlySent || 0);
  const hourlyCap = Number(progress?.hourlyCap || 199);
  const rateLimited = Boolean(progress?.rateLimited);
  const resumesInMs = Number(progress?.resumesInMs || 0);
  const resumeMins = Math.ceil(resumesInMs / 60000);

  return (
    <PageShell compact>
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-neutral-500">
            {info.campaignId ? (
              <Link to={`/admin/crm/projects/${info.campaignId}`} className="inline-flex items-center gap-1 font-semibold hover:text-brand">
                <ChevronLeft className="h-3.5 w-3.5" />
                {info.campaignName || 'Campaign Workspace'}
              </Link>
            ) : (
              <span className="inline-flex items-center gap-1 font-semibold">
                <Send className="h-3.5 w-3.5 text-brand" />
                Live Sequence Monitor
              </span>
            )}
            <span>·</span>
            <span>Launch Batch ID: <code className="font-mono text-2xs">{batchId.slice(0, 8)}</code></span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink flex items-center gap-2">
            <span>{info.sequenceName || 'Email Sequence Launch'}</span>
            {processing > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800 animate-pulse">
                <span className="h-2 w-2 rounded-full bg-blue-600 animate-ping" />
                Live Sending Active
              </span>
            )}
            {rateLimited && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">
                <ShieldAlert className="h-3.5 w-3.5 text-amber-700" />
                Hourly SMTP Limit Reached (Wait ~{resumeMins}m)
              </span>
            )}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fetchStatusAndJobs(false)}
            className="crm-btn-secondary py-2 px-3 text-xs flex items-center gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
          <button
            type="button"
            onClick={handleSendNow}
            disabled={sending || pending === 0}
            className="crm-btn-primary py-2 px-4 text-xs font-bold flex items-center gap-1.5 shadow-sm"
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            {sending ? 'Releasing Queue...' : 'Send Pending Now'}
          </button>
        </div>
      </div>

      {notice && (
        <Alert tone="info" className="mt-3">
          {notice}
        </Alert>
      )}

      {/* Hourly Rate Limit Banner */}
      {rateLimited && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900 shadow-xs mt-4">
          <div className="flex items-start gap-3">
            <ShieldAlert className="h-5 w-5 shrink-0 text-amber-700 mt-0.5" />
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-bold text-amber-950">
                SMTP Hourly Limit Reached ({hourlySent} / {hourlyCap} emails sent in last 60 mins)
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-amber-800">
                Your SMTP provider caps emails to <strong>{hourlyCap} per hour</strong>. Sequence execution has automatically paused to prevent provider blocks or bounce errors. It will <strong>automatically resume in ~{resumeMins} minute(s)</strong> from where it left off.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Progress & Stats Cards */}
      <PageSection>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="crm-card p-4">
            <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Total Enrolled</span>
            <p className="mt-2 text-2xl font-extrabold text-ink tabular-nums">{total}</p>
            <div className="mt-2 h-1.5 w-full rounded-full bg-neutral-100 overflow-hidden">
              <div className="h-full bg-brand rounded-full" style={{ width: `${percent}%` }} />
            </div>
          </div>

          <div className="crm-card p-4">
            <span className="text-xs font-medium text-emerald-600 uppercase tracking-wider flex items-center justify-between">
              Sent
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </span>
            <p className="mt-2 text-2xl font-extrabold text-emerald-700 tabular-nums">{sent}</p>
            <span className="mt-1 text-2xs text-neutral-400 font-medium">{percent}% completed</span>
          </div>

          <div className="crm-card p-4">
            <span className="text-xs font-medium text-amber-600 uppercase tracking-wider flex items-center justify-between">
              Pending Queue
              <Clock className="h-4 w-4 text-amber-500" />
            </span>
            <p className="mt-2 text-2xl font-extrabold text-amber-800 tabular-nums">{pending}</p>
            <span className="mt-1 text-2xs text-amber-600 font-semibold">
              {rateLimited ? `Held for rate limit (~${resumeMins}m)` : 'Ready to dispatch'}
            </span>
          </div>

          <div className="crm-card p-4">
            <span className="text-xs font-medium text-red-600 uppercase tracking-wider flex items-center justify-between">
              Failed
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </span>
            <p className="mt-2 text-2xl font-extrabold text-red-700 tabular-nums">{failed}</p>
            <span className="mt-1 text-2xs text-neutral-400 font-medium">Delivery errors</span>
          </div>

          <div className="crm-card p-4 bg-brand-soft/10">
            <span className="text-xs font-semibold text-brand uppercase tracking-wider flex items-center justify-between">
              Hourly Quota
              <ShieldAlert className="h-4 w-4 text-brand" />
            </span>
            <p className="mt-2 text-2xl font-extrabold text-brand tabular-nums">
              {hourlySent} <span className="text-xs font-normal text-neutral-500">/ {hourlyCap}</span>
            </p>
            <span className="mt-1 text-2xs font-medium text-neutral-500">Max 199 per hour</span>
          </div>
        </div>
      </PageSection>

      {/* Main Table Stream */}
      <PageSection>
        <div className="crm-card overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-line bg-neutral-50/50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-1 rounded-lg border border-line bg-white p-1">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={cn('crm-tab-btn text-xs py-1.5 px-3', statusFilter === 'all' && 'is-active')}
              >
                All ({jobs.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('pending')}
                className={cn('crm-tab-btn text-xs py-1.5 px-3', statusFilter === 'pending' && 'is-active')}
              >
                Pending ({pending})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('sent')}
                className={cn('crm-tab-btn text-xs py-1.5 px-3', statusFilter === 'sent' && 'is-active')}
              >
                Sent ({sent})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('failed')}
                className={cn('crm-tab-btn text-xs py-1.5 px-3', statusFilter === 'failed' && 'is-active')}
              >
                Failed ({failed})
              </button>
            </div>

            <label className="relative block min-w-[260px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search recipient or subject..."
                className="crm-input w-full py-1.5 pl-9 text-xs"
              />
            </label>
          </div>

          {filteredJobs.length === 0 ? (
            <EmptyState
              icon={Mail}
              title="No emails match filter"
              description="Email dispatch results for this batch will appear here as they process."
            />
          ) : (
            <>
              <TablePagination
                page={page}
                limit={limit}
                total={filteredJobs.length}
                onPageChange={setPage}
                onLimitChange={(l) => {
                  setLimit(l);
                  setPage(1);
                }}
                noun="emails"
              />

              <DataTableShell minWidth={900}>
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="crm-table-head bg-slate-100/50">
                      <th className="px-4 py-2.5">Recipient</th>
                      <th className="px-4 py-2.5">Step / Subject</th>
                      <th className="px-4 py-2.5">Scheduled / Sent</th>
                      <th className="px-4 py-2.5 text-center">Status</th>
                      <th className="px-4 py-2.5">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {paginatedJobs.map((job) => {
                      const recipientName = job.leadId?.name || 'Contact';
                      const dateVal = job.sentAt || job.scheduledFor;
                      const dateText = dateVal
                        ? new Date(dateVal).toLocaleString('en-AE', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })
                        : '—';

                      return (
                        <ClickableTableRow
                          key={job._id}
                          onClick={() => {
                            if (job.status === 'sent') {
                              setSelectedEmail({
                                _id: job._id,
                                renderedSubject: job.renderedSubject,
                                recipientEmail: job.recipientEmail,
                                status: job.status,
                                sentAt: job.sentAt,
                              });
                            }
                          }}
                        >
                          <td className="px-4 py-2.5 font-semibold text-ink">
                            <div>{recipientName}</div>
                            <div className="font-mono text-2xs text-neutral-500 font-normal">{job.recipientEmail}</div>
                          </td>
                          <td className="px-4 py-2.5 max-w-[280px]">
                            <div className="font-semibold text-ink truncate" title={job.renderedSubject}>
                              Step {Number(job.stepIndex || 0) + 1}: {job.renderedSubject || '(No subject)'}
                            </div>
                          </td>
                          <td className="px-4 py-2.5 font-mono text-neutral-600 font-medium">{dateText}</td>
                          <td className="px-4 py-2.5 text-center">
                            <StatusBadge
                              status={job.status}
                              rateLimited={rateLimited}
                              resumesInMs={resumesInMs}
                            />
                          </td>
                          <td className="px-4 py-2.5 text-neutral-500">
                            {job.errorMessage ? (
                              <span className="text-red-600 font-medium text-2xs truncate block max-w-[200px]" title={job.errorMessage}>
                                {job.errorMessage}
                              </span>
                            ) : (
                              <span className="text-2xs text-neutral-400">SMTP direct</span>
                            )}
                          </td>
                        </ClickableTableRow>
                      );
                    })}
                  </tbody>
                </table>
              </DataTableShell>

              <TablePagination
                page={page}
                limit={limit}
                total={filteredJobs.length}
                onPageChange={setPage}
                onLimitChange={(l) => {
                  setLimit(l);
                  setPage(1);
                }}
                noun="emails"
                className="is-bottom"
              />
            </>
          )}
        </div>
      </PageSection>

      <EmailDetailsDrawer
        email={selectedEmail}
        onClose={() => setSelectedEmail(null)}
        stackLevel={0}
      />
    </PageShell>
  );
}
