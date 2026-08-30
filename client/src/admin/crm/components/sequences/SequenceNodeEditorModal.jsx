import { useState } from 'react';
import {
  Mail,
  GitBranch,
  Clock,
  Sparkles,
  Trash2,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Eye,
  Layout,
} from 'lucide-react';
import { Modal } from '../ui/Modal.jsx';
import { DELAY_PRESETS, DELAY_UNIT_OPTIONS, formatDelayLabel } from '../../utils/sequenceDelay.js';
import { getConditionLabel } from './sequenceFlow.js';
import { EMAIL_TEMPLATES, getTemplateById } from '../../constants/emailTemplates.js';
import EmailPreviewModal from './EmailPreviewModal.jsx';
import EmailTemplatePickerModal from './EmailTemplatePickerModal.jsx';
import { cn } from '../ui/primitives.jsx';

const CONDITION_TYPES = [
  { value: 'replied', label: 'Contact replied to email' },
  { value: 'opened', label: 'Contact opened email' },
  { value: 'no_reply', label: 'No reply after wait period' },
];

const BRANCH_ACTIONS = [
  { value: 'continue', label: 'Continue branch', hint: 'Follow the connected path' },
  { value: 'stop', label: 'Stop sequence', hint: 'End outreach for this contact' },
];

function EditorField({ label, hint, children }) {
  return (
    <label className="crm-seq-editor-field">
      <span className="crm-seq-editor-label">{label}</span>
      {children}
      {hint && <span className="crm-seq-editor-hint">{hint}</span>}
    </label>
  );
}

