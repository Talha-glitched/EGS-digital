import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Building2, CircleDollarSign, Pencil, Plus, Search, Truck } from 'lucide-react';
import { crmApiFetch } from '../crmApi.js';
import { Alert, Badge, EmptyState, LoadingState, PageHeader, PageSection, PageShell, StatCard } from '../components/ui/primitives.jsx';
import { Modal } from '../components/ui/Modal.jsx';

function money(value) { return new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED', maximumFractionDigits: 0 }).format(Number(value || 0)); }
function when(value) { return value ? new Date(value).toLocaleDateString('en-AE', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Never used'; }
const emptyForm = { name: '', capabilityTags: '', capabilityNotes: '', status: 'active' };

export default function SuppliersPage() {
  const navigate = useNavigate();
  const [data, setData] = useState({ suppliers: [], capabilities: [] }); const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const [query, setQuery] = useState(''); const [capability, setCapability] = useState(''); const [status, setStatus] = useState('active');
  const [selected, setSelected] = useState(null); const [modalOpen, setModalOpen] = useState(false); const [form, setForm] = useState(emptyForm);
  const load = useCallback(async () => { try { setError(''); setData(await crmApiFetch('/api/admin/sales/suppliers')); } catch (err) { setError(err.message || 'Failed to load suppliers.'); } finally { setLoading(false); } }, []);
  useEffect(() => { load(); }, [load]);
  const filtered = useMemo(() => data.suppliers.filter((item) => {
    const needle = query.trim().toLowerCase(); const searchable = [item.name, item.capabilityNotes, ...(item.capabilityTags || []), ...(item.emails || []), ...(item.phones || [])].join(' ').toLowerCase();
    return (!needle || searchable.includes(needle)) && (!capability || item.capabilityTags?.includes(capability)) && (!status || item.status === status);
  }), [data.suppliers, query, capability, status]);
  const totals = useMemo(() => data.suppliers.filter((item) => item.status === 'active').reduce((result, item) => ({
    active: result.active + 1, commitments: result.commitments + item.activeCommitments, spend: result.spend + item.actualSpend, issues: result.issues + item.issuesCount,
  }), { active: 0, commitments: 0, spend: 0, issues: 0 }), [data.suppliers]);

  function openCreate() { setSelected(null); setForm(emptyForm); setModalOpen(true); }
  function openEdit(item) { setSelected(item); setForm({ name: item.name, capabilityTags: (item.capabilityTags || []).join(', '), capabilityNotes: item.capabilityNotes || '', status: item.status }); setModalOpen(true); }
  async function save(event) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const payload = { ...form, capabilityTags: form.capabilityTags.split(',').map((item) => item.trim()).filter(Boolean) };
      await crmApiFetch(selected ? `/api/admin/sales/suppliers/${selected.id}` : '/api/admin/sales/suppliers', { method: selected ? 'PATCH' : 'POST', body: JSON.stringify(payload) });
      setModalOpen(false); await load();
    } catch (err) { setError(err.message || 'Could not save supplier.'); } finally { setBusy(false); }
  }

  if (loading) return <PageShell><LoadingState label="Loading supplier directory…" /></PageShell>;
  return <PageShell className="max-w-none"><PageHeader actions={<button className="crm-btn-primary" onClick={openCreate}><Plus className="h-4 w-4" />Add supplier</button>} /><PageSection>
    {error && <Alert>{error}</Alert>}
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard compact label="Active suppliers" value={totals.active} icon={Building2} />
      <StatCard compact label="Open commitments" value={totals.commitments} icon={Truck} />
      <StatCard compact label="Recorded actual spend" value={money(totals.spend)} icon={CircleDollarSign} />
      <StatCard compact label="Recorded issues" value={totals.issues} icon={AlertTriangle} tone={totals.issues ? 'warning' : 'neutral'} />
    </div>
    <div className="mt-5 flex flex-wrap gap-2 rounded-xl border border-neutral-200 bg-white p-3">
      <label className="relative min-w-64 flex-1"><Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" /><input className="crm-input w-full pl-9" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search supplier, capability, email or phone" /></label>
      <select className="crm-select min-w-48" value={capability} onChange={(e) => setCapability(e.target.value)}><option value="">All capabilities</option>{data.capabilities.map((item) => <option key={item} value={item}>{item}</option>)}</select>
      <select className="crm-select min-w-36" value={status} onChange={(e) => setStatus(e.target.value)}><option value="active">Active</option><option value="inactive">Inactive</option><option value="">All statuses</option></select>
    </div>
    {!filtered.length ? <div className="mt-5"><EmptyState title="No suppliers match" description={data.suppliers.length ? 'Change the filters or add the missing capability to a supplier.' : 'Add the companies EGS outsources work or purchases materials from.'} /></div> : <div className="mt-5 overflow-hidden rounded-xl border border-neutral-200 bg-white"><div className="overflow-x-auto"><table className="crm-table w-full text-xs"><thead><tr className="crm-table-head"><th>Supplier</th><th>Capabilities</th><th>Jobs</th><th>Open</th><th>Committed</th><th>Actual</th><th>Issues</th><th>Last used</th><th /></tr></thead><tbody>{filtered.map((item) => <tr key={item.id}>
      <td><strong>{item.name}</strong>{item.emails?.[0] && <p className="mt-1 text-2xs text-neutral-400">{item.emails[0]}</p>}{item.capabilityNotes && <p className="mt-1 max-w-72 text-2xs text-neutral-500">{item.capabilityNotes}</p>}</td>
      <td><div className="flex max-w-80 flex-wrap gap-1">{item.capabilityTags?.length ? item.capabilityTags.map((tag) => <Badge key={tag} tone="info">{tag}</Badge>) : <span className="text-neutral-400">Not classified</span>}</div></td>
      <td>{item.jobsCount}</td><td>{item.activeCommitments}</td><td>{money(item.committedSpend)}</td><td>{money(item.actualSpend)}</td><td><Badge tone={item.issuesCount ? 'warning' : 'neutral'}>{item.issuesCount}</Badge></td><td>{when(item.lastUsedAt)}</td>
      <td><button className="crm-btn-ghost p-2!" onClick={() => openEdit(item)} title="Edit capabilities"><Pencil className="h-3.5 w-3.5" /></button></td>
    </tr>)}</tbody></table></div></div>}
    {filtered.some((item) => item.recentCommitments.length) && <div className="mt-5 rounded-xl border border-neutral-200 bg-white p-4"><h3 className="text-sm font-semibold">Recent supplier commitments</h3><div className="mt-3 space-y-2">{filtered.flatMap((item) => item.recentCommitments.map((commitment) => ({ ...commitment, supplierName: item.name }))).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 12).map((item) => <button key={item.id} onClick={() => navigate(`/admin/crm/ongoing-jobs?recordType=ongoing_job&recordId=${item.jobId}`)} className="flex w-full flex-wrap items-center justify-between gap-2 rounded-lg border border-neutral-100 px-3 py-2 text-left hover:border-brand/30 hover:bg-brand-soft/20"><span><strong className="text-xs">{item.supplierName} · {item.description}</strong><span className="ml-2 text-2xs text-neutral-400">{item.jobNumber ? `${item.jobNumber} · ` : ''}{item.jobTitle}</span></span><span className="flex items-center gap-2"><span className="text-xs font-semibold">{money(item.actualAmount ?? item.committedAmount)}</span><Badge tone={item.status === 'delivered' ? 'success' : 'info'}>{item.status.replace('_', ' ')}</Badge></span></button>)}</div></div>}
    <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={selected ? 'Edit supplier' : 'Add supplier'} subtitle="Capabilities make the directory searchable; notes capture useful supplier-specific context." icon={Building2} size="md" footer={<><button className="crm-btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button><button form="supplier-form" type="submit" className="crm-btn-primary" disabled={busy || (!selected && !form.name.trim())}>{busy ? 'Saving…' : 'Save supplier'}</button></>}><form id="supplier-form" onSubmit={save} className="space-y-4"><label className="block text-xs font-medium text-neutral-600">Company name<input className="crm-input mt-1.5 w-full" value={form.name} onChange={(e) => setForm((v) => ({ ...v, name: e.target.value }))} disabled={Boolean(selected)} required={!selected} /></label><label className="block text-xs font-medium text-neutral-600">Capabilities<input className="crm-input mt-1.5 w-full" value={form.capabilityTags} onChange={(e) => setForm((v) => ({ ...v, capabilityTags: e.target.value }))} placeholder="Printing, CNC, electrical, AV rental" /><span className="mt-1 block text-2xs font-normal text-neutral-400">Separate labels with commas.</span></label><label className="block text-xs font-medium text-neutral-600">Capability and supplier notes<textarea className="crm-input mt-1.5 min-h-28 w-full resize-y" value={form.capabilityNotes} onChange={(e) => setForm((v) => ({ ...v, capabilityNotes: e.target.value }))} placeholder="Special strengths, limitations, geographic coverage or useful context" /></label>{selected && <label className="block text-xs font-medium text-neutral-600">Status<select className="crm-select mt-1.5 w-full" value={form.status} onChange={(e) => setForm((v) => ({ ...v, status: e.target.value }))}><option value="active">Active</option><option value="inactive">Inactive</option></select></label>}</form></Modal>
  </PageSection></PageShell>;
}
