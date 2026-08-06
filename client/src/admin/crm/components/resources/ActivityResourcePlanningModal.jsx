import { useEffect, useMemo, useState } from 'react';
import { ExternalLink, Plus, UsersRound } from 'lucide-react';
import { crmApiFetch } from '../../crmApi.js';
import { Alert, Badge, EmptyState } from '../ui/primitives.jsx';
import { Modal } from '../ui/Modal.jsx';

function hours(minutes) { return `${(Number(minutes || 0) / 60).toFixed(1)} h`; }

export default function ActivityResourcePlanningModal({ item, resources, onClose, onChanged, onOpenJob }) {
  const [resourceId, setResourceId] = useState(''); const [plannedHours, setPlannedHours] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  useEffect(() => { setResourceId(''); setPlannedHours(''); setError(''); }, [item?.id]);
  const available = useMemo(() => (resources || []).filter((resource) => !(item?.resourceAssignments || []).some((assignment) => assignment.resourceId === resource.id)), [resources, item]);
  if (!item) return null;
  const base = `/api/admin/sales/ongoing-jobs/${item.jobId}/production/activities/${item.id}/resources`;

  async function save(resource, planned) {
    setBusy(true); setError('');
    try { await crmApiFetch(base, { method: 'POST', body: JSON.stringify({ resourceId: resource, plannedHours: planned }) }); await onChanged(); setResourceId(''); setPlannedHours(''); }
    catch (err) { setError(err.message || 'Could not assign this resource.'); } finally { setBusy(false); }
  }
  async function remove(id) {
    setBusy(true); setError('');
    try { await crmApiFetch(`${base}/${id}`, { method: 'DELETE' }); await onChanged(); }
    catch (err) { setError(err.message || 'Could not remove this resource.'); } finally { setBusy(false); }
  }

  return <Modal open={Boolean(item)} onClose={onClose} title={item.title} subtitle={`${item.jobTitle} · plan each person, crew, vehicle or equipment item against the same activity.`} icon={UsersRound} size="lg" footer={<><button className="crm-btn-secondary" onClick={() => onOpenJob(item)}><ExternalLink className="h-3.5 w-3.5" />Open Job</button><button className="crm-btn-primary" onClick={onClose}>Done</button></>}>
    {error && <Alert>{error}</Alert>}
    <div className="grid gap-3 sm:grid-cols-4"><div className="rounded-lg bg-neutral-50 p-3"><p className="text-[10px] uppercase text-neutral-400">Planned labor</p><p className="mt-1 text-sm font-semibold">{hours(item.plannedLaborMinutes)}</p></div><div className="rounded-lg bg-neutral-50 p-3"><p className="text-[10px] uppercase text-neutral-400">Actual labor</p><p className="mt-1 text-sm font-semibold">{hours(item.actualMinutes)}</p></div><div className="rounded-lg bg-neutral-50 p-3"><p className="text-[10px] uppercase text-neutral-400">Planned cost</p><p className="mt-1 text-sm font-semibold">AED {Number(item.plannedLaborCostAed || 0).toLocaleString('en-AE', { maximumFractionDigits: 0 })}</p></div><div className="rounded-lg bg-neutral-50 p-3"><p className="text-[10px] uppercase text-neutral-400">Actual cost</p><p className="mt-1 text-sm font-semibold">AED {Number(item.actualLaborCostAed || 0).toLocaleString('en-AE', { maximumFractionDigits: 0 })}</p></div></div>
    <div className="mt-4 space-y-2">{(item.resourceAssignments || []).map((assignment) => <div key={assignment.id} className="grid items-center gap-2 rounded-xl border border-neutral-200 p-3 sm:grid-cols-[minmax(0,1fr)_110px_100px_auto]"><div><p className="text-xs font-semibold">{assignment.resourceName}</p><p className="text-[10px] text-neutral-400">{assignment.resourceType}{assignment.role ? ` · ${assignment.role}` : ''}</p></div><input type="number" min="0" step="0.25" className="crm-input text-xs" defaultValue={assignment.plannedMinutes == null ? '' : Number(assignment.plannedMinutes) / 60} id={`planned-${assignment.id}`} aria-label={`Planned hours for ${assignment.resourceName}`} /><Badge tone={Number(assignment.actualMinutes || 0) > Number(assignment.plannedMinutes || 0) && assignment.plannedMinutes != null ? 'warning' : 'neutral'}>{hours(assignment.actualMinutes)} actual</Badge><div className="flex gap-1"><button className="crm-btn-secondary" disabled={busy} onClick={() => save(assignment.resourceId, document.getElementById(`planned-${assignment.id}`)?.value)}>Save</button><button className="crm-btn-ghost text-rose-600" disabled={busy} onClick={() => remove(assignment.id)}>Remove</button></div></div>)}{!(item.resourceAssignments || []).length && <EmptyState icon={UsersRound} title="No resources assigned" description="Assign the crew, person, vehicle or equipment that must be reserved for this work." />}</div>
    {available.length > 0 && <div className="mt-4 grid gap-2 rounded-xl bg-neutral-50 p-3 sm:grid-cols-[minmax(0,1fr)_130px_auto]"><select className="crm-select text-xs" value={resourceId} onChange={(e) => setResourceId(e.target.value)}><option value="">Assign another resource…</option>{available.map((resource) => <option key={resource.id} value={resource.id}>{resource.name} · {resource.resourceType}</option>)}</select><input type="number" min="0" step="0.25" className="crm-input text-xs" value={plannedHours} onChange={(e) => setPlannedHours(e.target.value)} placeholder="Planned hours" /><button className="crm-btn-primary" disabled={busy || !resourceId} onClick={() => save(resourceId, plannedHours)}><Plus className="h-3.5 w-3.5" />Assign</button></div>}
  </Modal>;
}
