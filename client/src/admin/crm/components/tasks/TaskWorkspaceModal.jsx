import { useEffect, useMemo, useState } from 'react';
import { Alert, Badge, LoadingState } from '../ui/primitives.jsx';
import { Modal } from '../ui/Modal.jsx';
import DateTimePicker from '../ui/DateTimePicker.jsx';
import SearchableSelect from '../ui/SearchableSelect.jsx';
import { crmApiFetch, notifyWorkspaceChanged } from '../../crmApi.js';
import { Paperclip, Save } from 'lucide-react';

function Field({ label, children, required = false }) {
  return <label className="block space-y-1.5"><span className="text-xs font-medium text-neutral-600">{label}{required ? ' *' : ''}</span>{children}</label>;
}

const EMPTY_CONTEXT = { workPackages: [], phases: [], locations: [], activities: [] };

export default function TaskWorkspaceModal({ task, tasks = [], opportunities = [], ownerOptions = [], onClose, onSaved }) {
  const [record, setRecord] = useState(null);
  const [context, setContext] = useState(EMPTY_CONTEXT);
  const [form, setForm] = useState(null);
  const [evidenceNote, setEvidenceNote] = useState('');
  const [evidenceFile, setEvidenceFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setRecord(null); setError('');
    crmApiFetch(`/api/admin/sales/tasks/${encodeURIComponent(task._id)}`)
      .then((value) => {
        if (cancelled) return;
        setRecord(value);
        setForm({
          title: value.title || '', notes: value.notes || '', status: value.status || 'Open', priority: value.priority || 'Normal',
          dueAt: value.dueAt || '', ownerUserId: value.ownerUserId || '', opportunityId: value.opportunityId || '',
          workPackageId: value.workPackageId || '', phaseId: value.phaseId || '', locationId: value.locationId || '', activityId: value.activityId || '',
          blockedReason: value.blockedReason || '', waitingOn: value.waitingOn || '', completionNote: value.completionNote || '',
          completionEvidenceRequired: Boolean(value.completionEvidenceRequired), dependencyIds: (value.dependencies || []).map((item) => item.id),
        });
      })
      .catch((err) => setError(err.message));
    return () => { cancelled = true; };
  }, [task._id]);

  useEffect(() => {
    const jobId = form?.opportunityId;
    if (!jobId) { setContext(EMPTY_CONTEXT); return; }
    crmApiFetch(`/api/admin/sales/tasks/context/job/${encodeURIComponent(jobId)}`)
      .then(setContext).catch((err) => setError(err.message));
  }, [form?.opportunityId]);

  const jobOptions = useMemo(() => opportunities.map((item) => ({ value: item._id, label: item.name, hint: item.companyId?.companyName || item.stage || '' })), [opportunities]);
  const dependencyOptions = useMemo(() => tasks.filter((item) => item._id !== task._id && item.status !== 'Done'), [tasks, task._id]);
  const set = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  async function save() {
    if (!form.title.trim()) return;
    setBusy(true); setError('');
    try {
      const updated = await crmApiFetch(`/api/admin/sales/tasks/${encodeURIComponent(task._id)}`, { method: 'PATCH', body: JSON.stringify(form) });
      setRecord(updated);
      onSaved?.(updated);
      notifyWorkspaceChanged({ entity: 'task', action: 'update', id: task._id });
      onClose();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }

  async function uploadEvidence() {
    if (!evidenceFile && !evidenceNote.trim()) return;
    setBusy(true); setError('');
    try {
      const body = new FormData();
      if (evidenceFile) body.append('file', evidenceFile);
      if (evidenceNote.trim()) body.append('note', evidenceNote.trim());
      const updated = await crmApiFetch(`/api/admin/sales/tasks/${encodeURIComponent(task._id)}/evidence`, { method: 'POST', body });
      setRecord(updated); setEvidenceFile(null); setEvidenceNote(''); onSaved?.(updated);
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }

  return (
    <Modal open onClose={onClose} title={record?.title || task.title || 'Task'} subtitle="Accountable action — linked to the work it belongs to" size="xl">
      {error && <Alert>{error}</Alert>}
      {!form ? <LoadingState label="Loading task…" /> : <div className="grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(280px,0.75fr)]">
        <div className="space-y-4">
          <Field label="Task" required><input className="crm-input" value={form.title} onChange={(e) => set('title', e.target.value)} /></Field>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="State"><select className="crm-select" value={form.status} onChange={(e) => set('status', e.target.value)}><option>Open</option><option>Blocked</option><option>Waiting</option><option>Done</option><option>Cancelled</option></select></Field>
            <Field label="Priority"><select className="crm-select" value={form.priority} onChange={(e) => set('priority', e.target.value)}><option>Low</option><option>Normal</option><option>High</option><option>Urgent</option></select></Field>
            <Field label="Due"><DateTimePicker value={form.dueAt} onChange={(value) => set('dueAt', value)} /></Field>
          </div>
          {form.status === 'Blocked' && <Field label="What is blocking this?" required><input className="crm-input" value={form.blockedReason} onChange={(e) => set('blockedReason', e.target.value)} placeholder="Specific issue that must be resolved" /></Field>}
          {form.status === 'Waiting' && <Field label="Waiting on" required><input className="crm-input" value={form.waitingOn} onChange={(e) => set('waitingOn', e.target.value)} placeholder="Person, approval, material, or external event" /></Field>}
          <Field label="Owner"><select className="crm-select" value={form.ownerUserId} onChange={(e) => set('ownerUserId', e.target.value)}><option value="">Unassigned / legacy owner</option>{ownerOptions.filter((option) => option.userId).map((option) => <option key={option.userId} value={option.userId}>{option.label}{option.hint ? ` · ${option.hint}` : ''}</option>)}</select></Field>
          <Field label="Working notes"><textarea rows={4} className="crm-input resize-y" value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Only context needed to complete this action. Job history belongs in Job Memory." /></Field>

          <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
            <div className="mb-3"><h3 className="text-sm font-semibold text-neutral-800">Exact work context</h3><p className="mt-1 text-xs text-neutral-500">Optional. Link only as deeply as useful.</p></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Ongoing Job"><SearchableSelect value={form.opportunityId} onChange={(value) => setForm((current) => ({ ...current, opportunityId: value, workPackageId: '', phaseId: '', locationId: '', activityId: '' }))} options={jobOptions} placeholder="No Job link" /></Field>
              <Field label="Work package"><select className="crm-select" disabled={!form.opportunityId} value={form.workPackageId} onChange={(e) => set('workPackageId', e.target.value)}><option value="">Whole Job</option>{context.workPackages.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></Field>
              <Field label="Phase"><select className="crm-select" disabled={!form.opportunityId} value={form.phaseId} onChange={(e) => set('phaseId', e.target.value)}><option value="">No phase</option>{context.phases.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
              <Field label="Location"><select className="crm-select" disabled={!form.opportunityId} value={form.locationId} onChange={(e) => set('locationId', e.target.value)}><option value="">No location</option>{context.locations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
              <Field label="Production activity"><select className="crm-select" disabled={!form.opportunityId} value={form.activityId} onChange={(e) => set('activityId', e.target.value)}><option value="">No activity</option>{context.activities.map((item) => <option key={item.id} value={item.id}>{item.title} · {item.status.replaceAll('_', ' ')}</option>)}</select></Field>
              <Field label="Depends on"><select multiple className="crm-select min-h-24" value={form.dependencyIds} onChange={(e) => set('dependencyIds', [...e.target.selectedOptions].map((option) => option.value))}>{dependencyOptions.map((item) => <option key={item._id} value={item._id}>{item.title}</option>)}</select></Field>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-200 pt-4">
            <label className="flex items-center gap-2 text-xs text-neutral-600"><input type="checkbox" checked={form.completionEvidenceRequired} onChange={(e) => set('completionEvidenceRequired', e.target.checked)} />Require evidence before completion</label>
            <button type="button" className="crm-btn-primary" onClick={save} disabled={busy || !form.title.trim()}><Save className="h-4 w-4" />{busy ? 'Saving…' : 'Save task'}</button>
          </div>
        </div>

        <aside className="space-y-4">
          <section className="rounded-xl border border-neutral-200 bg-white p-4">
            <h3 className="text-sm font-semibold">Completion evidence</h3>
            <p className="mt-1 text-xs text-neutral-500">A note, file, photo, approval, or proof that the action is complete.</p>
            <textarea rows={2} className="crm-input mt-3 resize-y text-xs" value={evidenceNote} onChange={(e) => setEvidenceNote(e.target.value)} placeholder="Evidence note" />
            <input className="mt-2 block w-full text-xs text-neutral-500" type="file" onChange={(e) => setEvidenceFile(e.target.files?.[0] || null)} />
            <button type="button" className="crm-btn-secondary mt-3" onClick={uploadEvidence} disabled={busy || (!evidenceFile && !evidenceNote.trim())}><Paperclip className="h-4 w-4" />Add evidence</button>
            <div className="mt-4 space-y-2">{(record?.evidence || []).map((item) => <div key={item.id} className="rounded-lg bg-neutral-50 p-2 text-xs"><div className="flex items-center justify-between gap-2"><strong>{item.fileName || 'Evidence note'}</strong><span className="text-2xs text-neutral-400">{new Date(item.createdAt).toLocaleDateString('en-AE')}</span></div>{item.note && <p className="mt-1 text-neutral-600">{item.note}</p>}{item.url && <a className="mt-1 inline-block text-brand hover:underline" href={item.url} target="_blank" rel="noreferrer">Open file</a>}</div>)}{!record?.evidence?.length && <p className="text-xs text-neutral-400">No evidence added.</p>}</div>
          </section>
          <section className="rounded-xl border border-neutral-200 bg-white p-4">
            <h3 className="text-sm font-semibold">Current links</h3>
            <div className="mt-3 flex flex-wrap gap-2">{record?.jobTitle && <Badge tone="success">{record.jobNumber ? `${record.jobNumber} · ` : ''}{record.jobTitle}</Badge>}{record?.workPackageTitle && <Badge tone="info">{record.workPackageTitle}</Badge>}{record?.phaseName && <Badge tone="neutral">{record.phaseName}</Badge>}{record?.locationName && <Badge tone="neutral">{record.locationName}</Badge>}{record?.activityTitle && <Badge tone="warning">{record.activityTitle}</Badge>}{!record?.jobTitle && <span className="text-xs text-neutral-400">No Job context.</span>}</div>
          </section>
        </aside>
      </div>}
    </Modal>
  );
}
