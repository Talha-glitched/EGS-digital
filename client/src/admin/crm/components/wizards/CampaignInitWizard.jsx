import { useState } from 'react';
import { crmApiFetch, previewCompaniesFile, uploadCompaniesFile } from '../../crmApi.js';
import { ChevronLeft, Upload, Download, CheckCircle2, Building2, ArrowRight, Wand2, FileSpreadsheet } from 'lucide-react';
import { Alert, Field, StepIndicator, InfoPanel } from '../ui/primitives.jsx';

const STEPS = ['Campaign details', 'Budget & ROI', 'Target companies'];
const STEP_META = [
  { description: 'Name the exhibition or outreach initiative.' },
  { description: 'Fixed costs power the ROI calculation.' },
  { description: 'Upload the companies you want to win (optional).' },
];

const MILESTONE_PRESETS = ['Gitex Global 2026', 'Arab Health 2026', 'Gulfood 2026', 'Downtown Design 2026', 'ADIPEC 2026'];

const COMPANY_FIELD_META = [
  { key: 'companyName', label: 'Company name', required: true, hint: 'The account / organization name.' },
  { key: 'domain', label: 'Website or domain', required: true, hint: 'e.g. alfuttaim.com — used to match contacts to this account.' },
  { key: 'industry', label: 'Industry', required: false, hint: 'Optional — sector or vertical.' },
  { key: 'boothNumber', label: 'Booth / stand', required: false, hint: 'Optional — their stand or hall at the event.' },
];

function downloadSampleCsv() {
  const header = 'companyName,domain,industry,boothNumber';
  const rows = [
    'Al-Futtaim Group,alfuttaim.com,Retail,H3-A14',
    'Emaar Properties,emaar.com,Real Estate,H1-B02',
    'Emirates NBD,emiratesnbd.com,Banking,',
  ];
  const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'egs-target-companies-template.csv';
  link.click();
  URL.revokeObjectURL(url);
}

