import { useState } from 'react';
import { Modal } from '../ui/Modal.jsx';
import { Alert, Field } from '../ui/primitives.jsx';
import {
  ModalActionFooter,
  ModalDropzone,
  ModalPreviewMetrics,
  ModalSection,
  ModalStack,
} from '../ui/workspaceModalParts.jsx';
import { Check, FileSpreadsheet, Upload } from 'lucide-react';

const FIELD_LABELS = {
  firstName: 'First name',
  lastName: 'Last name',
  name: 'Full name (if single column)',
  designation: 'Job title',
  companyName: 'Company name',
  domain: 'Company domain / website',
  linkedin: 'LinkedIn URL',
  emailApollo: 'Email (Apollo)',
  emailHunter: 'Email (Hunter)',
  emailLusha: 'Email (Lusha) — Work',
  emailLusha2: 'Email (Lusha) — Work 2',
  emailPersonal: 'Personal / private email',
  email: 'Other email',
  phone: 'Phone',
};

const EMAIL_FIELDS = ['emailApollo', 'emailHunter', 'emailLusha', 'emailLusha2', 'emailPersonal', 'email'];

const FALLBACK_SOURCES = [
  { id: '', label: 'None — map vendor emails above' },
  { id: 'Apollo', label: 'Apollo' },
  { id: 'Hunter', label: 'Hunter' },
  { id: 'Lusha', label: 'Lusha' },
];

function pickMapping(suggested = {}) {
  const mapping = {};
  for (const key of Object.keys(FIELD_LABELS)) {
    if (suggested[key]) mapping[key] = suggested[key];
  }
  return mapping;
}

export default function ContactBlenderModal({ open, onClose, projectId, onImported }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [file, setFile] = useState(null);
  const [headers, setHeaders] = useState([]);
  const [mapping, setMapping] = useState({});
  const [preview, setPreview] = useState(null);
  const [fallbackSource, setFallbackSource] = useState('');

  function reset() {
    setBusy(false);
    setError('');
    setFile(null);
    setHeaders([]);
    setMapping({});
    setPreview(null);
    setFallbackSource('');
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
      const response = await fetch(`/api/admin/projects/${projectId}/ingest/preview`, {
        method: 'POST',
        credentials: 'include',
        body: form,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Preview failed');
      setHeaders(result.headers || []);
      setMapping(pickMapping(result.suggestedMapping));
      setPreview(result);
      if (result.detectedVendor && result.detectedVendor !== 'Manual') {
        setFallbackSource(result.detectedVendor);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function importContacts() {
    if (!file || !projectId || !hasEmailMapping) return;
    setBusy(true);
    setError('');
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('fieldMapping', JSON.stringify(mapping));
      form.append('vendor', fallbackSource || 'Manual');
      const response = await fetch(`/api/admin/projects/${projectId}/ingest`, {
        method: 'POST',
        credentials: 'include',
        body: form,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Import failed');
      const created = result.companiesCreated ? `, ${result.companiesCreated} new companies` : '';
      onImported?.(
        `Imported ${result.inserted} new, merged ${result.merged} existing (LinkedIn / name+domain)${created}.`,
      );
      handleClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const hasEmailMapping = EMAIL_FIELDS.some((key) => Boolean(mapping[key]));
  const canImport = Boolean(file && hasEmailMapping);

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Import contacts"
      subtitle="Upload one tool at a time. Same LinkedIn (or name + domain) merges into one person and keeps every email."
      icon={Upload}
      accent="violet"
      size="xl"
      footer={(
        <ModalActionFooter>
          <button type="button" onClick={handleClose} className="crm-btn-ghost">Cancel</button>
          <button type="button" onClick={importContacts} disabled={busy || !canImport} className="crm-btn-primary">
            <Check className="h-4 w-4" />
            {busy ? 'Importing…' : 'Import contacts'}
          </button>
        </ModalActionFooter>
      )}
    >
      <ModalStack>
        {error ? <Alert>{error}</Alert> : null}

        <div className="crm-modal-callout">
          <span className="crm-modal-callout-title">How matching works</span>
          LinkedIn match first. If LinkedIn is missing, match name + domain. New emails from Apollo / Hunter / Lusha are appended to that person — sequences blast all variants until a reply confirms the working address.
        </div>

        <ModalDropzone
          icon={FileSpreadsheet}
          busy={busy}
          accept=".csv,.xlsx,.xls,.tsv"
          fileLabel={file ? file.name : 'Drop CSV, TSV, or Excel here'}
          hint="Apollo, Hunter, or Lusha export — one file per upload."
          onSelect={handleFileSelect}
        />

        {preview ? (
          <ModalPreviewMetrics
            items={[
              { label: 'Rows detected', value: preview.rowCount ?? '—' },
              { label: 'Columns', value: headers.length },
              { label: 'Mapped fields', value: Object.values(mapping).filter(Boolean).length, tone: 'success' },
              { label: 'Ready', value: canImport ? 'Yes' : 'Map an email', tone: canImport ? 'success' : 'warning' },
            ]}
          />
        ) : null}

        {preview && headers.length > 0 ? (
          <>
            <ModalSection title="Column mapping" description="For Apollo map First + Last name (combined automatically). Map every email column you have.">
              <div className="grid gap-4 sm:grid-cols-2">
                {Object.keys(FIELD_LABELS).map((key) => (
                  <Field
                    key={key}
                    label={FIELD_LABELS[key]}
                    required={EMAIL_FIELDS.includes(key) ? !hasEmailMapping : false}
                  >
                    <select
                      className="crm-select text-xs"
                      value={mapping[key] || ''}
                      onChange={(e) => setMapping({ ...mapping, [key]: e.target.value })}
                    >
                      <option value="">
                        {EMAIL_FIELDS.includes(key) && !hasEmailMapping ? 'Select a column…' : 'Skip'}
                      </option>
                      {headers.map((header) => (
                        <option key={header} value={header}>{header}</option>
                      ))}
                    </select>
                  </Field>
                ))}
              </div>
            </ModalSection>

            <ModalSection
              title="Fallback for “Other email”"
              description="Only needed when you mapped a single generic Email column (Apollo/Hunter style) instead of vendor fields."
            >
              <Field label="Treat that column as">
                <select
                  className="crm-select text-xs max-w-xs"
                  value={fallbackSource}
                  onChange={(e) => setFallbackSource(e.target.value)}
                  disabled={!mapping.email}
                >
                  {FALLBACK_SOURCES.map((option) => (
                    <option key={option.id || 'none'} value={option.id}>{option.label}</option>
                  ))}
                </select>
              </Field>
            </ModalSection>
          </>
        ) : null}
      </ModalStack>
    </Modal>
  );
}
