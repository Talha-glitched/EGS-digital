import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { ExternalLink, AlertCircle, Mail, BriefcaseBusiness, Building2, Trash2 } from 'lucide-react';
import Drawer from '../ui/Drawer.jsx';
import { Alert } from '../ui/primitives.jsx';
import { updateLead, addLeadToCompany, crmApiFetch, normalizeId } from '../../crmApi.js';
import SearchableSelect from '../ui/SearchableSelect.jsx';
import DrawerCollapsible from './DrawerCollapsible.jsx';
import DrawerTabs from './DrawerTabs.jsx';
import InteractionTimeline from './InteractionTimeline.jsx';
import PocQualificationEditor from './PocQualificationEditor.jsx';
import PocQualificationBadge from './PocQualificationBadge.jsx';
import SensitiveDataField from '../ui/SensitiveDataField.jsx';
import SensitiveDataDisplay from '../ui/SensitiveDataDisplay.jsx';
import { DeliveryStatusBadge } from './LeadTableComponents.jsx';
import { needsReferralDetails } from '../../constants/pocQualification.js';
import { RELATIONSHIP_STATUS_OPTIONS, SERVICE_CATEGORY_OPTIONS, getRelationshipOption } from '../../constants/relationshipProfile.js';
import { useLockSensitiveDataOnClose } from '../../hooks/useLockSensitiveDataOnClose.js';
import { useDebouncedAutoSave } from '../../hooks/useDebouncedAutoSave.js';
import AutoSaveIndicator from '../ui/AutoSaveIndicator.jsx';
import AutoSaveCloseNotice from '../ui/AutoSaveCloseNotice.jsx';

function populateFromLead(lead) {
  return {
    formName: lead.name || '',
    formDesignation: lead.designation || '',
    formLinkedinUrl: lead.linkedinUrl || '',
    formEmail: lead.email || '',
    formEmailApollo: lead.emailApollo || '',
    formEmailHunter: lead.emailHunter || '',
    formEmailLusha: lead.emailLusha || '',
    formEmailPersonal: lead.emailPersonal || '',
    formPhone: lead.phone || '',
    formPhoneLusha1: lead.phoneLusha1 || '',
    formPhoneLusha2: lead.phoneLusha2 || '',
    formWhatsappNumber: lead.whatsappNumber || '',
    formOutcome: lead.outcome || 'Pending',
    formCampaignId: lead.campaignId?._id || lead.campaignId || '',
    formDeliveryStatus: lead.deliveryStatus || 'Pending Inqueue',
    formLiConnSent: lead.linkedinOutreach?.connSent || false,
    formLiAccepted: lead.linkedinOutreach?.accepted || false,
    formLiInmailSent: lead.linkedinOutreach?.inmailSent || false,
    formLiDmSent: lead.linkedinOutreach?.dmSent || false,
    formLiNotes: lead.linkedinOutreach?.notes || '',
    formCcMade: lead.coldCall?.made || false,
    formCcResponse: lead.coldCall?.response || '',
    formCcNotes: lead.coldCall?.notes || '',
    formWaSent: lead.whatsapp?.sent || false,
    formWaResponse: lead.whatsapp?.response || '',
    formOutreachEmail: lead.outreachEmail || '',
    formOutreachEmailSource: lead.outreachEmailSource || '',
    pocQualification: {
      status: lead.pocQualification?.status || 'Unverified',
      notes: lead.pocQualification?.notes || '',
      referredLeadId: lead.pocQualification?.referredLeadId || null,
      referral: {
        name: lead.pocQualification?.referral?.name || '',
        email: lead.pocQualification?.referral?.email || '',
        phone: lead.pocQualification?.referral?.phone || '',
        designation: lead.pocQualification?.referral?.designation || '',
        linkedinUrl: lead.pocQualification?.referral?.linkedinUrl || '',
      },
    },
    relationshipProfile: {
      status: lead.relationshipProfile?.status || 'New',
      owner: lead.relationshipProfile?.owner || '',
      serviceCategories: lead.relationshipProfile?.serviceCategories || [],
      nextFollowUpAt: toDateTimeLocal(lead.relationshipProfile?.nextFollowUpAt),
      reminderNotes: lead.relationshipProfile?.reminderNotes || '',
    },
  };
}

