import { useEffect, useState } from 'react';
import { Database, History, RotateCcw, UserRound } from 'lucide-react';
import Drawer from '../ui/Drawer.jsx';
import { Alert, LoadingState } from '../ui/primitives.jsx';
import { fetchRevisionEntry } from '../../crmApi.js';
import ChangeTypeBadge from './ChangeTypeBadge.jsx';
import FieldDiffList from './FieldDiffList.jsx';
import {
  formatAuditValue,
  formatSettingsWhen,
  resourceLabel,
  snapshotTitle,
} from './settingsUtils.js';

export default function RevisionDetailDrawer({
  revisionId,
  preview,
  onClose,
  onRollback,
  rollingBack = false,
}) {
  const [detail, setDetail] = useState(preview || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!revisionId) {
      setDetail(null);
      setError('');
      return;
    }
    setLoading(true);
    setError('');
    fetchRevisionEntry(revisionId)
      .then(setDetail)
      .catch((err) => setError(err.message || 'Failed to load revision details.'))
      .finally(() => setLoading(false));
  }, [revisionId]);

  const snapshot = detail?.snapshotAfter || detail?.snapshot;
  const snapshotKeys = snapshot && typeof snapshot === 'object'
    ? Object.keys(snapshot).filter((key) => !['_id', '__v'].includes(key)).slice(0, 12)
    : [];

  return (
    <Drawer
      open={Boolean(revisionId)}
      onClose={onClose}
      title="Revision details"
      subtitle={detail ? `${resourceLabel(detail.resourceType)} · v${detail.revisionNumber}` : 'Data recovery entry'}
      size="lg"
      footer={detail ? (
        <div className="flex gap-3">
          <button type="button" className="crm-btn-secondary flex-1" onClick={onClose}>
            Close
          </button>
          <button
            type="button"
            className="crm-btn-primary flex-1"
            disabled={rollingBack}
            onClick={() => onRollback?.(detail)}
          >
            <RotateCcw className="h-4 w-4" />
            {rollingBack ? 'Rolling back…' : 'Rollback to this version'}
          </button>
        </div>
      ) : null}
    >
      {loading ? (
        <LoadingState label="Loading revision details…" />
      ) : (
        <div className="crm-settings-drawer space-y-5">
          {error && <Alert>{error}</Alert>}

          {detail && (
            <>
              <section className="crm-settings-detail-hero">
                <div className="crm-settings-detail-hero-icon is-recovery">
                  <History className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <ChangeTypeBadge changeType={detail.changeType} />
                    <span className="crm-settings-badge is-neutral">v{detail.revisionNumber}</span>
                    <span className="text-xs text-neutral-400">{formatSettingsWhen(detail.createdAt)}</span>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-[var(--color-ink)]">
                    {snapshotTitle(detail.resourceType, snapshot)}
                  </p>
                  <p className="mt-1 text-xs text-neutral-500">
                    {resourceLabel(detail.resourceType)} · ID {detail.resourceId}
                  </p>
                </div>
              </section>

              <section className="crm-settings-detail-grid">
                <DetailItem icon={UserRound} label="Changed by" value={detail.changedBy || 'admin'} />
                <DetailItem label="Resource type" value={resourceLabel(detail.resourceType)} />
                <DetailItem label="Resource ID" value={detail.resourceId} mono />
                <DetailItem label="Revision" value={`#${detail.revisionNumber}`} />
                <DetailItem label="Change type" value={detail.changeType} />
                <DetailItem label="Recorded at" value={formatSettingsWhen(detail.createdAt)} />
              </section>

              <section className="crm-settings-detail-section">
                <h3 className="crm-settings-section-title">Changed fields</h3>
                <FieldDiffList
                  changes={detail.changedFields}
                  emptyLabel="No individual field diffs were captured for this revision."
                />
              </section>

              {snapshotKeys.length > 0 && (
                <section className="crm-settings-detail-section">
                  <h3 className="crm-settings-section-title">
                    <Database className="inline h-3.5 w-3.5" />
                    {' '}Snapshot preview
                  </h3>
                  <div className="crm-settings-meta-grid">
                    {snapshotKeys.map((key) => (
                      <div key={key} className="crm-settings-meta-item">
                        <p className="crm-settings-meta-key">{key}</p>
                        <pre className="crm-settings-meta-value">{formatAuditValue(snapshot[key])}</pre>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      )}
    </Drawer>
  );
}

function DetailItem({ icon: Icon, label, value, mono = false }) {
  return (
    <div className="crm-settings-detail-item">
      <p className="crm-settings-detail-label">
        {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
        {label}
      </p>
      <p className={`crm-settings-detail-value ${mono ? 'is-mono' : ''}`}>{value}</p>
    </div>
  );
}
