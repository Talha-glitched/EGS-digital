import { useState, useEffect } from 'react';
import {
  Mail,
  GitBranch,
  Clock,
  Sparkles,
  Trash2,
  Send,
  FileText,
  Users,
  Plus,
  Minus,
  Eye,
  Building2,
  UserRound,
  X,
  Play,
  SlidersHorizontal,
  Layout,
} from 'lucide-react';
import SearchableSelect from '../ui/SearchableSelect.jsx';
import SearchableMultiSelect from '../ui/SearchableMultiSelect.jsx';
import MailboxUsagePopover from './MailboxUsagePopover.jsx';
import AudiencePreviewModal from './AudiencePreviewModal.jsx';
import CampaignListImportModal from './CampaignListImportModal.jsx';
import EmailPreviewModal from './EmailPreviewModal.jsx';
import EmailTemplatePickerModal from './EmailTemplatePickerModal.jsx';
import { EMAIL_TEMPLATES, getTemplateById } from '../../constants/emailTemplates.js';
import {
  buildAudienceSummary,
  buildImportedListLabels,
  normalizeCampaignId,
} from './audienceBuilder.js';
import { DELAY_PRESETS, DELAY_UNIT_OPTIONS, formatDelayLabel } from '../../utils/sequenceDelay.js';
import { Alert } from '../ui/primitives.jsx';
import { cn } from '../ui/primitives.jsx';
import { SequenceDeliveryAlert } from '../sent/SendDeliveryIssuesWorkspace.jsx';

const CONDITION_TYPES = [
  { value: 'replied', label: 'If replied' },
  { value: 'opened', label: 'If opened email' },
  { value: 'no_reply', label: 'If no reply after wait' },
];

function CompactField({ label, hint, children }) {
  return (
    <label className="block space-y-1.5">
      <span className="block text-2xs font-semibold uppercase tracking-wide text-neutral-400">{label}</span>
      {children}
      {hint && <span className="block text-2xs leading-snug text-neutral-400">{hint}</span>}
    </label>
  );
}

function InspectorSection({ title, icon: Icon, children }) {
  return (
    <section className="crm-seq-inspector-section">
      {title && (
        <p className="crm-seq-inspector-section-title">
          {Icon && <Icon className="h-3 w-3 text-brand" />}
          {title}
        </p>
      )}
      <div className="space-y-4">{children}</div>
    </section>
  );
}

