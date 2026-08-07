import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ListTodo } from 'lucide-react';
import { crmApiFetch, notifyWorkspaceChanged } from '../../crmApi.js';
import DateTimePicker from '../ui/DateTimePicker.jsx';
import { Modal } from '../ui/Modal.jsx';
import { Alert, cn } from '../ui/primitives.jsx';

const OUTCOMES = [
  { value: 'Interested', label: 'Interested', tone: 'border-emerald-200 bg-emerald-50 text-emerald-800' },
  { value: 'Ambiguous', label: 'Needs clarification', tone: 'border-amber-200 bg-amber-50 text-amber-800' },
  { value: 'Referral', label: 'Referral given', tone: 'border-purple-200 bg-purple-50 text-purple-800' },
  { value: 'Out of Office', label: 'Out of office', tone: 'border-sky-200 bg-sky-50 text-sky-800' },
  { value: 'Wrong POC', label: 'Wrong POC', tone: 'border-rose-200 bg-rose-50 text-rose-800' },
  { value: 'Not Interested', label: 'Not interested now', tone: 'border-neutral-200 bg-neutral-50 text-neutral-700' },
  { value: 'Unsubscribe', label: 'Unsubscribe', tone: 'border-red-200 bg-red-50 text-red-800' },
  { value: 'Bounce', label: 'Bounce', tone: 'border-red-200 bg-red-50 text-red-800' },
  { value: 'Automated', label: 'Automated reply', tone: 'border-neutral-200 bg-neutral-50 text-neutral-700' },
  { value: 'Other', label: 'Other', tone: 'border-blue-200 bg-blue-50 text-blue-800' },
];
const ACTIVE = new Set(['Interested', 'Ambiguous', 'Referral', 'Out of Office']);

function tomorrowAtTen() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(10, 0, 0, 0);
  return date.toISOString();
}

