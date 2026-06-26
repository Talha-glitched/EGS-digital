import { useEffect, useMemo, useState } from 'react';
import { Modal } from '../ui/Modal.jsx';
import DateTimePicker from '../ui/DateTimePicker.jsx';
import SearchableSelect from '../ui/SearchableSelect.jsx';
import { Alert, Field } from '../ui/primitives.jsx';
import { TASK_PRIORITIES } from './taskUtils.js';

const emptyForm = {
  title: '',
  dueAt: null,
  priority: 'Normal',
  owner: 'admin',
  opportunityId: '',
  companyId: '',
  notes: '',
  status: 'Open',
};

export default function TaskDetailModal({
  open,
  task,
  mode = 'edit',
  onClose,
  onSave,
  busy = false,
  error = '',
  opportunities = [],
  companies = [],
  ownerOptions = [],
  defaultOpportunityId = '',
  defaultCompanyId = '',
  defaultOwner = 'admin',
  hideOpportunityField = false,
}) {
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (!open) return;
    if (mode === 'create') {
      setForm({
        ...emptyForm,
        owner: defaultOwner || 'admin',
        opportunityId: defaultOpportunityId || '',
        companyId: defaultCompanyId || '',
      });
      return;
    }
    if (!task) return;
    setForm({
      title: task.title || '',
      dueAt: task.dueAt || null,
      priority: task.priority || 'Normal',
      owner: task.owner || 'admin',
      opportunityId: task.opportunityId?._id || task.opportunityId || '',
      companyId: task.companyId?._id || task.companyId || '',
      notes: task.notes || '',
      status: task.status || 'Open',
    });
  }, [open, task, mode, defaultOpportunityId, defaultCompanyId, defaultOwner]);

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    await onSave?.({
      ...form,
      dueAt: form.dueAt || null,
      opportunityId: form.opportunityId || null,
      companyId: form.companyId || null,
    });
  }

  const owners = ownerOptions.length ? ownerOptions : ['admin'];
  const isCreate = mode === 'create';

  const opportunityOptions = useMemo(
    () => opportunities.map((item) => ({
      value: item._id,
      label: item.name,
      hint: item.companyId?.companyName || item.eventName || undefined,
    })),
    [opportunities],
  );

  const companyOptions = useMemo(
    () => companies.map((item) => ({
      value: item._id,
      label: item.companyName,
      hint: item.industry || item.country || undefined,
    })),
    [companies],
  );

  return (
    <Modal
      open={open}
      onClose={() => !busy && onClose?.()}
      title={isCreate ? 'Create task' : 'Task details'}
      subtitle={isCreate ? 'Give the task a clear outcome and due date.' : 'Review and update this task.'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && <Alert>{error}</Alert>}
        <Field label="Task" required>
          <input
            autoFocus
            className="crm-input"
            value={form.title}
            onChange={(e) => update('title', e.target.value)}
            placeholder="Follow up on revised stand estimate"
            required
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Due">
            <DateTimePicker
              value={form.dueAt}
              onChange={(dueAt) => update('dueAt', dueAt)}
              placeholder="Set due date"
              ariaLabel="Task due date"
            />
          </Field>
          <Field label="Priority">
            <select className="crm-select" value={form.priority} onChange={(e) => update('priority', e.target.value)}>
              {TASK_PRIORITIES.map((priority) => (
                <option key={priority} value={priority}>{priority}</option>
              ))}
            </select>
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Owner">
            <select className="crm-select" value={form.owner} onChange={(e) => update('owner', e.target.value)}>
              {owners.map((owner) => (
                <option key={owner} value={owner}>{owner}</option>
              ))}
            </select>
          </Field>
          {!isCreate && (
            <Field label="Status">
              <select className="crm-select" value={form.status} onChange={(e) => update('status', e.target.value)}>
                <option value="Open">Open</option>
                <option value="Done">Completed</option>
              </select>
            </Field>
          )}
        </div>
        {!hideOpportunityField && (
          <Field label="Opportunity">
            <SearchableSelect
              value={form.opportunityId}
              onChange={(value) => update('opportunityId', value)}
              options={opportunityOptions}
              placeholder="No linked opportunity"
              searchPlaceholder="Search opportunities…"
              emptyLabel="No opportunities match."
            />
          </Field>
        )}
        <Field label="Company">
          <SearchableSelect
            value={form.companyId}
            onChange={(value) => update('companyId', value)}
            options={companyOptions}
            placeholder="No linked company"
            searchPlaceholder="Search companies…"
            emptyLabel="No companies match."
          />
        </Field>
        <Field label="Notes">
          <textarea
            rows="4"
            className="crm-input resize-y"
            value={form.notes}
            onChange={(e) => update('notes', e.target.value)}
          />
        </Field>
        <div className="flex justify-end gap-3 border-t border-[var(--color-line)] pt-4">
          <button type="button" className="crm-btn-secondary" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="submit" disabled={busy || !form.title.trim()} className="crm-btn-primary">
            {busy ? 'Saving…' : isCreate ? 'Create task' : 'Save changes'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
