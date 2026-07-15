import { useState } from 'react';
import { crmApiFetch } from '../../crmApi.js';
import { Modal } from '../ui/Modal.jsx';
import { Alert, Field } from '../ui/primitives.jsx';
import {
  ModalActionFooter,
  ModalDropzone,
  ModalPreviewMetrics,
  ModalSection,
  ModalSegmentTabs,
  ModalStack,
} from '../ui/workspaceModalParts.jsx';
import { Building2, Check, Table2, Upload } from 'lucide-react';

const FIELD_LABELS = {
  companyName: 'Company name',
  domain: 'Domain',
  city: 'City',
  country: 'Country',
  genericEmail: 'General email',
  genericPhone: 'General phone',
};

function pickMapping(suggested = {}) {
  const mapping = {};
  for (const key of Object.keys(FIELD_LABELS)) {
    if (suggested[key]) mapping[key] = suggested[key];
  }
  return mapping;
}

export default function ExhibitorImportModal({ open, onClose, projectId, onImported }) {
  const [mode, setMode] = useState('bulk');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [file, setFile] = useState(null);
  const [headers, setHeaders] = useState([]);
  const [mapping, setMapping] = useState({});
  const [preview, setPreview] = useState(null);
  const [single, setSingle] = useState({
    companyName: '',
    domain: '',
    city: '',
    country: '',
    genericEmail: '',
    genericPhone: '',
  });

  function reset() {
    setMode('bulk');
    setError('');
    setFile(null);
    setHeaders([]);
    setMapping({});
    setPreview(null);
    setSingle({
      companyName: '',
      domain: '',
      city: '',
      country: '',
      genericEmail: '',
      genericPhone: '',
    });
  }

  function handleClose() {
    reset();
    onClose?.();
  }

  async function handleFileSelect(selected) {
    setFile(selected);
    setHeaders([]);
    setMapping({});
    setPreview(null);
    if (!selected || !projectId) return;
    setBusy(true);
    setError('');
    try {
      const form = new FormData();
      form.append('file', selected);
      const response = await fetch(`/api/admin/projects/${projectId}/companies/preview`, {
        method: 'POST',
        credentials: 'include',
        body: form,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Preview failed');
      setHeaders(result.headers || []);
      setMapping(pickMapping(result.suggestedMapping));
      setPreview(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function importBulk() {
    if (!file || !projectId) return;
    setBusy(true);
    setError('');
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('fieldMapping', JSON.stringify(mapping));
      const response = await fetch(`/api/admin/projects/${projectId}/companies/upload`, {
        method: 'POST',
        credentials: 'include',
        body: form,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Import failed');
      onImported?.(`Imported ${result.created} new, linked ${result.linked} existing companies${result.contactsCreated ? `, ${result.contactsCreated} general contacts` : ''}.`);
      handleClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function importSingle(e) {
    e.preventDefault();
    if (!single.companyName.trim() || !single.domain.trim()) {
      setError('Company name and domain are required.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const result = await crmApiFetch(`/api/admin/projects/${projectId}/companies`, {
        method: 'POST',
        body: JSON.stringify({
          rows: [{ ...single, companyName: single.companyName.trim(), domain: single.domain.trim() }],
        }),
      });
      onImported?.(`Added ${result.created ? 'new' : 'existing'} company: ${single.companyName.trim()}${result.contactsCreated ? ` (+${result.contactsCreated} contacts)` : ''}.`);
      handleClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const canImportBulk = Boolean(file && mapping.companyName && mapping.domain);

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Add companies"
      subtitle="Import your target list or add a single company to this campaign."
      icon={Upload}
      accent="brand"
      size="xl"
      footer={mode === 'bulk' ? (
        <ModalActionFooter>
          <button type="button" onClick={handleClose} className="crm-btn-ghost">Cancel</button>
          <button type="button" onClick={importBulk} disabled={busy || !canImportBulk} className="crm-btn-primary">
            <Check className="h-4 w-4" />
            {busy ? 'Importing…' : 'Import list'}
          </button>
        </ModalActionFooter>
      ) : (
        <ModalActionFooter>
          <button type="button" onClick={handleClose} className="crm-btn-ghost">Cancel</button>
          <button type="submit" form="company-single-form" disabled={busy} className="crm-btn-primary">
            {busy ? 'Adding…' : 'Add company'}
          </button>
        </ModalActionFooter>
      )}
    >
      <ModalStack>
        <ModalSegmentTabs
          value={mode}
          onChange={setMode}
          options={[
            { id: 'bulk', label: 'Bulk upload', icon: Table2 },
            { id: 'single', label: 'One company', icon: Building2 },
          ]}
        />

        {error ? <Alert>{error}</Alert> : null}

        {mode === 'bulk' ? (
          <ModalStack>
            <div className="crm-modal-callout">
              <span className="crm-modal-callout-title">Bulk import</span>
              Upload a company list. Map company name and domain — general emails become People contacts named after the company.
            </div>

            <ModalDropzone
              icon={Upload}
              busy={busy}
              accept=".tsv,.csv,.xlsx,.xls"
              fileLabel={file ? file.name : 'Drop CSV, TSV, or Excel here'}
              hint="Supports Apollo exports, exhibition scrapes, and spreadsheet uploads."
              onSelect={handleFileSelect}
            />

            {preview ? (
              <ModalPreviewMetrics
                items={[
                  { label: 'Rows detected', value: preview.rowCount ?? preview.rows?.length ?? '—' },
                  { label: 'Columns', value: headers.length },
                  { label: 'Mapped fields', value: Object.values(mapping).filter(Boolean).length, tone: 'success' },
                  { label: 'Ready', value: canImportBulk ? 'Yes' : 'Map fields', tone: canImportBulk ? 'success' : 'warning' },
                ]}
              />
            ) : null}

            {preview && headers.length > 0 ? (
              <ModalSection title="Column mapping" description="Match spreadsheet columns to campaign fields.">
                <div className="grid gap-4 sm:grid-cols-2">
                  {Object.keys(FIELD_LABELS).map((key) => (
                    <Field key={key} label={FIELD_LABELS[key]} required={key === 'companyName' || key === 'domain'}>
                      <select
                        className="crm-select text-xs"
                        value={mapping[key] || ''}
                        onChange={(e) => setMapping({ ...mapping, [key]: e.target.value })}
                      >
                        <option value="">Skip</option>
                        {headers.map((header) => (
                          <option key={header} value={header}>{header}</option>
                        ))}
                      </select>
                    </Field>
                  ))}
                </div>
              </ModalSection>
            ) : null}
          </ModalStack>
        ) : (
          <form id="company-single-form" onSubmit={importSingle}>
            <ModalStack>
              <div className="crm-modal-callout">
                <span className="crm-modal-callout-title">Manual add</span>
                Add one target company when you already know the company details.
              </div>
              <ModalSection title="Company details" className="crm-modal-section--plain">
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Company name" required>
                    <input className="crm-input" value={single.companyName} onChange={(e) => setSingle({ ...single, companyName: e.target.value })} />
                  </Field>
                  <Field label="Domain" required>
                    <input className="crm-input" value={single.domain} onChange={(e) => setSingle({ ...single, domain: e.target.value })} placeholder="example.com" />
                  </Field>
                  <Field label="City">
                    <input className="crm-input" value={single.city} onChange={(e) => setSingle({ ...single, city: e.target.value })} />
                  </Field>
                  <Field label="Country">
                    <input className="crm-input" value={single.country} onChange={(e) => setSingle({ ...single, country: e.target.value })} />
                  </Field>
                  <Field label="General email">
                    <input
                      className="crm-input"
                      value={single.genericEmail}
                      onChange={(e) => setSingle({ ...single, genericEmail: e.target.value })}
                      placeholder="info@example.com"
                    />
                  </Field>
                  <Field label="General phone">
                    <input
                      className="crm-input"
                      value={single.genericPhone}
                      onChange={(e) => setSingle({ ...single, genericPhone: e.target.value })}
                    />
                  </Field>
                </div>
              </ModalSection>
            </ModalStack>
          </form>
        )}
      </ModalStack>
    </Modal>
  );
}
