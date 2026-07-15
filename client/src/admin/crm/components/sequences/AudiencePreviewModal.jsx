import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Users, Loader2 } from 'lucide-react';
import { previewSequenceAudience } from '../../crmApi.js';
import { audienceToApiParams } from './audienceBuilder.js';
import { useOverlayTransition } from '../ui/useOverlayTransition.js';
import { useBodyScrollLock } from '../ui/useBodyScrollLock.js';
import { cn } from '../ui/primitives.jsx';

function trimEmail(value) {
  const text = String(value || '').split(';')[0].trim();
  return text || '—';
}

export default function AudiencePreviewModal({
  open,
  onClose,
  campaignId,
  sequenceId,
  audience,
  previewMeta,
}) {
  const { mounted, visible, exiting } = useOverlayTransition(open);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);

  useBodyScrollLock(mounted);

  useEffect(() => {
    if (!open || !campaignId) return undefined;
    setLoading(true);
    previewSequenceAudience(campaignId, {
      sequenceId,
      full: true,
      ...audienceToApiParams(audience),
    })
      .then((data) => {
        setRows(data.items || data.sample || []);
        setTotal(data.totalItems ?? data.eligible ?? 0);
      })
      .catch(() => {
        setRows([]);
        setTotal(0);
      })
      .finally(() => setLoading(false));
  }, [open, campaignId, sequenceId, audience.importedCampaignIds, audience.includeCompanyIds, audience.includeContactIds, audience.excludeCompanyIds, audience.excludeContactIds]);

  if (!mounted) return null;

  return createPortal(
    <div
      className={cn('crm-seq-preview-overlay', visible && !exiting && 'is-visible', exiting && 'is-exiting')}
      onClick={onClose}
      role="presentation"
    >
      <div
        className={cn('crm-seq-preview-modal', visible && !exiting && 'is-visible', exiting && 'is-exiting')}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Audience list preview"
      >
        <div className="crm-seq-preview-head">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-soft text-brand">
              <Users className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-[var(--color-ink)]">Audience preview</h3>
              <p className="text-[11px] text-neutral-500">
                {previewMeta?.netNew ?? 0} will enroll
                {(previewMeta?.willRestart ?? 0) > 0 ? ` (${previewMeta.willRestart} restarting)` : ''}
                {' · '}{total} in list
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="crm-seq-icon-btn" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="crm-seq-preview-body crm-scroll">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-neutral-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading full list…
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="crm-seq-preview-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Role</th>
                    <th>Primary</th>
                    <th>Apollo</th>
                    <th>Hunter</th>
                    <th>Lusha</th>
                    <th>Personal</th>
                  </tr>
                </thead>
                <tbody>
                  {!rows.length && (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-neutral-400">No contacts match this audience.</td>
                    </tr>
                  )}
                  {rows.map((row) => (
                    <tr key={row._id}>
                      <td className="font-medium text-neutral-800">{row.name || '—'}</td>
                      <td className="text-neutral-500">{row.designation || '—'}</td>
                      <td className="font-mono text-neutral-500">{trimEmail(row.email)}</td>
                      <td className="font-mono text-neutral-500">{trimEmail(row.emailApollo)}</td>
                      <td className="font-mono text-neutral-500">{trimEmail(row.emailHunter)}</td>
                      <td className="font-mono text-neutral-500">{trimEmail(row.emailLusha)}</td>
                      <td className="font-mono text-neutral-500">{trimEmail(row.emailPersonal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {!loading && rows.length < total && (
          <p className="border-t border-[var(--color-line)] px-4 py-2 text-center text-[10px] text-neutral-400">
            Showing {rows.length} of {total} contacts
          </p>
        )}
      </div>
    </div>,
    document.body,
  );
}
