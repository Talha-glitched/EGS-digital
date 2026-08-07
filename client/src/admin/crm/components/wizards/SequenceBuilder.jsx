import { useState } from 'react';
import { crmApiFetch } from '../../crmApi.js';
import { Plus, Trash2, Play, Clock, Sparkles, CheckCircle2, Save } from 'lucide-react';
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

const GRADUATION_STEPS = [
  {
    stepOrder: 1,
    dayDelay: 0,
    subjectTemplate: '[University]: ceremony scale planning',
    bodyTemplate: `Hi [First],\n\nOne reason I am reaching out is that EGS has handled graduation work at UAE-wide scale. In 2025, EGS delivered seven HCT grand ceremonies across Dubai, Abu Dhabi, Sharjah, Ras Al Khaimah and Fujairah for 4,500 graduates and 13,500 guests. In 2024, EGS delivered eight grand ceremonies for 3,500 graduates and 10,000 guests.\n\nThat repetition matters because every ceremony improves the next one: stage flow, seating, registration, AV, branding, and event-day coordination.\n\nWould it be worth a conversation about [University]'s upcoming or next-cycle graduation plans?\n\nBest Regards,\nMasuood-ul-Rasheed\nExhibit Graphic Sign\nhttps://exhibitgraphicsign.com`,
    useAiPersonalization: true,
    aiPrompt: 'Personalize the intro hook to reference their university graduation ceremonies.'
  },
  {
    stepOrder: 2,
    dayDelay: 3,
    subjectTemplate: '[University]: clearer graduation scope',
    bodyTemplate: `Hi [First],\n\nA common graduation concern is cost control without making the ceremony feel compromised. The risk is not only price; it is unclear scope, late variations, and too many disconnected vendors.\n\nEGS defines the ceremony scope around the parts guests actually experience: registration flow, stage, seating, branding, LED, lighting, sound, AV, on-site management, and removal.\n\nWould you be open to a short call this week to see whether EGS could be useful for [University]?\n\nBest Regards,\nMasuood-ul-Rasheed\nExhibit Graphic Sign\nhttps://exhibitgraphicsign.com`,
    useAiPersonalization: true,
    aiPrompt: 'Personalize the intro hook focusing on ceremony scope or vendor logistics.'
  },
  {
    stepOrder: 3,
    dayDelay: 4,
    subjectTemplate: '[University]: before plans lock',
    bodyTemplate: `Hi [First],\n\nBefore ceremony plans are fully locked, it may be useful to speak early about where production support could help.\n\nEGS is strongest when the relationship becomes repeatable. The team remembers what worked, what changed, and what should be improved next time. That is one reason the HCT relationship matters: EGS supported eight HCT grand ceremonies in 2024 and seven more in 2025.\n\nShould I speak with you about graduation ceremony production at [University], or is there someone better I should connect with?\n\nBest Regards,\nMasuood-ul-Rasheed\nExhibit Graphic Sign\nhttps://exhibitgraphicsign.com`,
    useAiPersonalization: true,
    aiPrompt: 'Personalize the intro hook about speaking early before graduation plans lock.'
  },
  {
    stepOrder: 4,
    dayDelay: 5,
    subjectTemplate: '[University]: graduation setup for graduation',
    bodyTemplate: `Hi [First],\n\nFor marketing and communications teams, graduation does not end when the ceremony ends. It becomes photos, video, parent memories, student posts, and internal proof of the institution's standard.\n\nEGS does not sell digital marketing. We handle the physical production that makes that output stronger: stage, backdrop, LED screens, branding, lighting, seating, and ceremony environment.\n\nWould it be useful to discuss how EGS can support [University]'s graduation setup?\n\nBest Regards,\nMasuood-ul-Rasheed\nExhibit Graphic Sign\nhttps://exhibitgraphicsign.com`,
    useAiPersonalization: true,
    aiPrompt: 'Personalize the intro hook about visual memory and public brand standards.'
  },
  {
    stepOrder: 5,
    dayDelay: 7,
    subjectTemplate: '[University]: the ceremony families remember',
    bodyTemplate: `Hi [First],\n\nA graduation has no second take. Students and families remember whether the room felt organized, dignified, and worthy of the day.\n\nThe HCT Fujairah 2025 ceremony is a useful example: public coverage notes 535 graduates at Zayed Sports Complex, with senior attendance. EGS's internal project record sits behind that graduation season. The point is not decoration; it is to make the ceremony feel right from arrival to finish.\n\nWould you be open to a short conversation about [University]'s next ceremony?\n\nBest Regards,\nMasuood-ul-Rasheed\nExhibit Graphic Sign\nhttps://exhibitgraphicsign.com`,
    useAiPersonalization: true,
    aiPrompt: 'Personalize the intro hook referencing the HCT Fujairah scale or dignity.'
  }
];