function toDateTimeLocal(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

function contactInitials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
}

function collectOutreachEmailOptions(form) {
  const options = [];
  const add = (source, email) => {
    for (const part of String(email || '').split(/[;,]/)) {
      const trimmed = part.trim().toLowerCase();
      if (!trimmed) continue;
      if (options.some((row) => row.email === trimmed)) continue;
      options.push({ source, email: trimmed });
    }
  };
  add('Apollo', form.formEmailApollo);
  add('Hunter', form.formEmailHunter);
  add('Lusha', form.formEmailLusha);
  add('Personal', form.formEmailPersonal);
  add('Manual', form.formEmail);
  return options;
}

const TABS = [
  { id: 'profile', label: 'Profile' },
  { id: 'relationship', label: 'Relationship' },
  { id: 'timeline', label: 'Timeline' },
];

export default function OutreachDrawer({ lead, onClose, onLeadUpdated, onDelete, stackLevel = 0, initialTab = 'profile' }) {
  const isOpen = Boolean(lead);
  const { closeAndLock } = useLockSensitiveDataOnClose(isOpen);
  const handleClose = useCallback(() => closeAndLock(onClose), [closeAndLock, onClose]);

  const [tab, setTab] = useState(initialTab);
  const [error, setError] = useState('');
  const [detectingOutreach, setDetectingOutreach] = useState(false);
  const [campaigns, setCampaigns] = useState([]);
  const [form, setForm] = useState(() => (lead ? populateFromLead(lead) : {}));
  const leadRef = useRef(lead);

  leadRef.current = lead;

  useEffect(() => {
    crmApiFetch('/api/admin/projects')
      .then((items) => setCampaigns(items || []))
      .catch(() => setCampaigns([]));
  }, []);

  const campaignOptions = useMemo(
    () => campaigns.map((campaign) => ({
      value: campaign._id,
      label: campaign.projectName,
    })),
    [campaigns],
  );

  const outreachEmailOptions = useMemo(() => collectOutreachEmailOptions(form), [form]);

  async function handleAutoDetectOutreach() {
    if (!lead?._id) return;
    setDetectingOutreach(true);
    setError('');
    try {
      const updated = await updateLead(lead._id, { autoDetectOutreach: true });
      setForm((prev) => ({
        ...prev,
        formOutreachEmail: updated.outreachEmail || '',
        formOutreachEmailSource: updated.outreachEmailSource || '',
      }));
      onLeadUpdated?.(updated);
    } catch (err) {
      setError(err.message || 'Could not detect outreach email.');
    } finally {
      setDetectingOutreach(false);
    }
  }

  useEffect(() => {
    if (lead) {
      setForm(populateFromLead(lead));
      setError('');
      setTab(initialTab);
    }
  }, [lead, initialTab]);

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const toggleServiceCategory = (category) => {
    const existing = form.relationshipProfile?.serviceCategories || [];
    const next = existing.includes(category)
      ? existing.filter((item) => item !== category)
      : [...existing, category];
    set('relationshipProfile', { ...form.relationshipProfile, serviceCategories: next });
  };

  const buildPatch = useCallback((currentForm) => ({
    name: currentForm.formName.trim(),
    designation: currentForm.formDesignation.trim(),
    linkedinUrl: currentForm.formLinkedinUrl.trim(),
    email: currentForm.formEmail.trim(),
    emailApollo: currentForm.formEmailApollo.trim(),
    emailHunter: currentForm.formEmailHunter.trim(),
    emailLusha: currentForm.formEmailLusha.trim(),
    emailPersonal: currentForm.formEmailPersonal.trim(),
    phone: currentForm.formPhone.trim(),
    phoneLusha1: currentForm.formPhoneLusha1.trim(),
    phoneLusha2: currentForm.formPhoneLusha2.trim(),
    whatsappNumber: currentForm.formWhatsappNumber.trim(),
    outcome: currentForm.formOutcome,
    campaignId: currentForm.formCampaignId || null,
    deliveryStatus: currentForm.formDeliveryStatus,
    linkedinOutreach: {
      connSent: currentForm.formLiConnSent,
      accepted: currentForm.formLiAccepted,
      inmailSent: currentForm.formLiInmailSent,
      dmSent: currentForm.formLiDmSent,
      notes: currentForm.formLiNotes.trim(),
    },
    coldCall: {
      made: currentForm.formCcMade,
      response: currentForm.formCcResponse,
      notes: currentForm.formCcNotes.trim(),
    },
    whatsapp: {
      sent: currentForm.formWaSent,
      response: currentForm.formWaResponse,
    },
    outreachEmail: currentForm.formOutreachEmail.trim(),
    outreachEmailSource: currentForm.formOutreachEmailSource,
    pocQualification: currentForm.pocQualification,
    relationshipProfile: {
      ...currentForm.relationshipProfile,
      owner: currentForm.relationshipProfile?.owner?.trim() || '',
      reminderNotes: currentForm.relationshipProfile?.reminderNotes?.trim() || '',
      serviceCategories: (currentForm.relationshipProfile?.serviceCategories || []).filter(Boolean),
      nextFollowUpAt: currentForm.relationshipProfile?.nextFollowUpAt
        ? new Date(currentForm.relationshipProfile.nextFollowUpAt).toISOString()
        : null,
    },
  }), []);

  const persistContact = useCallback(async (currentForm) => {
    const activeLead = leadRef.current;
    if (!activeLead) return;

    setError('');
    const patch = buildPatch(currentForm);
    const poc = currentForm.pocQualification || {};
    const referral = poc.referral || {};

    if (needsReferralDetails(poc.status) && referral.email?.trim() && !poc.referredLeadId) {
      const companyId = activeLead.companyId?._id || activeLead.companyId;
      const campaignId = activeLead.campaignId?._id || activeLead.campaignId;
      if (companyId && campaignId) {
        try {
          const referred = await addLeadToCompany(companyId, {
            campaignId,
            email: referral.email.trim(),
            name: referral.name?.trim() || '',
            designation: referral.designation?.trim() || '',
            phone: referral.phone?.trim() || '',
            linkedinUrl: referral.linkedinUrl?.trim() || '',
          });
          patch.pocQualification = {
            ...patch.pocQualification,
            referredLeadId: referred._id,
          };
        } catch (referralErr) {
          if (!String(referralErr.message || '').includes('already enrolled')) {
            throw referralErr;
          }
        }
      }
    }

    try {
      const updated = await updateLead(activeLead._id, patch);
      onLeadUpdated?.(updated);
    } catch (err) {
      setError(err.message || 'Failed to update lead');
      throw err;
    }
  }, [buildPatch, onLeadUpdated]);

  const { status: saveStatus, requestClose, closingNotice } = useDebouncedAutoSave({
    snapshot: form,
    onSave: persistContact,
    enabled: Boolean(lead) && tab !== 'timeline',
    resetKey: lead?._id,
  });

  const guardedClose = useCallback(
    () => requestClose(handleClose),
    [requestClose, handleClose],
  );

  return (
    <>
    <Drawer
      open={Boolean(lead)}
      onClose={guardedClose}
      title={lead?.name || 'Contact profile'}
      subtitle={lead ? `${lead.companyName || 'Unknown company'} · ${lead.campaignName || 'No campaign'}` : ''}
      size="2xl"
      stackLevel={stackLevel}
      footer={
        <div className="flex items-center gap-3">
          {onDelete && lead ? (
            <button
              type="button"
              onClick={() => onDelete(lead)}
              className="crm-btn-ghost shrink-0 text-rose-600 hover:bg-rose-50"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          ) : null}
          {tab !== 'timeline' ? <AutoSaveIndicator status={saveStatus} className="flex-1" /> : <span className="flex-1" />}
          <button type="button" onClick={guardedClose} className="crm-btn-secondary shrink-0">
            Close
          </button>
        </div>
      }
    >
      {error && (
        <Alert tone="error">
          <span className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </span>
        </Alert>
      )}

      {lead && (
        <div className="crm-drawer-hero">
          <div className="flex items-start gap-4">
            <div className="crm-profile-avatar is-neutral">
              {contactInitials(lead.name)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-base font-bold text-[var(--color-ink)]">{lead.name || 'Unnamed contact'}</p>
                <PocQualificationBadge status={form.pocQualification?.status} compact />
                <RelationshipStatusPill status={form.relationshipProfile?.status} />
              </div>
              <p className="mt-1 text-sm text-neutral-600">{lead.designation || 'Decision maker'}</p>
              <div className="crm-profile-meta">
                <span className="crm-profile-chip">
                  <Building2 className="h-3 w-3" />
                  {lead.companyName || 'Unknown company'}
                </span>
                {(lead.outreachEmail || lead.email) && (
                  <span className={`crm-profile-chip ${lead.outreachEmail ? 'is-accent border-emerald-300 text-emerald-800 font-semibold' : ''}`}>
                    <Mail className="h-3 w-3 text-emerald-600" />
                    <SensitiveDataDisplay value={lead.outreachEmail || lead.email} kind="email" />
                  </span>
                )}
                {lead.campaignName && (
                  <span className="crm-profile-chip is-accent">
                    <BriefcaseBusiness className="h-3 w-3" />
                    {lead.campaignName}
                  </span>
                )}
                <DeliveryStatusBadge status={form.formDeliveryStatus || lead.deliveryStatus} />
              </div>
              {!!form.relationshipProfile?.serviceCategories?.length && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {form.relationshipProfile.serviceCategories.slice(0, 3).map((category) => (
                    <span key={category} className="inline-flex rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-600">
                      {category}
                    </span>
                  ))}
                  {form.relationshipProfile.serviceCategories.length > 3 && (
                    <span className="inline-flex rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-600">
                      +{form.relationshipProfile.serviceCategories.length - 3} more
                    </span>
                  )}
                </div>
              )}
            </div>
            {form.formLinkedinUrl && (
              <a
                href={form.formLinkedinUrl}
                target="_blank"
                rel="noreferrer"
                className="crm-drawer-close shrink-0"
                aria-label="Open LinkedIn profile"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
          </div>
        </div>
      )}

      <DrawerTabs tabs={TABS} active={tab} onChange={setTab} />

      <div key={tab} className="crm-drawer-tab-panel">
      {tab === 'timeline' ? (
        <InteractionTimeline leadId={lead?._id} companyId={normalizeId(lead?.companyId)} />
      ) : tab === 'relationship' ? (
        <div className="space-y-0">
          <DrawerCollapsible title="Relationship state" subtitle="Manage relevant POCs even when the timing is later" defaultOpen>
            <div className="space-y-4 pt-4">
              <p className="text-xs leading-relaxed text-neutral-500">
                Use this tab for the right contact when there is real fit, but not necessarily an immediate live deal. Capture what they care about and when to come back.
              </p>

              {form.pocQualification?.status !== 'Confirmed' && (
                <Alert tone="info">
                  This workspace is most useful once the contact is marked as the right POC, but you can still prepare the relationship plan now.
                </Alert>
              )}

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {RELATIONSHIP_STATUS_OPTIONS.map((option) => {
                  const active = form.relationshipProfile?.status === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => set('relationshipProfile', { ...form.relationshipProfile, status: option.value })}
                      className={[
                        'rounded-lg border p-3 text-left transition-all duration-200',
                        active ? 'border-brand bg-brand-soft/40 ring-2 ring-brand/10' : 'border-neutral-200 hover:border-neutral-300',
                      ].join(' ')}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span className="text-[13px] font-semibold text-[var(--color-ink)]">{option.label}</span>
                        {active && <RelationshipStatusPill status={option.value} compact />}
                      </div>
                      <p className="mt-1 text-[11px] leading-snug text-neutral-500">{option.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          </DrawerCollapsible>

          <DrawerCollapsible title="Service fit" subtitle="What can this contact realistically buy from us?" defaultOpen>
            <div className="space-y-4 pt-4">
              <p className="text-xs leading-relaxed text-neutral-500">
                A single contact can map to multiple EGS categories. This helps you revisit the relationship with the right angle later.
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {SERVICE_CATEGORY_OPTIONS.map((category) => {
                  const selected = form.relationshipProfile?.serviceCategories?.includes(category);
                  return (
                    <button
                      key={category}
                      type="button"
                      onClick={() => toggleServiceCategory(category)}
                      className={[
                        'rounded-lg border px-3 py-2.5 text-left text-sm font-medium transition',
                        selected ? 'border-brand bg-brand-soft/40 text-brand ring-2 ring-brand/10' : 'border-neutral-200 text-neutral-700 hover:border-neutral-300',
                      ].join(' ')}
                    >
                      {category}
                    </button>
                  );
                })}
              </div>
            </div>
          </DrawerCollapsible>

          <DrawerCollapsible title="Follow-up plan" subtitle="Set the next relationship reminder and internal context" defaultOpen>
            <div className="space-y-4 pt-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="block space-y-1.5">
                  <span className="text-xs font-medium text-neutral-600">Relationship owner</span>
                  <input
                    type="text"
                    className="crm-input text-sm"
                    value={form.relationshipProfile?.owner || ''}
                    onChange={(e) => set('relationshipProfile', { ...form.relationshipProfile, owner: e.target.value })}
                    placeholder="Who should own this relationship?"
                  />
                </label>
                <label className="block space-y-1.5">
                  <span className="text-xs font-medium text-neutral-600">Next follow-up / reminder</span>
                  <input
                    type="datetime-local"
                    className="crm-input text-sm"
                    value={form.relationshipProfile?.nextFollowUpAt || ''}
                    onChange={(e) => set('relationshipProfile', { ...form.relationshipProfile, nextFollowUpAt: e.target.value })}
                  />
                </label>
              </div>
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-neutral-600">Relationship notes</span>
                <textarea
                  className="crm-input min-h-[5rem] resize-y text-sm"
                  value={form.relationshipProfile?.reminderNotes || ''}
                  onChange={(e) => set('relationshipProfile', { ...form.relationshipProfile, reminderNotes: e.target.value })}
                  placeholder="Timing, budget cycle, service interest, internal politics, when to re-approach, or what to reference next time…"
                />
              </label>
            </div>
          </DrawerCollapsible>
        </div>
      ) : (
        <div className="space-y-0">
          <DrawerCollapsible title="POC verification" subtitle="Is this the right person to speak with?" defaultOpen>
            <div className="pt-4">
              <PocQualificationEditor
                value={form.pocQualification}
                onChange={(pocQualification) => setForm((prev) => ({ ...prev, pocQualification }))}
              />
            </div>
          </DrawerCollapsible>

          <DrawerCollapsible title="Identity & role" subtitle="Name, title, LinkedIn">
            <div className="space-y-4 pt-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Full name" value={form.formName} onChange={(v) => set('formName', v)} />
                <Field label="Job title" value={form.formDesignation} onChange={(v) => set('formDesignation', v)} />
              </div>
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-neutral-600">LinkedIn profile</span>
                <div className="relative">
                  <input
                    type="text"
                    className="crm-input crm-input-has-action"
                    value={form.formLinkedinUrl}
                    onChange={(e) => set('formLinkedinUrl', e.target.value)}
                    placeholder="https://linkedin.com/in/..."
                  />
                  {form.formLinkedinUrl && (
                    <a href={form.formLinkedinUrl} target="_blank" rel="noreferrer" className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-brand">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </div>
              </label>
            </div>
          </DrawerCollapsible>

          <DrawerCollapsible title="Contact channels" subtitle="Vendor emails and confirmed outreach address">
            <div className="space-y-4 pt-4">
              <div className="rounded-lg border border-emerald-100 bg-emerald-50/60 px-3 py-2.5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="text-xs font-semibold uppercase tracking-wide text-emerald-800">Confirmed outreach email</div>
                  <button
                    type="button"
                    className="crm-btn-secondary !py-1 text-[11px]"
                    onClick={handleAutoDetectOutreach}
                    disabled={detectingOutreach}
                  >
                    {detectingOutreach ? 'Detecting…' : 'Auto-detect'}
                  </button>
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-emerald-800/80">
                  Set manually below, or auto-detect from the last sequence send / sole vendor email / inbox reply.
                </p>
                <label className="mt-3 block space-y-1.5">
                  <span className="text-xs font-medium text-emerald-900">Working email</span>
                  <select
                    className="crm-select text-sm"
                    value={form.formOutreachEmail || ''}
                    onChange={(e) => {
                      const email = e.target.value;
                      const match = outreachEmailOptions.find((row) => row.email === email);
                      setForm((prev) => ({
                        ...prev,
                        formOutreachEmail: email,
                        formOutreachEmailSource: match?.source || (email ? 'Manual' : ''),
                      }));
                    }}
                  >
                    <option value="">Not confirmed yet</option>
                    {outreachEmailOptions.map((row) => (
                      <option key={`${row.source}-${row.email}`} value={row.email}>
                        {row.source}: {row.email}
                      </option>
                    ))}
                  </select>
                </label>
                {form.formOutreachEmail ? (
                  <div className="mt-2 font-mono text-sm text-emerald-900">
                    <SensitiveDataDisplay value={form.formOutreachEmail} kind="email" />
                  </div>
                ) : null}
                {form.formOutreachEmailSource ? (
                  <div className="mt-1 text-xs text-emerald-700">Source: {form.formOutreachEmailSource}</div>
                ) : null}
              </div>
              <SensitiveDataField
                label="Internal record email (dedup key)"
                type="email"
                kind="email"
                value={form.formEmail}
                onChange={(v) => set('formEmail', v)}
              />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {[
                  ['formEmailApollo', 'Apollo email', 'email', 'email'],
                  ['formEmailHunter', 'Hunter email', 'email', 'email'],
                  ['formEmailLusha', 'Lusha email', 'email', 'email'],
                  ['formEmailPersonal', 'Personal / private email', 'email', 'email'],
                  ['formPhoneLusha1', 'Lusha phone 1', 'tel', 'phone'],
                  ['formPhoneLusha2', 'Lusha phone 2', 'tel', 'phone'],
                  ['formPhone', 'Outreach phone', 'tel', 'phone'],
                ].map(([key, label, type, kind]) => (
                  <SensitiveDataField
                    key={key}
                    label={label}
                    type={type}
                    kind={kind}
                    value={form[key]}
                    onChange={(v) => set(key, v)}
                  />
                ))}
              </div>
              <SensitiveDataField
                label="WhatsApp number"
                type="tel"
                kind="phone"
                value={form.formWhatsappNumber}
                onChange={(v) => set('formWhatsappNumber', v)}
                placeholder="e.g. 971501234567"
              />
            </div>
          </DrawerCollapsible>

          <DrawerCollapsible title="Campaign assignment" subtitle="Link this contact to an outreach campaign" defaultOpen>
            <div className="space-y-4 pt-4">
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-neutral-600">Campaign</span>
                <SearchableSelect
                  value={form.formCampaignId}
                  onChange={(value) => set('formCampaignId', value)}
                  options={campaignOptions}
                  placeholder="No campaign — standalone contact"
                  searchPlaceholder="Search campaigns…"
                  emptyLabel="No campaigns match."
                />
              </label>
              <p className="text-xs leading-relaxed text-neutral-500">
                Assign a campaign so this contact appears in sequence audiences and campaign reporting. Leave blank for standalone contacts.
              </p>
            </div>
          </DrawerCollapsible>

          <DrawerCollapsible title="Campaign status" subtitle="Email delivery & outcome">
            <div className="grid grid-cols-1 gap-4 pt-4 sm:grid-cols-2">
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-neutral-600">Outbound email status</span>
                <select className="crm-select" value={form.formDeliveryStatus} onChange={(e) => set('formDeliveryStatus', e.target.value)}>
                  <option value="Pending Inqueue">Pending Inqueue</option>
                  <option value="Emailed Outbound">Emailed Outbound</option>
                  <option value="Bounced / Invalid">Bounced / Invalid</option>
                  <option value="Opted Out">Opted Out</option>
                  <option value="Replied">Replied</option>
                </select>
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-neutral-600">Campaign outcome</span>
                <select className="crm-select" value={form.formOutcome} onChange={(e) => set('formOutcome', e.target.value)}>
                  <option value="Pending">Pending</option>
                  <option value="Call Scheduled">Call Scheduled</option>
                  <option value="Won">Won (Client Partner)</option>
                  <option value="Opted Out">Opted Out</option>
                  <option value="Lost">Lost</option>
                </select>
              </label>
            </div>
          </DrawerCollapsible>

          <DrawerCollapsible title="Outreach touches" subtitle="Calls, LinkedIn, WhatsApp">
            <div className="space-y-5 pt-4">
              <div>
                <p className="mb-2 text-xs font-semibold text-neutral-500">Cold call</p>
                <label className="flex items-center gap-2 text-sm text-neutral-700">
                  <input type="checkbox" className="rounded border-neutral-300 text-brand" checked={form.formCcMade} onChange={(e) => set('formCcMade', e.target.checked)} />
                  Call made
                </label>
                {form.formCcMade && (
                  <div className="mt-3 space-y-2">
                    <input type="text" className="crm-input text-sm" value={form.formCcResponse} onChange={(e) => set('formCcResponse', e.target.value)} placeholder="Who did you speak with?" />
                    <textarea className="crm-input min-h-[4rem] resize-y text-sm" value={form.formCcNotes} onChange={(e) => set('formCcNotes', e.target.value)} placeholder="Call notes…" />
                  </div>
                )}
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold text-neutral-500">LinkedIn</p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {[
                    ['formLiConnSent', 'Connection sent'],
                    ['formLiAccepted', 'Connection accepted'],
                    ['formLiInmailSent', 'InMail sent'],
                    ['formLiDmSent', 'Direct message sent'],
                  ].map(([key, label]) => (
                    <label key={key} className="flex items-center gap-2 text-sm text-neutral-700">
                      <input type="checkbox" className="rounded border-neutral-300 text-brand" checked={form[key]} onChange={(e) => set(key, e.target.checked)} />
                      {label}
                    </label>
                  ))}
                </div>
                <textarea className="crm-input mt-3 min-h-[3.5rem] resize-y text-sm" value={form.formLiNotes} onChange={(e) => set('formLiNotes', e.target.value)} placeholder="LinkedIn notes…" />
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold text-neutral-500">WhatsApp</p>
                <label className="flex items-center gap-2 text-sm text-neutral-700">
                  <input type="checkbox" className="rounded border-neutral-300 text-brand" checked={form.formWaSent} onChange={(e) => set('formWaSent', e.target.checked)} />
                  Message sent
                </label>
                {form.formWaSent && (
                  <input type="text" className="crm-input mt-2 text-sm" value={form.formWaResponse} onChange={(e) => set('formWaResponse', e.target.value)} placeholder="Response summary" />
                )}
              </div>
            </div>
          </DrawerCollapsible>
        </div>
      )}
      </div>
    </Drawer>
    <AutoSaveCloseNotice open={closingNotice} />
    </>
  );
}

function RelationshipStatusPill({ status = 'New', compact = false }) {
  const option = getRelationshipOption(status);
  const toneClasses = {
    neutral: 'bg-neutral-100 text-neutral-600 ring-neutral-200/70',
    success: 'bg-emerald-50 text-emerald-700 ring-emerald-200/70',
    info: 'bg-sky-50 text-sky-700 ring-sky-200/70',
    warning: 'bg-amber-50 text-amber-800 ring-amber-200/70',
    danger: 'bg-red-50 text-red-700 ring-red-200/70',
  };
  return (
    <span
      className={[
        'inline-flex items-center rounded-full font-semibold ring-1 ring-inset',
        compact ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-[11px]',
        toneClasses[option.tone] || toneClasses.neutral,
      ].join(' ')}
    >
      {option.label}
    </span>
  );
}

function Field({ label, value, onChange, type = 'text', placeholder }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-neutral-600">{label}</span>
      <input
        type={type}
        className="crm-input text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}
