import { useEffect, useMemo, useState } from 'react';
import { Save } from 'lucide-react';
import { Modal } from '../ui/Modal.jsx';
import SearchableMultiSelect from '../ui/SearchableMultiSelect.jsx';
import {
  INTERACTION_TYPES,
  INTERACTION_DIRECTIONS,
  INTERACTION_TYPE_LABELS,
  INTERACTION_TYPE_HINTS,
  INTERACTION_DIRECTION_LABELS,
  INTERACTION_OUTCOME_LABELS,
  OUTCOMES_BY_TYPE,
  defaultTitleForType,
  emptyInteractionForm,
} from '../../constants/interactionTypes.js';

function Field({ label, children, hint }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-neutral-600">{label}</span>
      {children}
      {hint && <span className="block text-[11px] leading-relaxed text-neutral-400">{hint}</span>}
    </label>
  );
}

const inputClass =
  'w-full rounded-md border border-[var(--color-line)] bg-white px-3 py-2 text-sm text-[var(--color-ink)] outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15';

export default function LogInteractionModal({
  open,
  onClose,
  onSubmit,
  initialValues,
  contacts = [],
  defaultLeadId,
  defaultLeadIds,
  saving = false,
  mode = 'create',
}) {
  const [form, setForm] = useState(emptyInteractionForm);
  const [leadIds, setLeadIds] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setForm(initialValues || emptyInteractionForm());
    const initialIds = defaultLeadIds?.length
      ? defaultLeadIds
      : [defaultLeadId || contacts[0]?._id || ''].filter(Boolean);
    setLeadIds(initialIds.map(String));
    setError('');
  }, [open, initialValues, defaultLeadId, defaultLeadIds, contacts]);

  const outcomeOptions = useMemo(
    () => OUTCOMES_BY_TYPE[form.type] || INTERACTION_OUTCOMES_FALLBACK,
    [form.type]
  );

  const contactOptions = useMemo(
    () => contacts.map((contact) => ({
      value: String(contact._id),
      label: contact.name || contact.email || 'Unnamed',
      hint: contact.designation || 'POC',
    })),
    [contacts],
  );

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleTypeChange = (type) => {
    setForm((prev) => ({
      ...prev,
      type,
      title: prev.title || defaultTitleForType(type, prev.direction),
      outcome: '',
    }));
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (contacts.length && !leadIds.length) {
      setError('Select at least one contact for this interaction.');
      return;
    }
    if (!form.summary.trim()) {
      setError('Add a short summary of what happened.');
      return;
    }
    const normalizedLeadIds = leadIds.map(String).filter(Boolean);
    const primaryLeadId = normalizedLeadIds.includes(String(defaultLeadId))
      ? String(defaultLeadId)
      : normalizedLeadIds[0];
    try {
      await onSubmit({
        leadId: primaryLeadId,
        leadIds: normalizedLeadIds,
        payload: {
          ...form,
          title: form.title.trim() || defaultTitleForType(form.type, form.direction),
          summary: form.summary.trim(),
          durationMinutes: form.durationMinutes === '' ? null : Number(form.durationMinutes),
          outcome: form.outcome || null,
          occurredAt: new Date(form.occurredAt).toISOString(),
          leadIds: normalizedLeadIds,
        },
      });
      onClose?.();
    } catch (err) {
      setError(err.message || 'Failed to save interaction.');
    }
  }

  const showDuration = ['phone_call', 'meeting'].includes(form.type);
  const showLocation = ['meeting', 'site_visit', 'event'].includes(form.type);
  const showAttendees = ['meeting', 'site_visit', 'event', 'referral'].includes(form.type);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === 'edit' ? 'Edit interaction' : 'Log interaction'}
      subtitle="Capture calls, meetings, messages, and conversation summaries so the whole team has context."
      size="lg"
      footer={
        <div className="flex gap-3">
          <button
            type="submit"
            form="log-interaction-form"
            disabled={saving}
            className="crm-btn-primary flex flex-1 items-center justify-center gap-1.5"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving…' : mode === 'edit' ? 'Save changes' : 'Add to timeline'}
          </button>
          <button type="button" onClick={onClose} className="crm-btn-secondary">
            Cancel
          </button>
        </div>
      }
    >
      <form id="log-interaction-form" onSubmit={handleSubmit} className="space-y-5">
        {error && <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        {contacts.length > 0 && (
          <Field
            label="Contacts"
            hint="Select one or more people involved. The interaction appears on each contact's timeline."
          >
            <SearchableMultiSelect
              values={leadIds}
              onChange={setLeadIds}
              options={contactOptions}
              placeholder="Select contacts…"
              searchPlaceholder="Search contacts…"
              emptyLabel="No contacts match."
            />
          </Field>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Interaction type" hint={INTERACTION_TYPE_HINTS[form.type]}>
            <select className={inputClass} value={form.type} onChange={(e) => handleTypeChange(e.target.value)}>
              {INTERACTION_TYPES.map((type) => (
                <option key={type} value={type}>{INTERACTION_TYPE_LABELS[type]}</option>
              ))}
            </select>
          </Field>
          <Field label="Direction" hint={
            form.direction === 'inbound'
              ? 'They initiated this — shows as Contact → EGS Team on the timeline.'
              : form.direction === 'internal'
                ? 'Internal note for your team about this contact.'
                : 'Your team initiated this — shows as EGS Team → Contact on the timeline.'
          }>
            <select className={inputClass} value={form.direction} onChange={(e) => set('direction', e.target.value)}>
              {INTERACTION_DIRECTIONS.map((direction) => (
                <option key={direction} value={direction}>{INTERACTION_DIRECTION_LABELS[direction]}</option>
              ))}
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="When it happened">
            <input
              type="datetime-local"
              className={inputClass}
              value={form.occurredAt}
              onChange={(e) => set('occurredAt', e.target.value)}
              required
            />
          </Field>
          {showDuration && (
            <Field label="Duration (minutes)">
              <input
                type="number"
                min="0"
                className={inputClass}
                value={form.durationMinutes}
                onChange={(e) => set('durationMinutes', e.target.value)}
                placeholder="e.g. 15"
              />
            </Field>
          )}
        </div>

        <Field label="Title (optional)">
          <input
            className={inputClass}
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
            placeholder={defaultTitleForType(form.type, form.direction)}
          />
        </Field>

        <Field label="Summary" hint="What was discussed, agreed, or learned? Include next steps if relevant.">
          <textarea
            className={`${inputClass} min-h-[110px] resize-y`}
            value={form.summary}
            onChange={(e) => set('summary', e.target.value)}
            placeholder="e.g. Spoke with Joy about their GITEX stand — interested in a 6x3m build, asked for budget range by Thursday."
            required
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Outcome">
            <select className={inputClass} value={form.outcome} onChange={(e) => set('outcome', e.target.value)}>
              <option value="">Not set</option>
              {outcomeOptions.map((outcome) => (
                <option key={outcome} value={outcome}>{INTERACTION_OUTCOME_LABELS[outcome]}</option>
              ))}
            </select>
          </Field>
          {showLocation && (
            <Field label="Location">
              <input
                className={inputClass}
                value={form.location}
                onChange={(e) => set('location', e.target.value)}
                placeholder="Dubai World Trade Centre, Booth Z4-A12"
              />
            </Field>
          )}
        </div>

        {showAttendees && (
          <Field label="People involved">
            <input
              className={inputClass}
              value={form.attendees}
              onChange={(e) => set('attendees', e.target.value)}
              placeholder="Joy (Marketing), Ahmed (Procurement)"
            />
          </Field>
        )}
      </form>
    </Modal>
  );
}

const INTERACTION_OUTCOMES_FALLBACK = ['connected', 'interested', 'scheduled_followup', 'other'];
