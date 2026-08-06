import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Building2, CircleDollarSign, PackageCheck, Plus, Send, Truck } from 'lucide-react';
import { crmApiFetch } from '../../crmApi.js';
import { Alert, Badge, EmptyState, LoadingState, StatCard } from '../ui/primitives.jsx';

const STATUS_LABELS = { draft: 'Draft', committed: 'Committed', partially_delivered: 'Part delivered', delivered: 'Delivered', cancelled: 'Cancelled' };
const UPDATE_LABELS = { progress: 'Progress', delivery: 'Delivery', issue: 'Issue', resolution: 'Resolution', cost_adjustment: 'Cost change', cancellation: 'Cancellation' };
function amount(value, currency = 'AED') { return new Intl.NumberFormat('en-AE', { style: 'currency', currency, maximumFractionDigits: 2 }).format(Number(value || 0)); }
function when(value) { return value ? new Date(value).toLocaleString('en-AE', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—'; }

function QuoteComposer({ rfq, suppliers, busy, onSave }) {
  const [form, setForm] = useState({ supplierId: '', reference: '', amount: '', leadTimeDays: '', note: '' });
  return <form className="mt-3 grid gap-2 rounded-lg bg-neutral-50 p-3 sm:grid-cols-2 lg:grid-cols-5" onSubmit={async (event) => {
    event.preventDefault(); await onSave(rfq.id, form); setForm({ supplierId: '', reference: '', amount: '', leadTimeDays: '', note: '' });
  }}>
    <select className="crm-select text-xs" value={form.supplierId} onChange={(e) => setForm((v) => ({ ...v, supplierId: e.target.value }))} required><option value="">Supplier</option>{suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select>
    <input className="crm-input text-xs" value={form.reference} onChange={(e) => setForm((v) => ({ ...v, reference: e.target.value }))} placeholder="Quote reference" />
    <input type="number" min="0" step="0.01" className="crm-input text-xs" value={form.amount} onChange={(e) => setForm((v) => ({ ...v, amount: e.target.value }))} placeholder="Amount AED" required />
    <input type="number" min="0" className="crm-input text-xs" value={form.leadTimeDays} onChange={(e) => setForm((v) => ({ ...v, leadTimeDays: e.target.value }))} placeholder="Lead time, days" />
    <button className="crm-btn-secondary" disabled={busy || !form.supplierId || form.amount === ''}><Plus className="h-3.5 w-3.5" />Record quote</button>
    <input className="crm-input text-xs sm:col-span-2 lg:col-span-5" value={form.note} onChange={(e) => setForm((v) => ({ ...v, note: e.target.value }))} placeholder="Optional inclusions, exclusions or commercial note" />
  </form>;
}

function UpdateComposer({ busy, onSave }) {
  const [type, setType] = useState('progress'); const [note, setNote] = useState('');
  return <form className="mt-3 flex flex-wrap gap-2" onSubmit={async (event) => { event.preventDefault(); await onSave({ type, note }); setNote(''); }}>
    <select className="crm-select w-36 text-[11px]" value={type} onChange={(e) => setType(e.target.value)}>{Object.entries(UPDATE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
    <input className="crm-input min-w-56 flex-1 text-[11px]" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Delivery update, issue, resolution or cost explanation" required />
    <button className="crm-btn-secondary" disabled={busy || !note.trim()}>Add update</button>
  </form>;
}

export default function JobProcurementPanel({ ongoingJobId, active = true }) {
  const [data, setData] = useState(null); const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const [supplier, setSupplier] = useState({ name: '', capabilityTags: '' });
  const [rfq, setRfq] = useState({ title: '', workPackageId: '', requiredBy: '', requirement: '' });
  const [commitment, setCommitment] = useState({ supplierId: '', supplierQuoteId: '', workPackageId: '', reference: '', description: '', committedAmount: '', expectedDeliveryAt: '' });
  const base = `/api/admin/sales/ongoing-jobs/${encodeURIComponent(ongoingJobId)}/procurement`;
  const load = useCallback(async () => { try { setError(''); setData(await crmApiFetch(base)); } catch (err) { setError(err.message || 'Failed to load procurement.'); } finally { setLoading(false); } }, [base]);
  useEffect(() => { if (active) { setLoading(true); load(); } }, [active, load]);
  const allQuotes = useMemo(() => (data?.rfqs || []).flatMap((item) => item.quotes.map((quote) => ({ ...quote, rfqTitle: item.title, workPackageId: item.workPackageId }))), [data]);

  async function submit(path, payload, reset) { setBusy(true); setError(''); try { await crmApiFetch(`${base}${path}`, { method: 'POST', body: JSON.stringify(payload) }); reset?.(); await load(); } catch (err) { setError(err.message || 'Could not save procurement record.'); } finally { setBusy(false); } }
  async function patch(path, payload) { setBusy(true); setError(''); try { await crmApiFetch(`${base}${path}`, { method: 'PATCH', body: JSON.stringify(payload) }); await load(); } catch (err) { setError(err.message || 'Could not update commitment.'); } finally { setBusy(false); } }

  if (loading) return <LoadingState label="Loading suppliers and costs…" />;
  return <div className="space-y-5">
    {error && <Alert>{error}</Alert>}
    <div className="grid gap-3 sm:grid-cols-3">
      <StatCard compact label="Committed supplier cost" value={amount(data.totals.committed)} icon={CircleDollarSign} />
      <StatCard compact label="Actual supplier cost" value={data.totals.actualKnown ? amount(data.totals.actual) : 'Not recorded'} icon={PackageCheck} />
      <StatCard compact label="Actual vs committed" value={data.totals.actualKnown ? amount(data.totals.variance) : 'Pending actuals'} icon={data.totals.variance > 0 ? AlertTriangle : Truck} tone={data.totals.variance > 0 ? 'warning' : 'neutral'} />
    </div>

    <section className="rounded-xl border border-neutral-200 bg-white p-4">
      <div className="flex items-center gap-2"><Building2 className="h-4 w-4 text-brand" /><h3 className="text-sm font-semibold">Supplier directory</h3></div>
      <p className="mt-1 text-[11px] text-neutral-500">A supplier is a company identity EGS can reuse across Jobs. Add only capability labels useful for searching.</p>
      <form className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]" onSubmit={(e) => { e.preventDefault(); submit('/suppliers', supplier, () => setSupplier({ name: '', capabilityTags: '' })); }}>
        <input className="crm-input text-xs" value={supplier.name} onChange={(e) => setSupplier((v) => ({ ...v, name: e.target.value }))} placeholder="Supplier company name" required />
        <input className="crm-input text-xs" value={supplier.capabilityTags} onChange={(e) => setSupplier((v) => ({ ...v, capabilityTags: e.target.value }))} placeholder="Capabilities, comma separated" />
        <button className="crm-btn-secondary" disabled={busy || !supplier.name.trim()}><Plus className="h-3.5 w-3.5" />Add supplier</button>
      </form>
      {data.suppliers.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{data.suppliers.map((item) => <span key={item.id} className="rounded-full border border-neutral-200 px-2.5 py-1 text-[10px] text-neutral-600"><strong>{item.name}</strong>{item.capabilityTags?.length ? ` · ${item.capabilityTags.join(', ')}` : ''}</span>)}</div>}
    </section>

    <section className="rounded-xl border border-neutral-200 bg-white p-4">
      <div className="flex items-center gap-2"><Send className="h-4 w-4 text-brand" /><h3 className="text-sm font-semibold">RFQs and quote comparison</h3></div>
      <p className="mt-1 text-[11px] text-neutral-500">Use this when comparing suppliers. Skip it and create a direct commitment for ordinary purchasing.</p>
      <form className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4" onSubmit={(e) => { e.preventDefault(); submit('/rfqs', rfq, () => setRfq({ title: '', workPackageId: '', requiredBy: '', requirement: '' })); }}>
        <input className="crm-input text-xs lg:col-span-2" value={rfq.title} onChange={(e) => setRfq((v) => ({ ...v, title: e.target.value }))} placeholder="What are we pricing?" required />
        <select className="crm-select text-xs" value={rfq.workPackageId} onChange={(e) => setRfq((v) => ({ ...v, workPackageId: e.target.value }))}><option value="">Whole Job</option>{data.workPackages.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select>
        <label className="text-[10px] text-neutral-500">Required by<input type="date" className="crm-input mt-1 text-xs" value={rfq.requiredBy} onChange={(e) => setRfq((v) => ({ ...v, requiredBy: e.target.value }))} /></label>
        <textarea className="crm-input min-h-16 resize-y text-xs lg:col-span-3" value={rfq.requirement} onChange={(e) => setRfq((v) => ({ ...v, requirement: e.target.value }))} placeholder="Scope, quantity, specification and inclusions" />
        <button className="crm-btn-primary self-end" disabled={busy || !rfq.title.trim()}><Plus className="h-4 w-4" />Create RFQ</button>
      </form>
      {!data.rfqs.length ? <div className="mt-4"><EmptyState title="No supplier comparisons" description="Create an RFQ only when comparing prices or terms will help the Job." /></div> : <div className="mt-4 space-y-3">{data.rfqs.map((item) => <div key={item.id} className="rounded-xl border border-neutral-200 p-3">
        <div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-xs font-semibold">{item.title}</p><p className="mt-1 text-[10px] text-neutral-500">{item.workPackageTitle || 'Whole Job'} · required {item.requiredBy || 'date not set'}</p>{item.requirement && <p className="mt-2 text-[11px] text-neutral-600">{item.requirement}</p>}</div><select className="crm-select text-[11px]" value={item.status} onChange={(e) => patch(`/rfqs/${item.id}`, { status: e.target.value })}>{data.rfqStatuses.map((status) => <option key={status} value={status}>{status[0].toUpperCase() + status.slice(1)}</option>)}</select></div>
        {item.quotes.length > 0 && <div className="mt-3 overflow-x-auto"><table className="w-full text-left text-[11px]"><thead className="text-neutral-400"><tr><th className="pb-1">Supplier</th><th className="pb-1">Price</th><th className="pb-1">Lead time</th><th className="pb-1">Status</th><th /></tr></thead><tbody>{item.quotes.map((quote) => <tr key={quote.id} className="border-t border-neutral-100"><td className="py-2 font-medium">{quote.supplierName}</td><td>{amount(quote.amount, quote.currency)}</td><td>{quote.leadTimeDays == null ? '—' : `${quote.leadTimeDays} days`}</td><td><Badge tone={quote.status === 'accepted' ? 'success' : 'neutral'}>{quote.status}</Badge></td><td className="text-right"><button type="button" className="text-[10px] font-semibold text-brand" onClick={() => setCommitment((v) => ({ ...v, supplierId: quote.supplierId, supplierQuoteId: quote.id, workPackageId: item.workPackageId || '', description: item.title, committedAmount: quote.amount }))}>Use quote</button></td></tr>)}</tbody></table></div>}
        <QuoteComposer rfq={item} suppliers={data.suppliers} busy={busy} onSave={(rfqId, values) => submit(`/rfqs/${rfqId}/quotes`, values)} />
      </div>)}</div>}
    </section>

    <section className="rounded-xl border border-neutral-200 bg-white p-4">
      <div className="flex items-center gap-2"><PackageCheck className="h-4 w-4 text-brand" /><h3 className="text-sm font-semibold">Supplier commitments and delivery</h3></div>
      <p className="mt-1 text-[11px] text-neutral-500">This is the cost and delivery promise EGS is relying on. It can come from a formal quote or a direct supplier agreement.</p>
      <form className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4" onSubmit={(e) => { e.preventDefault(); submit('/commitments', commitment, () => setCommitment({ supplierId: '', supplierQuoteId: '', workPackageId: '', reference: '', description: '', committedAmount: '', expectedDeliveryAt: '' })); }}>
        <select className="crm-select text-xs" value={commitment.supplierId} onChange={(e) => setCommitment((v) => ({ ...v, supplierId: e.target.value, supplierQuoteId: '' }))} required><option value="">Supplier</option>{data.suppliers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
        <select className="crm-select text-xs" value={commitment.workPackageId} onChange={(e) => setCommitment((v) => ({ ...v, workPackageId: e.target.value }))}><option value="">Whole Job</option>{data.workPackages.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select>
        <input className="crm-input text-xs" value={commitment.reference} onChange={(e) => setCommitment((v) => ({ ...v, reference: e.target.value }))} placeholder="PO / supplier reference" />
        <input type="number" min="0" step="0.01" className="crm-input text-xs" value={commitment.committedAmount} onChange={(e) => setCommitment((v) => ({ ...v, committedAmount: e.target.value }))} placeholder="Committed AED" required />
        <input className="crm-input text-xs lg:col-span-2" value={commitment.description} onChange={(e) => setCommitment((v) => ({ ...v, description: e.target.value }))} placeholder="What is the supplier delivering?" required />
        <label className="text-[10px] text-neutral-500">Expected delivery<input type="datetime-local" className="crm-input mt-1 text-xs" value={commitment.expectedDeliveryAt} onChange={(e) => setCommitment((v) => ({ ...v, expectedDeliveryAt: e.target.value }))} /></label>
        <button className="crm-btn-primary self-end" disabled={busy || !commitment.supplierId || !commitment.description.trim() || commitment.committedAmount === ''}><Plus className="h-4 w-4" />Record commitment</button>
        {commitment.supplierQuoteId && <p className="text-[10px] text-emerald-700 lg:col-span-4">Linked to selected supplier quote. Saving will mark it accepted.</p>}
      </form>
      {!data.commitments.length ? <div className="mt-4"><EmptyState title="No supplier commitments" description="Record an agreed outsourced item, material order or subcontracted service here." /></div> : <div className="mt-5 space-y-3">{data.commitments.map((item) => <div key={item.id} className="rounded-xl border border-neutral-200 p-3">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><p className="text-xs font-semibold">{item.supplierName} · {item.description}</p><Badge tone={item.status === 'delivered' ? 'success' : item.status === 'cancelled' ? 'neutral' : 'info'}>{STATUS_LABELS[item.status]}</Badge></div><p className="mt-1 text-[10px] text-neutral-500">{item.workPackageTitle || 'Whole Job'} · committed {amount(item.committedAmount, item.currency)} · actual {item.actualAmount == null ? 'not recorded' : amount(item.actualAmount, item.currency)} · expected {when(item.expectedDeliveryAt)}</p></div><div className="flex flex-wrap gap-2"><select className="crm-select text-[11px]" value={item.status} onChange={(e) => patch(`/commitments/${item.id}`, { status: e.target.value })}>{data.commitmentStatuses.map((status) => <option key={status} value={status}>{STATUS_LABELS[status]}</option>)}</select><input type="number" min="0" step="0.01" className="crm-input w-32 text-[11px]" defaultValue={item.actualAmount ?? ''} placeholder="Actual AED" onBlur={(e) => { if (String(item.actualAmount ?? '') !== e.target.value) patch(`/commitments/${item.id}`, { actualAmount: e.target.value }); }} /></div></div>
        {item.updates.length > 0 && <div className="mt-3 space-y-1 border-t border-neutral-100 pt-2">{item.updates.slice(0, 6).map((update) => <p key={update.id} className={`text-[10px] ${update.type === 'issue' ? 'font-medium text-amber-700' : 'text-neutral-500'}`}><strong>{UPDATE_LABELS[update.type]}</strong> · {update.author} · {when(update.createdAt)} — {update.note}</p>)}</div>}
        <UpdateComposer busy={busy} onSave={(values) => submit(`/commitments/${item.id}/updates`, values)} />
      </div>)}</div>}
    </section>
  </div>;
}
