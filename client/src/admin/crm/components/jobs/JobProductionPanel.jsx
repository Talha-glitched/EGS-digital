import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CalendarClock, CheckCircle2, ClipboardCheck, FileWarning, Plus, ShieldCheck, Trash2, Upload } from 'lucide-react';
import { crmApiFetch } from '../../crmApi.js';
import { Alert, Badge, EmptyState, LoadingState } from '../ui/primitives.jsx';

const TYPE_LABELS = { site_survey: 'Site survey', design: 'Design', client_approval: 'Client approval', procurement: 'Procurement', printing: 'Printing', fabrication: 'Fabrication', packing: 'Packing', transport: 'Transport', installation: 'Installation', event_support: 'Event support', dismantling: 'Dismantling', return: 'Return', other: 'Other' };
const STATUS_LABELS = { not_started: 'Not started', in_progress: 'In progress', blocked: 'Blocked', ready: 'Ready', completed: 'Completed', cancelled: 'Cancelled' };
const UPDATE_LABELS = { progress: 'Progress', blocker: 'Blocker', resolution: 'Resolution', completion: 'Completion', evidence: 'Evidence' };

function localInput(value) { if (!value) return ''; const d = new Date(value); const offset = d.getTimezoneOffset() * 60000; return new Date(d.getTime() - offset).toISOString().slice(0, 16); }
function when(value) { return value ? new Date(value).toLocaleString('en-AE', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—'; }

function UpdateComposer({ busy, onSave }) {
  const [type, setType] = useState('progress'); const [note, setNote] = useState(''); const [file, setFile] = useState(null);
  return <form className="mt-3 grid gap-2 sm:grid-cols-[130px_minmax(0,1fr)_auto_auto]" onSubmit={async (e) => { e.preventDefault(); if (!note.trim() && !file) return; await onSave({ type, note, file }); setNote(''); setFile(null); e.currentTarget.reset(); }}>
    <select className="crm-select text-[11px]" value={type} onChange={(e) => setType(e.target.value)}>{Object.entries(UPDATE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
    <input className="crm-input text-[11px]" value={note} onChange={(e) => setNote(e.target.value)} placeholder="What happened, what is blocked, or what was completed?" />
    <label className="crm-btn-secondary cursor-pointer text-xs"><Upload className="h-3.5 w-3.5" />Evidence<input type="file" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] || null)} /></label>
    <button className="crm-btn-primary" disabled={busy || (!note.trim() && !file)}>Add</button>
  </form>;
}

function ResourceComposer({ resources, assignments, busy, onAdd, onRemove }) {
  const [resourceId, setResourceId] = useState(''); const [plannedHours, setPlannedHours] = useState('');
  const available = resources.filter((resource) => !assignments.some((assignment) => assignment.resourceId === resource.id));
  return <div className="mt-3 border-t border-neutral-100 pt-3"><div className="flex flex-wrap items-center gap-2">{assignments.map((assignment) => <span key={assignment.id} className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2.5 py-1 text-[10px] font-medium text-brand">{assignment.resourceName} · {assignment.resourceType}{assignment.plannedMinutes != null ? ` · ${(Number(assignment.plannedMinutes) / 60).toFixed(1)}h planned` : ''}{Number(assignment.actualMinutes || 0) > 0 ? ` / ${(Number(assignment.actualMinutes) / 60).toFixed(1)}h actual` : ''}<button type="button" className="ml-1 text-neutral-400 hover:text-rose-600" onClick={() => onRemove(assignment.id)}>×</button></span>)}{!assignments.length && <span className="text-[10px] text-neutral-400">No crew, vehicle or equipment assigned.</span>}</div>{available.length > 0 && <div className="mt-2 flex flex-wrap gap-2"><select className="crm-select min-w-48 text-[11px]" value={resourceId} onChange={(e) => setResourceId(e.target.value)}><option value="">Assign resource…</option>{available.map((resource) => <option key={resource.id} value={resource.id}>{resource.name} · {resource.resourceType}</option>)}</select><input type="number" min="0" step="0.25" className="crm-input w-28 text-[11px]" value={plannedHours} onChange={(e) => setPlannedHours(e.target.value)} placeholder="Planned h" /><button type="button" className="crm-btn-secondary" disabled={busy || !resourceId} onClick={async () => { await onAdd(resourceId, plannedHours); setResourceId(''); setPlannedHours(''); }}>Assign</button></div>}</div>;
}

export default function JobProductionPanel({ ongoingJobId, active = true }) {
  const [data, setData] = useState(null); const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const [release, setRelease] = useState({ designVersionIds: [], quoteVersionId: '', releaseBasis: 'approved', poPending: false, depositPending: false, note: '' });
  const [revocationReason, setRevocationReason] = useState('');
  const [activity, setActivity] = useState({ title: '', activityType: 'fabrication', ownerUserId: '', workPackageId: '', phaseId: '', locationId: '', plannedStart: '', plannedEnd: '' });
  const base = `/api/admin/sales/ongoing-jobs/${encodeURIComponent(ongoingJobId)}/production`;
  const load = useCallback(async () => { try { setError(''); setData(await crmApiFetch(base)); } catch (err) { setError(err.message || 'Failed to load production workspace.'); } finally { setLoading(false); } }, [base]);
  useEffect(() => { if (active) { setLoading(true); load(); } }, [active, load]);

  async function createRelease(e) {
    e.preventDefault(); setBusy(true); setError('');
    try { await crmApiFetch(`${base}/releases`, { method: 'POST', body: JSON.stringify(release) }); setRelease({ designVersionIds: [], quoteVersionId: '', releaseBasis: 'approved', poPending: false, depositPending: false, note: '' }); await load(); }
    catch (err) { setError(err.message || 'Could not release production.'); } finally { setBusy(false); }
  }
  async function createActivity(e) {
    e.preventDefault(); setBusy(true); setError('');
    try { await crmApiFetch(`${base}/activities`, { method: 'POST', body: JSON.stringify(activity) }); setActivity((v) => ({ ...v, title: '', plannedStart: '', plannedEnd: '' })); await load(); }
    catch (err) { setError(err.message || 'Could not plan activity.'); } finally { setBusy(false); }
  }
  async function revokeRelease() {
    if (!activeRelease || !revocationReason.trim()) return;
    setBusy(true); setError('');
    try { await crmApiFetch(`${base}/releases/${activeRelease.id}/revoke`, { method: 'POST', body: JSON.stringify({ reason: revocationReason }) }); setRevocationReason(''); await load(); }
    catch (err) { setError(err.message || 'Could not revoke production release.'); } finally { setBusy(false); }
  }
  async function updateActivity(id, payload) { setBusy(true); try { await crmApiFetch(`${base}/activities/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }); await load(); } catch (err) { setError(err.message); } finally { setBusy(false); } }
  async function archiveActivity(id) { setBusy(true); try { await crmApiFetch(`${base}/activities/${id}`, { method: 'DELETE' }); await load(); } catch (err) { setError(err.message); } finally { setBusy(false); } }
  async function addUpdate(id, values) { setBusy(true); try { const body = new FormData(); body.append('type', values.type); body.append('note', values.note); if (values.file) body.append('file', values.file); await crmApiFetch(`${base}/activities/${id}/updates`, { method: 'POST', body }); await load(); } catch (err) { setError(err.message); } finally { setBusy(false); } }
  async function assignActivityResource(activityId, resourceId, plannedHours) { setBusy(true); try { await crmApiFetch(`${base}/activities/${activityId}/resources`, { method: 'POST', body: JSON.stringify({ resourceId, plannedHours }) }); await load(); } catch (err) { setError(err.message); } finally { setBusy(false); } }
  async function removeActivityResource(activityId, assignmentId) { setBusy(true); try { await crmApiFetch(`${base}/activities/${activityId}/resources/${assignmentId}`, { method: 'DELETE' }); await load(); } catch (err) { setError(err.message); } finally { setBusy(false); } }

  if (loading) return <LoadingState label="Loading production plan…" />;
  const activeRelease = data.activeRelease;
  return <div className="space-y-5">
    {error && <Alert>{error}</Alert>}
    <section className="rounded-xl border border-neutral-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2"><ClipboardCheck className="h-4 w-4 text-brand" /><h3 className="text-sm font-semibold">Production readiness</h3></div><p className="mt-1 text-[11px] text-neutral-500">Advisory checks make risk visible without preventing an authorized EGS decision.</p></div><Badge tone={data.readiness.ready ? 'success' : 'warning'}>{data.readiness.ready ? 'Core ready' : 'Core information missing'}</Badge></div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{data.readiness.checks.map((check) => <div key={check.key} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-[11px] ${check.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}>{check.ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}{check.label}</div>)}</div>
      {data.readiness.warnings.length > 0 && <p className="mt-3 text-[11px] font-medium text-amber-700">Visible exceptions: {data.readiness.warnings.join(' · ')}</p>}
    </section>

    <section className="rounded-xl border border-neutral-200 bg-white p-4">
      <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-brand" /><h3 className="text-sm font-semibold">Production release</h3></div>
      {activeRelease && <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-[11px] text-emerald-900"><strong>Active release:</strong> {activeRelease.releaseBasis === 'approved' ? 'Approved basis' : 'Authorized exception'} · {when(activeRelease.releasedAt)} by {activeRelease.releasedBy}{activeRelease.poPending ? ' · PO pending' : ''}{activeRelease.depositPending ? ' · Deposit pending' : ''}{activeRelease.note ? <p className="mt-1">{activeRelease.note}</p> : null}<div className="mt-3 flex gap-2"><input className="crm-input min-w-0 flex-1 bg-white! text-[11px]" value={revocationReason} onChange={(e) => setRevocationReason(e.target.value)} placeholder="Reason to stop this production basis" /><button type="button" className="crm-btn-secondary text-rose-700" disabled={busy || !revocationReason.trim()} onClick={revokeRelease}>Revoke</button></div></div>}
      <form className="mt-4 space-y-3" onSubmit={createRelease}>
        <div><p className="mb-2 text-[11px] font-semibold text-neutral-700">Exact design version(s)</p><div className="flex flex-wrap gap-2">{data.designs.map((design) => <label key={design.id} className="flex items-center gap-2 rounded-lg border border-neutral-200 px-2.5 py-2 text-[11px]"><input type="checkbox" checked={release.designVersionIds.includes(design.id)} onChange={(e) => setRelease((v) => ({ ...v, designVersionIds: e.target.checked ? [...v.designVersionIds, design.id] : v.designVersionIds.filter((id) => id !== design.id) }))} /><span>{design.seriesTitle} V{design.version}</span><Badge tone={design.latestDecision === 'approved' ? 'success' : 'neutral'}>{design.latestDecision || 'No decision'}</Badge></label>)}</div></div>
        <div className="grid gap-2 sm:grid-cols-2"><select className="crm-select text-xs" value={release.quoteVersionId} onChange={(e) => setRelease((v) => ({ ...v, quoteVersionId: e.target.value }))}><option value="">Select exact quotation version</option>{data.quotations.map((quote) => <option key={quote.id} value={quote.id}>{quote.seriesTitle} V{quote.version} · {quote.latestDecision || 'no decision'}</option>)}</select><select className="crm-select text-xs" value={release.releaseBasis} onChange={(e) => setRelease((v) => ({ ...v, releaseBasis: e.target.value }))}><option value="approved">Approved versions</option><option value="authorized_exception">Authorized exception</option></select></div>
        <div className="flex flex-wrap gap-4 text-[11px] text-neutral-600"><label className="flex items-center gap-2"><input type="checkbox" checked={release.poPending} onChange={(e) => setRelease((v) => ({ ...v, poPending: e.target.checked }))} />PO pending</label><label className="flex items-center gap-2"><input type="checkbox" checked={release.depositPending} onChange={(e) => setRelease((v) => ({ ...v, depositPending: e.target.checked }))} />Deposit pending</label></div>
        <textarea className="crm-input min-h-18 resize-y text-xs" value={release.note} onChange={(e) => setRelease((v) => ({ ...v, note: e.target.value }))} placeholder={release.releaseBasis === 'authorized_exception' ? 'Required: who authorized starting early and why?' : 'Optional release note'} />
        <button className="crm-btn-primary" disabled={busy || !release.designVersionIds.length || !release.quoteVersionId}><ShieldCheck className="h-4 w-4" />{activeRelease ? 'Create superseding release' : 'Release production'}</button>
      </form>
    </section>

    <section className="rounded-xl border border-neutral-200 bg-white p-4">
      <div className="flex items-center gap-2"><CalendarClock className="h-4 w-4 text-brand" /><h3 className="text-sm font-semibold">Production activities</h3></div>
      <form className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4" onSubmit={createActivity}>
        <input className="crm-input text-xs lg:col-span-2" value={activity.title} onChange={(e) => setActivity((v) => ({ ...v, title: e.target.value }))} placeholder="Activity title, e.g. Print and mount stand graphics" required />
        <select className="crm-select text-xs" value={activity.activityType} onChange={(e) => setActivity((v) => ({ ...v, activityType: e.target.value }))}>{data.activityTypes.map((type) => <option key={type} value={type}>{TYPE_LABELS[type]}</option>)}</select>
        <select className="crm-select text-xs" value={activity.ownerUserId} onChange={(e) => setActivity((v) => ({ ...v, ownerUserId: e.target.value }))}><option value="">Owner later</option>{data.users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select>
        <select className="crm-select text-xs" value={activity.workPackageId} onChange={(e) => setActivity((v) => ({ ...v, workPackageId: e.target.value }))}><option value="">Work package</option>{data.workPackages.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select>
        <select className="crm-select text-xs" value={activity.phaseId} onChange={(e) => setActivity((v) => ({ ...v, phaseId: e.target.value }))}><option value="">Phase</option>{data.phases.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
        <select className="crm-select text-xs" value={activity.locationId} onChange={(e) => setActivity((v) => ({ ...v, locationId: e.target.value }))}><option value="">Location</option>{data.locations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><span />
        <label className="text-[10px] text-neutral-500">Start<input type="datetime-local" className="crm-input mt-1 text-xs" value={activity.plannedStart} onChange={(e) => setActivity((v) => ({ ...v, plannedStart: e.target.value }))} /></label><label className="text-[10px] text-neutral-500">End<input type="datetime-local" className="crm-input mt-1 text-xs" value={activity.plannedEnd} onChange={(e) => setActivity((v) => ({ ...v, plannedEnd: e.target.value }))} /></label>
        <button className="crm-btn-primary self-end" disabled={busy || !activity.title.trim()}><Plus className="h-4 w-4" />Plan activity</button>
      </form>
      {!data.activities.length ? <div className="mt-4"><EmptyState title="No production activities" description="Plan real operational work here; keep small reminders in Tasks." /></div> : <div className="mt-5 space-y-3">{data.activities.map((item) => <div key={item.id} className="rounded-xl border border-neutral-200 p-3">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><p className="text-xs font-semibold">{item.title}</p><Badge tone={item.status === 'completed' ? 'success' : item.status === 'blocked' ? 'warning' : 'info'}>{STATUS_LABELS[item.status]}</Badge></div><p className="mt-1 text-[10px] text-neutral-500">{TYPE_LABELS[item.activityType]} · {item.ownerName || 'Unassigned'} · {when(item.plannedStart)} → {when(item.plannedEnd)}{item.locationName ? ` · ${item.locationName}` : ''} · actual {(Number(item.actualMinutes || 0) / 60).toFixed(1)} h</p>{item.blocker && <p className="mt-2 flex items-center gap-1 text-[11px] font-medium text-amber-700"><FileWarning className="h-3.5 w-3.5" />{item.blocker}</p>}</div><div className="flex gap-2"><select className="crm-select text-[11px]" value={item.status} onChange={(e) => updateActivity(item.id, { status: e.target.value })}>{data.activityStatuses.map((value) => <option key={value} value={value}>{STATUS_LABELS[value]}</option>)}</select><button className="crm-btn-ghost p-2! text-rose-600" onClick={() => archiveActivity(item.id)}><Trash2 className="h-3.5 w-3.5" /></button></div></div>
        {item.updates.length > 0 && <div className="mt-3 space-y-1 border-t border-neutral-100 pt-2">{item.updates.slice(0, 5).map((update) => <p key={update.id} className="text-[10px] text-neutral-500"><strong>{UPDATE_LABELS[update.type]}</strong> · {update.author} · {when(update.createdAt)}{update.note ? ` — ${update.note}` : ''}{update.url ? <> · <a className="text-brand" href={update.url} target="_blank" rel="noreferrer">{update.fileName}</a></> : null}</p>)}</div>}
        <ResourceComposer resources={data.resources || []} assignments={item.resourceAssignments || []} busy={busy} onAdd={(resourceId, plannedHours) => assignActivityResource(item.id, resourceId, plannedHours)} onRemove={(assignmentId) => removeActivityResource(item.id, assignmentId)} />
        <UpdateComposer busy={busy} onSave={(values) => addUpdate(item.id, values)} />
      </div>)}</div>}
    </section>
  </div>;
}
