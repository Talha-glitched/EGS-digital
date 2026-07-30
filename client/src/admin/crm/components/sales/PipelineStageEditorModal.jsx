import { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, GripVertical, Plus, Settings2, Trash2 } from 'lucide-react';
import { Modal } from '../ui/Modal.jsx';
import { Alert, Field } from '../ui/primitives.jsx';
import { ModalSection, ModalStack } from '../ui/workspaceModalParts.jsx';
import { fetchPipelineConfig, updatePipelineConfig } from '../../crmApi.js';

function normalizeStages(stages = []) {
  return stages.map((stage) => ({
    name: typeof stage === 'string' ? stage : stage.name,
    probability: typeof stage === 'object' ? Number(stage.probability ?? 0) : 0,
  }));
}

export default function PipelineStageEditorModal({ open, onClose, stages = [], onSaved }) {
  const [items, setItems] = useState(() => normalizeStages(stages));
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [meta, setMeta] = useState({ updatedAt: null, updatedBy: '' });

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setError('');
    setLoading(true);
    fetchPipelineConfig()
      .then((config) => {
        if (cancelled) return;
        setItems(normalizeStages(config?.stages?.length ? config.stages : stages));
        setMeta({
          updatedAt: config?.updatedAt || null,
          updatedBy: config?.updatedBy || '',
        });
      })
      .catch((err) => {
        if (cancelled) return;
        setItems(normalizeStages(stages));
        setError(err.message || 'Failed to load pipeline stages.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, stages]);

  async function handleSave() {
    if (items.some((item) => !item.name.trim())) {
      setError('Stage names are required.');
      return;
    }
    setError('');
    setSaving(true);
    try {
      const payload = await updatePipelineConfig({ stages: items });
      setMeta({
        updatedAt: payload?.updatedAt || null,
        updatedBy: payload?.updatedBy || '',
      });
      onSaved?.(payload);
      onClose?.();
    } catch (err) {
      setError(err.message || 'Failed to save pipeline stages.');
    } finally {
      setSaving(false);
    }
  }

  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  function updateItem(index, patch) {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  function moveItem(index, direction) {
    setItems((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function reorderItem(fromIndex, toIndex) {
    if (fromIndex === null || toIndex === null || fromIndex === toIndex) return;
    setItems((prev) => {
      if (fromIndex < 0 || fromIndex >= prev.length || toIndex < 0 || toIndex >= prev.length) return prev;
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  }

  function removeItem(index) {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function addItem() {
    setItems((prev) => [...prev, { name: '', probability: 0 }]);
  }

  const updatedLabel = useMemo(() => {
    if (!meta.updatedAt) return '';
    const formatted = new Date(meta.updatedAt);
    if (Number.isNaN(formatted.getTime())) return '';
    const byline = meta.updatedBy ? ` by ${meta.updatedBy}` : '';
    return `Last synced ${formatted.toLocaleString('en-AE', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })}${byline}`;
  }, [meta.updatedAt, meta.updatedBy]);

  return (
    <Modal
      open={open}
      onClose={() => !saving && onClose?.()}
      title="Pipeline stages"
      subtitle="Customize the deal stages that appear on your sales board."
      size="lg"
      icon={Settings2}
      accent="brand"
      footer={(
        <div className="flex items-center justify-end gap-3 w-full">
          <button
            type="button"
            disabled={saving}
            className="crm-btn-secondary"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving || loading}
            className="crm-btn-primary"
            onClick={handleSave}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      )}
    >
      <ModalStack>
        {error && <Alert>{error}</Alert>}

        <ModalSection
          title="Stage order"
          description="Stages appear left-to-right on the board. Drag or use arrows to reorder, rename, or add stages to match your sales process."
        >
          {updatedLabel ? <p className="text-xs text-neutral-500 mb-2">{updatedLabel}</p> : null}
          <div className="space-y-3">
            {items.map((item, index) => {
              const isDragging = draggedIndex === index;
              const isDragOver = dragOverIndex === index && draggedIndex !== index;
              return (
                <div
                  key={`stage-${index}`}
                  className={`crm-stage-editor-row flex items-center gap-2 transition-all duration-150 ${
                    isDragging ? 'opacity-40 border-dashed border-neutral-400 bg-neutral-50 scale-[0.99]' : ''
                  } ${
                    isDragOver ? 'border-brand-500 bg-brand-50/40 ring-2 ring-brand-500/20' : ''
                  }`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    if (dragOverIndex !== index) {
                      setDragOverIndex(index);
                    }
                  }}
                  onDragLeave={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget)) {
                      if (dragOverIndex === index) {
                        setDragOverIndex(null);
                      }
                    }
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (draggedIndex !== null && draggedIndex !== index) {
                      reorderItem(draggedIndex, index);
                    }
                    setDraggedIndex(null);
                    setDragOverIndex(null);
                  }}
                  onDragEnd={() => {
                    setDraggedIndex(null);
                    setDragOverIndex(null);
                  }}
                >
                  <div
                    draggable
                    onDragStart={(e) => {
                      setDraggedIndex(index);
                      e.dataTransfer.effectAllowed = 'move';
                      e.dataTransfer.setData('text/plain', String(index));
                    }}
                    className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-neutral-100 shrink-0 text-neutral-400 hover:text-neutral-600 transition-colors"
                    title="Drag to reorder stage"
                  >
                    <GripVertical className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <Field label={index === 0 ? 'Stage name' : undefined} className="min-w-0 flex-1">
                    <input
                      className="crm-input"
                      value={item.name}
                      onChange={(e) => updateItem(index, { name: e.target.value })}
                      placeholder="Proposal Sent"
                    />
                  </Field>
                  <Field label={index === 0 ? 'Win %' : undefined} className="w-24 shrink-0">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      className="crm-input text-right tabular-nums"
                      value={item.probability}
                      onChange={(e) => updateItem(index, { probability: Math.min(100, Math.max(0, Number(e.target.value || 0))) })}
                      placeholder="65"
                    />
                  </Field>
                  <div className="flex shrink-0 items-end gap-1 pb-0.5">
                    <button type="button" className="crm-icon-btn h-8 w-8" onClick={() => moveItem(index, -1)} disabled={index === 0} aria-label="Move stage up">
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button type="button" className="crm-icon-btn h-8 w-8" onClick={() => moveItem(index, 1)} disabled={index === items.length - 1} aria-label="Move stage down">
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                    <button type="button" className="crm-icon-btn h-8 w-8 text-red-500" onClick={() => removeItem(index)} disabled={items.length <= 1} aria-label="Remove stage">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <button type="button" className="crm-btn-secondary mt-4" onClick={addItem}>
            <Plus className="h-4 w-4" />
            Add stage
          </button>
          {loading ? <p className="text-xs text-neutral-500 mt-2">Loading pipeline config…</p> : null}
        </ModalSection>
      </ModalStack>
    </Modal>
  );
}
