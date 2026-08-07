import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  fetchLaunchBatches,
  fetchLaunchBatchJobs,
  fetchLaunchBatchSendStatus,
  removeLaunchBatchJobs,
  sendLaunchBatch,
} from '../../crmApi.js';
import { useConfirmDeleteDialog } from '../../context/ConfirmDeleteContext.jsx';
import { useRowSelection } from '../../hooks/useRowSelection.js';
import { BulkSelectHeaderCell, BulkSelectRowCell, BulkSelectionBar } from '../ui/BulkSelectTable.jsx';
import DeleteIconButton from '../ui/DeleteIconButton.jsx';
import DataTableShell from '../ui/DataTableShell.jsx';
import { Modal } from '../ui/Modal.jsx';
import TablePagination from '../ui/TablePagination.jsx';
import { EmptyState, cn } from '../ui/primitives.jsx';
import { ChevronDown, ChevronRight, Play, Send, Trash2 } from 'lucide-react';

const STATUS_CONFIG = {
  pending: { className: 'bg-amber-50 text-amber-800 ring-amber-200/70', label: 'Pending' },
  processing: { className: 'bg-blue-50 text-blue-800 ring-blue-200/70', label: 'Sending…' },
  sent: { className: 'bg-emerald-50 text-emerald-800 ring-emerald-200/70', label: 'Sent' },
  failed: { className: 'bg-red-50 text-red-800 ring-red-200/70', label: 'Failed' },
  cancelled: { className: 'bg-neutral-100 text-neutral-600 ring-neutral-200/70', label: 'Cancelled' },
};

function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status] || {
    className: 'bg-neutral-100 text-neutral-600 ring-neutral-200/70',
    label: status,
  };
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-2xs font-semibold ring-1 ring-inset', config.className)}>
      {config.label}
    </span>
  );
}