export default function ReplyReviewModal({ item, owners = [], currentUserId = '', onClose, onResolved }) {
  const [outcome, setOutcome] = useState('');
  const [reason, setReason] = useState('');
  const [createFollowUp, setCreateFollowUp] = useState(false);
  const [followUp, setFollowUp] = useState({ title: '', dueAt: tomorrowAtTen(), ownerUserId: '', priority: 'medium', notes: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!item) return;
    setOutcome(''); setReason(''); setCreateFollowUp(false); setError('');
    setFollowUp({
      title: `Follow up with ${item.personName || item.companyName || 'contact'}`,
      dueAt: tomorrowAtTen(), ownerUserId: item.ownerUserId || currentUserId || '', priority: 'medium', notes: '',
    });
  }, [item, currentUserId]);

  const followUpRequired = ACTIVE.has(outcome);
  const shouldCreateFollowUp = followUpRequired || createFollowUp;
  const ownerOptions = useMemo(() => owners.filter((owner) => owner.id), [owners]);

  function chooseOutcome(value) {
    setOutcome(value);
    if (ACTIVE.has(value)) setCreateFollowUp(true);
  }

  async function submit(event) {
    event.preventDefault();
    if (!outcome) return;
    if (shouldCreateFollowUp && (!followUp.title.trim() || !followUp.dueAt || !followUp.ownerUserId)) {
      setError('A follow-up needs a title, owner and due date.');
      return;
    }
    setBusy(true); setError('');
    try {
      await crmApiFetch(`/api/admin/communications-workspace/reviews/${encodeURIComponent(item.reviewItemId)}/resolve`, {
        method: 'POST',
        body: JSON.stringify({
          outcome,
          reason: reason.trim() || null,
          followUpTask: shouldCreateFollowUp ? { ...followUp, title: followUp.title.trim(), notes: followUp.notes.trim() || null } : null,
        }),
      });
      notifyWorkspaceChanged({ entity: 'reply_review', action: 'resolve', id: item.reviewItemId });
      // The decision is saved. Close first so a slow or failing background refresh can
      // never leave the reviewer stuck in a modal over work that already committed.
      onClose();
      try {
        await onResolved?.();
      } catch (refreshError) {
        console.error('Reply review saved, but refreshing the workspace failed:', refreshError);
      }
    } catch (err) {
      setError(err.message || 'Could not complete this review.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={Boolean(item)} onClose={() => !busy && onClose()} title="Review client reply" subtitle={[item?.personName, item?.companyName, item?.campaignName].filter(Boolean).join(' · ')} size="xl">
      <form onSubmit={submit} className="space-y-5">
        {error && <Alert>{error}</Alert>}
        <section className="rounded-xl border border-sky-200 bg-sky-50/50 p-4">
          <p className="text-2xs font-semibold uppercase tracking-wide text-sky-700">Original reply</p>
          <p className="mt-1 text-xs font-semibold text-neutral-900">{item?.subject || 'Email reply'}</p>
          <p className="mt-2 line-clamp-4 whitespace-pre-line text-xs leading-relaxed text-neutral-600">{item?.preview || 'Open the source email to read the complete conversation.'}</p>
        </section>

        <section>
          <h3 className="text-xs font-semibold">What did the person actually communicate?</h3>
          <p className="mt-1 text-2xs text-neutral-500">This is a human decision. It does not automatically classify someone as the right POC or a Key Relationship.</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {OUTCOMES.map((option) => (
              <button key={option.value} type="button" onClick={() => chooseOutcome(option.value)} className={cn('rounded-xl border px-3 py-2.5 text-left text-xs font-semibold transition', option.tone, outcome === option.value ? 'ring-2 ring-brand ring-offset-1' : 'opacity-80 hover:opacity-100')}>
                {option.label}
              </button>
            ))}
          </div>
        </section>

        <label className="block text-xs font-medium text-neutral-600">
          Decision note {outcome === 'Other' ? '*' : '(optional)'}
          <textarea rows={2} className="crm-input mt-1.5 resize-y" value={reason} onChange={(event) => setReason(event.target.value)} required={outcome === 'Other'} placeholder="Only add context another team member would need." />
        </label>

        {outcome && !followUpRequired && (
          <label className="flex items-center gap-2 text-xs font-medium text-neutral-700">
            <input type="checkbox" checked={createFollowUp} onChange={(event) => setCreateFollowUp(event.target.checked)} />
            Create a follow-up task anyway
          </label>
        )}

        {outcome && shouldCreateFollowUp && (
          <section className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
            <div className="flex items-start gap-2"><ListTodo className="mt-0.5 h-4 w-4 text-brand" /><div><h3 className="text-xs font-semibold">Next accountable action</h3><p className="mt-0.5 text-2xs text-neutral-500">Active replies cannot disappear from the queue without an owner and due date.</p></div></div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-medium text-neutral-600 sm:col-span-2">Task title *<input className="crm-input mt-1.5" value={followUp.title} onChange={(event) => setFollowUp((current) => ({ ...current, title: event.target.value }))} required /></label>
              <label className="text-xs font-medium text-neutral-600">Owner *<select className="crm-select mt-1.5" value={followUp.ownerUserId} onChange={(event) => setFollowUp((current) => ({ ...current, ownerUserId: event.target.value }))} required><option value="">Choose owner…</option>{ownerOptions.map((owner) => <option key={owner.id} value={owner.id}>{owner.name}</option>)}</select></label>
              <label className="text-xs font-medium text-neutral-600">Priority<select className="crm-select mt-1.5" value={followUp.priority} onChange={(event) => setFollowUp((current) => ({ ...current, priority: event.target.value }))}><option value="low">Low</option><option value="medium">Normal</option><option value="high">High</option><option value="urgent">Urgent</option></select></label>
              <label className="text-xs font-medium text-neutral-600">Due *<DateTimePicker value={followUp.dueAt} onChange={(value) => setFollowUp((current) => ({ ...current, dueAt: value }))} /></label>
              <label className="text-xs font-medium text-neutral-600">Task notes<input className="crm-input mt-1.5" value={followUp.notes} onChange={(event) => setFollowUp((current) => ({ ...current, notes: event.target.value }))} placeholder="Specific next step or promised follow-up" /></label>
            </div>
          </section>
        )}

        <div className="flex justify-end gap-2 border-t border-neutral-200 pt-4">
          <button type="button" className="crm-btn-secondary" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="submit" className="crm-btn-primary" disabled={busy || !outcome}><CheckCircle2 className="h-4 w-4" />{busy ? 'Saving decision…' : 'Complete review'}</button>
        </div>
      </form>
    </Modal>
  );
}
