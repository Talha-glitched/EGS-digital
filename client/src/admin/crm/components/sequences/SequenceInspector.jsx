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
} from 'lucide-react';
import SearchableSelect from '../ui/SearchableSelect.jsx';
import SearchableMultiSelect from '../ui/SearchableMultiSelect.jsx';
import MailboxUsagePopover from './MailboxUsagePopover.jsx';
import AudiencePreviewModal from './AudiencePreviewModal.jsx';
import { buildAudienceSummary, buildImportedListLabels } from './audienceBuilder.js';
import { Alert } from '../ui/primitives.jsx';
import { cn } from '../ui/primitives.jsx';

const CONDITION_TYPES = [
  { value: 'replied', label: 'If replied' },
  { value: 'opened', label: 'If opened email' },
  { value: 'no_reply', label: 'If no reply after wait' },
];

function CompactField({ label, hint, children }) {
  return (
    <label className="block space-y-1.5">
      <span className="block text-[10px] font-semibold uppercase tracking-wide text-neutral-400">{label}</span>
      {children}
      {hint && <span className="block text-[10px] leading-snug text-neutral-400">{hint}</span>}
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
  campaignId,
  onCampaignChange,
  campaignOptions,
  allCampaignOptions = [],
  campaignName,
  audience,
  onAudienceChange,
  companyOptions,
  contactOptions,
  audiencePreview,
  launchMode,
  onLaunchModeChange,
  enrollLimit,
  onEnrollLimitChange,
  fromName,
  onFromNameChange,
  fromEmail,
  onFromEmailChange,
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
              <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-neutral-400">
                {isGlobal ? 'Sequence settings' : 'Element'}
              </p>
              <p
                key={inspectorMode}
                className={cn(
                  'mt-0.5 text-[11px] font-semibold text-[var(--color-ink)] crm-seq-inspector-headline',
                  !isGlobal && 'capitalize',
                )}
              >
                {isGlobal ? 'Configure your flow' : (selectedNode.type === 'email' ? 'Send email' : selectedNode.type)}
              </p>
            </div>
            {isGlobal && autosaveStatus !== 'idle' && (
              <span className={cn(
                'shrink-0 text-[10px] font-medium',
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
              campaignId={campaignId}
              onCampaignChange={onCampaignChange}
              allCampaignOptions={allCampaignOptions}
              audience={audience}
              patchAudience={patchAudience}
              companyOptions={companyOptions}
              contactOptions={contactOptions}
              audiencePreview={audiencePreview}
              onOpenPreview={() => setPreviewOpen(true)}
              launchMode={launchMode}
              onLaunchModeChange={onLaunchModeChange}
              enrollLimit={enrollLimit}
              onEnrollLimitChange={onEnrollLimitChange}
              fromName={fromName}
              onFromNameChange={onFromNameChange}
              fromEmail={fromEmail}
              onFromEmailChange={onFromEmailChange}
              mailboxUsage={mailboxUsage}
              mailStatus={mailStatus}
            />
          ) : (
            <NodeInspector
              node={selectedNode}
              onUpdate={onUpdateNode}
              onDelete={onDeleteNode}
              canDelete={nodes.length > 1 || selectedNode.type !== 'email'}
            />
          )}
          </div>
        </div>

        {isGlobal && (
          <div className="crm-seq-panel-foot">
            {launchMode === 'draft' ? (
              <button type="button" onClick={onSaveDraft} disabled={busy} className="crm-btn-primary w-full !py-2.5 text-[11px]">
                <FileText className="h-3.5 w-3.5" />
                {busy ? 'Saving…' : 'Save draft'}
              </button>
            ) : (
              <button
                type="button"
                onClick={onLaunch}
                disabled={busy || !(audiencePreview?.netNew || 0)}
                className={cn('crm-btn-primary w-full !py-2.5 text-[11px]', launchArmed && 'ring-2 ring-orange-200')}
              >
                <Send className="h-3.5 w-3.5" />
                {busy ? 'Launching…' : launchArmed ? `Confirm ${enrollLimit}` : `Launch ${enrollLimit}`}
              </button>
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
        previewMeta={audiencePreview}
      />
    </>
  );
}

function GlobalInspector({
  sequenceName,
  onSequenceNameChange,
  campaignId,
  onCampaignChange,
  allCampaignOptions = [],
  audience,
  patchAudience,
  companyOptions,
  contactOptions,
  audiencePreview,
  onOpenPreview,
  launchMode,
  onLaunchModeChange,
  enrollLimit,
  onEnrollLimitChange,
  fromName,
  onFromNameChange,
  fromEmail,
  onFromEmailChange,
  mailboxUsage,
  mailStatus,
}) {
  const [importPickerId, setImportPickerId] = useState(campaignId || '');
  const maxEnroll = audiencePreview?.netNew || 0;
  const isSend = launchMode === 'send';

  useEffect(() => {
    if (campaignId && !importPickerId) setImportPickerId(campaignId);
  }, [campaignId, importPickerId]);

  const campaignLabels = Object.fromEntries(
    allCampaignOptions.map((opt) => [String(opt.value), opt.label]),
  );
  const summary = buildAudienceSummary(audience, audiencePreview, campaignLabels);
  const importedLists = buildImportedListLabels(audience, campaignLabels);

  function importCampaignList() {
    const id = importPickerId || campaignId;
    if (!id) return;
    const ids = audience.importedCampaignIds || [];
    if (ids.includes(id)) return;
    const nextIds = [...ids, id];
    patchAudience({ importedCampaignIds: nextIds });
    if (!campaignId || ids.length === 0) {
      onCampaignChange(id);
    }
  }

  function removeImportedList(id) {
    patchAudience({
      importedCampaignIds: (audience.importedCampaignIds || []).filter((item) => item !== id),
    });
  }

  return (
    <div className="crm-seq-inspector-sections">
      <InspectorSection title="Basics">
        <CompactField label="Name">
          <input
            className="crm-input crm-seq-input py-2 text-[11px]"
            value={sequenceName}
            onChange={(e) => onSequenceNameChange(e.target.value)}
          />
        </CompactField>
      </InspectorSection>

      <InspectorSection title="Send to" icon={Users}>
        <div className="crm-seq-send-import">
          <p className="text-[10px] leading-relaxed text-neutral-500">
            Import one or more campaign lists, then layer companies or contacts on top.
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
            <button type="button" onClick={importCampaignList} className="crm-seq-import-btn shrink-0">
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
        />
        </div>

        {importedLists.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {importedLists.map((item) => (
              <span key={item.id} className="crm-seq-import-chip">
                <Building2 className="h-3 w-3 shrink-0" />
                <span className="truncate">{item.label}</span>
                <button type="button" onClick={() => removeImportedList(item.id)} aria-label={`Remove ${item.label}`}>
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="crm-seq-audience-summary">
          <p className="text-[10px] leading-relaxed text-neutral-600">{summary}</p>
          <button
            type="button"
            onClick={onOpenPreview}
            className="mt-2 inline-flex items-center gap-1 text-[10px] font-semibold text-brand hover:underline"
          >
            <Eye className="h-3 w-3" />
            Preview full list ({audiencePreview?.eligible || 0})
          </button>
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
          <div className="crm-seq-enroll-panel crm-seq-expand-in">
            <div className="flex items-end gap-2">
              <div className="min-w-0 flex-1">
                <CompactField label="Enroll count">
                  <input
                    type="number"
                    min="1"
                    max={maxEnroll || 1}
                    className="crm-input crm-seq-input py-2 text-[11px] tabular-nums"
                    value={enrollLimit}
                    onChange={(e) => onEnrollLimitChange(Math.min(maxEnroll || 1, Math.max(1, Number(e.target.value) || 1)))}
                    disabled={!maxEnroll}
                  />
                </CompactField>
              </div>
              <MailboxUsagePopover usage={mailboxUsage} />
            </div>
            {!mailStatus?.smtpReady && (
              <Alert tone="warning" className="mt-2 !py-1.5 !text-[10px]">SMTP not configured.</Alert>
            )}
          </div>
        )}
      </InspectorSection>

      <InspectorSection title="Sender">
        <CompactField label="From name">
          <input className="crm-input crm-seq-input py-2 text-[11px]" value={fromName} onChange={(e) => onFromNameChange(e.target.value)} />
        </CompactField>
        <CompactField label="From email">
          <input type="email" className="crm-input crm-seq-input py-2 text-[11px]" value={fromEmail} onChange={(e) => onFromEmailChange(e.target.value)} />
        </CompactField>
      </InspectorSection>
    </div>
  );
}

function AudienceAddRow({ icon: Icon, label, values, onChange, options, placeholder, tone }) {
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
            />
          </div>
        )}
      </div>
    </div>
  );
}

function NodeInspector({ node, onUpdate, onDelete, canDelete }) {
  const update = (field, value) => onUpdate(node.id, { ...node.data, [field]: value });

  if (node.type === 'email') {
    return (
      <>
        <label className="flex items-center gap-1.5 rounded-md border border-[var(--color-line)] p-2 text-[10px]">
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
              className="crm-input crm-seq-input py-1.5 text-[10px]"
              value={node.data?.aiPrompt || ''}
              onChange={(e) => update('aiPrompt', e.target.value)}
            />
          </CompactField>
        )}
        <CompactField label="Subject">
          <input
            className="crm-input crm-seq-input py-1.5 font-mono text-[10px]"
            value={node.data?.subjectTemplate || ''}
            onChange={(e) => update('subjectTemplate', e.target.value)}
          />
        </CompactField>
        <CompactField label="Body">
          <textarea
            rows={8}
            className="crm-input crm-seq-input resize-y font-mono text-[10px] leading-relaxed"
            value={node.data?.bodyTemplate || ''}
            onChange={(e) => update('bodyTemplate', e.target.value)}
          />
        </CompactField>
        {canDelete && (
          <button type="button" onClick={() => onDelete(node.id)} className="crm-btn-ghost w-full !py-1.5 text-[10px] text-rose-600">
            <Trash2 className="h-3 w-3" />
            Remove
          </button>
        )}
      </>
    );
  }

  if (node.type === 'wait') {
    return (
      <>
        <CompactField label="Days">
          <input
            type="number"
            min="1"
            className="crm-input crm-seq-input py-1.5 text-[11px]"
            value={node.data?.days || 1}
            onChange={(e) => update('days', Number(e.target.value))}
          />
        </CompactField>
        {canDelete && (
          <button type="button" onClick={() => onDelete(node.id)} className="crm-btn-ghost w-full !py-1.5 text-[10px] text-rose-600">
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
            className="crm-input crm-seq-input py-1.5 text-[11px]"
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
          <input className="crm-input crm-seq-input py-1.5 text-[11px]" value={node.data?.trueBranch || ''} onChange={(e) => update('trueBranch', e.target.value)} />
        </CompactField>
        <CompactField label="If false">
          <input className="crm-input crm-seq-input py-1.5 text-[11px]" value={node.data?.falseBranch || ''} onChange={(e) => update('falseBranch', e.target.value)} />
        </CompactField>
        {canDelete && (
          <button type="button" onClick={() => onDelete(node.id)} className="crm-btn-ghost w-full !py-1.5 text-[10px] text-rose-600">
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
  if (type === 'email') return Mail;
  if (type === 'condition') return GitBranch;
  if (type === 'wait') return Clock;
  return Mail;
}