function formatLaunchDate(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function BatchJobTable({ batchId, batchLabel, onJobsChanged }) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sendNotice, setSendNotice] = useState('');
  const [sendProgress, setSendProgress] = useState({ sent: 0, total: 0 });
  const [deleting, setDeleting] = useState(false);
  const [sendConfirmOpen, setSendConfirmOpen] = useState(false);
  const selection = useRowSelection(jobs);
  const { confirmDelete } = useConfirmDeleteDialog();

  const loadJobs = useCallback(async () => {
    try {
      const data = await fetchLaunchBatchJobs(batchId);
      setJobs(data.items || []);
    } catch (err) {
      console.error(err);
      setJobs([]);
    }
  }, [batchId]);

  const refreshJobs = useCallback(async () => {
    setLoading(true);
    try {
      await loadJobs();
    } finally {
      setLoading(false);
    }
  }, [loadJobs]);

  const applySendStatus = useCallback((status) => {
    const total = (status.sent || 0) + (status.pending || 0);
    setSendProgress({ sent: status.sent || 0, total });
    if (status.running) {
      setSending(true);
      setSendNotice(
        `Sending on server… ${status.sent || 0} sent, ${status.pending || 0} remaining. You can leave this page.`,
      );
    }
    return status;
  }, []);

  const pollSendStatus = useCallback(async () => {
    const status = applySendStatus(await fetchLaunchBatchSendStatus(batchId));
    await loadJobs();
    onJobsChanged?.();

    if (!status.running) {
      setSending(false);
      if (status.lastError) {
        setSendNotice(`Send stopped: ${status.lastError} ${status.pending || 0} still queued — click Send remaining to continue.`);
      } else if ((status.pending || 0) === 0) {
        setSendNotice(`Done — ${status.sent || 0} sent in this batch.`);
      } else if ((status.pending || 0) > 0) {
        setSendNotice(`${status.pending} still queued — click Send remaining to continue.`);
      }
    }

    return status;
  }, [applySendStatus, batchId, loadJobs, onJobsChanged]);

  useEffect(() => {
    refreshJobs();
  }, [refreshJobs]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const status = await fetchLaunchBatchSendStatus(batchId);
        if (cancelled) return;
        if (status.running) applySendStatus(status);
      } catch (err) {
        console.error(err);
      }
    })();
    return () => { cancelled = true; };
  }, [applySendStatus, batchId]);

  useEffect(() => {
    if (!sending) return undefined;
    const interval = setInterval(() => {
      pollSendStatus().catch(console.error);
    }, 5000);
    return () => clearInterval(interval);
  }, [sending, pollSendStatus]);

  async function sendBatch() {
    const pending = pendingOnly;
    if (!pending.length || sending) return;
    setSendConfirmOpen(false);
    setSending(true);
    setSendNotice('Starting send on server… already-sent contacts are skipped.');
    setSendProgress({ sent: sentCount, total: pending.length + sentCount });

    try {
      const start = await sendLaunchBatch(batchId, { background: true });
      setSendNotice(start.message || 'Sending on server…');

      if (start.running || start.started || start.alreadyRunning) {
        let status = await pollSendStatus();
        while (status.running) {
          await sleep(5000);
          status = await pollSendStatus();
        }
      } else if ((start.remaining || 0) === 0) {
        setSending(false);
        setSendNotice(start.message || 'Nothing left to send.');
      }

      await refreshJobs();
      onJobsChanged?.();
    } catch (err) {
      console.error(err);
      setSendNotice(err.message || 'Batch send failed.');
      setSending(false);
    }
  }

  async function deleteJobs(ids, { all = false } = {}) {
    const ok = await confirmDelete({
      title: all ? 'Remove entire batch queue?' : `Remove ${ids.length} queued email(s)?`,
      message: 'Queued sends will be removed. This cannot be undone.',
      confirmLabel: 'Remove',
    });
    if (!ok) return;

    setDeleting(true);
    try {
      await removeLaunchBatchJobs(batchId, all ? { all: true } : { jobIds: ids });
      selection.clearSelection();
      await refreshJobs();
      onJobsChanged?.();
    } catch (err) {
      console.error(err);
    } finally {
      setDeleting(false);
    }
  }

  const queueCount = jobs.filter((job) => ['pending', 'processing', 'failed'].includes(job.status)).length;
  const sentCount = jobs.filter((job) => job.status === 'sent').length;
  const pendingOnly = jobs.filter((job) => job.status === 'pending' || job.status === 'failed');

  if (loading) {
    return <p className="px-4 py-6 text-xs text-neutral-500">Loading queue…</p>;
  }

  if (!jobs.length) {
    return <p className="px-4 py-6 text-xs text-neutral-500">No send jobs in this launch batch.</p>;
  }

  return (
    <div className="border-t border-[var(--color-line)] bg-neutral-50/40 p-4 space-y-3">
      <BulkSelectionBar
        count={selection.selectionCount}
        noun="queued email"
        onDelete={() => deleteJobs(selection.selectedArray)}
        onClear={selection.clearSelection}
        deleting={deleting}
      />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-2xs font-semibold uppercase tracking-wider text-neutral-500">
            {queueCount} remaining · {sentCount} already sent
          </p>
          <p className="mt-0.5 text-2xs text-neutral-400">
            Only remaining queue items are sent. Contacts already emailed for this sequence are skipped automatically.
          </p>
          {sending ? (
            <div className="mt-2 space-y-1 rounded-lg border border-brand/20 bg-brand-soft/30 px-3 py-2">
              <div className="flex justify-between text-2xs font-semibold text-brand">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-brand" />
                  Sending in progress
                </span>
                {sendProgress.total > 0 ? (
                  <span className="tabular-nums">{sendProgress.sent} / {sendProgress.total}</span>
                ) : null}
              </div>
              {sendProgress.total > 0 ? (
                <div className="w-full max-w-xs bg-neutral-200 rounded-full h-1.5">
                  <div
                    className="bg-brand h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, (sendProgress.sent / sendProgress.total) * 100)}%` }}
                  />
                </div>
              ) : null}
            </div>
          ) : null}
          {sendNotice ? (
            <p className="mt-1 text-2xs font-medium text-brand">{sendNotice}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => deleteJobs([], { all: true })}
            disabled={deleting || sending || queueCount === 0}
            className="crm-btn-secondary py-1.5 px-3 text-2xs font-semibold text-rose-600 border-rose-200 hover:bg-rose-50"
          >
            <Trash2 className="inline h-3 w-3 mr-1" />
            Delete all
          </button>
          <button
            type="button"
            onClick={() => setSendConfirmOpen(true)}
            disabled={sending || queueCount === 0}
            className="crm-btn-primary py-1.5 px-3 text-2xs font-bold"
          >
            <Play className="inline h-3 w-3 mr-1 fill-current" />
            {sending ? 'Sending…' : sentCount > 0 ? `Send remaining (${queueCount})` : 'Send batch'}
          </button>
        </div>
      </div>

      <Modal
        open={sendConfirmOpen}
        onClose={() => setSendConfirmOpen(false)}
        title="Send this batch?"
        subtitle="This queues real outreach emails to external recipients right now. It cannot be undone or recalled once sent."
        size="md"
        icon={Send}
        accent="brand"
        footer={(
          <div className="flex justify-end gap-3">
            <button type="button" className="crm-btn-secondary" onClick={() => setSendConfirmOpen(false)}>
              Cancel
            </button>
            <button type="button" className="crm-btn-primary" onClick={sendBatch}>
              Send {pendingOnly.length} email{pendingOnly.length === 1 ? '' : 's'}
            </button>
          </div>
        )}
      >
        <div className="space-y-3 text-sm">
          <p className="text-neutral-600">
            {batchLabel ? <><span className="font-semibold text-[var(--color-ink)]">{batchLabel}</span> — </> : null}
            <span className="font-semibold text-[var(--color-ink)]">{pendingOnly.length}</span> email{pendingOnly.length === 1 ? '' : 's'} will send now. Contacts already emailed for this sequence are skipped automatically.
          </p>
          {pendingOnly.length > 0 && (
            <ul className="rounded-lg border border-[var(--color-line)] divide-y divide-[var(--color-line)] bg-neutral-50/60">
              {pendingOnly.slice(0, 3).map((job) => (
                <li key={job._id} className="px-3 py-2 text-xs">
                  <span className="font-medium text-[var(--color-ink)]">{job.leadId?.name || 'Contact'}</span>
                  <span className="text-neutral-500"> — {job.recipientEmail || job.leadId?.email || 'no email on file'}</span>
                </li>
              ))}
              {pendingOnly.length > 3 && (
                <li className="px-3 py-2 text-xs text-neutral-500">+ {pendingOnly.length - 3} more</li>
              )}
            </ul>
          )}
        </div>
      </Modal>

      <DataTableShell minWidth={760}>
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="crm-table-head bg-white/80">
              <BulkSelectHeaderCell selection={selection} ariaLabel="Select all queued emails" />
              <th className="px-3 py-2">Recipient</th>
              <th className="px-3 py-2">Subject</th>
              <th className="px-3 py-2 text-center">Step</th>
              <th className="px-3 py-2 text-center">Status</th>
              <th className="px-3 py-2 text-right w-10" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-line)] bg-white">
            {jobs.map((job) => {
              const name = job.leadId?.name || 'Contact';
              return (
                <tr key={job._id}>
                  <BulkSelectRowCell id={job._id} selection={selection} ariaLabel={`Select ${name}`} />
                  <td className="px-3 py-2">
                    <div className="font-semibold text-[var(--color-ink)]">{name}</div>
                    <div className="text-2xs text-neutral-500 font-mono">{job.recipientEmail || job.leadId?.email}</div>
                  </td>
                  <td className="px-3 py-2 text-neutral-600 truncate max-w-[240px]" title={job.renderedSubject}>
                    {job.renderedSubject || '(No subject)'}
                  </td>
                  <td className="px-3 py-2 text-center text-neutral-500">{(job.stepIndex ?? 0) + 1}</td>
                  <td className="px-3 py-2 text-center">
                    <StatusBadge status={job.status} />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <DeleteIconButton
                      label={`Remove ${name}`}
                      disabled={deleting || (sending && job.status === 'processing')}
                      onClick={() => deleteJobs([job._id])}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </DataTableShell>
    </div>
  );
}

export default function EmailOutboxWorkspace({ focusBatchId = '', onFocusBatchHandled }) {
  const [batches, setBatches] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expandedBatchId, setExpandedBatchId] = useState(focusBatchId || '');

  const loadBatches = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchLaunchBatches({ page, limit: 25 });
      setBatches(data.items || []);
      setTotal(data.total || 0);
      setPages(data.pages || 0);
    } catch (err) {
      console.error(err);
      setBatches([]);
      setTotal(0);
      setPages(0);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    loadBatches();
  }, [loadBatches]);

  useEffect(() => {
    if (focusBatchId) {
      setExpandedBatchId(focusBatchId);
      onFocusBatchHandled?.();
    }
  }, [focusBatchId, onFocusBatchHandled]);

  if (loading && !batches.length) {
    return <p className="text-xs text-neutral-500 py-8 text-center">Loading launch batches…</p>;
  }

  if (!batches.length) {
    return (
      <EmptyState
        icon={Send}
        title="No sequence launches yet"
        description="Launch a sequence from Email Sequences to queue outreach here. Each launch appears as its own batch with audience lists and send status."
      />
    );
  }

  return (
    <div className="space-y-3">
      {batches.map((batch) => {
        const isOpen = expandedBatchId === String(batch._id);
        const audienceLabel = (batch.audienceLists || []).join(', ');
        return (
          <div key={batch._id} className="crm-card overflow-hidden">
            <button
              type="button"
              onClick={() => setExpandedBatchId(isOpen ? '' : String(batch._id))}
              className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-neutral-50/80 transition"
            >
              <span className="mt-0.5 text-neutral-400">
                {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-[var(--color-ink)]">{batch.sequenceName}</span>
                  <span className="text-2xs text-neutral-400">·</span>
                  <span className="text-2xs font-medium text-neutral-500">{formatLaunchDate(batch.launchedAt)}</span>
                </div>
                <p className="mt-1 text-xs text-neutral-600">
                  Audience: <span className="font-medium">{audienceLabel}</span>
                  {' · '}
                  <span className="tabular-nums">{batch.enrolledCount}</span> enrolled
                  {batch.restartedCount > 0 ? ` (${batch.restartedCount} restarted)` : ''}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="rounded-full bg-amber-50 px-2 py-0.5 text-2xs font-semibold text-amber-800 ring-1 ring-amber-200/70">
                    {batch.stats?.queued || 0} queued
                  </span>
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-2xs font-semibold text-emerald-800 ring-1 ring-emerald-200/70">
                    {batch.stats?.sent || 0} sent
                  </span>
                  {(batch.stats?.failed || 0) > 0 && (
                    <span className="rounded-full bg-red-50 px-2 py-0.5 text-2xs font-semibold text-red-800 ring-1 ring-red-200/70">
                      {batch.stats.failed} failed
                    </span>
                  )}
                </div>
              </div>
              <Link
                to={`/admin/crm/sequences?edit=${batch.sequenceId}`}
                onClick={(e) => e.stopPropagation()}
                className="shrink-0 text-2xs font-semibold text-brand hover:underline"
              >
                Open sequence
              </Link>
            </button>
            {isOpen ? (
              <BatchJobTable batchId={batch._id} batchLabel={batch.sequenceName} onJobsChanged={loadBatches} />
            ) : null}
          </div>
        );
      })}

      <TablePagination
        page={page}
        limit={25}
        total={total}
        pages={pages}
        onPageChange={setPage}
        onLimitChange={() => {}}
        noun="launches"
        className="is-bottom"
      />
    </div>
  );
}