function EmailEditor({ data, onChange }) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const update = (field, value) => onChange({ ...data, [field]: value });
  const currentTemplateId = data?.templateType || 'exhibitions';
  const currentTemplate = getTemplateById(currentTemplateId);

  const handleSelectTemplate = (templateId, { applyCopy, template } = {}) => {
    const patch = { templateType: templateId };
    if (applyCopy && template) {
      patch.subjectTemplate = template.defaultSubject;
      patch.bodyTemplate = template.defaultBody;
    }
    onChange({ ...data, ...patch });
  };

  return (
    <div className="crm-seq-editor-sections">
      {/* TEMPLATE PICKER STRIP */}
      <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200/80 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Layout className="h-3.5 w-3.5 text-brand" />
            <span className="text-2xs font-bold uppercase tracking-wider text-neutral-600">Email Template Design:</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="text-xs font-semibold text-brand hover:underline flex items-center gap-1"
            >
              <Layout className="h-3 w-3" />
              Browse Gallery
            </button>
            <button
              type="button"
              onClick={() => setPreviewOpen(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white border border-neutral-200 text-xs font-semibold text-neutral-800 shadow-2xs hover:bg-neutral-100 transition-all"
            >
              <Eye className="h-3.5 w-3.5 text-brand" />
              Preview Email
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
          {EMAIL_TEMPLATES.map((tpl) => {
            const isSelected = currentTemplateId === tpl.id;
            return (
              <button
                key={tpl.id}
                type="button"
                onClick={() => handleSelectTemplate(tpl.id, { applyCopy: false })}
                className={cn(
                  'flex flex-col text-left p-2 rounded-lg border transition-all text-2xs',
                  isSelected
                    ? 'bg-white border-neutral-900 ring-1 ring-neutral-900 shadow-2xs font-semibold text-neutral-900'
                    : 'bg-white/60 border-neutral-200 text-neutral-600 hover:bg-white hover:text-neutral-900',
                )}
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span className="truncate font-semibold">{tpl.name.split('&')[0].trim()}</span>
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: tpl.accentColor }}
                  />
                </div>
                <span className="text-[10px] text-neutral-400 truncate">{tpl.category}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="crm-seq-editor-callout">
        <Sparkles className="h-4 w-4 text-brand" />
        <p>Personalize with placeholders like <code>[First]</code>, <code>{'{{name}}'}</code>, <code>{'{{company}}'}</code>, or <code>[University]</code>.</p>
      </div>

      <label className="crm-seq-editor-toggle">
        <input
          type="checkbox"
          checked={data?.useAiPersonalization !== false}
          onChange={(e) => update('useAiPersonalization', e.target.checked)}
        />
        <span className="crm-seq-editor-toggle-copy">
          <strong>AI personalization</strong>
          <span>Generate a tailored version per contact at send time.</span>
        </span>
      </label>

      {data?.useAiPersonalization !== false && (
        <EditorField label="AI prompt" hint="Optional instructions for tone, angle, or offer.">
          <textarea
            rows={3}
            className="crm-input crm-seq-editor-input"
            value={data?.aiPrompt || ''}
            onChange={(e) => update('aiPrompt', e.target.value)}
            placeholder="e.g. Reference their company booth and graduation season timing…"
          />
        </EditorField>
      )}

      <EditorField label="Subject line">
        <input
          className="crm-input crm-seq-editor-input font-mono"
          value={data?.subjectTemplate ?? currentTemplate.defaultSubject}
          onChange={(e) => update('subjectTemplate', e.target.value)}
          placeholder="{{company}} — quick question"
        />
      </EditorField>

      <EditorField label="Email body">
        <textarea
          rows={10}
          className="crm-input crm-seq-editor-input resize-y font-mono leading-relaxed"
          value={data?.bodyTemplate ?? currentTemplate.defaultBody}
          onChange={(e) => update('bodyTemplate', e.target.value)}
          placeholder="Hi [First],&#10;&#10;…"
        />
      </EditorField>

      <EmailPreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        templateType={currentTemplateId}
        subject={data?.subjectTemplate ?? currentTemplate.defaultSubject}
        body={data?.bodyTemplate ?? currentTemplate.defaultBody}
        aiPrompt={data?.aiPrompt || ''}
        useAi={data?.useAiPersonalization !== false}
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
    </div>
  );
}

function WaitEditor({ data, onChange }) {
  const amount = Number(data?.amount ?? data?.days) || 1;
  const unit = data?.unit || 'days';
  const setWait = (patch) => onChange({ ...data, ...patch, days: undefined });

  return (
    <div className="crm-seq-editor-sections">
      <div className="crm-seq-editor-callout is-wait">
        <Clock className="h-4 w-4" />
        <p>Contacts pause here before the next step. Use minutes for quick tests.</p>
      </div>

      <EditorField label="Duration">
        <div className="crm-seq-editor-duration">
          <input
            type="number"
            min="1"
            className="crm-input crm-seq-editor-input"
            value={amount}
            onChange={(e) => setWait({ amount: Number(e.target.value) })}
          />
          <select
            className="crm-input crm-seq-editor-input crm-seq-editor-unit"
            value={unit}
            onChange={(e) => setWait({ unit: e.target.value })}
          >
            {DELAY_UNIT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </EditorField>

      <div className="crm-seq-editor-presets">
        <p className="crm-seq-editor-presets-label">Quick presets</p>
        <div className="crm-seq-editor-preset-grid">
          {DELAY_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              className={`crm-seq-editor-preset ${amount === preset.amount && unit === preset.unit ? 'is-active' : ''}`}
              onClick={() => setWait({ amount: preset.amount, unit: preset.unit })}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      <p className="crm-seq-editor-summary">
        Waits <strong>{formatDelayLabel(amount, unit)}</strong> before the next connected step.
      </p>
    </div>
  );
}

function ConditionEditor({ data, onChange }) {
  const update = (field, value) => {
    const next = { ...data, [field]: value };
    if (field === 'conditionType') {
      const option = CONDITION_TYPES.find((item) => item.value === value);
      next.label = option?.label || 'Condition';
    }
    onChange(next);
  };

  return (
    <div className="crm-seq-editor-sections">
      <div className="crm-seq-editor-callout is-condition">
        <GitBranch className="h-4 w-4" />
        <p>This step splits into two paths. Connect the <strong>Yes</strong> and <strong>No</strong> ports on the canvas to different follow-up steps.</p>
      </div>

      <EditorField label="Condition type">
        <select
          className="crm-input crm-seq-editor-input"
          value={data?.conditionType || 'replied'}
          onChange={(e) => update('conditionType', e.target.value)}
        >
          {CONDITION_TYPES.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </EditorField>

      <div className="crm-seq-editor-branch-grid">
        <div className="crm-seq-editor-branch-card is-true">
          <div className="crm-seq-editor-branch-head">
            <CheckCircle2 className="h-4 w-4" />
            <span>Yes — condition met</span>
          </div>
          <EditorField label="When true">
            <select
              className="crm-input crm-seq-editor-input"
              value={data?.trueAction || 'continue'}
              onChange={(e) => update('trueAction', e.target.value)}
            >
              {BRANCH_ACTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </EditorField>
          <p className="crm-seq-editor-branch-hint">
            {BRANCH_ACTIONS.find((a) => a.value === (data?.trueAction || 'continue'))?.hint}
          </p>
        </div>

        <div className="crm-seq-editor-branch-card is-false">
          <div className="crm-seq-editor-branch-head">
            <XCircle className="h-4 w-4" />
            <span>No — condition not met</span>
          </div>
          <EditorField label="When false">
            <select
              className="crm-input crm-seq-editor-input"
              value={data?.falseAction || 'continue'}
              onChange={(e) => update('falseAction', e.target.value)}
            >
              {BRANCH_ACTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </EditorField>
          <p className="crm-seq-editor-branch-hint">
            {BRANCH_ACTIONS.find((a) => a.value === (data?.falseAction || 'continue'))?.hint}
          </p>
        </div>
      </div>

      <div className="crm-seq-editor-flow-hint">
        <ArrowRight className="h-3.5 w-3.5 shrink-0" />
        Drag from the green <strong>Yes</strong> or slate <strong>No</strong> port on the node to build each path.
      </div>
    </div>
  );
}

const NODE_META = {
  email: { icon: Mail, title: 'Send email', accent: 'brand', subtitle: 'Compose subject, body, and template design' },
  wait: { icon: Clock, title: 'Wait', accent: 'amber', subtitle: 'Delay before the next step runs' },
  condition: { icon: GitBranch, title: 'Condition', accent: 'violet', subtitle: 'Branch the sequence into yes / no paths' },
};

export default function SequenceNodeEditorModal({
  node,
  open,
  onClose,
  onSave,
  onDelete,
  canDelete,
}) {
  if (!node) return null;

  const meta = NODE_META[node.type] || NODE_META.email;
  const Icon = meta.icon;
  const headline = node.type === 'condition'
    ? getConditionLabel(node.data)
    : meta.title;

  function handleDataChange(data) {
    onSave?.(node.id, data);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={headline}
      subtitle={meta.subtitle}
      icon={Icon}
      accent={meta.accent}
      size="lg"
      footer={(
        <div className="crm-seq-editor-footer">
          {canDelete && onDelete ? (
            <button
              type="button"
              onClick={() => onDelete(node.id)}
              className="crm-btn-ghost text-rose-600 hover:bg-rose-50"
            >
              <Trash2 className="h-4 w-4" />
              Remove step
            </button>
          ) : <span />}
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="crm-btn-secondary">
              Done
            </button>
          </div>
        </div>
      )}
    >
      {node.type === 'email' && <EmailEditor data={node.data} onChange={handleDataChange} />}
      {node.type === 'wait' && <WaitEditor data={node.data} onChange={handleDataChange} />}
      {node.type === 'condition' && <ConditionEditor data={node.data} onChange={handleDataChange} />}
    </Modal>
  );
}
