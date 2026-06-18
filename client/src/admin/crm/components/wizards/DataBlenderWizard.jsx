import { useState } from 'react';
import { previewIngestFile, uploadIngestFile } from '../../crmApi.js';
import { ChevronLeft, Upload, ArrowRight, Wand2, FileSpreadsheet } from 'lucide-react';
import { Alert, Field, StepIndicator, InfoPanel, cn } from '../ui/primitives.jsx';

const INTERNAL_FIELDS = [
  { key: 'email', label: 'Email address', required: true, hint: 'Work email used for outreach and deduplication.' },
  { key: 'name', label: 'Contact name', required: false, hint: 'First name or full name.' },
  { key: 'designation', label: 'Job title', required: false, hint: 'e.g. Marketing Director.' },
  { key: 'companyName', label: 'Company name', required: false, hint: 'Used when a new company is created from this row.' },
  { key: 'domain', label: 'Company domain', required: false, hint: 'Optional — falls back to the email domain if blank.' },
  { key: 'phone', label: 'Phone', required: false, hint: 'Optional — used for WhatsApp handoff in the Inbox.' },
];

const VENDORS = ['Apollo', 'Hunter', 'Lusha', 'Manual'];
const STEPS = ['Upload file', 'Map columns', 'Review & import'];
const STEP_META = [
  { description: 'Choose the data source and upload an unmodified export.' },
  { description: 'Match spreadsheet headers to CRM fields. Only email is required.' },
  { description: 'Confirm the counts before writing contacts to the database.' },
];

