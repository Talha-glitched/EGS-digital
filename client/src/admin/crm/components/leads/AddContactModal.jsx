import { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal } from '../ui/Modal.jsx';
import { Alert, Field } from '../ui/primitives.jsx';
import SearchableSelect from '../ui/SearchableSelect.jsx';
import { createStandaloneLead, crmApiFetch, fetchGlobalCompanies } from '../../crmApi.js';
import { Users } from 'lucide-react';

const EMPTY = {
  mode: 'existing',
  companyId: '',
  companyName: '',
  domain: '',
  campaignId: '',
  name: '',
  email: '',
  designation: '',
  phone: '',
  linkedinUrl: '',
};

export default function AddContactModal({ open, onClose, onCreated }) {
  const [form, setForm] = useState(EMPTY);
  const [selectedCompanyOption, setSelectedCompanyOption] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    crmApiFetch('/api/admin/projects')
      .then((projectList) => setCampaigns(projectList || []))
      .catch(console.error);
  }, [open]);

  const searchCompanies = useCallback(async (query) => {
    const data = await fetchGlobalCompanies({
      search: query || undefined,
      limit: 50,
    });
    return (data.items || []).map((company) => ({
      value: company._id,
      label: company.companyName,
      hint: company.domain || undefined,
    }));
  }, []);

  const companyOptions = useMemo(() => {
    if (!selectedCompanyOption) return [];
    return [selectedCompanyOption];
  }, [selectedCompanyOption]);

  const campaignOptions = useMemo(
    () => campaigns.map((campaign) => ({
      value: campaign._id,
      label: campaign.projectName,
    })),
    [campaigns],
  );

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleClose() {
    if (busy) return;
    setForm(EMPTY);
    setSelectedCompanyOption(null);
    setError('');
    onClose?.();
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        designation: form.designation.trim(),
        phone: form.phone.trim(),
        linkedinUrl: form.linkedinUrl.trim(),
        campaignId: form.campaignId || undefined,
      };

      if (form.mode === 'existing') {
        if (!form.companyId) {
          throw new Error('Select a company for this contact.');
        }
        payload.companyId = form.companyId;
      } else {
        payload.companyName = form.companyName.trim();
        payload.domain = form.domain.trim();
      }

      const lead = await createStandaloneLead(payload);
      onCreated?.(lead);
      setForm(EMPTY);
      setSelectedCompanyOption(null);
      onClose?.();
    } catch (err) {
      setError(err.message || 'Failed to create contact.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Add contact"
      subtitle="Create a person profile with or without a campaign assignment."
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && <Alert>{error}</Alert>}

        <div className="crm-info-panel">
          <p className="text-sm leading-relaxed">
            Campaign is optional. Leave it blank for standalone relationships, referrals, or contacts you are nurturing outside active outreach.
          </p>
        </div>

        <div className="flex gap-2 rounded-lg border border-[var(--color-line)] bg-neutral-50 p-1">
          <button
            type="button"
            onClick={() => update('mode', 'existing')}
            className={`flex-1 rounded-md px-3 py-2 text-xs font-semibold transition ${form.mode === 'existing' ? 'bg-white text-[var(--color-ink)] shadow-sm' : 'text-neutral-500'}`}
          >
            Link to existing company
          </button>
          <button
            type="button"
            onClick={() => update('mode', 'new')}
            className={`flex-1 rounded-md px-3 py-2 text-xs font-semibold transition ${form.mode === 'new' ? 'bg-white text-[var(--color-ink)] shadow-sm' : 'text-neutral-500'}`}
          >
            Create new company
          </button>
        </div>

        {form.mode === 'existing' ? (
          <Field label="Company">
            <SearchableSelect
              value={form.companyId}
              onChange={(value, option) => {
                update('companyId', value);
                setSelectedCompanyOption(option || null);
              }}
              options={companyOptions}
              onSearch={searchCompanies}
              placeholder="Select company…"
              searchPlaceholder="Search companies…"
              emptyLabel="No companies match."
              required
            />
          </Field>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field label="Company name">
                <input
                  className="crm-input"
                  value={form.companyName}
                  onChange={(e) => update('companyName', e.target.value)}
                  required
                />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Domain">
                <input
                  className="crm-input"
                  value={form.domain}
                  onChange={(e) => update('domain', e.target.value)}
                  placeholder="company.com"
                  required
                />
              </Field>
            </div>
          </div>
        )}

        <Field label="Campaign (optional)">
          <SearchableSelect
            value={form.campaignId}
            onChange={(value) => update('campaignId', value)}
            options={campaignOptions}
            placeholder="No campaign — standalone contact"
            searchPlaceholder="Search campaigns…"
            emptyLabel="No campaigns match."
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name">
            <input className="crm-input" value={form.name} onChange={(e) => update('name', e.target.value)} />
          </Field>
          <Field label="Email">
            <input
              type="email"
              className="crm-input"
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
              required
            />
          </Field>
          <Field label="Job title">
            <input className="crm-input" value={form.designation} onChange={(e) => update('designation', e.target.value)} />
          </Field>
          <Field label="Phone">
            <input className="crm-input" value={form.phone} onChange={(e) => update('phone', e.target.value)} />
          </Field>
          <Field label="LinkedIn URL">
            <input className="crm-input" value={form.linkedinUrl} onChange={(e) => update('linkedinUrl', e.target.value)} />
          </Field>
        </div>

        <div className="flex justify-end gap-2 border-t border-[var(--color-line)] pt-4">
          <button type="button" className="crm-btn-secondary" onClick={handleClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" className="crm-btn-primary" disabled={busy}>
            <Users className="h-4 w-4" />
            {busy ? 'Creating…' : 'Create contact'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