export default function SequenceInspector({
  selectedNode,
  nodes,
  onUpdateNode,
  onDeleteNode,
  sequenceName,
  onSequenceNameChange,
  fromEmail,
  fromName,
  onSenderChange,
  emailAccounts = [],
  campaignId,
  campaignOptions,
  allCampaignOptions = [],
  campaignName,
  audience,
  onAudienceChange,
  companyOptions,
  contactOptions,
  onContactSearch,
  audiencePreview,
  onResetEnrollments,
  launchMode,
  onLaunchModeChange,
  mailboxUsage,
  mailStatus,
  sequenceId,
  onSaveDraft,
  onLaunch,
  busy,
  launchArmed,
  isActive,
  contentKey,
  autosaveStatus = 'idle',
  deliverySummary,
}) {
  const isGlobal = !selectedNode;
  const [previewOpen, setPreviewOpen] = useState(false);
  const inspectorMode = isGlobal ? 'global' : `node-${selectedNode.id}`;

  const patchAudience = (patch) => onAudienceChange({ ...audience, ...patch });

  return (
    <>
      <aside className="crm-seq-panel crm-seq-panel-right crm-seq-inspector">
        <div className="crm-seq-panel-head">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-2xs font-semibold uppercase tracking-[0.16em] text-neutral-400">
                {isGlobal ? 'Sequence settings' : 'Element'}
              </p>
              <p
                key={inspectorMode}
                className={cn(
                  'mt-0.5 text-xs font-semibold text-[var(--color-ink)] crm-seq-inspector-headline',
                  !isGlobal && 'capitalize',
                )}
              >
                {isGlobal ? 'Configure your flow' : (selectedNode.type === 'email' ? 'Send email' : selectedNode.type)}
              </p>
            </div>
            {isGlobal && autosaveStatus !== 'idle' && (
              <span className={cn(
                'shrink-0 text-2xs font-medium',
                autosaveStatus === 'saving' && 'text-neutral-400',
                autosaveStatus === 'saved' && 'text-emerald-600',
                autosaveStatus === 'error' && 'text-red-600',
              )}
              >
                {autosaveStatus === 'saving' && 'Saving…'}
                {autosaveStatus === 'saved' && 'Saved'}
                {autosaveStatus === 'error' && 'Save failed'}
              </span>
            )}
          </div>
        </div>

        <div className="crm-seq-panel-body crm-scroll crm-seq-inspector-scroll">
          <div
            key={`${contentKey}-${inspectorMode}`}
            className={cn('crm-seq-inspector-pane', isGlobal ? 'is-global' : 'is-node')}
          >
          {isGlobal ? (
            <GlobalInspector
              sequenceName={sequenceName}
              onSequenceNameChange={onSequenceNameChange}
              fromEmail={fromEmail}
              fromName={fromName}
              onSenderChange={onSenderChange}
              emailAccounts={emailAccounts}
              campaignId={campaignId}
              allCampaignOptions={allCampaignOptions}
              audience={audience}
              patchAudience={patchAudience}
              companyOptions={companyOptions}
              contactOptions={contactOptions}
              onContactSearch={onContactSearch}
              audiencePreview={audiencePreview}
              onOpenPreview={() => setPreviewOpen(true)}
              onResetEnrollments={onResetEnrollments}
              launchMode={launchMode}
              onLaunchModeChange={onLaunchModeChange}
              mailboxUsage={mailboxUsage}
              mailStatus={mailStatus}
              deliverySummary={deliverySummary}
            />
          ) : (
            <NodeInspector
              node={selectedNode}
              onUpdate={onUpdateNode}
              onDelete={onDeleteNode}
              canDelete={nodes.length > 1 || selectedNode.type !== 'email'}
              fromEmail={fromEmail}
              fromName={fromName}
              emailAccounts={emailAccounts}
            />
          )}
          </div>
        </div>

        {isGlobal && (
          <div className="crm-seq-panel-foot">
            {launchMode === 'draft' ? (
              <button type="button" onClick={onSaveDraft} disabled={busy} className="crm-btn-primary w-full !py-2.5 text-xs">
                <FileText className="h-3.5 w-3.5" />
                {busy ? 'Saving…' : 'Save draft'}
              </button>
            ) : (
              <>
                {launchArmed && (
                  <p className="mb-2 rounded-lg border border-orange-200 bg-orange-50 px-2.5 py-2 text-xs leading-relaxed text-orange-800">
                    This sends real email to <span className="font-semibold">{audiencePreview?.netNew || 0} new contact{(audiencePreview?.netNew || 0) === 1 ? '' : 's'}</span> right now
                    {mailboxUsage ? (
                      <>, using <span className="font-semibold">{Math.min(audiencePreview?.netNew || 0, mailboxUsage.remaining ?? mailboxUsage.dailyCap ?? 150)}</span> of the {mailboxUsage.remaining ?? Math.max(0, (mailboxUsage.dailyCap || 150) - (mailboxUsage.sentToday || 0))} sends left on this mailbox today</>
                    ) : null}. Click again to confirm.
                    {(audiencePreview?.holdOverridden || 0) > 0 && (
                      <span className="mt-1.5 block font-semibold">
                        {audiencePreview.holdOverridden} of these {audiencePreview.holdOverridden === 1 ? 'is' : 'are'} mid-conversation
                        {' '}(replied or paused) and will get an automated email because you selected {audiencePreview.holdOverridden === 1 ? 'them' : 'them'} at import.
                      </span>
                    )}
                  </p>
                )}
                <button
                  type="button"
                  onClick={onLaunch}
                  disabled={busy || !((audiencePreview?.netNew || 0) > 0 || (audiencePreview?.eligible || 0) > 0 || audience.importedCampaignIds?.length || audience.includeContactIds?.length || audience.includeCompanyIds?.length)}
                  className={cn('crm-btn-primary w-full !py-2.5 text-xs', launchArmed && 'ring-2 ring-orange-200')}
                >
                  <Send className="h-3.5 w-3.5" />
                  {busy ? 'Launching…' : launchArmed ? 'Confirm launch' : 'Launch sequence'}
                </button>
              </>
            )}
          </div>
        )}
      </aside>

      <AudiencePreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        campaignId={campaignId}
        sequenceId={sequenceId}
        audience={audience}
        onPatchAudience={patchAudience}
      />
    </>
  );
}

