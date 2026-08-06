import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Clock3,
  FileText,
  History,
  Loader2,
  MailSearch,
  Paperclip,
  Pencil,
  Pin,
  Plus,
  Save,
} from 'lucide-react';
import { crmApiFetch } from '../../crmApi.js';
import { Alert, Badge, EmptyState, LoadingState, cn } from '../ui/primitives.jsx';
import CommunicationSourceDrawer from '../communications/CommunicationSourceDrawer.jsx';

const TYPE_LABELS = {
  brief: 'Brief',
  requirement: 'Requirement',
  update: 'Update',
  client_comment: 'Client comment',
  decision: 'Decision',
  approval: 'Approval',
  issue: 'Issue',
  site_update: 'Site update',
  production_update: 'Production update',
  installation_update: 'Installation update',
  photo: 'Photo',
  resolution: 'Resolution',
  learning: 'Learning',
};

const TYPE_TONES = {
  approval: 'success',
  decision: 'info',
  issue: 'warning',
  resolution: 'success',
  requirement: 'info',
  brief: 'info',
  learning: 'neutral',
};

function formatWhen(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-AE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatBytes(value) {
  const bytes = Number(value) || 0;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function AttachmentList({ attachments = [] }) {
  if (!attachments.length) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {attachments.map((file) => (
        <a
          key={file.id || file.url}
          href={file.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex max-w-full items-center gap-2 rounded-lg border border-neutral-200 bg-white px-2.5 py-2 text-[11px] font-medium text-neutral-700 hover:border-brand/40 hover:text-brand"
          title={file.checksumSha256 ? `SHA-256: ${file.checksumSha256}` : file.fileName}
        >
          <Paperclip className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{file.fileName}</span>
          {file.sizeBytes ? <span className="shrink-0 text-neutral-400">{formatBytes(file.sizeBytes)}</span> : null}
        </a>
      ))}
    </div>
  );
}

export default function JobMemoryPanel({ ongoingJobId, active = true, onChanged }) {
  const [data, setData] = useState({ items: [], types: Object.keys(TYPE_LABELS) });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [form, setForm] = useState({ type: 'update', content: '', pinned: false });
  const [files, setFiles] = useState([]);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [editingId, setEditingId] = useState('');
  const [editForm, setEditForm] = useState({ type: 'update', content: '', pinned: false, changeReason: '' });
  const [editFiles, setEditFiles] = useState([]);
  const [versionsByNote, setVersionsByNote] = useState({});
  const [openVersions, setOpenVersions] = useState('');
  const [communicationSource, setCommunicationSource] = useState(null);
  const composerRef = useRef(null);

  const load = useCallback(async () => {
    if (!ongoingJobId) return;
    setError('');
    try {
      setData(await crmApiFetch(`/api/admin/sales/ongoing-jobs/${encodeURIComponent(ongoingJobId)}/memory`));
    } catch (err) {
      setError(err.message || 'Failed to load Job Memory.');
    } finally {
      setLoading(false);
    }
  }, [ongoingJobId]);

  useEffect(() => {
    if (!active || !ongoingJobId) return;
    setLoading(true);
    load();
  }, [active, ongoingJobId, load]);

  const visibleItems = useMemo(
    () => (filter === 'all' ? data.items : data.items.filter((item) => item.type === filter)),
    [data.items, filter],
  );

  async function submitNew(event) {
    event.preventDefault();
    if (!form.content.trim() && !files.length) return;
    setSaving(true);
    setError('');
    try {
      const body = new FormData();
      body.append('type', form.type);
      body.append('content', form.content);
      body.append('pinned', String(form.pinned));
      files.forEach((file) => body.append('files', file));
      await crmApiFetch(`/api/admin/sales/ongoing-jobs/${encodeURIComponent(ongoingJobId)}/memory`, {
        method: 'POST',
        body,
      });
      setForm({ type: 'update', content: '', pinned: false });
      setFiles([]);
      setFileInputKey((value) => value + 1);
      await load();
      onChanged?.();
    } catch (err) {
      setError(err.message || 'Failed to add Job Memory entry.');
    } finally {
      setSaving(false);
    }
  }

  function beginEdit(item) {
    setEditingId(item.id);
    setEditForm({
      type: item.type,
      content: item.content,
      pinned: item.pinned,
      changeReason: '',
    });
    setEditFiles([]);
  }

  async function saveRevision(event) {
    event.preventDefault();
    if (!editingId || (!editForm.content.trim() && !editFiles.length)) return;
    setSaving(true);
    setError('');
    try {
      const body = new FormData();
      body.append('type', editForm.type);
      body.append('content', editForm.content);
      body.append('pinned', String(editForm.pinned));
      body.append('changeReason', editForm.changeReason);
      editFiles.forEach((file) => body.append('files', file));
      await crmApiFetch(
        `/api/admin/sales/ongoing-jobs/${encodeURIComponent(ongoingJobId)}/memory/${encodeURIComponent(editingId)}`,
        { method: 'PATCH', body },
      );
      setEditingId('');
      setEditFiles([]);
      setVersionsByNote((current) => ({ ...current, [editingId]: undefined }));
      await load();
      onChanged?.();
    } catch (err) {
      setError(err.message || 'Failed to save note revision.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleVersions(noteId) {
    if (openVersions === noteId) {
      setOpenVersions('');
      return;
    }
    setOpenVersions(noteId);
    if (versionsByNote[noteId]) return;
    try {
      const result = await crmApiFetch(
        `/api/admin/sales/ongoing-jobs/${encodeURIComponent(ongoingJobId)}/memory/${encodeURIComponent(noteId)}/versions`,
      );
      setVersionsByNote((current) => ({ ...current, [noteId]: result.items || [] }));
    } catch (err) {
      setError(err.message || 'Failed to load version history.');
    }
  }

  if (loading) return <LoadingState label="Loading Job Memory…" />;

  return (
    <div className="space-y-5">
      {error && <Alert>{error}</Alert>}

      <form ref={composerRef} onSubmit={submitNew} className="rounded-xl border border-brand/20 bg-brand-soft/35 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-neutral-900">Add to Job Memory</p>
            <p className="mt-0.5 text-[11px] text-neutral-500">Record the requirement, change, issue, evidence, or lesson where the work lives.</p>
          </div>
          <label className="inline-flex items-center gap-2 text-[11px] font-medium text-neutral-600">
            <input
              type="checkbox"
              checked={form.pinned}
              onChange={(event) => setForm((current) => ({ ...current, pinned: event.target.checked }))}
            />
            Pin as important
          </label>
        </div>
        <div className="grid gap-2 sm:grid-cols-[170px_1fr]">
          <select
            className="crm-select text-xs"
            value={form.type}
            onChange={(event) => setForm((current) => ({ ...current, type: event.target.value }))}
            aria-label="Job Memory entry type"
          >
            {(data.types || Object.keys(TYPE_LABELS)).map((type) => (
              <option key={type} value={type}>{TYPE_LABELS[type] || type}</option>
            ))}
          </select>
          <textarea
            className="crm-input min-h-22 resize-y text-xs"
            value={form.content}
            onChange={(event) => setForm((current) => ({ ...current, content: event.target.value }))}
            placeholder="What changed, what was agreed, what happened, or what should be remembered?"
          />
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <label className="crm-btn-secondary cursor-pointer text-xs">
            <Paperclip className="h-3.5 w-3.5" />
            Attach files
            <input
              key={fileInputKey}
              type="file"
              multiple
              className="sr-only"
              onChange={(event) => setFiles(Array.from(event.target.files || []))}
            />
          </label>
          <div className="flex min-w-0 items-center gap-3">
            {files.length > 0 && <span className="truncate text-[11px] text-neutral-500">{files.length} file{files.length === 1 ? '' : 's'} selected</span>}
            <button type="submit" disabled={saving || (!form.content.trim() && !files.length)} className="crm-btn-primary text-xs">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              Add entry
            </button>
          </div>
        </div>
      </form>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-neutral-500" />
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-600">History</p>
          <Badge tone="neutral">{data.items.length}</Badge>
        </div>
        <select className="crm-select max-w-48 text-xs" value={filter} onChange={(event) => setFilter(event.target.value)}>
          <option value="all">All entry types</option>
          {(data.types || Object.keys(TYPE_LABELS)).map((type) => (
            <option key={type} value={type}>{TYPE_LABELS[type] || type}</option>
          ))}
        </select>
      </div>

      {!visibleItems.length ? (
        <EmptyState
          icon={FileText}
          title={data.items.length ? 'No entries match this filter' : 'No Job Memory entries yet'}
          description="Add the first brief, requirement, update, issue, file, photo, or lesson for this Job."
        />
      ) : (
        <div className="space-y-3">
          {visibleItems.map((item) => {
            const editing = editingId === item.id;
            const versionsOpen = openVersions === item.id;
            const versions = versionsByNote[item.id];
            return (
              <article key={item.id} className={cn('rounded-xl border bg-white p-4', item.pinned ? 'border-amber-300 shadow-sm' : 'border-neutral-200')}>
                {editing ? (
                  <form onSubmit={saveRevision} className="space-y-3">
                    <div className="grid gap-2 sm:grid-cols-[170px_1fr]">
                      <select
                        className="crm-select text-xs"
                        value={editForm.type}
                        onChange={(event) => setEditForm((current) => ({ ...current, type: event.target.value }))}
                      >
                        {(data.types || Object.keys(TYPE_LABELS)).map((type) => (
                          <option key={type} value={type}>{TYPE_LABELS[type] || type}</option>
                        ))}
                      </select>
                      <textarea
                        className="crm-input min-h-28 resize-y text-xs"
                        value={editForm.content}
                        onChange={(event) => setEditForm((current) => ({ ...current, content: event.target.value }))}
                      />
                    </div>
                    <input
                      className="crm-input text-xs"
                      value={editForm.changeReason}
                      onChange={(event) => setEditForm((current) => ({ ...current, changeReason: event.target.value }))}
                      placeholder="Reason for change (recommended)"
                    />
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-3">
                        <label className="inline-flex items-center gap-2 text-[11px] font-medium text-neutral-600">
                          <input
                            type="checkbox"
                            checked={editForm.pinned}
                            onChange={(event) => setEditForm((current) => ({ ...current, pinned: event.target.checked }))}
                          />
                          Pinned
                        </label>
                        <label className="cursor-pointer text-[11px] font-semibold text-brand hover:text-brand-dark">
                          Add files
                          <input type="file" multiple className="sr-only" onChange={(event) => setEditFiles(Array.from(event.target.files || []))} />
                        </label>
                        {editFiles.length > 0 && <span className="text-[11px] text-neutral-500">{editFiles.length} new file{editFiles.length === 1 ? '' : 's'}</span>}
                      </div>
                      <div className="flex gap-2">
                        <button type="button" className="crm-btn-secondary text-xs" onClick={() => setEditingId('')}>Cancel</button>
                        <button type="submit" disabled={saving} className="crm-btn-primary text-xs">
                          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                          Save version {item.currentVersion + 1}
                        </button>
                      </div>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge tone={TYPE_TONES[item.type] || 'neutral'}>{TYPE_LABELS[item.type] || item.type}</Badge>
                          {item.pinned && <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700"><Pin className="h-3 w-3" />Pinned</span>}
                          <span className="text-[10px] font-medium text-neutral-400">Version {item.currentVersion}</span>
                        </div>
                        <p className="mt-3 whitespace-pre-wrap text-xs leading-5 text-neutral-700">{item.content || 'File-only entry'}</p>
                      </div>
                      <button type="button" className="crm-timeline-action shrink-0" onClick={() => beginEdit(item)} aria-label="Revise entry">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <AttachmentList attachments={item.attachments} />
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-neutral-100 pt-3 text-[10px] text-neutral-500">
                      <span className="inline-flex items-center gap-1.5"><Clock3 className="h-3 w-3" />{formatWhen(item.updatedAt)} · {item.author}</span>
                      <div className="flex flex-wrap items-center gap-3">
                        {item.communicationSource?.conversationId && (
                          <button type="button" onClick={() => setCommunicationSource(item.communicationSource)} className="inline-flex items-center gap-1 font-semibold text-brand hover:text-brand-dark">
                            <MailSearch className="h-3 w-3" />
                            View source email
                          </button>
                        )}
                        <button type="button" onClick={() => toggleVersions(item.id)} className="inline-flex items-center gap-1 font-semibold text-neutral-600 hover:text-brand">
                          <History className="h-3 w-3" />
                          Version history
                          {versionsOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        </button>
                      </div>
                    </div>
                    {versionsOpen && (
                      <div className="mt-3 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                        {!versions ? (
                          <div className="flex items-center gap-2 text-[11px] text-neutral-500"><Loader2 className="h-3.5 w-3.5 animate-spin" />Loading history…</div>
                        ) : (
                          <div className="space-y-3">
                            {versions.map((version) => (
                              <div key={version.id} className="border-b border-neutral-200 pb-3 last:border-0 last:pb-0">
                                <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-neutral-500">
                                  <span className="font-semibold text-neutral-700">Version {version.version}</span>
                                  <span>{formatWhen(version.createdAt)} · {version.author}</span>
                                </div>
                                {version.changeReason && <p className="mt-1 text-[10px] font-medium text-neutral-500">Reason: {version.changeReason}</p>}
                                <p className="mt-2 whitespace-pre-wrap text-[11px] leading-5 text-neutral-700">{version.content || 'File-only entry'}</p>
                                <AttachmentList attachments={version.attachments} />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </article>
            );
          })}
        </div>
      )}

      <div className="flex gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-[10px] leading-4 text-neutral-500">
        <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>Edit an entry to correct or clarify the same information. Add a new entry when a new client instruction, decision, problem, site event, or delivery update occurs.</span>
      </div>
      <CommunicationSourceDrawer source={communicationSource} onClose={() => setCommunicationSource(null)} />
    </div>
  );
}