export default function SequenceBuilder({ projectId, project, leadCount = 0, onEnrolled }) {
  const isGraduation = String(project?.projectName || '').toLowerCase().includes('graduation') || 
                       String(project?.milestone || '').toLowerCase().includes('graduation');

  const [name, setName] = useState(isGraduation ? 'Graduation Ceremonies Sequence' : 'Primary outreach sequence');
  const [steps, setSteps] = useState(() => {
    return isGraduation ? GRADUATION_STEPS : [emptyStep(1), emptyStep(2), emptyStep(3)];
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [sequenceId, setSequenceId] = useState(null);
  const [launchArmed, setLaunchArmed] = useState(false);

  function updateStep(index, field, value) {
    setLaunchArmed(false);
    setSteps((prev) => prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)));
  }
  function addStep() {
    setLaunchArmed(false);
    setSteps((prev) => [...prev, emptyStep(prev.length + 1)]);
  }
  function removeStep(index) {
    setLaunchArmed(false);
    setSteps((prev) => prev.filter((_, i) => i !== index).map((s, i) => ({ ...s, stepOrder: i + 1 })));
  }

  async function persistSequence() {
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
    return seqId;
  }

  async function saveDraft() {
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      await persistSequence();
      setLaunchArmed(false);
      setSuccess('Draft saved. No contacts were enrolled.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function saveAndEnroll() {
    if (!launchArmed) {
      setLaunchArmed(true);
      setSuccess('Review the audience count, then confirm launch. Only never-contacted leads will be enrolled.');
      return;
    }

    setBusy(true);
    setError('');
    setSuccess('');
    try {
      const seqId = await persistSequence();
      const result = await crmApiFetch(`/api/admin/projects/${projectId}/enroll`, {
        method: 'POST',
        body: JSON.stringify({ sequenceId: seqId, confirmEnrollment: true }),
      });
      setLaunchArmed(false);
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
        <h2 className="text-lg font-bold text-ink">Email sequence</h2>
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
      {success && <Alert tone="success">{success}</Alert>}

      <Field label="Sequence name" hint="Internal label — not visible to recipients.">
        <input className="crm-input max-w-md" value={name} onChange={(e) => { setName(e.target.value); setLaunchArmed(false); }} />
      </Field>

      <div className="space-y-4">
        {steps.map((step, index) => (
          <div key={index} className="rounded-xl border border-line bg-neutral-50/50 p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">
                  {index + 1}
                </span>
                <div>
                  <p className="text-sm font-semibold text-ink">Step {index + 1}</p>
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

            <div className="grid gap-4">
              <Field label="Wait before sending (days)" hint="Days after the previous step, or after enrollment for step 1.">
                <div className="relative">
                  <Clock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                  <input
                    type="number"
                    min="0"
                    className="crm-input crm-input-has-icon"
                    value={step.dayDelay}
                    onChange={(e) => updateStep(index, 'dayDelay', Number(e.target.value))}
                  />
                </div>
              </Field>
              <label className="flex items-center gap-3 rounded-lg border border-line-strong bg-white px-4 py-3">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-neutral-300 text-brand focus:ring-brand/30"
                  checked={step.useAiPersonalization}
                  onChange={(e) => updateStep(index, 'useAiPersonalization', e.target.checked)}
                />
                <Sparkles className="h-4 w-4 text-brand" />
                <span className="text-sm font-medium text-ink">AI personalization</span>
              </label>
            </div>

            <div className="mt-4 space-y-3">
              <Field label="Subject line" hint="Use [First] or [University] as placeholders.">
                <input className="crm-input" value={step.subjectTemplate} onChange={(e) => updateStep(index, 'subjectTemplate', e.target.value)} />
              </Field>
              <Field label="Email body" hint="Base template — AI refines this when personalization is on.">
                <textarea
                  rows={6}
                  className="crm-input resize-y font-mono text-sm leading-relaxed"
                  value={step.bodyTemplate}
                  onChange={(e) => updateStep(index, 'bodyTemplate', e.target.value)}
                />
              </Field>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col-reverse gap-3 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
        <button type="button" onClick={addStep} className="crm-btn-secondary">
          <Plus className="h-4 w-4" />
          Add another step
        </button>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button type="button" disabled={busy} onClick={saveDraft} className="crm-btn-secondary">
            <Save className="h-4 w-4" />
            {busy ? 'Saving…' : 'Save draft'}
          </button>
          <button type="button" disabled={busy || leadCount === 0} onClick={saveAndEnroll} className={`crm-btn-primary crm-btn-wrap ${launchArmed ? 'ring-2 ring-red-200' : ''}`}>
          {busy ? <Play className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
          {busy ? 'Launching…' : launchArmed ? `Confirm launch (${leadCount})` : 'Review & launch'}
          </button>
        </div>
      </div>

      {leadCount === 0 && (
        <p className="text-sm text-amber-700">Import contacts first — there are no leads to enroll yet.</p>
      )}
    </div>
  );
}
