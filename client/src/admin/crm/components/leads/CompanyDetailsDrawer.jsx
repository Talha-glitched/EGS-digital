import { useEffect, useMemo, useState, useCallback } from 'react';
import { fetchCompanyDetails, updateCompanyDetails, addLeadToCompany, crmApiFetch, deleteLeadWithUndo, deleteLeads } from '../../crmApi.js';
import { Plus, ExternalLink, AlertCircle, Building2, MapPin, Users, Globe, X, Trash2 } from 'lucide-react';
import Drawer from '../ui/Drawer.jsx';
import DrawerLoadingSkeleton from '../ui/DrawerLoadingSkeleton.jsx';
import SearchableSelect from '../ui/SearchableSelect.jsx';
import { Alert, Badge } from '../ui/primitives.jsx';
import PocQualificationBadge from './PocQualificationBadge.jsx';
import { ResponseStatusBadge } from './LeadTableComponents.jsx';
import DrawerCollapsible from './DrawerCollapsible.jsx';
import DrawerTabs from './DrawerTabs.jsx';
import InteractionTimeline from './InteractionTimeline.jsx';
import { BulkSelectCheckbox, BulkSelectionBar } from '../ui/BulkSelectTable.jsx';
import DeleteIconButton from '../ui/DeleteIconButton.jsx';
import { useRowSelection } from '../../hooks/useRowSelection.js';
import { useConfirmDelete } from '../../hooks/useConfirmDelete.js';
import { useBulkDelete } from '../../hooks/useBulkDelete.js';
import SensitiveDataField from '../ui/SensitiveDataField.jsx';
import SensitiveEmailList from '../ui/SensitiveEmailList.jsx';
import { useLockSensitiveDataOnClose } from '../../hooks/useLockSensitiveDataOnClose.js';
import { useDebouncedAutoSave } from '../../hooks/useDebouncedAutoSave.js';
import AutoSaveIndicator from '../ui/AutoSaveIndicator.jsx';
import AutoSaveCloseNotice from '../ui/AutoSaveCloseNotice.jsx';

const STATUS_TONE = {
  'Client Partner': 'success',
  'Active Prospect': 'info',
  Blacklisted: 'neutral',
  Lead: 'neutral',
};

function contactInitials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
}