export default function DataBlenderWizard({ projectId, onComplete, onCancel }) {
  const [step, setStep] = useState(0);
  const [file, setFile] = useState(null);
  const [headers, setHeaders] = useState([]);
  const [mapping, setMapping] = useState({});
  const [vendor, setVendor] = useState('Manual');
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleFileSelect(selected) {
    if (!selected) return;
    setFile(selected);
    setError('');
    setBusy(true);
    try {
      const result = await previewIngestFile(projectId, selected);
      setHeaders(result.headers || result.sheets?.[0]?.headers || []);
      setMapping(result.suggestedMapping || {});
      if (result.detectedVendor) setVendor(result.detectedVendor);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function runPreview() {
    setBusy(true);
    setError('');
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('fieldMapping', JSON.stringify(mapping));
      form.append('vendor', vendor);
      const response = await fetch(`/api/admin/projects/${projectId}/ingest/preview`, {
        method: 'POST',
        credentials: 'include',
        body: form,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Preview failed');
      setPreview(result);
      setStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function runImport() {
    setBusy(true);
    setError('');
    try {
      const result = await uploadIngestFile(projectId, file, mapping, vendor);
      onComplete?.(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="crm-card space-y-6 p-5 sm:p-6">
      <div>
        <h2 className="text-lg font-bold text-[var(--color-ink)]">Import contacts</h2>
        <p className="mt-1 text-sm leading-relaxed text-neutral-500">
          Upload a raw export from your prospecting tool. Contacts are grouped by company domain, deduplicated by email,
          and tagged with their discovery source.
        </p>
      </div>

      <StepIndicator steps={STEPS} current={step} meta={STEP_META} />

      {error && <Alert>{error}</Alert>}

      {step === 0 && (
        <div className="space-y-5">
          <InfoPanel title="How matching works">
            Each contact is grouped by its company domain. If that company isn&apos;t in the project yet, it&apos;s created
            automatically — so no rows are silently dropped.
          </InfoPanel>
          <Field label="Which tool did this export come from?" hint="Used for source attribution in analytics.">
            <select className="crm-select max-w-xs" value={vendor} onChange={(e) => setVendor(e.target.value)}>
              {VENDORS.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </Field>
          <label className="flex cursor-pointer flex-col items-center rounded-xl border-2 border-dashed border-[var(--color-line-strong)] bg-neutral-50/60 px-6 py-12 transition hover:border-brand/40 hover:bg-brand-soft/20">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white text-neutral-400 shadow-sm">
              {file ? <FileSpreadsheet className="h-6 w-6 text-brand" /> : <Upload className="h-6 w-6" />}
            </div>
            <span className="text-sm font-semibold text-[var(--color-ink)]">{file ? file.name : 'Upload CSV or Excel export'}</span>
            <span className="mt-1 text-xs text-neutral-500">Upload the file exactly as exported — no need to edit columns.</span>
            <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={(e) => handleFileSelect(e.target.files?.[0])} />
          </label>
          {busy && <p className="text-sm text-neutral-500">Reading columns…</p>}
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 rounded-lg border border-brand/20 bg-brand-soft/40 px-4 py-2.5 text-sm font-medium text-[var(--color-ink)]">
            <Wand2 className="h-4 w-4 text-brand" />
            Found {headers.length} columns. We auto-matched what we could — adjust anything below.
          </div>
          <div className="space-y-2.5">
            {INTERNAL_FIELDS.map(({ key, label, required, hint }) => (
              <div
                key={key}
                className="grid items-center gap-3 rounded-xl border border-[var(--color-line)] bg-white px-4 py-3 sm:grid-cols-[1fr_auto_1fr]"
              >
                <div>
                  <p className="text-sm font-semibold text-[var(--color-ink)]">
                    {label}
                    {required && <span className="ml-0.5 text-brand">*</span>}
                  </p>
                  <p className="text-xs leading-relaxed text-neutral-500">{hint}</p>
                </div>
                <ArrowRight className="hidden h-4 w-4 text-neutral-300 sm:block" />
                <select
                  className="crm-select"
                  value={mapping[key] || ''}
                  onChange={(e) => setMapping({ ...mapping, [key]: e.target.value })}
                >
                  <option value="">{required ? 'Select a column…' : 'Not in my file (skip)'}</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
          {!mapping.email && (
            <Alert tone="warning">
              Map the <strong>Email address</strong> column to continue — it&apos;s required for every contact.
            </Alert>
          )}
        </div>
      )}

      {step === 2 && preview && (
        <div className="space-y-4">
          <InfoPanel title="Ready to import">
            &ldquo;Merged&rdquo; means the email already existed — the new source is added to that contact without creating a
            duplicate. &ldquo;New companies&rdquo; are created automatically from unmatched domains.
          </InfoPanel>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <PreviewStat label="New contacts" value={preview.inserted} tone="success" />
            <PreviewStat label="Merged sources" value={preview.merged} tone="info" />
            <PreviewStat label="New companies" value={preview.newCompanies || 0} tone="brand" help="Created from domains" />
            <PreviewStat label="Invalid email" value={preview.invalidEmail || 0} tone="error" />
          </div>
        </div>
      )}

      <div className="flex flex-col-reverse gap-3 border-t border-[var(--color-line)] pt-5 sm:flex-row sm:justify-between">
        <button type="button" onClick={step === 0 ? onCancel : () => setStep(step - 1)} className="crm-btn-ghost">
          <ChevronLeft className="h-4 w-4" />
          {step === 0 ? 'Cancel' : 'Back'}
        </button>
        {step === 0 && (
          <button type="button" disabled={!file || busy} onClick={() => setStep(1)} className="crm-btn-primary">
            Continue to column mapping
          </button>
        )}
        {step === 1 && (
          <button type="button" disabled={busy || !mapping.email} onClick={runPreview} className="crm-btn-primary">
            {busy ? 'Generating preview…' : 'Preview import'}
          </button>
        )}
        {step === 2 && (
          <button type="button" disabled={busy} onClick={runImport} className="crm-btn-primary">
            {busy ? 'Importing contacts…' : 'Confirm import'}
          </button>
        )}
      </div>
    </div>
  );
}

function PreviewStat({ label, value, tone, help }) {
  const tones = {
    success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    info: 'border-sky-200 bg-sky-50 text-sky-800',
    brand: 'border-red-200 bg-brand-soft text-brand',
    error: 'border-red-200 bg-red-50 text-red-800',
  };
  return (
    <div className={cn('rounded-xl border p-4 text-center', tones[tone])}>
      <p className="text-2xl font-bold tabular-nums">{value}</p>
      <p className="mt-0.5 text-[13px] font-semibold">{label}</p>
      {help && <p className="mt-0.5 text-[11px] opacity-80">{help}</p>}
    </div>
  );
}
