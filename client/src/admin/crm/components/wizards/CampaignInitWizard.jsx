import { useState } from 'react';
import { crmApiFetch, previewCompaniesFile, uploadCompaniesFile } from '../../crmApi.js';
import { Modal } from '../ui/Modal.jsx';
import {
  ModalActionFooter,
  ModalDropzone,
  ModalFieldList,
  ModalSection,
  ModalStack,
  ModalStepRail,
} from '../ui/workspaceModalParts.jsx';
import {
  Building2,
  ChevronLeft,
  Download,
  CheckCircle2,
  ArrowRight,
  Wand2,
  Megaphone,
  FileSpreadsheet,
} from 'lucide-react';
import { Alert, Field, InfoPanel } from '../ui/primitives.jsx';

const STEPS = ['Campaign details', 'Target companies', 'Ready'];
const STEP_META = [
  { description: 'Name the exhibition or outreach initiative.' },
  { description: 'Upload the companies you want to win (optional).' },
  { description: 'Open the workspace and import contacts.' },
];

const MILESTONE_PRESETS = ['Gitex Global 2026', 'Arab Health 2026', 'Gulfood 2026', 'Downtown Design 2026', 'ADIPEC 2026'];

const COMPANY_FIELD_META = [
  { key: 'companyName', label: 'Company name', required: true, hint: 'The company / organization name.' },
  { key: 'domain', label: 'Website or domain', required: true, hint: 'e.g. alfuttaim.com — used to match contacts to this company.' },
  { key: 'city', label: 'City', required: false, hint: 'Optional — HQ or primary city.' },
  { key: 'country', label: 'Country', required: false, hint: 'Optional — country of the company.' },
  { key: 'genericEmail', label: 'General email', required: false, hint: 'Optional — creates a People contact named after the company.' },
  { key: 'genericPhone', label: 'General phone', required: false, hint: 'Optional — stored on the company and attached to the general-email contact.' },
];

function downloadSampleCsv() {
  const header = 'companyName,domain,city,country,genericEmail,genericPhone';
  const rows = [
    'Al-Futtaim Group,alfuttaim.com,Dubai,UAE,info@alfuttaim.com,+97140000000',
    'Emaar Properties,emaar.com,Dubai,UAE,info@emaar.com,',
    'Emirates NBD,emiratesnbd.com,Dubai,UAE,,',
  ];
  const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'egs-target-companies-template.csv';
  link.click();
  URL.revokeObjectURL(url);
}