export default function CompanyDetailsDrawer({ companyId, onClose, onPersonSelected, onUpdated, onDelete }) {
  const isOpen = Boolean(companyId);
  const { closeAndLock } = useLockSensitiveDataOnClose(isOpen);
  const handleClose = useCallback(() => closeAndLock(onClose), [closeAndLock, onClose]);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [campaigns, setCampaigns] = useState([]);
  const [tab, setTab] = useState('account');
  const [timelineCount, setTimelineCount] = useState(null);

  const [companyName, setCompanyName] = useState('');
  const [domain, setDomain] = useState('');
  const [industry, setIndustry] = useState('');
  const [boothNumber, setBoothNumber] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [genericEmails, setGenericEmails] = useState([]);
  const [newGenericEmail, setNewGenericEmail] = useState('');
  const [genericPhone, setGenericPhone] = useState('');
  const [globalStatus, setGlobalStatus] = useState('Lead');
  const [notes, setNotes] = useState('');

  const [addEmail, setAddEmail] = useState('');
  const [addName, setAddName] = useState('');
  const [addDesignation, setAddDesignation] = useState('');
  const [addCampaignId, setAddCampaignId] = useState('');
  const [addError, setAddError] = useState('');
  const [addSuccess, setAddSuccess] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const peopleSelection = useRowSelection(data?.leads || []);

  const confirmDeleteLead = useConfirmDelete({
    resourceType: 'lead',
    deleteFn: deleteLeadWithUndo,
    onRemoved: () => {
      loadDetails();
      onUpdated?.();
      peopleSelection.clearSelection();
    },
    onRestored: () => {
      loadDetails();
      onUpdated?.();
    },
    defaultConfirm: 'Delete this contact? You can undo within 30 seconds.',
  });

  const runBulkDeleteLeads = useBulkDelete({
    resourceType: 'lead',
    bulkDeleteFn: deleteLeads,
    getLabelForId: (id) => {
      const lead = data?.leads?.find((l) => l._id === id);
      return `Deleted contact: ${lead?.name || lead?.email || 'Contact'}`;
    },
    defaultConfirm: 'Delete these contacts? You can undo each within 30 seconds.',
    onRemoved: () => {
      loadDetails();
      onUpdated?.();
      peopleSelection.clearSelection();
    },
    onRestored: () => {
      loadDetails();
      onUpdated?.();
    },
  });

  async function deleteLeadItem(lead) {
    await confirmDeleteLead(
      lead._id,
      `Deleted contact: ${lead.name || lead.email || 'Contact'}`,
    );
  }

  async function handleBulkDeletePeople() {
    setBulkDeleting(true);
    try {
      await runBulkDeleteLeads(peopleSelection.selectedArray, { noun: 'contact' });
    } finally {
      setBulkDeleting(false);
    }
  }

  const loadDetails = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchCompanyDetails(companyId);
      setData(res);
      const c = res.company;
      setCompanyName(c.companyName || '');
      setDomain(c.domain || '');
      setIndustry(c.industry || '');
      setBoothNumber(c.boothNumber || '');
      setCity(c.city || '');
      setCountry(c.country || '');
      setGenericEmails(Array.isArray(c.genericEmails) ? c.genericEmails : (c.genericEmail ? [c.genericEmail] : []));
      setGenericPhone(c.genericPhone || '');
      setGlobalStatus(c.globalStatus || 'Lead');
      setNotes(c.notes || '');
    } catch (err) {
      setError(err.message || 'Failed to load company details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!companyId) return;
    setTab('account');
    loadDetails();
  }, [companyId]);

  useEffect(() => {
    crmApiFetch('/api/admin/projects')
      .then((list) => {
        setCampaigns(list);
      })
      .catch(console.error);
  }, []);

  const companySnapshot = useMemo(() => ({
    companyName,
    domain,
    industry,
    boothNumber,
    city,
    country,
    genericEmails,
    genericPhone,
    globalStatus,
    notes,
  }), [companyName, domain, industry, boothNumber, city, country, genericEmails, genericPhone, globalStatus, notes]);

  const persistCompany = useCallback(async (snapshot) => {
    if (!companyId) return;
    setError('');
    try {
      const updated = await updateCompanyDetails(companyId, snapshot);
      onUpdated?.();
      setData((prev) => (prev ? { ...prev, company: updated } : prev));
    } catch (err) {
      setError(err.message || 'Failed to update company.');
      throw err;
    }
  }, [companyId, onUpdated]);

  const { status: saveStatus, requestClose, closingNotice } = useDebouncedAutoSave({
    snapshot: companySnapshot,
    onSave: persistCompany,
    enabled: Boolean(companyId) && tab === 'account' && !loading,
    resetKey: companyId,
  });

  const guardedClose = useCallback(
    () => requestClose(handleClose),
    [requestClose, handleClose],
  );

  useEffect(() => {
    if (saveStatus !== 'error') return;
    setError('Failed to save company changes. Please try again.');
  }, [saveStatus]);

  const handleAddContact = async (e) => {
    e.preventDefault();
    setAddError('');
    setAddSuccess(false);
    if (!addEmail) {
      return setAddError('Email is required.');
    }
    try {
      await addLeadToCompany(companyId, {
        campaignId: addCampaignId || undefined,
        email: addEmail,
        name: addName,
        designation: addDesignation,
      });
      setAddEmail('');
      setAddName('');
      setAddDesignation('');
      setAddSuccess(true);
      await loadDetails();
      onUpdated?.();
    } catch (err) {
      setAddError(err.message || 'Failed to add contact.');
    }
  };

  const tabs = [
    { id: 'account', label: 'Company' },
    { id: 'people', label: 'People', count: data?.leads?.length || 0 },
    { id: 'timeline', label: 'Timeline', count: timelineCount ?? undefined },
  ];

  const campaignOptions = useMemo(
    () => campaigns.map((c) => ({
      value: c._id,
      label: c.projectName,
    })),
    [campaigns],
  );

  return (
    <>
    <Drawer
      open={Boolean(companyId)}
      onClose={guardedClose}
      title={companyName || 'Company profile'}
      subtitle={domain ? `${domain} · relationship hub` : 'Contacts, timeline, and company details'}
      size="2xl"
      stackLevel={0}
      footer={
        !loading ? (
          <div className="flex gap-3">
            {onDelete && companyId ? (
              <button
                type="button"
                onClick={() => onDelete({ _id: companyId, companyName })}
                className="crm-btn-ghost shrink-0 text-rose-600 hover:bg-rose-50"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            ) : null}
            {tab === 'account' ? (
              <AutoSaveIndicator status={saveStatus} className="flex-1" />
            ) : (
              <span className="flex-1" />
            )}
            <button type="button" onClick={guardedClose} className="crm-btn-secondary shrink-0">
              Close
            </button>
          </div>
        ) : null
      }
    >
      {loading ? (
        <DrawerLoadingSkeleton />
      ) : (
        <>
          {error && (
            <Alert tone="error">
              <span className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </span>
            </Alert>
          )}
          <div className="crm-drawer-hero">
            <div className="flex items-start gap-4">
              <div className="crm-profile-avatar is-brand">
                {(companyName || '?').slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-base font-bold text-ink">{companyName || 'Unnamed company'}</p>
                  <Badge tone={STATUS_TONE[globalStatus] || 'neutral'}>{globalStatus}</Badge>
                </div>
                <p className="mt-1 text-sm text-neutral-600">{industry || 'Industry not set'}</p>
                <div className="crm-profile-meta">
                  {domain && (
                    <span className="crm-profile-chip">
                      <Globe className="h-3 w-3" />
                      {domain}
                    </span>
                  )}
                  {(city || country) && (
                    <span className="crm-profile-chip">
                      <MapPin className="h-3 w-3" />
                      {[city, country].filter(Boolean).join(', ')}
                    </span>
                  )}
                  <span className="crm-profile-chip is-accent">
                    <Users className="h-3 w-3" />
                    {data?.leads?.length || 0} contact{(data?.leads?.length || 0) === 1 ? '' : 's'}
                  </span>
                  {data?.company?.hasResponded && (
                    <span className="crm-profile-chip">
                      <ResponseStatusBadge
                        hasResponded={data.company.hasResponded}
                        respondedAt={data.company.respondedAt}
                        responseChannels={data.company.responseChannels}
                        compact
                      />
                    </span>
                  )}
                  {boothNumber && (
                    <span className="crm-profile-chip">
                      <Building2 className="h-3 w-3" />
                      Stand {boothNumber}
                    </span>
                  )}
                </div>
              </div>
              {domain && (
                <a
                  href={`https://${domain}`}
                  target="_blank"
                  rel="noreferrer"
                  className="crm-drawer-close shrink-0"
                  aria-label="Open website"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
            </div>
          </div>

          <DrawerTabs tabs={tabs} active={tab} onChange={setTab} />

          <div key={tab} className="crm-drawer-tab-panel">
          {tab === 'timeline' && (
            <InteractionTimeline
              companyId={companyId}
              showContact
              contacts={data?.leads || []}
              onCountChange={setTimelineCount}
            />
          )}

          {tab === 'people' && (
            <div className="space-y-4">
              <DrawerCollapsible title="Known contacts" subtitle="Open a person to manage outreach" defaultOpen>
                <div className="pt-4">
                  {!data?.leads?.length ? (
                    <p className="text-sm text-neutral-400">No contacts linked yet.</p>
                  ) : (
                    <>
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <label className="inline-flex items-center gap-2 text-xs font-semibold text-neutral-600">
                          <BulkSelectCheckbox
                            checked={peopleSelection.allSelected}
                            indeterminate={peopleSelection.someSelected && !peopleSelection.allSelected}
                            onChange={peopleSelection.toggleSelectAll}
                            aria-label="Select all contacts"
                          />
                          Select all
                        </label>
                      </div>
                      <BulkSelectionBar
                        count={peopleSelection.selectionCount}
                        noun="contact"
                        onDelete={handleBulkDeletePeople}
                        onClear={peopleSelection.clearSelection}
                        deleting={bulkDeleting}
                        className="mb-3 rounded-lg border border-line"
                      />
                      <div className="space-y-2">
                      {data.leads.map((lead) => (
                        <div
                          key={lead._id}
                          className={`crm-profile-contact-card flex items-center gap-2 ${peopleSelection.isSelected(lead._id) ? 'ring-2 ring-brand/30' : ''}`}
                        >
                          <BulkSelectCheckbox
                            checked={peopleSelection.isSelected(lead._id)}
                            onChange={(e) => peopleSelection.toggleSelect(lead._id, e)}
                            aria-label={`Select ${lead.name || 'contact'}`}
                          />
                          <button
                            type="button"
                            onClick={() => onPersonSelected(lead)}
                            className="flex min-w-0 flex-1 items-center justify-between gap-3 text-left"
                          >
                          <div className="flex min-w-0 flex-1 items-center gap-3 pr-3">
                            <div className="crm-profile-avatar is-neutral h-9! w-9! text-[11px]!">
                              {contactInitials(lead.name)}
                            </div>
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="truncate text-sm font-semibold text-neutral-800">{lead.name || 'Unnamed contact'}</p>
                                <PocQualificationBadge status={lead.pocQualification?.status} compact />
                              </div>
                              <p className="truncate text-xs text-neutral-500">{lead.designation || 'Decision maker'} · {lead.campaignName}</p>
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <ResponseStatusBadge
                              hasResponded={lead.hasResponded}
                              respondedAt={lead.respondedAt}
                              responseChannels={lead.responseChannels}
                              compact
                            />
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${lead.outcome === 'Won' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-50 text-blue-700'}`}>
                              {lead.outcome || 'Pending'}
                            </span>
                          </div>
                          </button>
                          <DeleteIconButton
                            label={`Delete ${lead.name || 'contact'}`}
                            onClick={() => deleteLeadItem(lead)}
                            size="sm"
                          />
                        </div>
                      ))}
                      </div>
                    </>
                  )}
                </div>
              </DrawerCollapsible>

              <DrawerCollapsible title="Add contact" subtitle="Enroll someone new at this company">
                <div className="space-y-3 pt-4">
                  {addSuccess && <Alert tone="success">Contact added and linked.</Alert>}
                  {addError && <Alert tone="error">{addError}</Alert>}
                  <form onSubmit={handleAddContact} className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className="text-xs font-medium text-neutral-600 block mb-1">Campaign (optional)</label>
                      <SearchableSelect
                        className="text-sm"
                        value={addCampaignId}
                        onChange={setAddCampaignId}
                        options={campaignOptions}
                        placeholder="No campaign — standalone contact"
                        searchPlaceholder="Search campaigns…"
                        emptyLabel="No campaigns match."
                      />
                    </div>
                    <div>
                      <SensitiveDataField
                        label="Email"
                        type="email"
                        kind="email"
                        value={addEmail}
                        onChange={setAddEmail}
                        placeholder="contact@..."
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-neutral-600 block mb-1">Full name</label>
                      <input type="text" className="crm-input text-sm" value={addName} onChange={(e) => setAddName(e.target.value)} />
                    </div>
                    <div className="col-span-2">
                      <label className="text-xs font-medium text-neutral-600 block mb-1">Job title</label>
                      <input type="text" className="crm-input text-sm" value={addDesignation} onChange={(e) => setAddDesignation(e.target.value)} />
                    </div>
                    <button type="submit" className="col-span-2 crm-btn-secondary flex items-center justify-center gap-1">
                      <Plus className="h-3.5 w-3.5" />
                      Add & enroll contact
                    </button>
                  </form>
                </div>
              </DrawerCollapsible>
            </div>
          )}

          {tab === 'account' && (
            <div className="space-y-5">
              <DrawerCollapsible title="Company identity" subtitle="Name, domain, industry" defaultOpen>
                <div className="space-y-4 pt-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <label className="block space-y-1.5">
                      <span className="text-xs font-medium text-neutral-600">Company name</span>
                      <input type="text" className="crm-input text-sm" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
                    </label>
                    <label className="block space-y-1.5">
                      <span className="text-xs font-medium text-neutral-600">Domain</span>
                      <div className="relative">
                        <input type="text" className="crm-input crm-input-has-action text-sm" value={domain} onChange={(e) => setDomain(e.target.value)} />
                        {domain && (
                          <a href={`https://${domain}`} target="_blank" rel="noreferrer" className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-brand">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        )}
                      </div>
                    </label>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <label className="block space-y-1.5">
                      <span className="text-xs font-medium text-neutral-600">Industry</span>
                      <input type="text" className="crm-input text-sm" value={industry} onChange={(e) => setIndustry(e.target.value)} />
                    </label>
                    <label className="block space-y-1.5">
                      <span className="text-xs font-medium text-neutral-600">Stand / booth</span>
                      <input type="text" className="crm-input text-sm" value={boothNumber} onChange={(e) => setBoothNumber(e.target.value)} />
                    </label>
                    <label className="block space-y-1.5">
                      <span className="text-xs font-medium text-neutral-600">Status</span>
                      <select className="crm-select text-sm" value={globalStatus} onChange={(e) => setGlobalStatus(e.target.value)}>
                        <option value="Lead">Lead</option>
                        <option value="Active Prospect">Active Prospect</option>
                        <option value="Client Partner">Client Partner</option>
                        <option value="Blacklisted">Blacklisted</option>
                      </select>
                    </label>
                  </div>
                </div>
              </DrawerCollapsible>

              <DrawerCollapsible title="Location & reach" subtitle="City, country, generic contacts">
                <div className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block space-y-1.5">
                      <span className="text-xs font-medium text-neutral-600">City</span>
                      <input type="text" className="crm-input text-sm" value={city} onChange={(e) => setCity(e.target.value)} />
                    </label>
                    <label className="block space-y-1.5">
                      <span className="text-xs font-medium text-neutral-600">Country</span>
                      <input type="text" className="crm-input text-sm" value={country} onChange={(e) => setCountry(e.target.value)} />
                    </label>
                  </div>
                  <div className="space-y-3">
                    <label className="block space-y-1.5">
                      <span className="text-xs font-medium text-neutral-600">Generic emails</span>
                      <SensitiveEmailList
                        emails={genericEmails}
                        onChange={setGenericEmails}
                        inputValue={newGenericEmail}
                        onInputChange={setNewGenericEmail}
                        onAdd={() => {
                          const next = newGenericEmail.trim().toLowerCase();
                          if (!next) return;
                          setGenericEmails((prev) => (prev.includes(next) ? prev : [...prev, next]));
                          setNewGenericEmail('');
                        }}
                      />
                    </label>
                    <SensitiveDataField
                      label="Generic phone"
                      type="tel"
                      kind="phone"
                      value={genericPhone}
                      onChange={setGenericPhone}
                    />
                  </div>
                </div>
              </DrawerCollapsible>

              <DrawerCollapsible title="Notes" subtitle="Internal context for the team">
                <div className="pt-4">
                  <textarea className="crm-input min-h-20 resize-y text-sm" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Relationship notes, access restrictions, preferences…" />
                </div>
              </DrawerCollapsible>
            </div>
          )}
          </div>
        </>
      )}
    </Drawer>
    <AutoSaveCloseNotice open={closingNotice} />
    </>
  );
}
