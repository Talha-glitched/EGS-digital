import { useMemo, useState } from 'react';
import { Modal } from '../ui/Modal.jsx';
import { Alert } from '../ui/primitives.jsx';
import {
  ModalActionFooter,
  ModalDropzone,
  ModalPreviewMetrics,
  ModalStack,
  ModalStepRail,
} from '../ui/workspaceModalParts.jsx';
import { FileSpreadsheet, Sparkles } from 'lucide-react';

const VENDOR_TAGS = ['Apollo', 'Hunter', 'Lusha'];

export default function ContactBlenderModal({ open, onClose, projectId, onImported }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [files, setFiles] = useState([]);
  const [preview, setPreview] = useState(null);

  const step = useMemo(() => {
    if (!files.length) return 1;
    if (!preview) return 2;
    return 3;
  }, [files.length, preview]);

  function reset() {
    setBusy(false);
    setError('');
    setFiles([]);
    setPreview(null);
  }

  function handleClose() {
    reset();
    onClose?.();
  }

  async function handleFilesSelect(selected) {
    if (!selected?.length || !projectId) return;
    const fileList = Array.from(selected);
    setFiles(fileList);
    setPreview(null);
    setBusy(true);
    setError('');
    try {
      const form = new FormData();
      fileList.forEach((file) => form.append('files', file));
      const response = await fetch(`/api/admin/projects/${projectId}/ingest/preview`, {
        method: 'POST',
        credentials: 'include',
        body: form,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Preview failed');
      setPreview(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function runBlender() {
    if (!files.length || !projectId) return;
    setBusy(true);
    setError('');
    try {
      const form = new FormData();
      files.forEach((file) => form.append('files', file));
      const response = await fetch(`/api/admin/projects/${projectId}/ingest`, {
        method: 'POST',
        credentials: 'include',
        body: form,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Blender failed');
      const created = result.companiesCreated ? `, ${result.companiesCreated} new companies` : '';
      onImported?.(`Ingested ${result.inserted} contacts, merged ${result.merged} duplicates${created}.`);
      handleClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Contact blender"
      subtitle="Merge Apollo, Hunter, and Lusha exports into one deduplicated contact database."
      icon={Sparkles}
      accent="violet"
      size="lg"
      footer={(
        <ModalActionFooter>
          <button type="button" onClick={handleClose} className="crm-btn-ghost">Cancel</button>
          <button type="button" onClick={runBlender} disabled={busy || !files.length || !preview} className="crm-btn-primary">
            <Sparkles className="h-4 w-4" />
            {busy ? 'Running blender…' : 'Run blender'}
          </button>
        </ModalActionFooter>
      )}
    >
      <ModalStack>
        <ModalStepRail
          current={step}
          steps={[
            { label: 'Upload' },
            { label: 'Preview' },
            { label: 'Merge' },
          ]}
        />

        {error ? <Alert>{error}</Alert> : null}

        <div className="crm-modal-callout">
          <span className="crm-modal-callout-title">How it works</span>
          Drop one or more contact CSV exports. The blender normalizes emails, matches domains to target companies, and merges duplicate POCs.
          <div className="mt-3 flex flex-wrap gap-2">
            {VENDOR_TAGS.map((vendor) => (
              <span
                key={vendor}
                className="inline-flex rounded-full border border-violet-200 bg-white/80 px-2.5 py-1 text-[10px] font-bold text-violet-700"
              >
                {vendor}
              </span>
            ))}
          </div>
        </div>

        <ModalDropzone
          icon={FileSpreadsheet}
          busy={busy}
          multiple
          accept=".csv,.xlsx"
          fileLabel={files.length ? `${files.length} file(s) selected` : 'Select discovery CSV exports'}
          hint="You can upload multiple vendor files at once — duplicates merge automatically."
          onSelect={handleFilesSelect}
        />

        {preview ? (
          <ModalPreviewMetrics
            items={[
              { label: 'New POCs', value: preview.inserted, tone: 'success' },
              { label: 'Merged', value: preview.merged },
              { label: 'New companies', value: preview.newCompanies || 0 },
              { label: 'Skipped emails', value: preview.invalidEmail || 0, tone: preview.invalidEmail ? 'warning' : undefined },
            ]}
          />
        ) : files.length > 0 && !busy ? (
          <p className="text-center text-xs text-neutral-500">Preview failed or still processing — check your file format.</p>
        ) : null}
      </ModalStack>
    </Modal>
  );
}
