import { useCallback, useEffect, useState } from 'react';
import { CircleAlert, PackageCheck, Plus, Trash2, Wallet } from 'lucide-react';
import { crmApiFetch } from '../../crmApi.js';
import { Alert, Badge, EmptyState, LoadingState, StatCard } from '../ui/primitives.jsx';

const money = (value) => value == null
  ? '—'
  : new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED', maximumFractionDigits: 0 }).format(Number(value));
const when = (value) => value ? new Date(value).toLocaleDateString('en-AE', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

const PAYMENT_TONE = {
  fully_paid: 'success', partially_paid: 'warning', outstanding: 'warning',
  not_invoiced: 'neutral', unrecorded: 'neutral',
};
const PAYMENT_LABEL = {
  fully_paid: 'Fully paid', partially_paid: 'Partially paid', outstanding: 'Outstanding',
  not_invoiced: 'Not invoiced', unrecorded: 'Not recorded',
};
const SOURCE_LABEL = {
  zoho_sync: 'From Zoho Books', manual_milestone: 'Operational milestone (manual)', unrecorded: 'Nothing recorded yet',
};

const blankMilestone = () => ({
  id: '', milestone: '', milestoneState: 'awaiting_initial_downpayment',
  amount: '', dueOn: '', zohoReference: '', displayOrder: 0,
});

export default function JobSettlementPanel({ ongoingJobId, active = true }) {
  const base = `/api/admin/sales/ongoing-jobs/${encodeURIComponent(ongoingJobId)}/settlement`;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState(blankMilestone);

  const load = useCallback(async () => {
    try { setError(''); setData(await crmApiFetch(base)); }
    catch (err) { setError(err.message || 'Failed to load settlement.'); }
    finally { setLoading(false); }
  }, [base]);
  useEffect(() => { if (active) { setLoading(true); load(); } }, [active, load]);

  async function request(path, options = {}, after) {
    setBusy(true); setError('');
    try { setData(await crmApiFetch(`${base}${path}`, options)); after?.(); }
    catch (err) { setError(err.message || 'Could not update settlement.'); }
    finally { setBusy(false); }
  }

  if (loading) return <LoadingState label="Loading settlement…" />;
  if (!data) return <Alert>{error || 'Settlement is unavailable.'}</Alert>;

  const s = data.settlement;
  const delivered = s.physicalDeliveryState === 'delivered';
  const synced = data.zohoIntegrationActive;

  return <div className="space-y-5">
    {error && <Alert>{error}</Alert>}

    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard compact label="Physical delivery" value={delivered ? 'Delivered' : 'Not delivered'} tone={delivered ? 'success' : 'neutral'} />
      <StatCard compact label="Payment status" value={PAYMENT_LABEL[s.paymentStatus] || s.paymentStatus} tone={PAYMENT_TONE[s.paymentStatus] || 'neutral'} />
      <StatCard compact label="Invoiced (Zoho)" value={synced ? money(s.invoicedTotal) : 'Not synced'} />
      <StatCard compact label="Outstanding (Zoho)" value={synced ? money(s.outstanding) : 'Not synced'} tone={synced && s.outstanding > 0 ? 'warning' : 'neutral'} />
    </div>

    {/* The source must always be visible so a hand-set milestone is never
        mistaken for a balance reconciled against Zoho. */}
    <div className="flex flex-wrap items-center gap-2">
      <Badge tone={synced ? 'success' : 'neutral'}>{SOURCE_LABEL[s.settlementSource] || s.settlementSource}</Badge>
      {s.isDeliveredButUnpaid && <Badge tone="warning">Delivered but unpaid</Badge>}
      {s.isOverdue && <Badge tone="danger">Overdue by {s.daysOverdue} days</Badge>}
      {s.isReadyForJobDone && <Badge tone="success">Ready for Job Done</Badge>}
      {s.settlementUnrecorded && <Badge tone="warning">No settlement position recorded</Badge>}
    </div>

    {!synced && (
      <p className="rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-[11px] text-neutral-600">
        Zoho Books integration is not connected yet, so amounts and due dates are not available and overdue cannot be
        calculated. Record the operational position below. When Zoho is connected, its figures take over automatically
        and these milestones remain as history — nothing needs re-entering.
      </p>
    )}

    <section className="rounded-xl border border-neutral-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex gap-3">
          <PackageCheck className="mt-0.5 h-4 w-4 text-brand" />
          <div>
            <h3 className="text-sm font-semibold">Physical delivery</h3>
            <p className="mt-1 text-[11px] text-neutral-500">
              Independent of payment. A Job can be delivered while money is still outstanding.
            </p>
          </div>
        </div>
        <button
          type="button"
          className={delivered ? 'crm-btn-secondary' : 'crm-btn-primary'}
          disabled={busy}
          onClick={() => request('/delivery', { method: 'POST', body: JSON.stringify({ state: delivered ? 'not_delivered' : 'delivered' }) })}
        >
          {delivered ? 'Mark not delivered' : 'Mark physically delivered'}
        </button>
      </div>
      {delivered && <p className="mt-3 text-[10px] text-emerald-700">Handed over on {when(s.physicallyDeliveredAt)}.</p>}
    </section>

    <section className="rounded-xl border border-neutral-200 bg-white p-4">
      <div className="flex items-center gap-2"><Wallet className="h-4 w-4 text-brand" /><h3 className="text-sm font-semibold">Operational payment position</h3></div>
      <p className="mt-1 text-[11px] text-neutral-500">
        The coarse position EGS tracks. Detailed invoices, credit notes and payments stay in Zoho Books — record the
        Zoho reference here rather than re-entering the numbers.
      </p>

      <form
        className="mt-3 grid gap-2 sm:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          request('/milestones', { method: 'POST', body: JSON.stringify(form) }, () => setForm(blankMilestone()));
        }}
      >
        <select className="crm-select text-xs" value={form.milestoneState} onChange={(e) => setForm((v) => ({ ...v, milestoneState: e.target.value }))}>
          {data.milestoneStates.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select>
        <input className="crm-input text-xs" value={form.milestone} onChange={(e) => setForm((v) => ({ ...v, milestone: e.target.value }))} placeholder="Description (optional)" />
        <input type="number" min="0" step="0.01" className="crm-input text-xs" value={form.amount} onChange={(e) => setForm((v) => ({ ...v, amount: e.target.value }))} placeholder="Expected amount AED (optional)" />
        <input className="crm-input text-xs" value={form.zohoReference} onChange={(e) => setForm((v) => ({ ...v, zohoReference: e.target.value }))} placeholder="Zoho invoice / estimate reference" />
        <input type="date" className="crm-input text-xs" value={form.dueOn} onChange={(e) => setForm((v) => ({ ...v, dueOn: e.target.value }))} />
        <button className="crm-btn-primary" disabled={busy}><Plus className="h-4 w-4" />Record position</button>
      </form>

      <div className="mt-4 space-y-2">
        {data.milestones.map((item) => (
          <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-neutral-50 p-2.5">
            <div className="min-w-0">
              <p className="text-xs font-medium">{item.milestone}</p>
              <p className="text-[10px] text-neutral-400">
                {data.milestoneStates.find((state) => state.value === item.milestoneState)?.label || 'No state'}
                {item.amount ? ` · ${money(item.amount)}` : ''}
                {item.dueOn ? ` · due ${when(item.dueOn)}` : ''}
                {item.zohoReference ? ` · Zoho ${item.zohoReference}` : ''}
              </p>
              <p className="text-[10px] text-neutral-400">
                {item.confirmedFrom === 'zoho_sync' ? 'Confirmed from Zoho' : `Set by ${item.confirmedBy}`} on {when(item.confirmedAt)}
              </p>
            </div>
            <button type="button" className="crm-btn-ghost p-2! text-rose-600" disabled={busy} onClick={() => request(`/milestones/${item.id}`, { method: 'DELETE' })}>
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        {!data.milestones.length && <EmptyState title="No payment position recorded" description="Record where this Job stands so it appears correctly in the delivered-but-unpaid queue." />}
      </div>
    </section>

    {/* Advisory only. Job Done stays a human transition, per the confirmed decision. */}
    {delivered && !s.isReadyForJobDone && (
      <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
        <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
        <div className="text-xs text-amber-900">
          <p className="font-semibold">Delivered, but settlement is not complete</p>
          <p className="mt-1 text-[11px]">
            Job Done means physically delivered <em>and</em> fully paid. This is a warning, not a block — you can still
            move the Job, but the outstanding position will remain visible in Reports.
          </p>
        </div>
      </div>
    )}
  </div>;
}
