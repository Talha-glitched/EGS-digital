import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, FileCheck2, FileText, History, MailSearch, Plus, Upload } from 'lucide-react';
import { crmApiFetch, formatCurrency } from '../../crmApi.js';
import { Alert, Badge, EmptyState, LoadingState } from '../ui/primitives.jsx';
import CommunicationSourceDrawer from '../communications/CommunicationSourceDrawer.jsx';

const DECISION_LABELS = {
  approved: 'Approved',
  rejected: 'Rejected',
  changes_requested: 'Changes requested',
  withdrawn: 'Withdrawn',
};

function when(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-AE', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function DecisionComposer({ artifactType, versionId, contacts, options, busy, onSave }) {
  const [decision, setDecision] = useState('approved');
  const [personId, setPersonId] = useState('');
  const [note, setNote] = useState('');
  return (
    <div className="mt-3 grid gap-2 rounded-lg bg-neutral-50 p-2.5 sm:grid-cols-[150px_180px_minmax(0,1fr)_auto]">
      <select className="crm-select text-[11px]" value={decision} onChange={(e) => setDecision(e.target.value)}>{options.map((value) => <option key={value} value={value}>{DECISION_LABELS[value]}</option>)}</select>
      <select className="crm-select text-[11px]" value={personId} onChange={(e) => setPersonId(e.target.value)}><option value="">Client contact optional</option>{contacts.map((contact) => <option key={contact._id} value={contact._id}>{contact.name || contact.email}</option>)}</select>
      <input className="crm-input text-[11px]" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Evidence or comment, e.g. approved by email" />
      <button type="button" className="crm-btn-secondary" disabled={busy} onClick={async () => { await onSave({ artifactType, versionId, decision, decidedByPersonId: personId || null, note }); setNote(''); }}><CheckCircle2 className="h-3.5 w-3.5" />Record</button>
    </div>
  );
}

