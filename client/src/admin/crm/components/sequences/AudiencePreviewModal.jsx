import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Users, Loader2 } from 'lucide-react';
import { previewSequenceAudience } from '../../crmApi.js';
import { audienceToApiParams } from './audienceBuilder.js';
import { useOverlayTransition } from '../ui/useOverlayTransition.js';
import { useBodyScrollLock } from '../ui/useBodyScrollLock.js';
import { cn } from '../ui/primitives.jsx';

const BLOCKED_REASON_LABELS = {
  missing_email: 'No email on file',
  suppressed: 'Suppressed (bounced/unsubscribed elsewhere)',
  delivery_blocked: 'Marked Bounced / Invalid or Opted Out',
  campaign_focus_hold: 'On hold in campaign (replied / paused / manual)',
};

function rowStatus(row, excludedSet) {
  if (row.blockedReason) {
    return { label: BLOCKED_REASON_LABELS[row.blockedReason] || row.blockedReason, tone: 'blocked', toggleable: false };
  }
  if (row.holdOverridden && !excludedSet.has(String(row.leadId))) {
    return { label: 'Will send — mid-conversation, you selected it', tone: 'override', toggleable: true };
  }
  if (row.alreadySent) return { label: 'Already sent this sequence', tone: 'sent', toggleable: false };
  if (row.alreadyInQueue) return { label: 'Already queued to send', tone: 'queued', toggleable: false };
  if (row.alreadyEnrolled) return { label: 'Already enrolled', tone: 'enrolled', toggleable: false };
  if (row.manuallyExcluded || excludedSet.has(String(row.leadId))) return { label: 'Manually excluded', tone: 'excluded', toggleable: true };
  return { label: 'Will send', tone: 'send', toggleable: true };
}

const TONE_CLASSES = {
  send: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  override: 'bg-orange-50 text-orange-700 border-orange-200',
  excluded: 'bg-neutral-100 text-neutral-500 border-neutral-200',
  blocked: 'bg-rose-50 text-rose-700 border-rose-200',
  sent: 'bg-neutral-100 text-neutral-500 border-neutral-200',
  queued: 'bg-amber-50 text-amber-700 border-amber-200',
  enrolled: 'bg-amber-50 text-amber-700 border-amber-200',
};

export default function AudiencePreviewModal({
  open,
  onClose,
  campaignId,
  sequenceId,
  audience,
  onPatchAudience,
}) {
  const { mounted, visible, exiting } = useOverlayTransition(open);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);

  useBodyScrollLock(mounted);

  useEffect(() => {
    const hasAudience = Boolean(
      audience?.importedCampaignIds?.length
      || audience?.includeCompanyIds?.length
      || audience?.includeContactIds?.length
      || audience?.importCampaign,
    );
    if (!open || (!campaignId && !hasAudience)) return undefined;
    setLoading(true);
    previewSequenceAudience(campaignId || null, {
      sequenceId,
      full: true,
      ...audienceToApiParams(audience),
    })
      .then((data) => {
        setRows(data.contacts || data.sample || []);
      })
      .catch(() => {
        setRows([]);
      })
      .finally(() => setLoading(false));
  }, [open, campaignId, sequenceId, audience.importedCampaignIds, audience.includeCompanyIds, audience.includeContactIds, audience.excludeCompanyIds, audience.excludeContactIds]);

  const excludedSet = useMemo(
    () => new Set((audience.excludeContactIds || []).map(String)),
    [audience.excludeContactIds],
  );

  const sendTones = rows.map((row) => rowStatus(row, excludedSet).tone);
  const willSendCount = sendTones.filter((tone) => tone === 'send' || tone === 'override').length;
  const overrideCount = sendTones.filter((tone) => tone === 'override').length;

  function toggleExclude(row) {
    const id = String(row.leadId);
    const current = (audience.excludeContactIds || []).map(String);
    const next = excludedSet.has(id)
      ? current.filter((existing) => existing !== id)
      : [...current, id];
    onPatchAudience?.({ excludeContactIds: next });
  }

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
              <h3 className="text-sm font-bold text-[var(--color-ink)]">Who gets emailed</h3>
              <p className="text-xs text-neutral-500">
                {loading ? 'Loading…' : `${willSendCount} will send now`}
                {!loading && rows.length ? ` · ${rows.length - willSendCount} skipped` : ''}
                {!loading && overrideCount ? ` · ${overrideCount} mid-conversation` : ''}
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
                    <th>Send?</th>
                    <th>Name</th>
                    <th>Company</th>
                    <th>Email</th>
                    <th>Source list</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {!rows.length && (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-neutral-400">No contacts match this audience.</td>
                    </tr>
                  )}
                  {rows.map((row) => {
                    const status = rowStatus(row, excludedSet);
                    const checked = status.tone === 'send';
                    return (
                      <tr key={row.campaignContactId || row.leadId}>
                        <td>
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={!status.toggleable}
                            onChange={() => toggleExclude(row)}
                            title={status.toggleable ? 'Include/exclude this contact' : 'This contact cannot be toggled here'}
                          />
                        </td>
                        <td className="font-medium text-neutral-800">{row.name || '—'}</td>
                        <td className="text-neutral-500">{row.companyName || '—'}</td>
                        <td className="font-mono text-neutral-500">{row.email || '—'}</td>
                        <td className="text-neutral-500">{row.campaignName || '—'}</td>
                        <td>
                          <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-2xs font-semibold', TONE_CLASSES[status.tone])}>
                            {status.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {!loading && rows.length ? (
          <p className="border-t border-[var(--color-line)] px-4 py-2 text-center text-2xs text-neutral-400">
            Check the box to manually include/exclude a specific contact. Contacts blocked by a delivery rule (bounced, suppressed, missing email, or on hold in their campaign) can't be forced here.
          </p>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
