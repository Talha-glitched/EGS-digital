import {
  Mail,
  GitBranch,
  Clock,
  Sparkles,
  Trash2,
  CheckCircle2,
  XCircle,
  ArrowRight,
} from 'lucide-react';
import { Modal } from '../ui/Modal.jsx';
import { DELAY_PRESETS, DELAY_UNIT_OPTIONS, formatDelayLabel } from '../../utils/sequenceDelay.js';
import { getConditionLabel } from './sequenceFlow.js';

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
  const update = (field, value) => onChange({ ...data, [field]: value });

  return (
    <div className="crm-seq-editor-sections">
      <div className="crm-seq-editor-callout">
        <Sparkles className="h-4 w-4 text-brand" />
        <p>Personalize with placeholders like <code>[First]</code> or <code>[University]</code> in subject and body.</p>
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
          value={data?.subjectTemplate || ''}
          onChange={(e) => update('subjectTemplate', e.target.value)}
          placeholder="{{company}} — quick question"
        />
      </EditorField>

      <EditorField label="Email body">
        <textarea
          rows={10}
          className="crm-input crm-seq-editor-input resize-y font-mono leading-relaxed"
          value={data?.bodyTemplate || ''}
          onChange={(e) => update('bodyTemplate', e.target.value)}
          placeholder="Hi [First],&#10;&#10;…"
        />
      </EditorField>
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
  email: { icon: Mail, title: 'Send email', accent: 'brand', subtitle: 'Compose subject, body, and AI settings' },
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
