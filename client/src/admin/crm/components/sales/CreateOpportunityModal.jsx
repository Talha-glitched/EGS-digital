import { useEffect, useMemo, useState } from 'react';
import { BriefcaseBusiness } from 'lucide-react';
import { Modal } from '../ui/Modal.jsx';
import { Alert, Field } from '../ui/primitives.jsx';
import SearchableSelect from '../ui/SearchableSelect.jsx';
import { ModalActionFooter, ModalFieldList, ModalSection, ModalStack } from '../ui/workspaceModalParts.jsx';
import AddCompanyModal from '../leads/AddCompanyModal.jsx';
import { createOpportunity, fetchCompanyDetails, fetchGlobalCompanies } from '../../crmApi.js';

function emptyForm(owner = '') {
  return {
    name: '',
    companyId: '',
    campaignId: '',
    primaryLeadId: '',
    valueAed: '',
    nextAction: '',
    eventName: '',
    notes: '',
    owner,
  };
}

export default function CreateOpportunityModal({
  open,
  onClose,
  onCreated,
  companies = [],
  campaigns = [],
  contacts = [],
  currentUser = 'admin',
}) {
  const [form, setForm] = useState(() => emptyForm(currentUser));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showAddCompany, setShowAddCompany] = useState(false);
  const [localCompanies, setLocalCompanies] = useState(companies);
  const [companyContacts, setCompanyContacts] = useState([]);
  const [loadingContacts, setLoadingContacts] = useState(false);

  useEffect(() => {
    setLocalCompanies(companies);
  }, [companies]);

  useEffect(() => {
    if (open) {
      setForm(emptyForm(currentUser));
      setError('');
    }
  }, [open, currentUser]);

  const companyOptions = useMemo(
    () => localCompanies.map((company) => ({
      value: company._id,
      label: company.companyName,
      hint: company.domain || company.city || '',
    })),
    [localCompanies],
  );

  const campaignOptions = useMemo(
    () => campaigns.map((campaign) => ({
      value: campaign._id,
      label: campaign.projectName,
    })),
    [campaigns],
  );

  const contactOptions = useMemo(() => {
    const companyId = form.companyId;
    const source = companyContacts.length
      ? companyContacts
      : contacts.filter((contact) => !companyId || String(contact.companyId?._id || contact.companyId) === String(companyId));
    return source
      .map((contact) => ({
        value: contact._id,
        label: contact.name || contact.email,
        hint: [contact.designation, contact.email].filter(Boolean).join(' · '),
      }));
  }, [companyContacts, contacts, form.companyId]);

  useEffect(() => {
    if (!open || !form.companyId) {
      setCompanyContacts([]);
      setLoadingContacts(false);
      return;
    }
    let cancelled = false;
    setLoadingContacts(true);
    fetchCompanyDetails(form.companyId)
      .then((data) => {
        if (!cancelled) setCompanyContacts(data?.leads || []);
      })
      .catch(() => {
        if (!cancelled) setCompanyContacts([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingContacts(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, form.companyId]);

  function update(field, value) {
    setForm((prev) => {
      if (field === 'companyId') {
        return { ...prev, companyId: value, primaryLeadId: '' };
      }
      return { ...prev, [field]: value };
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const payload = {
        ...form,
        valueAed: form.valueAed === '' ? 0 : Number(form.valueAed),
        primaryLeadId: form.primaryLeadId || null,
        campaignId: form.campaignId || null,
      };
      const created = await createOpportunity(payload);
      onCreated?.(created);
      onClose?.();
    } catch (err) {
      setError(err.message || 'Failed to create opportunity.');
    } finally {
      setBusy(false);
    }
  }

  function handleCompanyCreated(company) {
    setLocalCompanies((prev) => [company, ...prev]);
    update('companyId', company._id);
    setShowAddCompany(false);
  }

  return (
    <>
      <Modal
        open={open}
        onClose={() => !busy && onClose?.()}
        title="New sales opportunity"
        subtitle="Capture commercial work once a prospect shows genuine interest."
        size="lg"
        icon={BriefcaseBusiness}
        accent="brand"
        footer={(
          <ModalActionFooter>
            <button type="button" className="crm-btn-secondary" onClick={onClose} disabled={busy}>Cancel</button>
            <button type="submit" form="create-opportunity-form" disabled={busy || !form.name || !form.companyId} className="crm-btn-primary">
              {busy ? 'Creating…' : 'Create opportunity'}
            </button>
          </ModalActionFooter>
        )}
      >
        <form id="create-opportunity-form" onSubmit={handleSubmit}>
          <ModalStack>
            {error && <Alert>{error}</Alert>}

            <ModalSection
              title="Deal basics"
              description="Name the opportunity and link it to a company."
            >
              <ModalFieldList>
                <Field label="Opportunity name" required>
                  <input
                    autoFocus
                    className="crm-input"
                    value={form.name}
                    onChange={(e) => update('name', e.target.value)}
                    placeholder="GITEX 2026 exhibition stand"
                    required
                  />
                </Field>

                <div className="crm-modal-field-grid">
                  <Field label="Company" required>
                    <SearchableSelect
                      value={form.companyId}
                      onChange={(value) => update('companyId', value)}
                      options={companyOptions}
                      placeholder="Select company…"
                      searchPlaceholder="Search companies…"
                      emptyLabel="No companies match. Create one below."
                      onCreateNew={() => setShowAddCompany(true)}
                      createLabel="Create new company"
                      onSearch={async (query) => {
                        const data = await fetchGlobalCompanies({ search: query, page: 1, limit: 25 });
                        return (data.items || []).map((company) => ({
                          value: company._id,
                          label: company.companyName,
                          hint: company.domain || company.city || '',
                        }));
                      }}
                      minQueryLength={2}
                      required
                    />
                  </Field>

                  <Field label="Campaign / project">
                    <SearchableSelect
                      value={form.campaignId}
                      onChange={(value) => update('campaignId', value)}
                      options={campaignOptions}
                      placeholder="No campaign"
                      searchPlaceholder="Search campaigns…"
                      emptyLabel="No campaigns match."
                    />
                  </Field>

                  <Field label="Primary POC" hint="Links this deal to the right contact across timelines.">
                    <SearchableSelect
                      value={form.primaryLeadId}
                      onChange={(value) => update('primaryLeadId', value)}
                      options={contactOptions}
                      placeholder={form.companyId ? 'Select contact…' : 'Select a company first'}
                      searchPlaceholder="Search contacts…"
                      emptyLabel={form.companyId ? (loadingContacts ? 'Loading company contacts…' : 'No contacts for this company.') : 'Choose a company first.'}
                      disabled={!form.companyId}
                      searching={loadingContacts}
                    />
                  </Field>

                  <Field label="Event / exhibition">
                    <input
                      className="crm-input"
                      value={form.eventName}
                      onChange={(e) => update('eventName', e.target.value)}
                      placeholder="GITEX Global 2026"
                    />
                  </Field>
                </div>
              </ModalFieldList>
            </ModalSection>

            <ModalSection
              title="Commercial details"
              description="Value, owner, and opened date are tracked automatically."
            >
              <ModalFieldList>
                <div className="crm-modal-field-grid">
                  <Field label="Potential contract value (AED)">
                    <input
                      type="number"
                      min="0"
                      className="crm-input"
                      value={form.valueAed}
                      onChange={(e) => update('valueAed', e.target.value)}
                      placeholder="150000"
                    />
                  </Field>

                  <Field label="Owner" hint="Set automatically to the signed-in user.">
                    <div className="crm-readonly-field">
                      <span className="text-sm font-medium text-[var(--color-ink)]">{form.owner || currentUser}</span>
                    </div>
                  </Field>

                  <Field label="Opened on" hint="Recorded automatically when the opportunity is created.">
                    <div className="crm-readonly-field">
                      <span className="text-sm font-medium text-[var(--color-ink)]">
                        {new Date().toLocaleDateString('en-AE', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                  </Field>
                </div>

                <Field label="Next action">
                  <input
                    className="crm-input"
                    value={form.nextAction}
                    onChange={(e) => update('nextAction', e.target.value)}
                    placeholder="Schedule discovery call with marketing director"
                  />
                </Field>

                <Field label="Notes">
                  <textarea
                    className="crm-input min-h-[96px] resize-y"
                    value={form.notes}
                    onChange={(e) => update('notes', e.target.value)}
                    placeholder="Context, stakeholders, or internal notes…"
                  />
                </Field>
              </ModalFieldList>
            </ModalSection>
          </ModalStack>
        </form>
      </Modal>

      <AddCompanyModal
        open={showAddCompany}
        onClose={() => setShowAddCompany(false)}
        onCreated={handleCompanyCreated}
      />
    </>
  );
}
