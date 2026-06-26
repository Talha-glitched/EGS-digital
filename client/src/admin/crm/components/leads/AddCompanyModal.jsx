import { useState } from 'react';
import { Modal } from '../ui/Modal.jsx';
import { Alert, Field } from '../ui/primitives.jsx';
import { createCompany } from '../../crmApi.js';
import { Building2 } from 'lucide-react';

const EMPTY = {
  companyName: '',
  domain: '',
  industry: '',
  city: '',
  country: '',
  globalStatus: 'Lead',
};

export default function AddCompanyModal({ open, onClose, onCreated }) {
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleClose() {
    if (busy) return;
    setForm(EMPTY);
    setError('');
    onClose?.();
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const company = await createCompany(form);
      onCreated?.(company);
      setForm(EMPTY);
      onClose?.();
    } catch (err) {
      setError(err.message || 'Failed to create company.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Add company"
      subtitle="Create a company in the CRM without linking it to a campaign."
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && <Alert>{error}</Alert>}

        <div className="crm-info-panel">
          <p className="text-sm leading-relaxed">
            Use this for referrals, inbound leads, or companies you want to track before assigning them to an exhibition campaign.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Company name">
              <input
                className="crm-input"
                value={form.companyName}
                onChange={(e) => update('companyName', e.target.value)}
                placeholder="Acme Exhibitions LLC"
                required
              />
            </Field>
          </div>
          <Field label="Domain" hint="Used as the unique company identifier.">
            <input
              className="crm-input"
              value={form.domain}
              onChange={(e) => update('domain', e.target.value)}
              placeholder="acme.com"
              required
            />
          </Field>
          <Field label="Industry">
            <input
              className="crm-input"
              value={form.industry}
              onChange={(e) => update('industry', e.target.value)}
              placeholder="Events / FMCG"
            />
          </Field>
          <Field label="City">
            <input className="crm-input" value={form.city} onChange={(e) => update('city', e.target.value)} />
          </Field>
          <Field label="Country">
            <input className="crm-input" value={form.country} onChange={(e) => update('country', e.target.value)} />
          </Field>
          <Field label="Status">
            <select className="crm-select" value={form.globalStatus} onChange={(e) => update('globalStatus', e.target.value)}>
              <option value="Lead">Lead</option>
              <option value="Active Prospect">Active Prospect</option>
              <option value="Client Partner">Client Partner</option>
              <option value="Blacklisted">Blacklisted</option>
            </select>
          </Field>
        </div>

        <div className="flex justify-end gap-2 border-t border-[var(--color-line)] pt-4">
          <button type="button" className="crm-btn-secondary" onClick={handleClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" className="crm-btn-primary" disabled={busy}>
            <Building2 className="h-4 w-4" />
            {busy ? 'Creating…' : 'Create company'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