export default function CampaignInitWizard({ onComplete, onCancel }) {
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [projectId, setProjectId] = useState(null);
  const [uploadResult, setUploadResult] = useState(null);
  const [skippedUpload, setSkippedUpload] = useState(false);
  const [form, setForm] = useState({
    projectName: '',
    milestone: '',
    allocatedToolBudget: '',
    domainFixedCosts: '',
    laborCosts: '',
  });
  const [file, setFile] = useState(null);
  const [headers, setHeaders] = useState([]);
  const [sampleRows, setSampleRows] = useState([]);
  const [rowCount, setRowCount] = useState(0);
  const [mapping, setMapping] = useState({});

  const isSuccess = step === 3;
  const mappingReady = Boolean(mapping.companyName && mapping.domain);

  async function createProject() {
    setBusy(true);
    setError('');
    try {
      const project = await crmApiFetch('/api/admin/projects', {
        method: 'POST',
        body: JSON.stringify({
          projectName: form.projectName.trim(),
          milestone: form.milestone.trim(),
          allocatedToolBudget: Number(form.allocatedToolBudget) || 0,
          domainFixedCosts: Number(form.domainFixedCosts) || 0,
          laborCosts: Number(form.laborCosts) || 0,
        }),
      });
      setProjectId(project._id);
      setStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleFileSelect(selected) {
    setFile(selected);
    setHeaders([]);
    setMapping({});
    setSampleRows([]);
    setRowCount(0);
    if (!selected || !projectId) return;
    setBusy(true);
    setError('');
    try {
      const p = await previewCompaniesFile(projectId, selected);
      setHeaders(p.headers || []);
      setMapping(p.suggestedMapping || {});
      setSampleRows(p.sample || []);
      setRowCount(p.rowCount || 0);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function updateMapping(field, header) {
    setMapping((prev) => {
      const next = { ...prev };
      if (header) next[field] = header;
      else delete next[field];
      return next;
    });
  }

  async function uploadCompanies() {
    if (!file || !projectId || !mappingReady) return;
    setBusy(true);
    setError('');
    try {
      const result = await uploadCompaniesFile(projectId, file, mapping);
      setUploadResult(result);
      setSkippedUpload(false);
      setStep(3);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function skipUpload() {
    setSkippedUpload(true);
    setUploadResult(null);
    setStep(3);
  }

  return (
    <div className="space-y-6">
      {!isSuccess && (
        <>
          <StepIndicator steps={STEPS} current={step} meta={STEP_META} />
          {error && <Alert>{error}</Alert>}
        </>
      )}

      {step === 0 && (
        <div className="space-y-5">
          <InfoPanel title="What is a project?">
            A project groups one exhibition or outreach initiative. Upload target companies here, then import contacts
            (POCs) from Apollo, Hunter, or Lusha inside the project workspace.
          </InfoPanel>
          <Field label="Project name" required hint="Use a name your team recognizes — usually the event plus year.">
            <input
              className="crm-input"
              value={form.projectName}
              onChange={(e) => setForm({ ...form, projectName: e.target.value })}
              placeholder="e.g. Gitex 2026 — Enterprise Stand Outreach"
            />
          </Field>
          <Field label="Commercial milestone" hint="The trade show, season, or business moment this supports.">
            <input
              className="crm-input"
              value={form.milestone}
              onChange={(e) => setForm({ ...form, milestone: e.target.value })}
              placeholder="e.g. Arab Health 2026"
            />
            <div className="mt-2 flex flex-wrap gap-2">
              {MILESTONE_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setForm({ ...form, milestone: preset })}
                  className="rounded-full border border-[var(--color-line-strong)] bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 transition hover:border-brand/30 hover:bg-brand-soft"
                >
                  {preset}
                </button>
              ))}
            </div>
          </Field>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-5">
          <InfoPanel title="Why capture budget now?">
            These feed the ROI dashboard: <strong>ROI = (Revenue won − Total cost) ÷ Total cost</strong>. AI email costs
            are added automatically as sequences run.
          </InfoPanel>
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Tool subscriptions (AED)" hint="Share of Apollo/Hunter/Lusha for this campaign.">
              <input type="number" min="0" className="crm-input" value={form.allocatedToolBudget} onChange={(e) => setForm({ ...form, allocatedToolBudget: e.target.value })} placeholder="0" />
            </Field>
            <Field label="Domains & inboxes (AED)" hint="Outbound domains, DNS, or mailbox setup.">
              <input type="number" min="0" className="crm-input" value={form.domainFixedCosts} onChange={(e) => setForm({ ...form, domainFixedCosts: e.target.value })} placeholder="0" />
            </Field>
            <Field label="Team labor (AED)" hint="Staff hours or agency fees.">
              <input type="number" min="0" className="crm-input" value={form.laborCosts} onChange={(e) => setForm({ ...form, laborCosts: e.target.value })} placeholder="0" />
            </Field>
          </div>
          <p className="text-sm text-neutral-500">
            You can update these later. Leave at 0 if unknown — ROI still tracks AI spend and logged deals.
          </p>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-5">
          <InfoPanel title="Upload your target account list">
            These are companies EGS is pursuing at this event — not individual contacts yet. Upload any CSV/Excel; you map
            its columns next, so headers don&apos;t need to match exactly. You can also skip and add them later.
          </InfoPanel>

          <button type="button" onClick={downloadSampleCsv} className="crm-btn-secondary">
            <Download className="h-4 w-4" />
            Download CSV template
          </button>

          <label className="flex cursor-pointer flex-col items-center rounded-xl border-2 border-dashed border-[var(--color-line-strong)] bg-neutral-50/60 px-6 py-12 transition hover:border-brand/40 hover:bg-brand-soft/20">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white text-neutral-400 shadow-sm">
              {file ? <FileSpreadsheet className="h-6 w-6 text-brand" /> : <Upload className="h-6 w-6" />}
            </div>
            <span className="text-sm font-semibold text-[var(--color-ink)]">{file ? file.name : 'Click to upload CSV or Excel'}</span>
            <span className="mt-1 text-xs text-neutral-500">.csv, .xlsx, or .xls — one row per target company</span>
            <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={(e) => handleFileSelect(e.target.files?.[0] || null)} />
          </label>

          {busy && headers.length === 0 && file && <p className="text-sm text-neutral-500">Reading columns from “{file.name}”…</p>}

          {headers.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 rounded-lg border border-brand/20 bg-brand-soft/40 px-4 py-2.5 text-sm font-medium text-[var(--color-ink)]">
                <Wand2 className="h-4 w-4 text-brand" />
                Found {headers.length} columns and {rowCount} rows. Match them below.
              </div>

              <div className="space-y-2.5">
                {COMPANY_FIELD_META.map((field) => (
                  <div key={field.key} className="grid items-center gap-3 rounded-xl border border-[var(--color-line)] bg-white px-4 py-3 sm:grid-cols-[1fr_auto_1fr]">
                    <div>
                      <p className="text-sm font-semibold text-[var(--color-ink)]">
                        {field.label}
                        {field.required && <span className="ml-0.5 text-brand">*</span>}
                      </p>
                      <p className="text-xs leading-relaxed text-neutral-500">{field.hint}</p>
                    </div>
                    <ArrowRight className="hidden h-4 w-4 text-neutral-300 sm:block" />
                    <select className="crm-select" value={mapping[field.key] || ''} onChange={(e) => updateMapping(field.key, e.target.value)}>
                      <option value="">{field.required ? 'Select a column…' : 'Not in my file (skip)'}</option>
                      {headers.map((header) => (
                        <option key={header} value={header}>
                          {header}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              {!mappingReady && (
                <Alert tone="warning">
                  Map both <strong>Company name</strong> and <strong>Website / domain</strong> to continue.
                </Alert>
              )}

              {sampleRows.length > 0 && (
                <div className="crm-card overflow-hidden">
                  <div className="border-b border-[var(--color-line)] bg-neutral-50/70 px-4 py-2.5">
                    <p className="text-xs font-semibold text-[var(--color-ink)]">Preview — first {sampleRows.length} rows</p>
                  </div>
                  <div className="crm-scroll overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="crm-table-head">
                          {headers.map((header) => (
                            <th key={header} className="whitespace-nowrap px-4 py-2.5 text-left">
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {sampleRows.map((row, i) => (
                          <tr key={i} className="crm-table-row">
                            {headers.map((header, ci) => (
                              <td key={ci} className="whitespace-nowrap px-4 py-2.5 text-neutral-600">
                                {row[ci]}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {step === 3 && (
        <div className="space-y-5 py-4 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-[var(--color-ink)]">Project created</h3>
            <p className="mx-auto mt-1.5 max-w-lg text-sm leading-relaxed text-neutral-600">
              <strong>{form.projectName}</strong> is ready.{' '}
              {skippedUpload
                ? 'Add target companies later, or jump straight to importing contacts.'
                : `Imported ${uploadResult?.created ?? 0} new companies and linked ${uploadResult?.linked ?? 0} existing accounts (${uploadResult?.total ?? 0} total targets).`}
            </p>
          </div>

          {!skippedUpload && uploadResult?.errors?.length > 0 && (
            <Alert tone="warning">{uploadResult.errors.length} row(s) skipped — check the company name and domain columns.</Alert>
          )}

          <div className="mx-auto max-w-md rounded-xl border border-[var(--color-line)] bg-neutral-50/60 p-5 text-left">
            <p className="text-sm font-semibold text-[var(--color-ink)]">Recommended next steps</p>
            <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-neutral-600">
              <li>Open the project workspace</li>
              <li>Go to <strong>Import contacts</strong> and upload Apollo / Hunter / Lusha exports</li>
              <li>Build an email <strong>sequence</strong> and enroll leads</li>
            </ol>
          </div>
        </div>
      )}

      {!isSuccess ? (
        <div className="flex flex-col-reverse gap-3 border-t border-[var(--color-line)] pt-5 sm:flex-row sm:items-center sm:justify-between">
          <button type="button" onClick={step === 0 ? onCancel : () => setStep(step - 1)} className="crm-btn-ghost">
            <ChevronLeft className="h-4 w-4" />
            {step === 0 ? 'Cancel' : 'Back'}
          </button>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {step === 2 && (
              <button type="button" onClick={skipUpload} className="crm-btn-secondary">
                Skip — add targets later
              </button>
            )}
            {step < 2 && (
              <button
                type="button"
                disabled={busy || (step === 0 && form.projectName.trim().length < 3)}
                onClick={() => (step === 1 ? createProject() : setStep(step + 1))}
                className="crm-btn-primary"
              >
                {step === 1 ? (busy ? 'Creating project…' : 'Save budget & continue') : 'Continue'}
              </button>
            )}
            {step === 2 && (
              <button type="button" disabled={busy || !file || !mappingReady} onClick={uploadCompanies} className="crm-btn-primary">
                {busy ? 'Importing…' : 'Import & finish'}
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="flex justify-center border-t border-[var(--color-line)] pt-5">
          <button type="button" onClick={() => projectId && onComplete?.(projectId)} className="crm-btn-primary min-w-[220px]">
            <Building2 className="h-4 w-4" />
            Open project workspace
          </button>
        </div>
      )}
    </div>
  );
}