function GlobalInspector({
  sequenceName,
  onSequenceNameChange,
  fromEmail,
  fromName,
  onSenderChange,
  emailAccounts = [],
  campaignId,
  allCampaignOptions = [],
  audience,
  patchAudience,
  companyOptions,
  contactOptions,
  onContactSearch,
  audiencePreview,
  onOpenPreview,
  onResetEnrollments,
  launchMode,
  onLaunchModeChange,
  mailboxUsage,
  mailStatus,
  deliverySummary,
}) {
  const [importPickerId, setImportPickerId] = useState(() => normalizeCampaignId(campaignId));
  const [importModal, setImportModal] = useState({ open: false, campaignId: '', campaignName: '', initialSelections: null });
  const isSend = launchMode === 'send';

  useEffect(() => {
    const linked = normalizeCampaignId(campaignId);
    const picked = normalizeCampaignId(importPickerId);
    if (linked && !picked) {
      setImportPickerId(linked);
      return;
    }
    // Drop invalid leftovers such as String(null) → "null"
    if (importPickerId && !picked) {
      setImportPickerId(linked || '');
    }
  }, [campaignId, importPickerId]);

  const campaignLabels = Object.fromEntries(
    allCampaignOptions.map((opt) => [String(opt.value), opt.label]),
  );
  const summary = buildAudienceSummary(audience, audiencePreview, campaignLabels);
  const importedLists = buildImportedListLabels(audience, campaignLabels);

  function openImportModalForCampaign(cid, cname) {
    const id = normalizeCampaignId(cid || importPickerId || campaignId);
    if (!id) return;
    const label = cname || campaignLabels[id] || 'Campaign List';
    const existingSelections = audience.campaignSelections?.[id] || null;
    setImportModal({
      open: true,
      campaignId: id,
      campaignName: label,
      initialSelections: existingSelections,
    });
  }

  function handleImportConfirm({ campaignId: cId, selectedLeadIds, unselectedLeadIds, allLeadIds, totalCampaignLeadsCount }) {
    const ids = (audience.importedCampaignIds || []).map(String);
    const nextImported = ids.includes(cId) ? ids : [...ids, cId];

    const nextSelections = {
      ...(audience.campaignSelections || {}),
      [cId]: selectedLeadIds,
    };

    // Cleanly exclude unselected contacts from this campaign list
    let nextExcludeContactIds = (audience.excludeContactIds || []).map(String);
    const allSet = new Set((allLeadIds || []).map(String));

    // Remove any previous exclusions belonging to this campaign list
    nextExcludeContactIds = nextExcludeContactIds.filter((id) => !allSet.has(id));

    if (selectedLeadIds.length < totalCampaignLeadsCount) {
      // Add unselected contacts to excludeContactIds so backend enrolls ONLY selected contacts
      const excludeSet = new Set([...nextExcludeContactIds, ...(unselectedLeadIds || [])]);
      nextExcludeContactIds = Array.from(excludeSet);
    }

    patchAudience({
      importedCampaignIds: nextImported,
      campaignSelections: nextSelections,
      excludeContactIds: nextExcludeContactIds,
    });
  }

  function removeImportedList(id) {
    const nextSelections = { ...(audience.campaignSelections || {}) };
    delete nextSelections[id];
    patchAudience({
      importedCampaignIds: (audience.importedCampaignIds || [])
        .map(String)
        .filter((item) => item !== String(id)),
      campaignSelections: nextSelections,
    });
  }

  return (
    <>
    <div className="crm-seq-inspector-sections">
      {deliverySummary ? (
        <InspectorSection title="Delivery status">
          <SequenceDeliveryAlert summary={deliverySummary} compact />
        </InspectorSection>
      ) : null}

      <InspectorSection title="Basics">
        <CompactField label="Name">
          <input
            className="crm-input crm-seq-input py-2 text-xs"
            value={sequenceName}
            onChange={(e) => onSequenceNameChange(e.target.value)}
          />
        </CompactField>
        {campaignId ? (
          <p className="mt-2 text-2xs leading-relaxed text-neutral-500">
            Imported lists choose who receives this sequence. Launch batches appear in{' '}
            <span className="font-semibold text-[var(--color-ink)]">Email → Outbox</span>.
          </p>
        ) : (
          <p className="mt-2 text-2xs leading-relaxed text-neutral-500">
            Import a campaign list below, then launch. Batches appear in{' '}
            <span className="font-semibold text-[var(--color-ink)]">Email → Outbox</span>.
          </p>
        )}
      </InspectorSection>

      <InspectorSection title="Sender mailbox" icon={Mail}>
        <CompactField label="Sending Account" hint="Emails in this sequence will be sent from this executive mailbox">
          <select
            className="crm-input crm-seq-input py-2 text-xs font-medium text-[var(--color-ink)]"
            value={fromEmail || (emailAccounts.find((a) => a.isPrimary)?.email || 'haider@exhibitgraphicsign.com')}
            onChange={(e) => {
              const val = e.target.value;
              const matched = emailAccounts.find((a) => a.email.toLowerCase() === val.toLowerCase());
              onSenderChange?.({
                email: val,
                name: matched?.name || (val.includes('haider') ? 'Dr. Haider' : val.includes('masuood') ? 'Masuood-ul-Rasheed' : 'Talha Masuood'),
              });
            }}
          >
            {emailAccounts.length > 0 ? (
              emailAccounts.map((acc) => (
                <option key={acc.email} value={acc.email}>
                  {acc.name} ({acc.email}) — {acc.title || (acc.isPrimary ? 'Primary' : 'Sender')}
                </option>
              ))
            ) : (
              <>
                <option value="haider@exhibitgraphicsign.com">Dr. Haider (haider@exhibitgraphicsign.com) — Project Director (Default)</option>
                <option value="masuood@exhibitgraphicsign.com">Masuood-ul-Rasheed (masuood@exhibitgraphicsign.com) — Managing Director</option>
                <option value="talha@exhibitgraphicsign.com">Talha Masuood (talha@exhibitgraphicsign.com) — Operations & Technical Director</option>
              </>
            )}
          </select>
        </CompactField>
        {(() => {
          const effectiveEmail = fromEmail || (emailAccounts.find((a) => a.isPrimary)?.email || 'haider@exhibitgraphicsign.com');
          const matched = emailAccounts.find((a) => a.email.toLowerCase() === effectiveEmail.toLowerCase());
          const isReady = matched ? (matched.smtpReady !== false) : true;
          return (
            <div className="flex items-center justify-between rounded-lg border border-neutral-200/80 bg-neutral-50 px-2.5 py-2 text-2xs">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className={cn('h-2 w-2 rounded-full shrink-0', isReady ? 'bg-emerald-500' : 'bg-amber-500')} />
                <span className="truncate font-medium text-[var(--color-ink)]">
                  {matched?.title || (effectiveEmail.includes('haider') ? 'Project Director · Exhibit Graphic Sign LLC' : effectiveEmail.includes('masuood') ? 'Managing Director · Exhibit Graphic Sign LLC' : 'Operations & Technical Director · Exhibit Graphic Sign LLC')}
                </span>
              </div>
              <span className="shrink-0 text-neutral-400 font-mono">
                {isReady ? 'SMTP active' : 'Check SMTP'}
              </span>
            </div>
          );
        })()}
      </InspectorSection>

      <InspectorSection title="Send to" icon={Users}>
        <div className="crm-seq-send-import">
          <p className="text-2xs leading-relaxed text-neutral-500">
            Choose a campaign list, click <span className="font-semibold text-[var(--color-ink)]">Import</span> to open filters and customize who receives emails.
          </p>
          <div className="flex gap-2">
            <div className="min-w-0 flex-1">
              <SearchableSelect
                value={importPickerId}
                onChange={setImportPickerId}
                options={allCampaignOptions}
                placeholder="Choose list…"
                className="crm-seq-compact-select"
              />
            </div>
            <button
              type="button"
              onClick={() => openImportModalForCampaign(importPickerId, campaignLabels[importPickerId])}
              className="crm-seq-import-btn shrink-0"
              disabled={!importPickerId}
            >
              <Plus className="h-3 w-3" />
              Import
            </button>
          </div>
        </div>

        <div className="crm-seq-audience-rows">
        <AudienceAddRow
          icon={Building2}
          label="Add companies"
          values={audience.includeCompanyIds}
          onChange={(includeCompanyIds) => patchAudience({ includeCompanyIds })}
          options={companyOptions}
          placeholder="Search companies…"
        />

        <AudienceAddRow
          icon={UserRound}
          label="Add contacts"
          values={audience.includeContactIds}
          onChange={(includeContactIds) => patchAudience({ includeContactIds })}
          options={contactOptions}
          placeholder="Search contacts…"
          onSearch={onContactSearch}
        />

        <AudienceAddRow
          icon={Minus}
          label="Exclude companies"
          values={audience.excludeCompanyIds}
          onChange={(excludeCompanyIds) => patchAudience({ excludeCompanyIds })}
          options={companyOptions}
          placeholder="Remove companies…"
          tone="exclude"
        />

        <AudienceAddRow
          icon={Minus}
          label="Exclude contacts"
          values={audience.excludeContactIds}
          onChange={(excludeContactIds) => patchAudience({ excludeContactIds })}
          options={contactOptions}
          placeholder="Remove contacts…"
          tone="exclude"
          onSearch={onContactSearch}
        />
        </div>

        {importedLists.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {importedLists.map((item) => (
              <span key={item.id} className="crm-seq-import-chip inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-neutral-100 border border-neutral-200 text-xs font-medium text-neutral-800">
                <Building2 className="h-3 w-3 shrink-0 text-brand" />
                <span className="truncate max-w-[120px] font-semibold">{item.label}</span>
                {item.selectedCount != null && (
                  <span className="text-2xs bg-brand-soft text-brand px-1 py-0.2 rounded font-bold">
                    {item.selectedCount} sel
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => openImportModalForCampaign(item.id, item.label)}
                  className="text-neutral-500 hover:text-brand transition-colors p-0.5"
                  title="Edit selection / filters"
                  aria-label={`Edit selections for ${item.label}`}
                >
                  <SlidersHorizontal className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={() => removeImportedList(item.id)}
                  className="text-neutral-400 hover:text-red-600 transition-colors p-0.5"
                  aria-label={`Remove ${item.label}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="crm-seq-audience-summary">
          <p className="text-2xs leading-relaxed text-neutral-600">{summary}</p>
          {(audiencePreview?.willRestart || 0) > 0 && (audiencePreview?.netNew || 0) > 0 && (
            <p className="mt-2 text-2xs leading-relaxed text-neutral-600">
              {(audiencePreview.blockingContacts || []).map((c) => c.name || c.email).filter(Boolean).join(', ')}
              {' '}already in this sequence — relaunch will restart from step 1.
            </p>
          )}
          {(() => {
            const totalSel = Object.values(audience.campaignSelections || {}).reduce(
              (acc, arr) => acc + (Array.isArray(arr) ? arr.length : 0),
              0,
            );
            const total = (audiencePreview?.eligible || 0) + (audiencePreview?.blocked || 0);
            const count = total || totalSel || 0;
            return (
              <button
                type="button"
                onClick={onOpenPreview}
                className="mt-2 inline-flex items-center gap-1 text-2xs font-semibold text-brand hover:underline"
              >
                <Eye className="h-3 w-3" />
                See who gets emailed & why ({count})
              </button>
            );
          })()}
        </div>
      </InspectorSection>

      <InspectorSection title="Delivery">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onLaunchModeChange('draft')}
            className={cn('crm-seq-mode-btn crm-seq-mode-btn-sm', launchMode === 'draft' && 'is-active')}
          >
            <FileText className="h-3 w-3" />
            Draft
          </button>
          <button
            type="button"
            onClick={() => onLaunchModeChange('send')}
            className={cn('crm-seq-mode-btn crm-seq-mode-btn-sm', launchMode === 'send' && 'is-active')}
          >
            <Send className="h-3 w-3" />
            Send
          </button>
        </div>

        {isSend && (
          <div className="crm-seq-enroll-panel crm-seq-expand-in space-y-2.5">
            <MailboxUsagePopover usage={mailboxUsage} />
            {!mailStatus?.emailDeliveryReady && (
              <Alert tone="warning" className="mt-2 !py-1.5 !text-2xs">Email delivery is not configured.</Alert>
            )}
            {onResetEnrollments && (
              <div className="pt-2 border-t border-neutral-100 flex items-center justify-between">
                <span className="text-2xs text-neutral-500">Need to restart or re-send?</span>
                <button
                  type="button"
                  onClick={onResetEnrollments}
                  className="text-2xs font-semibold text-brand hover:text-brand/80 hover:underline cursor-pointer"
                >
                  Reset enrollments
                </button>
              </div>
            )}
          </div>
        )}
      </InspectorSection>
    </div>

    <CampaignListImportModal
      open={importModal.open}
      onClose={() => setImportModal((prev) => ({ ...prev, open: false }))}
      campaignId={importModal.campaignId}
      campaignName={importModal.campaignName}
      initialSelectedLeadIds={importModal.initialSelections}
      onConfirm={handleImportConfirm}
    />
    </>
  );
}

function AudienceAddRow({ icon: Icon, label, values, onChange, options, placeholder, tone, onSearch }) {
  const [open, setOpen] = useState(false);
  const count = values?.length || 0;

  return (
    <div className={cn('crm-seq-audience-block', tone === 'exclude' && 'is-exclude', open && 'is-open')}>
      <button type="button" className="crm-seq-audience-toggle" onClick={() => setOpen((v) => !v)}>
        <Icon className="h-3 w-3 shrink-0" />
        <span className="flex-1 text-left">{label}</span>
        {count > 0 && <span className="crm-seq-audience-count">{count}</span>}
        <Plus className={cn('h-3 w-3 shrink-0 transition-transform duration-200 ease-out', open && 'rotate-45')} />
      </button>
      <div className={cn('crm-seq-audience-expand', open && 'is-open')} aria-hidden={!open}>
        {open && (
          <div className="crm-seq-audience-expand-inner px-2 pb-2">
            <SearchableMultiSelect
              values={values}
              onChange={onChange}
              options={options}
              placeholder={placeholder}
              className="crm-seq-compact-select"
              onQueryChange={onSearch}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function NodeInspector({ node, onUpdate, onDelete, canDelete, fromEmail, fromName, emailAccounts = [] }) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const update = (field, value) => onUpdate(node.id, { ...node.data, [field]: value });

  if (node.type === 'email') {
    const currentTemplateId = node.data?.templateType || 'exhibitions';
    const currentTemplate = getTemplateById(currentTemplateId);

    const handleSelectTemplate = (templateId, { applyCopy, template } = {}) => {
      const patch = { templateType: templateId };
      if (applyCopy && template) {
        patch.subjectTemplate = template.defaultSubject;
        patch.bodyTemplate = template.defaultBody;
      }
      onUpdate(node.id, { ...node.data, ...patch });
    };

    const effectiveFromEmail = fromEmail || 'haider@exhibitgraphicsign.com';
    const effectiveFromName = fromName || (effectiveFromEmail.includes('haider') ? 'Dr. Haider' : effectiveFromEmail.includes('masuood') ? 'Masuood-ul-Rasheed' : 'Talha Masuood');

    return (
      <>
        {/* SENDER IDENTITY BADGE */}
        <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg border border-neutral-200/80 bg-neutral-50 text-2xs">
          <div className="flex items-center gap-1.5 text-neutral-600 truncate">
            <Mail className="h-3 w-3 text-brand shrink-0" />
            <span className="truncate">From: <strong className="text-neutral-900">{effectiveFromName}</strong> <span className="text-neutral-400 font-mono">({effectiveFromEmail})</span></span>
          </div>
        </div>

        {/* TEMPLATE PICKER CARD */}
        <div className="rounded-lg border border-[var(--color-line)] bg-neutral-50/70 p-2.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-semibold uppercase tracking-wide text-neutral-500">Design Template</span>
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="text-2xs font-semibold text-brand hover:underline"
            >
              Gallery
            </button>
          </div>

          <div className="grid grid-cols-2 gap-1">
            {EMAIL_TEMPLATES.map((tpl) => {
              const isSelected = currentTemplateId === tpl.id;
              return (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => handleSelectTemplate(tpl.id, { applyCopy: false })}
                  className={cn(
                    'flex items-center justify-between px-2 py-1 rounded text-2xs transition-all text-left',
                    isSelected
                      ? 'bg-white border border-neutral-900 font-semibold text-neutral-900 shadow-2xs'
                      : 'bg-white/60 border border-neutral-200 text-neutral-600 hover:bg-white',
                  )}
                >
                  <span className="truncate">{tpl.name.split('&')[0].trim()}</span>
                  <span className="h-1.5 w-1.5 rounded-full shrink-0 ml-1" style={{ backgroundColor: tpl.accentColor }} />
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-md bg-white border border-neutral-200 text-2xs font-semibold text-neutral-800 shadow-2xs hover:bg-neutral-100 transition-all cursor-pointer"
          >
            <Eye className="h-3 w-3 text-brand" />
            Preview Email as Recipient
          </button>
        </div>

        <label className="flex items-center gap-1.5 rounded-md border border-[var(--color-line)] p-2 text-2xs">
          <input
            type="checkbox"
            checked={node.data?.useAiPersonalization !== false}
            onChange={(e) => update('useAiPersonalization', e.target.checked)}
          />
          <Sparkles className="h-3 w-3 text-brand" />
          AI personalize
        </label>
        {node.data?.useAiPersonalization !== false && (
          <CompactField label="AI prompt">
            <input
              className="crm-input crm-seq-input py-1.5 text-2xs"
              value={node.data?.aiPrompt || ''}
              onChange={(e) => update('aiPrompt', e.target.value)}
            />
          </CompactField>
        )}
        <CompactField label="Subject">
          <input
            className="crm-input crm-seq-input py-1.5 font-mono text-2xs"
            value={node.data?.subjectTemplate ?? currentTemplate.defaultSubject}
            onChange={(e) => update('subjectTemplate', e.target.value)}
          />
        </CompactField>
        <CompactField label="Body">
          <textarea
            rows={8}
            className="crm-input crm-seq-input resize-y font-mono text-2xs leading-relaxed"
            value={node.data?.bodyTemplate ?? currentTemplate.defaultBody}
            onChange={(e) => update('bodyTemplate', e.target.value)}
          />
        </CompactField>
        {canDelete && (
          <button type="button" onClick={() => onDelete(node.id)} className="crm-btn-ghost w-full !py-1.5 text-2xs text-rose-600">
            <Trash2 className="h-3 w-3" />
            Remove
          </button>
        )}

        <EmailPreviewModal
          open={previewOpen}
          onClose={() => setPreviewOpen(false)}
          templateType={currentTemplateId}
          subject={node.data?.subjectTemplate ?? currentTemplate.defaultSubject}
          body={node.data?.bodyTemplate ?? currentTemplate.defaultBody}
          aiPrompt={node.data?.aiPrompt || ''}
          useAi={node.data?.useAiPersonalization !== false}
          fromEmail={effectiveFromEmail}
          fromName={effectiveFromName}
          onApplyTemplate={(id) => handleSelectTemplate(id, { applyCopy: false })}
        />

        <EmailTemplatePickerModal
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          selectedTemplateId={currentTemplateId}
          onSelectTemplate={handleSelectTemplate}
          onPreviewTemplate={(id) => {
            handleSelectTemplate(id, { applyCopy: false });
            setPreviewOpen(true);
          }}
        />
      </>
    );
  }

  if (node.type === 'wait') {
    const amount = Number(node.data?.amount ?? node.data?.days) || 1;
    const unit = node.data?.unit || 'days';
    const setWait = (patch) => onUpdate(node.id, { ...node.data, ...patch });

    return (
      <>
        <CompactField label="Wait duration">
          <div className="flex gap-2">
            <input
              type="number"
              min="1"
              className="crm-input crm-seq-input min-w-0 flex-1 py-1.5 text-xs"
              value={amount}
              onChange={(e) => setWait({ amount: Number(e.target.value), days: undefined })}
            />
            <select
              className="crm-input crm-seq-input w-24 shrink-0 py-1.5 text-xs"
              value={unit}
              onChange={(e) => setWait({ unit: e.target.value })}
            >
              {DELAY_UNIT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </CompactField>
        <div className="flex flex-wrap gap-1.5">
          {DELAY_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              className="rounded-md border border-[var(--color-line)] px-2 py-1 text-2xs font-medium text-neutral-600 hover:border-brand hover:text-brand"
              onClick={() => setWait({ amount: preset.amount, unit: preset.unit, days: undefined })}
            >
              {preset.label}
            </button>
          ))}
        </div>
        <p className="text-2xs text-neutral-400">
          Current wait: {formatDelayLabel(amount, unit)}
        </p>
        {canDelete && (
          <button type="button" onClick={() => onDelete(node.id)} className="crm-btn-ghost w-full !py-1.5 text-2xs text-rose-600">
            <Trash2 className="h-3 w-3" />
            Remove
          </button>
        )}
      </>
    );
  }

  if (node.type === 'condition') {
    return (
      <>
        <CompactField label="Type">
          <select
            className="crm-input crm-seq-input py-1.5 text-xs"
            value={node.data?.conditionType || 'replied'}
            onChange={(e) => {
              const option = CONDITION_TYPES.find((c) => c.value === e.target.value);
              onUpdate(node.id, {
                ...node.data,
                conditionType: e.target.value,
                label: option?.label || 'Condition',
              });
            }}
          >
            {CONDITION_TYPES.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </CompactField>
        <CompactField label="If true">
          <input className="crm-input crm-seq-input py-1.5 text-xs" value={node.data?.trueBranch || ''} onChange={(e) => update('trueBranch', e.target.value)} />
        </CompactField>
        <CompactField label="If false">
          <input className="crm-input crm-seq-input py-1.5 text-xs" value={node.data?.falseBranch || ''} onChange={(e) => update('falseBranch', e.target.value)} />
        </CompactField>
        {canDelete && (
          <button type="button" onClick={() => onDelete(node.id)} className="crm-btn-ghost w-full !py-1.5 text-2xs text-rose-600">
            <Trash2 className="h-3 w-3" />
            Remove
          </button>
        )}
      </>
    );
  }

  return null;
}

export function nodeIcon(type) {
  if (type === 'start') return Play;
  if (type === 'email') return Mail;
  if (type === 'condition') return GitBranch;
  if (type === 'wait') return Clock;
  return Mail;
}
