import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, GripVertical, Plus, Settings2, Trash2 } from 'lucide-react';
import { Modal } from '../ui/Modal.jsx';
import { Alert, Field } from '../ui/primitives.jsx';
import { ModalSection, ModalStack } from '../ui/workspaceModalParts.jsx';
import AutoSaveIndicator from '../ui/AutoSaveIndicator.jsx';
import AutoSaveCloseNotice from '../ui/AutoSaveCloseNotice.jsx';
import { useDebouncedAutoSave } from '../../hooks/useDebouncedAutoSave.js';
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
  const [meta, setMeta] = useState({ updatedAt: null, updatedBy: '' });
  const [resetToken, setResetToken] = useState('closed');

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
        setResetToken(`loaded:${config?.updatedAt || 'default'}:${config?.stages?.length || stages.length}`);
      })
      .catch((err) => {
        if (cancelled) return;
        setItems(normalizeStages(stages));
        setError(err.message || 'Failed to load pipeline stages.');
        setResetToken(`fallback:${stages.length}`);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, stages]);

  const persistStages = useCallback(async (currentItems) => {
    if (currentItems.some((item) => !item.name.trim())) {
      throw new Error('Stage names are required.');
    }
    setError('');
    const payload = await updatePipelineConfig({ stages: currentItems });
    setMeta({
      updatedAt: payload?.updatedAt || null,
      updatedBy: payload?.updatedBy || '',
    });
    onSaved?.(payload);
  }, [onSaved]);

  const { status: saveStatus, requestClose, closingNotice } = useDebouncedAutoSave({
    snapshot: items,
    onSave: persistStages,
    enabled: open,
    resetKey: open ? resetToken : 'closed',
  });

  const guardedClose = useCallback(
    () => requestClose(onClose),
    [requestClose, onClose],
  );

  useEffect(() => {
    if (saveStatus !== 'error') return;
    setError('Failed to save pipeline stages.');
  }, [saveStatus]);

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
    <>
      <Modal
        open={open}
        onClose={guardedClose}
        title="Pipeline stages"
        subtitle="Customize the deal stages that appear on your sales board."
        size="lg"
        icon={Settings2}
        accent="brand"
        footer={(
          <div className="flex items-center gap-3">
            <AutoSaveIndicator status={saveStatus} className="flex-1" />
            <button type="button" className="crm-btn-secondary shrink-0" onClick={guardedClose}>
              Close
            </button>
          </div>
        )}
      >
        <ModalStack>
          {error && <Alert>{error}</Alert>}

          <ModalSection
            title="Stage order"
            description="Stages appear left-to-right on the board. Reorder, rename, or add stages to match your sales process, and keep win probability aligned for forecasting."
          >
            {updatedLabel ? <p className="text-xs text-neutral-500">{updatedLabel}</p> : null}
            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={`stage-${index}`} className="crm-stage-editor-row">
                  <GripVertical className="h-4 w-4 shrink-0 text-neutral-300" aria-hidden="true" />
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
              ))}
            </div>

            <button type="button" className="crm-btn-secondary mt-4" onClick={addItem}>
              <Plus className="h-4 w-4" />
              Add stage
            </button>
            {loading ? <p className="text-xs text-neutral-500">Refreshing canonical pipeline config…</p> : null}
          </ModalSection>
        </ModalStack>
      </Modal>
      <AutoSaveCloseNotice open={closingNotice} />
    </>
  );
}
