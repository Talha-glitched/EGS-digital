import { useEffect, useState } from 'react';
import { Activity, Globe, Monitor, UserRound } from 'lucide-react';
import Drawer from '../ui/Drawer.jsx';
import { Alert, LoadingState } from '../ui/primitives.jsx';
import { fetchAuditLogEntry } from '../../crmApi.js';
import ActionBadge from './ActionBadge.jsx';
import FieldDiffList from './FieldDiffList.jsx';
import { formatAuditValue, formatSettingsWhen } from './settingsUtils.js';

export default function ActivityDetailDrawer({ entryId, preview, onClose }) {
  const [detail, setDetail] = useState(preview || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!entryId) {
      setDetail(null);
      setError('');
      return;
    }
    setLoading(true);
    setError('');
    fetchAuditLogEntry(entryId)
      .then(setDetail)
      .catch((err) => setError(err.message || 'Failed to load activity details.'))
      .finally(() => setLoading(false));
  }, [entryId]);

  const metadataEntries = detail?.metadata && typeof detail.metadata === 'object'
    ? Object.entries(detail.metadata).filter(([, value]) => value !== null && value !== undefined && value !== '')
    : [];

  return (
    <Drawer
      open={Boolean(entryId)}
      onClose={onClose}
      title="Activity details"
      subtitle={detail?.summary || detail?.action || 'Audit log entry'}
      size="lg"
      footer={(
        <button type="button" className="crm-btn-secondary w-full" onClick={onClose}>
          Close
        </button>
      )}
    >
      {loading ? (
        <LoadingState label="Loading activity details…" />
      ) : (
        <div className="crm-settings-drawer space-y-5">
          {error && <Alert>{error}</Alert>}

          {detail && (
            <>
              <section className="crm-settings-detail-hero">
                <div className="crm-settings-detail-hero-icon">
                  <Activity className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <ActionBadge action={detail.action} />
                    <span className="text-xs text-neutral-400">{formatSettingsWhen(detail.createdAt)}</span>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-[var(--color-ink)]">
                    {detail.summary || ACTION_SUMMARY(detail)}
                  </p>
                </div>
              </section>

              <section className="crm-settings-detail-grid">
                <DetailItem icon={UserRound} label="User" value={detail.userDisplayName || 'System'} />
                <DetailItem label="Action" value={detail.action} />
                <DetailItem label="Resource" value={detail.resource || '—'} />
                <DetailItem label="Resource ID" value={detail.resourceId || '—'} mono />
                <DetailItem icon={Globe} label="IP address" value={detail.ip || '—'} mono />
                <DetailItem icon={Monitor} label="User agent" value={detail.userAgent || '—'} />
              </section>

              <section className="crm-settings-detail-section">
                <h3 className="crm-settings-section-title">Field changes</h3>
                <FieldDiffList changes={detail.changes} />
              </section>

              {metadataEntries.length > 0 && (
                <section className="crm-settings-detail-section">
                  <h3 className="crm-settings-section-title">Additional metadata</h3>
                  <div className="crm-settings-meta-grid">
                    {metadataEntries.map(([key, value]) => (
                      <div key={key} className="crm-settings-meta-item">
                        <p className="crm-settings-meta-key">{key}</p>
                        <pre className="crm-settings-meta-value">{formatAuditValue(value)}</pre>
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

function ACTION_SUMMARY(detail) {
  const parts = [detail.action, detail.resource].filter(Boolean);
  return parts.join(' · ') || 'Activity';
}