export default function CampaignInitWizard({ open, onClose, onComplete }) {
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [projectId, setProjectId] = useState(null);
  const [uploadResult, setUploadResult] = useState(null);
  const [skippedUpload, setSkippedUpload] = useState(false);
  const [form, setForm] = useState({
    projectName: '',
    milestone: '',
  });
  const [file, setFile] = useState(null);
  const [headers, setHeaders] = useState([]);
  const [sampleRows, setSampleRows] = useState([]);
  const [rowCount, setRowCount] = useState(0);
  const [mapping, setMapping] = useState({});

  const isSuccess = step === 2;
  const mappingReady = Boolean(mapping.companyName && mapping.domain);
  const stepRailCurrent = isSuccess ? 3 : step + 1;

  function handleClose() {
    setStep(0);
    setBusy(false);
    setError('');
    setProjectId(null);
    setUploadResult(null);
    setSkippedUpload(false);
    setForm({ projectName: '', milestone: '' });
    setFile(null);
    setHeaders([]);
    setSampleRows([]);
    setRowCount(0);
    setMapping({});
    onClose?.();
  }

  async function createProject() {
    setBusy(true);
    setError('');
    try {
      const project = await crmApiFetch('/api/admin/projects', {
        method: 'POST',
        body: JSON.stringify({
          projectName: form.projectName.trim(),
          milestone: form.milestone.trim(),
        }),
      });
      setProjectId(project._id);
      setStep(1);
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
      const suggested = p.suggestedMapping || {};
      const cleaned = {};
      for (const { key } of COMPANY_FIELD_META) {
        if (suggested[key]) cleaned[key] = suggested[key];
      }
      setMapping(cleaned);
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
      setStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function skipUpload() {
    setSkippedUpload(true);
    setUploadResult(null);
    setStep(2);
  }

  const footer = isSuccess ? (
    <ModalActionFooter>
      <button type="button" onClick={() => projectId && onComplete?.(projectId)} className="crm-btn-primary min-w-[220px]">
        <Building2 className="h-4 w-4" />
        Open campaign workspace
      </button>
    </ModalActionFooter>
  ) : (
    <ModalActionFooter className="crm-modal-action-footer--split">
      <button type="button" onClick={step === 0 ? handleClose : () => setStep(step - 1)} className="crm-btn-ghost">
        <ChevronLeft className="h-4 w-4" />
        {step === 0 ? 'Cancel' : 'Back'}
      </button>
      <div className="flex flex-wrap items-center gap-3">
      {step === 1 && (
        <button type="button" onClick={skipUpload} className="crm-btn-secondary">
          Skip — add targets later
        </button>
      )}
      {step === 0 && (
        <button
          type="button"
          disabled={busy || form.projectName.trim().length < 3}
          onClick={createProject}
          className="crm-btn-primary"
        >
          {busy ? 'Creating campaign…' : 'Create & continue'}
        </button>
      )}
      {step === 1 && (
        <button type="button" disabled={busy || !file || !mappingReady} onClick={uploadCompanies} className="crm-btn-primary">
          {busy ? 'Importing…' : 'Import & finish'}
        </button>
      )}
      </div>
    </ModalActionFooter>
  );

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Create campaign"
      subtitle="Name your campaign, upload target companies, then import contacts in the workspace."
      icon={Megaphone}
      accent="brand"
      size="xl"
      footer={footer}
    >
      <ModalStack>
        {!isSuccess && (
          <ModalStepRail
            current={stepRailCurrent}
            steps={STEPS.map((label) => ({ label }))}
          />
        )}

        {error ? <Alert>{error}</Alert> : null}

        {step === 0 && (
          <ModalStack className="crm-modal-stack--tight">
            <InfoPanel title="What is a campaign?">
              A campaign groups one exhibition or outreach initiative. Upload target companies here, then import contacts
              (POCs) from Apollo, Hunter, or Lusha inside the campaign workspace.
            </InfoPanel>

            <ModalSection title="Campaign identity" className="crm-modal-section--plain">
              <div className="grid gap-5">
                <Field label="Campaign name" required hint="Use a name your team recognizes — usually the event plus year.">
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
                  <div className="mt-3 flex flex-wrap gap-2">
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
            </ModalSection>
          </ModalStack>
        )}

        {step === 1 && (
          <ModalStack>
            <InfoPanel title="Upload your target company list">
              These are companies EGS is pursuing at this event — not individual contacts yet. Upload any CSV/Excel; you map
              its columns next. You can also skip and add them later.
            </InfoPanel>

            <div className="flex flex-wrap items-center gap-3">
              <button type="button" onClick={downloadSampleCsv} className="crm-btn-secondary">
                <Download className="h-4 w-4" />
                Download CSV template
              </button>
            </div>

            <ModalDropzone
              icon={FileSpreadsheet}
              busy={busy && !headers.length && Boolean(file)}
              accept=".csv,.xlsx,.xls"
              fileLabel={file ? file.name : 'Drop CSV or Excel here'}
              hint="One row per target company — .csv, .xlsx, or .xls"
              onSelect={handleFileSelect}
            />

            {busy && headers.length === 0 && file ? (
              <p className="text-sm text-neutral-500">Reading columns from “{file.name}”…</p>
            ) : null}

            {headers.length > 0 && (
              <ModalStack>
                <div className="crm-modal-callout flex items-center gap-2.5">
                  <Wand2 className="h-4 w-4 shrink-0 text-brand" />
                  <span>Found {headers.length} columns and {rowCount} rows. Match them below.</span>
                </div>

                <ModalSection title="Column mapping" description="Map your spreadsheet columns to campaign fields.">
                  <ModalFieldList>
                    {COMPANY_FIELD_META.map((field) => (
                      <div key={field.key} className="grid items-center gap-4 rounded-xl border border-[var(--color-line)] bg-white px-4 py-4 sm:grid-cols-[1fr_auto_1fr]">
                        <div>
                          <p className="text-sm font-semibold text-[var(--color-ink)]">
                            {field.label}
                            {field.required && <span className="ml-0.5 text-brand">*</span>}
                          </p>
                          <p className="mt-0.5 text-xs leading-relaxed text-neutral-500">{field.hint}</p>
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
                  </ModalFieldList>
                </ModalSection>

                {!mappingReady && (
                  <Alert tone="warning">
                    Map both <strong>Company name</strong> and <strong>Website / domain</strong> to continue.
                  </Alert>
                )}

                {sampleRows.length > 0 && (
                  <ModalSection title={`Preview — first ${sampleRows.length} rows`}>
                    <div className="crm-card -mx-1 overflow-hidden">
                      <div className="crm-scroll overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="crm-table-head">
                              {headers.map((header) => (
                                <th key={header} className="whitespace-nowrap px-4 py-3 text-left">
                                  {header}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {sampleRows.map((row, i) => (
                              <tr key={i} className="crm-table-row">
                                {headers.map((header, ci) => (
                                  <td key={ci} className="whitespace-nowrap px-4 py-3 text-neutral-600">
                                    {row[ci]}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </ModalSection>
                )}
              </ModalStack>
            )}
          </ModalStack>
        )}

        {step === 2 && (
          <ModalStack className="items-center py-2 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle2 className="h-9 w-9" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-[var(--color-ink)]">Campaign created</h3>
              <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-neutral-600">
                <strong>{form.projectName}</strong> is ready.{' '}
                {skippedUpload
                  ? 'Add target companies later, or jump straight to importing contacts.'
                  : `Imported ${uploadResult?.created ?? 0} new companies and linked ${uploadResult?.linked ?? 0} existing (${uploadResult?.total ?? 0} total)${uploadResult?.contactsCreated ? `, ${uploadResult.contactsCreated} general contacts` : ''}.`}
              </p>
            </div>

            {!skippedUpload && uploadResult?.errors?.length > 0 && (
              <Alert tone="warning">{uploadResult.errors.length} row(s) skipped — check the company name and domain columns.</Alert>
            )}

            <ModalSection title="Recommended next steps" className="w-full max-w-md text-left">
              <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-neutral-600">
                <li>Open the campaign workspace</li>
                <li>Use <strong>Import contacts</strong> to upload Apollo / Hunter / Lusha exports</li>
                <li>Go to <strong>Email Sequences</strong> to build a drip and enroll leads</li>
              </ol>
            </ModalSection>
          </ModalStack>
        )}
      </ModalStack>
    </Modal>
  );
}