function VersionCard({ version, artifactType, contacts, options, busy, onDecision, onViewSource }) {
  const latest = version.decisions?.[0];
  return (
    <div className="rounded-lg border border-neutral-200 p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2"><span className="text-xs font-semibold text-neutral-900">Version {version.version}</span><Badge tone={version.status === 'issued' ? 'info' : 'neutral'}>{version.status}</Badge>{latest && <Badge tone={latest.decision === 'approved' ? 'success' : 'warning'}>{DECISION_LABELS[latest.decision]}</Badge>}</div>
          <p className="mt-1 text-[10px] text-neutral-500">{version.author} · {when(version.createdAt)}{version.totalAmount != null ? ` · ${formatCurrency(version.totalAmount)}` : ''}</p>
          {version.revisionNote && <p className="mt-2 text-[11px] leading-5 text-neutral-700">{version.revisionNote}</p>}
        </div>
        <a href={version.url} target="_blank" rel="noreferrer" className="crm-btn-secondary text-xs"><FileText className="h-3.5 w-3.5" />{version.fileName || 'Open file'}</a>
      </div>
      {artifactType === 'quotation' && version.lines?.length > 0 && <div className="mt-3 overflow-x-auto rounded-lg border border-neutral-100"><table className="w-full text-left text-[10px]"><thead className="bg-neutral-50 text-neutral-400"><tr><th className="p-2">Description</th><th className="p-2">Service / work package</th><th className="p-2 text-right">Quantity</th><th className="p-2 text-right">Unit price</th><th className="p-2 text-right">Total</th></tr></thead><tbody>{version.lines.map((line) => <tr key={line.id} className="border-t border-neutral-100"><td className="p-2 font-medium">{line.description}</td><td className="p-2 text-neutral-500">{line.serviceLabel || 'Unclassified'}{line.workPackageTitle ? ` · ${line.workPackageTitle}` : ''}{line.locationName ? ` · ${line.locationName}` : ''}</td><td className="p-2 text-right">{line.quantity} {line.uomLabel || ''}</td><td className="p-2 text-right">{formatCurrency(line.unitPrice)}</td><td className="p-2 text-right font-semibold">{formatCurrency(line.lineTotal)}</td></tr>)}</tbody></table></div>}
      {version.decisions?.length > 0 && <div className="mt-3 space-y-1 border-t border-neutral-100 pt-2">{version.decisions.map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-neutral-500"><p><strong className="text-neutral-700">{DECISION_LABELS[item.decision]}</strong> by {item.decidedBy} · {when(item.decidedAt)}{item.note ? ` — ${item.note}` : ''}</p>{item.sourceConversationId && <button type="button" className="inline-flex items-center gap-1 font-semibold text-brand hover:text-brand-dark" onClick={() => onViewSource({ conversationId: item.sourceConversationId, messageId: item.sourceMessageId })}><MailSearch className="h-3 w-3" />View source email</button>}</div>)}</div>}
      <DecisionComposer artifactType={artifactType} versionId={version.id} contacts={contacts} options={options} busy={busy} onSave={onDecision} />
    </div>
  );
}

function VersionUpload({ kind, familyId, busy, onUpload, quoteContext }) {
  const [file, setFile] = useState(null);
  const [note, setNote] = useState('');
  const [status, setStatus] = useState('draft');
  const [amount, setAmount] = useState('');
  const [lines, setLines] = useState([]);
  const structuredTotal = lines.reduce((sum, line) => sum + (Number(line.quantity) || 0) * (Number(line.unitPrice) || 0), 0);
  function addLine() { setLines((current) => [...current, { description: '', workPackageId: '', serviceOfferingId: '', uomId: '', quantity: '1', unitPrice: '' }]); }
  function updateLine(index, field, value) { setLines((current) => current.map((line, lineIndex) => { if (lineIndex !== index) return line; const next = { ...line, [field]: value }; if (field === 'workPackageId' && value) { const pack = quoteContext?.workPackages?.find((item) => item.id === value); if (pack) { next.description ||= pack.title; next.serviceOfferingId ||= pack.serviceOfferingId || ''; next.uomId ||= pack.uomId || ''; } } return next; })); }
  return (
    <form className="mt-3 grid gap-2 rounded-lg border border-dashed border-neutral-300 p-3 sm:grid-cols-2" onSubmit={async (e) => { e.preventDefault(); if (!file) return; const saved = await onUpload(kind, familyId, { file, note, status, amount: lines.length ? structuredTotal : amount, lines }); if (!saved) return; setFile(null); setNote(''); setAmount(''); setLines([]); e.currentTarget.reset(); }}>
      <label className="crm-btn-secondary cursor-pointer justify-center text-xs"><Upload className="h-3.5 w-3.5" />Choose exact file<input type="file" required className="sr-only" onChange={(e) => setFile(e.target.files?.[0] || null)} /></label>
      <select className="crm-select text-xs" value={status} onChange={(e) => setStatus(e.target.value)}><option value="draft">Draft / internal</option><option value="issued">Issued to client</option></select>
      {kind === 'quotations' && <input type="number" min="0" step="0.01" className="crm-input text-xs" value={lines.length ? structuredTotal.toFixed(2) : amount} onChange={(e) => setAmount(e.target.value)} readOnly={lines.length > 0} placeholder="Quotation total AED" />}
      <input className="crm-input text-xs" value={note} onChange={(e) => setNote(e.target.value)} placeholder="What changed in this version?" />
      {kind === 'quotations' && <div className="space-y-2 sm:col-span-2"><div className="flex items-center justify-between"><div><p className="text-[11px] font-semibold text-neutral-700">Structured quotation lines</p><p className="text-[10px] text-neutral-400">Required when issuing. Selecting a work package fills its service and UOM.</p></div><button type="button" className="crm-btn-secondary" onClick={addLine}><Plus className="h-3.5 w-3.5" />Line</button></div>{lines.map((line, index) => <div key={`line-${index}`} className="grid gap-2 rounded-lg bg-white p-2 sm:grid-cols-2 xl:grid-cols-[minmax(150px,1.3fr)_minmax(130px,1fr)_minmax(120px,1fr)_90px_minmax(100px,0.8fr)_auto]"><input className="crm-input text-[11px]" value={line.description} onChange={(e) => updateLine(index, 'description', e.target.value)} placeholder="Description" required /><select className="crm-select text-[11px]" value={line.workPackageId} onChange={(e) => updateLine(index, 'workPackageId', e.target.value)}><option value="">Whole Job</option>{quoteContext?.workPackages?.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select><select className="crm-select text-[11px]" value={line.serviceOfferingId} onChange={(e) => updateLine(index, 'serviceOfferingId', e.target.value)}><option value="">Service</option>{quoteContext?.services?.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select><input type="number" min="0.0001" step="0.0001" className="crm-input text-[11px]" value={line.quantity} onChange={(e) => updateLine(index, 'quantity', e.target.value)} placeholder="Qty" required /><div className="grid grid-cols-[minmax(70px,1fr)_minmax(80px,1fr)] gap-1"><select className="crm-select text-[10px]" value={line.uomId} onChange={(e) => updateLine(index, 'uomId', e.target.value)}><option value="">UOM</option>{quoteContext?.uoms?.map((item) => <option key={item.id} value={item.id}>{item.code}</option>)}</select><input type="number" min="0" step="0.01" className="crm-input text-[11px]" value={line.unitPrice} onChange={(e) => updateLine(index, 'unitPrice', e.target.value)} placeholder="AED/unit" required /></div><button type="button" className="crm-btn-ghost p-2! text-rose-600" onClick={() => setLines((current) => current.filter((_, lineIndex) => lineIndex !== index))}>×</button></div>)}</div>}
      <button className="crm-btn-primary sm:col-span-2" disabled={busy || !file}><Plus className="h-3.5 w-3.5" />Add new immutable version{file ? ` · ${file.name}` : ''}</button>
    </form>
  );
}

export default function JobArtifactsPanel({ ongoingJobId, contacts = [], active = true }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [designTitle, setDesignTitle] = useState('');
  const [designWorkPackageId, setDesignWorkPackageId] = useState('');
  const [quoteTitle, setQuoteTitle] = useState('');
  const [quoteWorkPackageId, setQuoteWorkPackageId] = useState('');
  const [communicationSource, setCommunicationSource] = useState(null);
  const base = `/api/admin/sales/ongoing-jobs/${encodeURIComponent(ongoingJobId)}/artifacts`;

  const load = useCallback(async () => {
    try { setError(''); setData(await crmApiFetch(base)); }
    catch (err) { setError(err.message || 'Failed to load designs and quotations.'); }
    finally { setLoading(false); }
  }, [base]);
  useEffect(() => { if (active) { setLoading(true); load(); } }, [active, load]);

  async function createFamily(kind, title, workPackageId, clear) {
    setBusy(true); setError('');
    try { await crmApiFetch(`${base}/${kind}`, { method: 'POST', body: JSON.stringify({ title, workPackageId: workPackageId || null }) }); clear(); await load(); }
    catch (err) { setError(err.message || 'Could not create series.'); }
    finally { setBusy(false); }
  }
  async function upload(kind, familyId, values) {
    setBusy(true); setError('');
    try {
      const body = new FormData(); body.append('file', values.file); body.append('revisionNote', values.note); body.append('status', values.status);
      if (kind === 'quotations') { body.append('totalAmount', values.amount); body.append('quoteLines', JSON.stringify(values.lines || [])); }
      await crmApiFetch(`${base}/${kind}/${encodeURIComponent(familyId)}/versions`, { method: 'POST', body }); await load(); return true;
    } catch (err) { setError(err.message || 'Could not add version.'); return false; }
    finally { setBusy(false); }
  }
  async function decision(payload) {
    setBusy(true); setError('');
    try { await crmApiFetch(`${base}/decisions`, { method: 'POST', body: JSON.stringify(payload) }); await load(); }
    catch (err) { setError(err.message || 'Could not record decision.'); }
    finally { setBusy(false); }
  }

  if (loading) return <LoadingState label="Loading designs and quotations…" />;
  const versionProps = { contacts, options: data.decisionOptions, busy, onDecision: decision, onViewSource: setCommunicationSource };
  const quoteContext = { workPackages: data.workPackages, services: data.services, uoms: data.uoms };
  return (
    <div className="space-y-5">
      {error && <Alert>{error}</Alert>}
      <div className="rounded-xl border border-brand/20 bg-brand-soft/30 p-3 text-[11px] leading-5 text-neutral-600"><strong>Independent approvals:</strong> design and commercial acceptance are recorded separately against the exact file version. Adding a revision never overwrites an earlier file or decision.</div>
      <div className="grid gap-5 xl:grid-cols-2">
        <section className="rounded-xl border border-neutral-200 bg-white p-4">
          <div className="mb-4 flex items-center gap-2"><FileCheck2 className="h-4 w-4 text-brand" /><h3 className="text-sm font-semibold">Designs</h3></div>
          <form className="mb-4 grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(140px,0.8fr)_auto]" onSubmit={(e) => { e.preventDefault(); if (designTitle.trim()) createFamily('designs', designTitle, designWorkPackageId, () => { setDesignTitle(''); setDesignWorkPackageId(''); }); }}><input className="crm-input min-w-0" value={designTitle} onChange={(e) => setDesignTitle(e.target.value)} placeholder="e.g. Main stand concept" /><select className="crm-select text-xs" value={designWorkPackageId} onChange={(e) => setDesignWorkPackageId(e.target.value)}><option value="">Whole Job</option>{data.workPackages.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select><button className="crm-btn-primary" disabled={busy || !designTitle.trim()}><Plus className="h-4 w-4" />Series</button></form>
          {!data.designSets.length ? <EmptyState title="No design series" description="Create one series for each independently revised design or work package." /> : <div className="space-y-4">{data.designSets.map((set) => <div key={set.id} className="rounded-xl bg-neutral-50 p-3"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold">{set.title}</p>{set.workPackageTitle && <p className="text-[10px] text-neutral-500">{set.workPackageTitle}</p>}</div><span className="text-[10px] text-neutral-400"><History className="mr-1 inline h-3 w-3" />{set.versions.length} versions</span></div><div className="mt-3 space-y-2">{set.versions.map((version) => <VersionCard key={version.id} version={version} artifactType="design" {...versionProps} />)}</div><VersionUpload kind="designs" familyId={set.id} busy={busy} onUpload={upload} /></div>)}</div>}
        </section>
        <section className="rounded-xl border border-neutral-200 bg-white p-4">
          <div className="mb-4 flex items-center gap-2"><FileText className="h-4 w-4 text-brand" /><h3 className="text-sm font-semibold">Quotations</h3></div>
          <form className="mb-4 grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(140px,0.8fr)_auto]" onSubmit={(e) => { e.preventDefault(); if (quoteTitle.trim()) createFamily('quotations', quoteTitle, quoteWorkPackageId, () => { setQuoteTitle(''); setQuoteWorkPackageId(''); }); }}><input className="crm-input min-w-0" value={quoteTitle} onChange={(e) => setQuoteTitle(e.target.value)} placeholder="e.g. Complete event quotation" /><select className="crm-select text-xs" value={quoteWorkPackageId} onChange={(e) => setQuoteWorkPackageId(e.target.value)}><option value="">Whole Job</option>{data.workPackages.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select><button className="crm-btn-primary" disabled={busy || !quoteTitle.trim()}><Plus className="h-4 w-4" />Series</button></form>
          {!data.quotes.length ? <EmptyState title="No quotation series" description="Create a series, then add every sent revision without replacing the previous one." /> : <div className="space-y-4">{data.quotes.map((quote) => <div key={quote.id} className="rounded-xl bg-neutral-50 p-3"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold">{quote.title}</p><p className="text-[10px] text-neutral-500">{quote.familyNumber}</p></div><span className="text-[10px] text-neutral-400"><History className="mr-1 inline h-3 w-3" />{quote.versions.length} versions</span></div><div className="mt-3 space-y-2">{quote.versions.map((version) => <VersionCard key={version.id} version={version} artifactType="quotation" {...versionProps} />)}</div><VersionUpload kind="quotations" familyId={quote.id} busy={busy} onUpload={upload} quoteContext={quoteContext} /></div>)}</div>}
        </section>
      </div>
      <CommunicationSourceDrawer source={communicationSource} onClose={() => setCommunicationSource(null)} />
    </div>
  );
}
