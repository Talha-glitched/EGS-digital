import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, GripVertical, Plus, Settings2, Trash2 } from 'lucide-react';
import { Modal } from '../ui/Modal.jsx';
import { Alert, Field } from '../ui/primitives.jsx';
import { ModalActionFooter, ModalSection, ModalStack } from '../ui/workspaceModalParts.jsx';
import { updatePipelineConfig } from '../../crmApi.js';

function normalizeStages(stages = []) {
  return stages.map((stage) => ({
    name: typeof stage === 'string' ? stage : stage.name,
    probability: typeof stage === 'object' ? Number(stage.probability ?? 0) : 0,
  }));
}

export default function PipelineStageEditorModal({ open, onClose, stages = [], onSaved }) {
  const [items, setItems] = useState(() => normalizeStages(stages));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setItems(normalizeStages(stages));
      setError('');
    }
  }, [open, stages]);

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

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const payload = await updatePipelineConfig({ stages: items });
      onSaved?.(payload);
      onClose?.();
    } catch (err) {
      setError(err.message || 'Failed to save pipeline stages.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => !busy && onClose?.()}
      title="Pipeline stages"
      subtitle="Customize the deal stages that appear on your sales board."
      size="lg"
      icon={Settings2}
      accent="brand"
      footer={(
        <ModalActionFooter>
          <button type="button" className="crm-btn-secondary" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="submit" form="pipeline-stage-form" className="crm-btn-primary" disabled={busy || items.some((item) => !item.name.trim())}>
            {busy ? 'Saving…' : 'Save stages'}
          </button>
        </ModalActionFooter>
      )}
    >
      <form id="pipeline-stage-form" onSubmit={handleSubmit}>
        <ModalStack>
          {error && <Alert>{error}</Alert>}

          <ModalSection
            title="Stage order"
            description="Stages appear left-to-right on the board. Reorder, rename, or add stages to match your sales process."
          >
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
                      required
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
          </ModalSection>
        </ModalStack>
      </form>
    </Modal>
  );
}
