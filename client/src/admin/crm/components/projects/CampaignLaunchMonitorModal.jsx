import { useEffect, useState, useCallback } from 'react';
import { crmApiFetch } from '../../crmApi.js';
import { Modal } from '../ui/Modal.jsx';
import { LoadingState, EmptyState, Badge } from '../ui/primitives.jsx';
import { ModalSection, ModalStack } from '../ui/workspaceModalParts.jsx';
import { Send, ExternalLink, RefreshCw, Calendar, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-AE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function CampaignLaunchMonitorModal({ open, onClose, projectId, projectName }) {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchBatches = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError('');
    try {
      const res = await crmApiFetch(`/api/admin/email/launch-batches?campaignId=${encodeURIComponent(projectId)}&limit=50`);
      setBatches(res.items || []);
    } catch (err) {
      console.error('Error fetching campaign launch batches:', err);
      setError(err.message || 'Failed to load launch batches.');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (open && projectId) {
      fetchBatches();
    }
  }, [open, projectId, fetchBatches]);

  function handleOpenMonitor(batchId) {
    window.open(`/admin/crm/sequence-live/${batchId}`, '_blank');
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Sequence Send Progress & Monitor"
      subtitle={projectName ? `Launch history and live progress monitor for "${projectName}"` : 'Live send monitors for campaign'}
      icon={Send}
      accent="brand"
      size="xl"
    >
      <ModalStack>
        {loading ? (
          <LoadingState label="Fetching campaign sequence launch monitors..." />
        ) : error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-800">
            {error}
          </div>
        ) : batches.length === 0 ? (
          <EmptyState
            icon={Send}
            title="No sequence launches found"
            description="No sequence emails have been launched for this campaign yet. Once a sequence is launched, you can monitor live delivery and queued jobs here."
          />
        ) : (
          <ModalSection
            title={`Launch Batches (${batches.length})`}
            description="Select a sequence launch batch to open its live dispatch monitor, view queue status, and inspect sent emails."
          >
            <div className="flex flex-col gap-3">
              {batches.map((batch) => {
                const stats = batch.stats || {};
                const queued = Number(stats.queued || 0);
                const sent = Number(stats.sent || 0);
                const failed = Number(stats.failed || 0);
                const total = Number(batch.enrolledCount || 0);

                return (
                  <div
                    key={batch._id || batch.id}
                    className="flex flex-col gap-3 rounded-xl border border-line bg-white p-4 transition hover:border-brand/40 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-ink">{batch.sequenceName || 'Sequence Launch'}</span>
                        <Badge tone="neutral" className="font-mono text-2xs">
                          {total} Enrolled
                        </Badge>
                        {batch.status === 'active' && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-2xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-200">
                            <span className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-pulse" />
                            Active
                          </span>
                        )}
                      </div>

                      <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-500">
                        <span className="inline-flex items-center gap-1 font-mono text-2xs">
                          <Calendar className="h-3 w-3 text-neutral-400" />
                          {formatDate(batch.launchedAt)}
                        </span>
                        <span>·</span>
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 text-2xs">
                            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                            {sent} Sent
                          </span>
                          <span className="inline-flex items-center gap-1 font-semibold text-amber-800 text-2xs">
                            <Clock className="h-3 w-3 text-amber-600" />
                            {queued} Queued
                          </span>
                          {failed > 0 && (
                            <span className="inline-flex items-center gap-1 font-semibold text-red-700 text-2xs">
                              <AlertTriangle className="h-3 w-3 text-red-500" />
                              {failed} Failed
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleOpenMonitor(batch._id || batch.id)}
                        className="crm-btn-primary py-2 px-3 text-xs font-bold flex items-center gap-1.5 shadow-2xs"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Open Live Monitor
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </ModalSection>
        )}
      </ModalStack>
    </Modal>
  );
}
