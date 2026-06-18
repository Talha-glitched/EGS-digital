import { useState } from 'react';
import { crmApiFetch } from '../../crmApi.js';
import { Plus, Trash2, Play, Clock, Sparkles, CheckCircle2 } from 'lucide-react';
import { Alert, Field, InfoPanel } from '../ui/primitives.jsx';

function emptyStep(order) {
  return {
    stepOrder: order,
    dayDelay: order === 1 ? 0 : 3,
    subjectTemplate: `{{company}} — exhibition stand support (Step ${order})`,
    bodyTemplate:
      'Hi {{name}},\n\nWe help {{company}} with custom exhibition stands and branded environments across the UAE.\n\nWould you have 15 minutes this week for a quick call?',
    useAiPersonalization: true,
    aiPrompt: '',
  };
}

export default function SequenceBuilder({ projectId, leadCount = 0, onEnrolled }) {
  const [name, setName] = useState('Primary outreach sequence');
  const [steps, setSteps] = useState([emptyStep(1), emptyStep(2), emptyStep(3)]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sequenceId, setSequenceId] = useState(null);

  function updateStep(index, field, value) {
    setSteps((prev) => prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)));
  }
  function addStep() {
    setSteps((prev) => [...prev, emptyStep(prev.length + 1)]);
  }
  function removeStep(index) {
    setSteps((prev) => prev.filter((_, i) => i !== index).map((s, i) => ({ ...s, stepOrder: i + 1 })));
  }

  async function saveAndEnroll() {
    setBusy(true);
    setError('');
    try {
      let seqId = sequenceId;
      if (!seqId) {
        const seq = await crmApiFetch(`/api/admin/projects/${projectId}/sequences`, {
          method: 'POST',
          body: JSON.stringify({ name, steps }),
        });
        seqId = seq._id;
        setSequenceId(seqId);
      } else {
        await crmApiFetch(`/api/admin/sequences/${seqId}`, {
          method: 'PATCH',
          body: JSON.stringify({ name, steps }),
        });
      }
      const result = await crmApiFetch(`/api/admin/projects/${projectId}/enroll`, {
        method: 'POST',
        body: JSON.stringify({ sequenceId: seqId }),
      });
      onEnrolled?.(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="crm-card space-y-6 p-5 sm:p-6">
      <div>
        <h2 className="text-lg font-bold text-[var(--color-ink)]">Email sequence</h2>
        <p className="mt-1 text-sm leading-relaxed text-neutral-500">
          A multi-step drip that sends one email at a time during UAE business hours (Mon–Fri, 8:30–17:30 GST) with a
          natural delay between each message.
        </p>
      </div>

      <InfoPanel title="Sending rules">
        <ul className="list-disc space-y-0.5 pl-5">
          <li>Maximum 150 emails per day per mailbox</li>
          <li>60–100 second pause between each send</li>
          <li>Sequence stops automatically when a lead replies or opts out</li>
          <li>
            <strong>{leadCount}</strong> contact{leadCount === 1 ? '' : 's'} eligible for enrollment
          </li>
        </ul>
      </InfoPanel>

      {error && <Alert>{error}</Alert>}

      <Field label="Sequence name" hint="Internal label — not visible to recipients.">
        <input className="crm-input max-w-md" value={name} onChange={(e) => setName(e.target.value)} />
      </Field>

      <div className="space-y-4">
        {steps.map((step, index) => (
          <div key={index} className="rounded-xl border border-[var(--color-line)] bg-neutral-50/50 p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">
                  {index + 1}
                </span>
                <div>
                  <p className="text-sm font-semibold text-[var(--color-ink)]">Step {index + 1}</p>
                  <p className="text-xs text-neutral-500">
                    {index === 0 ? 'Sends when enrolled' : `Waits ${step.dayDelay} day(s) after previous step`}
                  </p>
                </div>
              </div>
              {steps.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeStep(index)}
                  className="text-neutral-400 transition hover:text-red-600"
                  aria-label="Remove step"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Wait before sending (days)" hint="Days after the previous step, or after enrollment for step 1.">
                <div className="relative">
                  <Clock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                  <input
                    type="number"
                    min="0"
                    className="crm-input pl-10"
                    value={step.dayDelay}
                    onChange={(e) => updateStep(index, 'dayDelay', Number(e.target.value))}
                  />
                </div>
              </Field>
              <label className="flex items-center gap-3 self-end rounded-lg border border-[var(--color-line-strong)] bg-white px-4 py-2.5">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-neutral-300 text-brand focus:ring-brand/30"
                  checked={step.useAiPersonalization}
                  onChange={(e) => updateStep(index, 'useAiPersonalization', e.target.checked)}
                />
                <Sparkles className="h-4 w-4 text-brand" />
                <span className="text-sm font-medium text-[var(--color-ink)]">AI personalization</span>
              </label>
            </div>

            <div className="mt-4 space-y-3">
              <Field label="Subject line" hint="Use {{name}}, {{company}}, {{designation}} as placeholders.">
                <input className="crm-input" value={step.subjectTemplate} onChange={(e) => updateStep(index, 'subjectTemplate', e.target.value)} />
              </Field>
              <Field label="Email body" hint="Base template — AI refines this when personalization is on.">
                <textarea
                  rows={5}
                  className="crm-input resize-y font-mono text-[13px] leading-relaxed"
                  value={step.bodyTemplate}
                  onChange={(e) => updateStep(index, 'bodyTemplate', e.target.value)}
                />
              </Field>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col-reverse gap-3 border-t border-[var(--color-line)] pt-5 sm:flex-row sm:items-center sm:justify-between">
        <button type="button" onClick={addStep} className="crm-btn-secondary">
          <Plus className="h-4 w-4" />
          Add another step
        </button>
        <button type="button" disabled={busy || leadCount === 0} onClick={saveAndEnroll} className="crm-btn-primary">
          {busy ? <Play className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
          {busy ? 'Launching sequence…' : 'Save & enroll eligible leads'}
        </button>
      </div>

      {leadCount === 0 && (
        <p className="text-sm text-amber-700">Import contacts first — there are no leads to enroll yet.</p>
      )}
    </div>
  );
}
