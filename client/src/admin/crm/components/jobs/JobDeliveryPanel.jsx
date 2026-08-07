import { useCallback, useEffect, useMemo, useState } from 'react';
import { Boxes, CalendarRange, MapPin, Plus, Sparkles, Trash2 } from 'lucide-react';
import { crmApiFetch } from '../../crmApi.js';
import { Alert, Badge, EmptyState, LoadingState } from '../ui/primitives.jsx';
import JobActivationModal from './JobActivationModal.jsx';

const PROGRESS_LABELS = {
  not_started: 'Not started',
  in_progress: 'In progress',
  blocked: 'Blocked',
  ready: 'Ready',
  completed: 'Completed',
};

const SCOPE_LABELS = {
  draft: 'Draft',
  quoted: 'Quoted',
  approved: 'Approved',
  changed: 'Changed',
  cancelled: 'Cancelled',
};

function Section({ icon: Icon, title, description, children }) {
  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-4">
      <div className="mb-4 flex items-start gap-3">
        <span className="rounded-lg bg-brand-soft p-2 text-brand"><Icon className="h-4 w-4" /></span>
        <div><h3 className="text-sm font-semibold text-neutral-900">{title}</h3><p className="mt-0.5 text-xs leading-5 text-neutral-500">{description}</p></div>
      </div>
      {children}
    </section>
  );
}

function ProgressSelect({ value, onChange, values }) {
  return (
    <select className="crm-select min-w-32 text-xs" value={value || 'not_started'} onChange={(event) => onChange(event.target.value)}>
      {values.map((item) => <option key={item} value={item}>{PROGRESS_LABELS[item] || item}</option>)}
    </select>
  );
}

