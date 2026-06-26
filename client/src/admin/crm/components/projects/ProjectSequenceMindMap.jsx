import { useEffect, useState } from 'react';
import { crmApiFetch } from '../../crmApi.js';
import { Alert, Badge, Field, LoadingState } from '../ui/primitives.jsx';
import {
  Plus,
  Trash2,
  Clock,
  Sparkles,
  Save,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

const GRADUATION_STEPS = [
  {
    stepOrder: 1,
    dayDelay: 0,
    subjectTemplate: '[University]: ceremony scale planning',
    bodyTemplate: `Hi [First],\n\nOne reason I am reaching out is that EGS has handled graduation work at UAE-wide scale. In 2025, EGS delivered seven HCT grand ceremonies across Dubai, Abu Dhabi, Sharjah, Ras Al Khaimah and Fujairah for 4,500 graduates and 13,500 guests.\n\nBest Regards,\nMasuood-ul-Rasheed\nExhibit Graphic Sign`,
    useAiPersonalization: true,
    aiPrompt: 'Personalize the intro hook.',
  },
];

function emptyStep(order) {
  return {
    stepOrder: order,
    dayDelay: order === 1 ? 0 : 3,
    subjectTemplate: `{{company}} — stand execution support (Step ${order})`,
    bodyTemplate: `Hi {{name}},\n\nWe support regional companies with custom exhibition stands in Dubai & Abu Dhabi.\n\nWould you be open for a short call?\n\nBest,\nEGS Team`,
    useAiPersonalization: true,
    aiPrompt: '',
  };
}

export default function ProjectSequenceMindMap({ projectId, projectName = '', milestone = '' }) {
  const [leadsCount, setLeadsCount] = useState(0);
  const [sequenceName, setSequenceName] = useState('Campaign Drip Sequence');
  const [steps, setSteps] = useState([emptyStep(1)]);
  const [sequenceId, setSequenceId] = useState(null);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [launchArmed, setLaunchArmed] = useState(false);

  useEffect(() => {
    if (!projectId) return undefined;
    setBusy(true);
    setError('');
    setSuccess('');
    setLaunchArmed(false);

    Promise.all([
      crmApiFetch(`/api/admin/projects/${projectId}/sequences`),
      crmApiFetch(`/api/admin/projects/${projectId}/leads?limit=1&deliveryStatus=Pending%20Inqueue`),
    ])
      .then(([seqList, leadData]) => {
        setLeadsCount(leadData.total || 0);
        if (seqList.length) {
          const activeSeq = seqList[0];
          setSequenceId(activeSeq._id);
          setSequenceName(activeSeq.name || 'Campaign Drip Sequence');
          setSteps(activeSeq.steps?.length ? activeSeq.steps : [emptyStep(1)]);
        } else {
          setSequenceId(null);
          const isGraduation =
            String(projectName).toLowerCase().includes('graduation') ||
            String(milestone).toLowerCase().includes('graduation');
          setSteps(isGraduation ? GRADUATION_STEPS : [emptyStep(1)]);
        }
        setActiveStepIndex(0);
      })
      .catch(() => setError('Failed to load sequence.'))
      .finally(() => {
        setBusy(false);
        setLoading(false);
      });
  }, [projectId, projectName, milestone]);

  const updateStep = (index, field, value) => {
    setLaunchArmed(false);
    setSteps((prev) => prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)));
  };

  const addStepNode = () => {
    setLaunchArmed(false);
    const nextOrder = steps.length + 1;
    const newSteps = [...steps, emptyStep(nextOrder)];
    setSteps(newSteps);
    setActiveStepIndex(newSteps.length - 1);
  };

  const removeStepNode = (index) => {
    setLaunchArmed(false);
    if (steps.length <= 1) return;
    const newSteps = steps.filter((_, i) => i !== index).map((s, i) => ({ ...s, stepOrder: i + 1 }));
    setSteps(newSteps);
    setActiveStepIndex(Math.max(0, index - 1));
  };

  const saveSequence = async ({ publish = false } = {}) => {
    if (publish && !launchArmed) {
      setLaunchArmed(true);
      setSuccess(`Review the sequence, then confirm launch. Only ${leadsCount} never-contacted lead(s) are eligible.`);
      return;
    }
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      let seqId = sequenceId;
      if (!seqId) {
        const seq = await crmApiFetch(`/api/admin/projects/${projectId}/sequences`, {
          method: 'POST',
          body: JSON.stringify({ name: sequenceName, steps }),
        });
        seqId = seq._id;
        setSequenceId(seqId);
      } else {
        await crmApiFetch(`/api/admin/sequences/${seqId}`, {
          method: 'PATCH',
          body: JSON.stringify({ name: sequenceName, steps }),
        });
      }

      if (publish && leadsCount > 0) {
        await crmApiFetch(`/api/admin/projects/${projectId}/enroll`, {
          method: 'POST',
          body: JSON.stringify({ sequenceId: seqId, confirmEnrollment: true }),
        });
        setLaunchArmed(false);
        setSuccess('Sequence published and eligible leads enrolled.');
      } else {
        setLaunchArmed(false);
        setSuccess('Draft saved. No contacts were enrolled.');
      }
    } catch (err) {
      setError(err.message || 'Failed to save sequence.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <LoadingState label="Loading sequence map…" />;
  }

  const activeStep = steps[activeStepIndex] || steps[0];

  return (
    <div className="crm-modal-stack">
      <div className="crm-modal-callout">
        <span className="crm-modal-callout-title">Sequence builder</span>
        Map each email step, personalize with AI, then review before enrolling eligible contacts.
      </div>

      <div className="flex flex-col gap-4 rounded-xl border border-[var(--color-line)] bg-neutral-50/60 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Badge tone="info">{leadsCount} eligible contact(s)</Badge>
          <input
            className="crm-input max-w-xs py-1.5 text-xs font-semibold"
            value={sequenceName}
            onChange={(e) => setSequenceName(e.target.value)}
            aria-label="Sequence name"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => saveSequence({ publish: false })} disabled={busy} className="crm-btn-secondary py-1.5 text-xs">
            <Save className="h-3.5 w-3.5" />
            Save draft
          </button>
          <button
            type="button"
            onClick={() => saveSequence({ publish: true })}
            disabled={busy || leadsCount === 0}
            className={`crm-btn-primary py-1.5 text-xs ${launchArmed ? 'ring-2 ring-red-200' : ''}`}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            {busy ? 'Launching…' : launchArmed ? `Confirm ${leadsCount} contact(s)` : 'Review & launch'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_340px]">
        <div className="crm-card relative flex max-h-[min(58vh,520px)] flex-col items-center overflow-y-auto border border-[var(--color-line)] bg-slate-50/20 p-6">
          <div className="flex flex-col items-center w-full">
            <div className="flex h-9 items-center rounded-full border border-neutral-300 bg-white px-4 text-[11px] font-bold text-neutral-600 shadow-sm">
              START CAMPAIGN
            </div>
            <svg className="h-6 w-1" viewBox="0 0 4 24">
              <line x1="2" y1="0" x2="2" y2="20" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="3 3" />
              <polygon points="0,18 4,18 2,24" fill="#94a3b8" />
            </svg>
          </div>

          <div className="flex w-full flex-col items-center">
            {steps.map((step, idx) => {
              const isActive = activeStepIndex === idx;
              return (
                <div key={idx} className="flex w-full flex-col items-center">
                  <div
                    onClick={() => setActiveStepIndex(idx)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setActiveStepIndex(idx);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    className={`w-56 crm-mindmap-node cursor-pointer rounded-xl border p-3 ${isActive ? 'border-brand bg-red-50/20 ring-1 ring-brand' : 'border-neutral-200 bg-white'}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold text-white ${isActive ? 'bg-brand' : 'bg-neutral-500'}`}>
                          {idx + 1}
                        </span>
                        <div>
                          <p className="text-[11px] font-bold text-neutral-800">Email step {idx + 1}</p>
                          <p className="text-[9px] text-neutral-500">{idx === 0 ? 'Instant' : `Wait ${step.dayDelay}d`}</p>
                        </div>
                      </div>
                      {steps.length > 1 && (
                        <button type="button" onClick={(e) => { e.stopPropagation(); removeStepNode(idx); }} className="text-neutral-400 hover:text-rose-600">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                    <p className="mt-2 truncate rounded border border-neutral-100 bg-neutral-50 p-1 font-mono text-[9px] text-neutral-500">
                      {step.subjectTemplate || 'No subject'}
                    </p>
                  </div>
                  {idx < steps.length - 1 ? (
                    <svg className="h-6 w-1" viewBox="0 0 4 24">
                      <line x1="2" y1="0" x2="2" y2="20" stroke="#cbd5e1" strokeWidth="2" />
                      <polygon points="0,18 4,18 2,24" fill="#94a3b8" />
                    </svg>
                  ) : (
                    <div className="flex flex-col items-center">
                      <svg className="h-6 w-1" viewBox="0 0 4 24">
                        <line x1="2" y1="0" x2="2" y2="20" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="3 3" />
                      </svg>
                      <button type="button" onClick={addStepNode} className="crm-btn-secondary py-1 text-[10px]">
                        <Plus className="h-3 w-3" />
                        Add step
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="crm-card max-h-[min(58vh,520px)] space-y-4 overflow-y-auto border border-[var(--color-line)] p-5">
          <h3 className="text-xs font-bold text-neutral-800">Configure step {activeStepIndex + 1}</h3>
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-800">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {error}
            </div>
          )}
          {success && <Alert tone="success">{success}</Alert>}

          <Field label="Delay (days)" hint={activeStepIndex === 0 ? 'Step 1 sends on enrollment.' : undefined}>
            <input
              type="number"
              min="0"
              disabled={activeStepIndex === 0}
              className="crm-input py-1.5 text-xs"
              value={activeStep.dayDelay}
              onChange={(e) => updateStep(activeStepIndex, 'dayDelay', Number(e.target.value))}
            />
          </Field>

          <label className="flex items-center gap-2 rounded-lg border border-[var(--color-line)] p-2 text-xs">
            <input
              type="checkbox"
              checked={activeStep.useAiPersonalization}
              onChange={(e) => updateStep(activeStepIndex, 'useAiPersonalization', e.target.checked)}
            />
            <Sparkles className="h-3.5 w-3.5 text-brand" />
            AI personalization
          </label>

          {activeStep.useAiPersonalization && (
            <Field label="AI prompt">
              <input
                className="crm-input py-1.5 text-xs"
                value={activeStep.aiPrompt || ''}
                onChange={(e) => updateStep(activeStepIndex, 'aiPrompt', e.target.value)}
              />
            </Field>
          )}

          <Field label="Subject">
            <input
              className="crm-input py-1.5 text-xs font-mono"
              value={activeStep.subjectTemplate}
              onChange={(e) => updateStep(activeStepIndex, 'subjectTemplate', e.target.value)}
            />
          </Field>

          <Field label="Body">
            <textarea
              rows={6}
              className="crm-input resize-none font-mono text-xs leading-relaxed"
              value={activeStep.bodyTemplate}
              onChange={(e) => updateStep(activeStepIndex, 'bodyTemplate', e.target.value)}
            />
          </Field>
        </div>
      </div>
    </div>
  );
}
