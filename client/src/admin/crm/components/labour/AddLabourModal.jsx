import { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal.jsx';
import { Field, Alert } from '../ui/primitives.jsx';
import { HardHat, Loader2, Sparkles } from 'lucide-react';
import { createLabour, updateLabour } from '../../crmApi.js';

const COMMON_TRADES = [
  { id: 'Carpenter', label: 'Carpenter', desc: 'Framing, counters, joinery, flooring' },
  { id: 'Painter', label: 'Painter', desc: 'Duco spray, emulsion, finishes' },
  { id: 'Plasterer', label: 'Plasterer', desc: 'Gypsum, jointing, skim coat' },
  { id: 'Helper', label: 'Helper', desc: 'Assembly, loading, staging, cleanup' },
];

export default function AddLabourModal({
  open,
  initialLabour = null,
  onClose,
  onSaved,
}) {
  const isEdit = Boolean(initialLabour);

  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [trade, setTrade] = useState('Carpenter');
  const [customTrade, setCustomTrade] = useState('');
  const [dailyRate, setDailyRate] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [status, setStatus] = useState('active');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialLabour) {
      setName(initialLabour.name || '');
      setContact(initialLabour.contact || initialLabour.phone || '');
      const matchTrade = COMMON_TRADES.find(
        (t) => t.id.toLowerCase() === (initialLabour.trade || '').toLowerCase()
      );
      if (matchTrade) {
        setTrade(matchTrade.id);
        setCustomTrade('');
      } else {
        setTrade('Custom');
        setCustomTrade(initialLabour.trade || '');
      }
      setDailyRate(initialLabour.dailyRate != null ? String(initialLabour.dailyRate) : '');
      setHourlyRate(initialLabour.hourlyRate != null ? String(initialLabour.hourlyRate) : '');
      setStatus(initialLabour.status || 'active');
      setNotes(initialLabour.notes || '');
    } else {
      setName('');
      setContact('');
      setTrade('Carpenter');
      setCustomTrade('');
      setDailyRate('');
      setHourlyRate('');
      setStatus('active');
      setNotes('');
    }
    setError('');
  }, [initialLabour, open]);

  if (!open) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter the worker name.');
      return;
    }
    if (!contact.trim()) {
      setError('Please enter contact phone or details.');
      return;
    }

    const resolvedTrade = trade === 'Custom' ? customTrade.trim() : trade;
    if (!resolvedTrade) {
      setError('Please specify what he does (trade/role).');
      return;
    }

    setBusy(true);
    setError('');

    const payload = {
      name: name.trim(),
      contact: contact.trim(),
      phone: contact.trim(),
      trade: resolvedTrade,
      dailyRate: dailyRate ? parseFloat(dailyRate) : null,
      hourlyRate: hourlyRate ? parseFloat(hourlyRate) : null,
      status,
      notes: notes.trim() || null,
    };

    try {
      let saved;
      if (isEdit) {
        saved = await updateLabour(initialLabour.id, payload);
      } else {
        saved = await createLabour(payload);
      }
      onSaved?.(saved);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save labour record.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit Outsource Labour' : 'Add Outsource Labour'}
      subtitle={
        isEdit
          ? `Update details and skills for ${initialLabour.name}`
          : 'Register freelance craftsmen, technicians, and site helpers'
      }
      icon={HardHat}
      accent="brand"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert tone="error">{error}</Alert>}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Worker Name" required hint="Full name of technician or labourer">
            <input
              type="text"
              className="crm-input font-medium"
              placeholder="e.g. Rashid Ali, Muhammad Imran"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </Field>

          <Field label="Contact (Phone / WhatsApp)" required hint="Direct mobile number">
            <input
              type="tel"
              className="crm-input font-medium"
              placeholder="e.g. +971 50 234 8901"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              required
            />
          </Field>
        </div>

        {/* Trade Selection (What he does: Plasterer / Carpenter / Painter / Helper) */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-2">
            What he does (Trade / Role) <span className="text-brand">*</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {COMMON_TRADES.map((t) => {
              const selected = trade === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setTrade(t.id);
                    setCustomTrade('');
                  }}
                  className={`flex flex-col items-start p-3 rounded-xl border text-left transition ${
                    selected
                      ? 'border-brand bg-brand-soft/50 ring-1 ring-brand text-neutral-900 shadow-xs'
                      : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300 hover:bg-neutral-50'
                  }`}
                >
                  <span className="text-xs font-bold">{t.label}</span>
                  <span className="text-3xs text-neutral-500 mt-0.5 line-clamp-1">
                    {t.desc}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-2.5">
            <button
              type="button"
              onClick={() => setTrade('Custom')}
              className={`text-2xs font-semibold underline underline-offset-2 ${
                trade === 'Custom' ? 'text-brand' : 'text-neutral-500 hover:text-neutral-800'
              }`}
            >
              + Other / Custom trade (Electrician, Welder, Fabricator, etc.)
            </button>
            {trade === 'Custom' && (
              <input
                type="text"
                className="crm-input mt-1.5"
                placeholder="Enter custom trade (e.g. Electrician, Signage Installer, Welder)"
                value={customTrade}
                onChange={(e) => setCustomTrade(e.target.value)}
                autoFocus
              />
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="Daily Rate (AED)" hint="Standard 8-10hr shift">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-neutral-400">
                AED
              </span>
              <input
                type="number"
                step="5"
                min="0"
                className="crm-input pl-12 font-medium tabular-nums"
                placeholder="e.g. 200"
                value={dailyRate}
                onChange={(e) => setDailyRate(e.target.value)}
              />
            </div>
          </Field>

          <Field label="Hourly Rate (AED)" hint="Overtime rate">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-neutral-400">
                AED
              </span>
              <input
                type="number"
                step="1"
                min="0"
                className="crm-input pl-12 font-medium tabular-nums"
                placeholder="e.g. 25"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(e.target.value)}
              />
            </div>
          </Field>

          <Field label="Availability Status">
            <select
              className="crm-input"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="active">Active Worker</option>
              <option value="available">Available Now</option>
              <option value="busy">Busy / On Project</option>
              <option value="inactive">Inactive</option>
            </select>
          </Field>
        </div>

        <Field label="Skills & Notes" hint="DWTC badge, specific expertise, tools owned, languages spoken">
          <textarea
            className="crm-input min-h-[64px]"
            placeholder="e.g. Has DWTC contractor badge, specialized in curved counters & high-gloss spray paint, available for night setup shifts..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
          />
        </Field>

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-neutral-100">
          <button
            type="button"
            onClick={onClose}
            className="crm-btn-secondary"
            disabled={busy}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="crm-btn-primary flex items-center gap-2"
            disabled={busy}
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {busy ? 'Saving Labour…' : isEdit ? 'Save Changes' : 'Add Labour'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