export default function JobDeliveryPanel({ ongoingJobId, active = true }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [workTitle, setWorkTitle] = useState('');
  const [workServiceId, setWorkServiceId] = useState('');
  const [phaseName, setPhaseName] = useState('');
  const [locationName, setLocationName] = useState('');
  const [activationOpen, setActivationOpen] = useState(false);

  const base = `/api/admin/sales/ongoing-jobs/${encodeURIComponent(ongoingJobId)}/delivery`;
  const load = useCallback(async () => {
    if (!ongoingJobId) return;
    try {
      setError('');
      setData(await crmApiFetch(base));
    } catch (err) {
      setError(err.message || 'Failed to load Job scope and plan.');
    } finally {
      setLoading(false);
    }
  }, [base, ongoingJobId]);

  useEffect(() => {
    if (!active) return;
    setLoading(true);
    load();
  }, [active, load]);

  const phaseMap = useMemo(() => Object.fromEntries((data?.phases || []).map((item) => [item.id, item.name])), [data?.phases]);
  const locationMap = useMemo(() => Object.fromEntries((data?.locations || []).map((item) => [item.id, item.name])), [data?.locations]);

  async function create(kind, payload, reset) {
    setBusy(true); setError('');
    try {
      await crmApiFetch(`${base}/${kind}`, { method: 'POST', body: JSON.stringify(payload) });
      reset();
      await load();
    } catch (err) { setError(err.message || 'Could not add item.'); }
    finally { setBusy(false); }
  }

  async function update(kind, id, payload) {
    setBusy(true); setError('');
    try {
      await crmApiFetch(`${base}/${kind}/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(payload) });
      await load();
    } catch (err) { setError(err.message || 'Could not update item.'); }
    finally { setBusy(false); }
  }

  async function archive(kind, id) {
    setBusy(true); setError('');
    try {
      await crmApiFetch(`${base}/${kind}/${encodeURIComponent(id)}`, { method: 'DELETE' });
      await load();
    } catch (err) { setError(err.message || 'Could not remove item.'); }
    finally { setBusy(false); }
  }

  if (loading) return <LoadingState label="Loading scope and plan…" />;

  return (
    <div className="space-y-4">
      {error && <Alert>{error}</Alert>}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand/20 bg-brand-soft/30 px-4 py-3">
        <p className="max-w-2xl text-xs leading-5 text-neutral-600">Start with only what is known. A Job can contain several services, phases, and locations; detail can be added as the design and quotation mature.</p>
        <button className="crm-btn-primary shrink-0" onClick={()=>setActivationOpen(true)}><Sparkles className="h-4 w-4"/>Prepare for Delivery</button>
      </div>

      <Section icon={Boxes} title="Work packages" description="The distinct pieces EGS must design, quote, make, source, or install.">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-2xs text-neutral-500"><span>{data.services.length} service categories available</span><span>{data.uoms.length} units of measure available</span></div>
        <form className="mb-4 grid gap-2 sm:grid-cols-[minmax(0,1fr)_220px_auto]" onSubmit={(event) => { event.preventDefault(); if (workTitle.trim()) create('work-packages', { title: workTitle, serviceOfferingId: workServiceId || null }, () => { setWorkTitle(''); setWorkServiceId(''); }); }}>
          <input className="crm-input min-w-0" value={workTitle} onChange={(event) => setWorkTitle(event.target.value)} placeholder="e.g. Main exhibition stand, vehicle graphics, reception signage" />
          <select className="crm-select text-xs" value={workServiceId} onChange={(event) => setWorkServiceId(event.target.value)}><option value="">Choose service later</option>{data.services.map((service) => <option key={service.id} value={service.id}>{service.label}</option>)}</select>
          <button className="crm-btn-primary" disabled={busy || !workTitle.trim()}><Plus className="h-4 w-4" />Add</button>
        </form>
        {!data?.workPackages?.length ? <EmptyState title="No work packages yet" description="Add the first deliverable when the requirement becomes known." /> : (
          <div className="space-y-2">
            {data.workPackages.map((item) => (
              <div key={item.id} className="rounded-lg border border-neutral-200 p-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0"><p className="text-xs font-semibold text-neutral-900">{item.title}</p><div className="mt-1 flex flex-wrap gap-1.5 text-2xs text-neutral-500">{item.serviceLabel && <Badge tone="info">{item.serviceLabel}</Badge>}{item.phaseId && <span>{phaseMap[item.phaseId]}</span>}{item.locationId && <span>· {locationMap[item.locationId]}</span>}</div></div>
                  <div className="flex items-center gap-2"><ProgressSelect value={item.progress} values={data.progressValues} onChange={(value) => update('work-packages', item.id, { progress: value })} /><button className="crm-btn-ghost p-2! text-rose-600" onClick={() => archive('work-packages', item.id)} disabled={busy} title="Archive work package"><Trash2 className="h-3.5 w-3.5" /></button></div>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  <select className="crm-select text-xs" value={item.serviceOfferingId || ''} onChange={(event) => update('work-packages', item.id, { serviceOfferingId: event.target.value })}><option value="">Service (optional)</option>{data.services.map((service) => <option key={service.id} value={service.id}>{service.label}</option>)}</select>
                  <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-2">
                    <input type="number" min="0" step="any" className="crm-input text-xs" defaultValue={item.quantity ?? ''} placeholder="Qty" onBlur={(event) => update('work-packages', item.id, { quantity: event.target.value })} />
                    <select className="crm-select text-xs" value={item.uomId || ''} onChange={(event) => update('work-packages', item.id, { uomId: event.target.value })}><option value="">UOM</option>{data.uoms.map((uom) => <option key={uom.id} value={uom.id}>{uom.label}</option>)}</select>
                  </div>
                  <select className="crm-select text-xs" value={item.scopeState || 'draft'} onChange={(event) => update('work-packages', item.id, { scopeState: event.target.value })}>{data.scopeStates.map((state) => <option key={state} value={state}>{SCOPE_LABELS[state] || state}</option>)}</select>
                  <select className="crm-select text-xs" value={item.phaseId || ''} onChange={(event) => update('work-packages', item.id, { phaseId: event.target.value })}><option value="">Phase (optional)</option>{data.phases.map((phase) => <option key={phase.id} value={phase.id}>{phase.name}</option>)}</select>
                  <select className="crm-select text-xs" value={item.locationId || ''} onChange={(event) => update('work-packages', item.id, { locationId: event.target.value })}><option value="">Location (optional)</option>{data.locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select>
                  <input type="date" className="crm-input text-xs" value={item.targetDate ? String(item.targetDate).slice(0, 10) : ''} onChange={(event) => update('work-packages', item.id, { targetDate: event.target.value })} aria-label="Work package target date" />
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Section icon={CalendarRange} title="Phases" description="Use phases for separately owned or scheduled parts of one Job.">
          <form className="mb-3 flex gap-2" onSubmit={(event) => { event.preventDefault(); if (phaseName.trim()) create('phases', { name: phaseName }, () => setPhaseName('')); }}><input className="crm-input min-w-0 flex-1" value={phaseName} onChange={(event) => setPhaseName(event.target.value)} placeholder="Design, production, installation…" /><button className="crm-btn-secondary" disabled={busy || !phaseName.trim()} aria-label="Add phase"><Plus className="h-4 w-4" /></button></form>
          <div className="space-y-2">{data.phases.map((item) => <div key={item.id} className="flex items-center justify-between gap-2 rounded-lg bg-neutral-50 p-2.5"><span className="text-xs font-medium text-neutral-800">{item.name}</span><div className="flex items-center gap-1"><ProgressSelect value={item.progress} values={data.progressValues} onChange={(value) => update('phases', item.id, { progress: value })} /><button className="crm-btn-ghost p-1.5! text-rose-600" onClick={() => archive('phases', item.id)} aria-label={`Remove phase: ${item.name}`}><Trash2 className="h-3.5 w-3.5" /></button></div></div>)}</div>
        </Section>
        <Section icon={MapPin} title="Locations" description="One Job may cover several venues, branches, or installation sites.">
          <form className="mb-3 flex gap-2" onSubmit={(event) => { event.preventDefault(); if (locationName.trim()) create('locations', { name: locationName }, () => setLocationName('')); }}><input className="crm-input min-w-0 flex-1" value={locationName} onChange={(event) => setLocationName(event.target.value)} placeholder="ADNEC Hall 4, Dubai branch…" /><button className="crm-btn-secondary" disabled={busy || !locationName.trim()} aria-label="Add location"><Plus className="h-4 w-4" /></button></form>
          <div className="space-y-2">{data.locations.map((item) => <div key={item.id} className="flex items-center justify-between gap-2 rounded-lg bg-neutral-50 p-2.5"><span className="text-xs font-medium text-neutral-800">{item.name}</span><div className="flex items-center gap-1"><ProgressSelect value={item.progress} values={data.progressValues} onChange={(value) => update('locations', item.id, { progress: value })} /><button className="crm-btn-ghost p-1.5! text-rose-600" onClick={() => archive('locations', item.id)} aria-label={`Remove location: ${item.name}`}><Trash2 className="h-3.5 w-3.5" /></button></div></div>)}</div>
        </Section>
      </div>
      <p className="text-2xs leading-4 text-neutral-400">Removing an item archives it; its audit history is retained. Service selection is optional because EGS often receives an incomplete brief first.</p>
      <JobActivationModal ongoingJobId={ongoingJobId} open={activationOpen} onClose={()=>setActivationOpen(false)} onCreated={load}/>
    </div>
  );
}
