import { useEffect, useMemo, useState } from 'react';
import { Plus, Play, FileText, Trash2 } from 'lucide-react';
import SearchableSelect from '../ui/SearchableSelect.jsx';
import { cn } from '../ui/primitives.jsx';
import { useConfirmDeleteDialog } from '../../context/ConfirmDeleteContext.jsx';

function formatWhen(value) {
  if (!value) return '';
  return new Date(value).toLocaleDateString('en-AE', { month: 'short', day: 'numeric' });
}

function buildSequenceMeta(seq, stats = {}) {
  const parts = [];
  const campaign = seq.campaign?.projectName;
  if (campaign) parts.push(campaign);
  const steps = seq.steps?.length || 0;
  parts.push(`${steps} step${steps === 1 ? '' : 's'}`);
  if (seq.isActive) {
    parts.push(`${stats.enrolled || 0} enrolled`);
  } else {
    parts.push('Draft');
  }
  const when = formatWhen(seq.updatedAt);
  if (when) parts.push(when);
  return parts.join(' · ');
}

export default function SequenceSidebar({
  sequences = [],
  activeId,
  onSelect,
  onCreate,
  onDelete,
  onBulkDelete,
  deleting = false,
}) {
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const { confirmDelete } = useConfirmDeleteDialog();

  const sequenceOptions = useMemo(
    () => sequences.map((seq) => ({
      value: seq._id,
      label: seq.name || 'Untitled sequence',
      hint: seq.campaign?.projectName || '',
    })),
    [sequences],
  );

  const allSelected = sequences.length > 0 && sequences.every((seq) => selectedIds.has(seq._id));
  const selectionCount = selectedIds.size;

  useEffect(() => {
    setSelectedIds((prev) => {
      const valid = new Set(sequences.map((seq) => seq._id));
      const next = new Set([...prev].filter((id) => valid.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [sequences]);

  function toggleSelect(id, event) {
    event?.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(sequences.map((seq) => seq._id)));
  }

  async function handleBulkDelete() {
    if (!selectionCount) return;
    const label = selectionCount === 1 ? '1 sequence' : `${selectionCount} sequences`;
    const ok = await confirmDelete({
      title: `Delete ${label}?`,
      message: 'Enrollments and pending sends for these sequences will be removed. You can undo within 30 seconds.',
      confirmLabel: 'Delete sequences',
    });
    if (!ok) return;
    await onBulkDelete?.([...selectedIds]);
    setSelectedIds(new Set());
  }

  async function handleDeleteOne(id, event) {
    event.stopPropagation();
    await onDelete?.(id);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  return (
    <aside className="crm-seq-panel crm-seq-panel-left crm-seq-sidebar">
      <div className="crm-seq-panel-head crm-seq-sidebar-head">
        <button type="button" onClick={onCreate} className="crm-seq-sidebar-new">
          <Plus className="h-3.5 w-3.5" />
          New sequence
        </button>
        <div className="mt-2">
          <SearchableSelect
            value={activeId || ''}
            onChange={(id) => { if (id) onSelect(id); }}
            options={sequenceOptions}
            placeholder="Jump to…"
            searchPlaceholder="Filter…"
            emptyLabel="No sequences found"
            className="crm-seq-compact-select crm-seq-sidebar-select"
          />
        </div>
        {sequences.length > 0 && (
          <div className="crm-seq-sidebar-bulk mt-2">
            <label className="crm-seq-sidebar-select-all">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleSelectAll}
                aria-label="Select all sequences"
              />
              <span>All</span>
            </label>
            {selectionCount > 0 && (
              <button
                type="button"
                onClick={handleBulkDelete}
                disabled={deleting}
                aria-label={`Delete ${selectionCount} selected sequence${selectionCount === 1 ? '' : 's'}`}
                className="crm-seq-sidebar-bulk-delete"
              >
                <Trash2 className="h-3 w-3" />
                {selectionCount}
              </button>
            )}
          </div>
        )}
      </div>

      <div
        className="crm-seq-panel-list crm-scroll crm-seq-sidebar-list flex flex-col flex-1 cursor-default"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onSelect(null);
          }
        }}
      >
        {!sequences.length && (
          <p className="px-3 py-6 text-center text-2xs text-neutral-400">No sequences yet.</p>
        )}
        {sequences.map((seq) => {
          const active = activeId === seq._id;
          const checked = selectedIds.has(seq._id);
          const stats = seq.stats || {};
          const meta = buildSequenceMeta(seq, stats);
          return (
            <div
              key={seq._id}
              className={cn('crm-seq-list-row', active && 'is-active', checked && 'is-checked')}
            >
              <label className="crm-seq-list-check" onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => toggleSelect(seq._id, e)}
                  aria-label={`Select ${seq.name || 'sequence'}`}
                />
              </label>
              <button
                type="button"
                onClick={() => onSelect(active ? null : seq._id)}
                className="crm-seq-list-item"
              >
                <span className={cn('crm-seq-list-icon', seq.isActive && 'is-live')}>
                  {seq.isActive ? <Play className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
                </span>
                <span className="crm-seq-list-copy min-w-0">
                  <span className="crm-seq-list-title">{seq.name || 'Untitled sequence'}</span>
                  <span className="crm-seq-list-meta">{meta}</span>
                </span>
              </button>
              <button
                type="button"
                className="crm-seq-list-delete"
                onClick={(e) => handleDeleteOne(seq._id, e)}
                disabled={deleting}
                aria-label={`Delete ${seq.name || 'sequence'}`}
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          );
        })}
        {/* Empty area filler to deselect sequence when clicking empty space below list (uses normal default cursor) */}
        <div
          className="flex-1 min-h-[140px] cursor-default"
          onClick={() => onSelect(null)}
          aria-hidden="true"
        />
      </div>
    </aside>
  );
}
