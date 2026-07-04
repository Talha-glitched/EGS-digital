import { useEffect, useMemo, useState } from 'react';
import { Save, ExternalLink, AlertCircle, Mail, BriefcaseBusiness, Building2, Trash2 } from 'lucide-react';
import Drawer from '../ui/Drawer.jsx';
import { Alert } from '../ui/primitives.jsx';
import { updateLead, addLeadToCompany, crmApiFetch } from '../../crmApi.js';
import SearchableSelect from '../ui/SearchableSelect.jsx';
import DrawerCollapsible from './DrawerCollapsible.jsx';
import DrawerTabs from './DrawerTabs.jsx';
import InteractionTimeline from './InteractionTimeline.jsx';
import PocQualificationEditor from './PocQualificationEditor.jsx';
import PocQualificationBadge from './PocQualificationBadge.jsx';
import { DeliveryStatusBadge } from './LeadTableComponents.jsx';
import { needsReferralDetails } from '../../constants/pocQualification.js';
import { RELATIONSHIP_STATUS_OPTIONS, SERVICE_CATEGORY_OPTIONS, getRelationshipOption } from '../../constants/relationshipProfile.js';

function populateFromLead(lead) {
  return {
    formName: lead.name || '',
    formDesignation: lead.designation || '',
    formLinkedinUrl: lead.linkedinUrl || '',
    formEmail: lead.email || '',
    formEmailApollo: lead.emailApollo || '',
    formEmailHunter: lead.emailHunter || '',
    formEmailLusha: lead.emailLusha || '',
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
    pocQualification: {
      status: lead.pocQualification?.status || 'Unverified',
      notes: lead.pocQualification?.notes || '',
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

const TABS = [
  { id: 'profile', label: 'Profile' },
  { id: 'relationship', label: 'Relationship' },
  { id: 'timeline', label: 'Timeline' },
];

export default function OutreachDrawer({ lead, onClose, onLeadUpdated, onDelete, stackLevel = 0, initialTab = 'profile' }) {
  const [tab, setTab] = useState(initialTab);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState('');
  const [campaigns, setCampaigns] = useState([]);
  const [form, setForm] = useState(() => (lead ? populateFromLead(lead) : {}));

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

  async function save(e) {
    e.preventDefault();
    if (!lead) return;
    setIsUpdating(true);
    setError('');
    const patch = {
      name: form.formName.trim(),
      designation: form.formDesignation.trim(),
      linkedinUrl: form.formLinkedinUrl.trim(),
      email: form.formEmail.trim(),
      emailApollo: form.formEmailApollo.trim(),
      emailHunter: form.formEmailHunter.trim(),
      emailLusha: form.formEmailLusha.trim(),
      phone: form.formPhone.trim(),
      phoneLusha1: form.formPhoneLusha1.trim(),
      phoneLusha2: form.formPhoneLusha2.trim(),
      whatsappNumber: form.formWhatsappNumber.trim(),
      outcome: form.formOutcome,
      campaignId: form.formCampaignId || null,
      deliveryStatus: form.formDeliveryStatus,
      linkedinOutreach: {
        connSent: form.formLiConnSent,
        accepted: form.formLiAccepted,
        inmailSent: form.formLiInmailSent,
        dmSent: form.formLiDmSent,
        notes: form.formLiNotes.trim(),
      },
      coldCall: {
        made: form.formCcMade,
        response: form.formCcResponse,
        notes: form.formCcNotes.trim(),
      },
      whatsapp: {
        sent: form.formWaSent,
        response: form.formWaResponse,
      },
      pocQualification: form.pocQualification,
      relationshipProfile: {
        ...form.relationshipProfile,
        owner: form.relationshipProfile?.owner?.trim() || '',
        reminderNotes: form.relationshipProfile?.reminderNotes?.trim() || '',
        serviceCategories: (form.relationshipProfile?.serviceCategories || []).filter(Boolean),
        nextFollowUpAt: form.relationshipProfile?.nextFollowUpAt
          ? new Date(form.relationshipProfile.nextFollowUpAt).toISOString()
          : null,
      },
    };
    try {
      const poc = form.pocQualification || {};
      const referral = poc.referral || {};
      if (needsReferralDetails(poc.status) && referral.email?.trim()) {
        const companyId = lead.companyId?._id || lead.companyId;
        const campaignId = lead.campaignId?._id || lead.campaignId;
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
      const updated = await updateLead(lead._id, patch);
      onLeadUpdated?.(updated);
      onClose?.();
    } catch (err) {
      setError(err.message || 'Failed to update lead');
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <Drawer
      open={Boolean(lead)}
      onClose={onClose}
      title={lead?.name || 'Contact profile'}
      subtitle={lead ? `${lead.companyName || 'Unknown company'} · ${lead.campaignName || 'No campaign'}` : ''}
      size="2xl"
      stackLevel={stackLevel}
      footer={
        tab !== 'timeline' ? (
          <div className="flex gap-3">
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
            <button type="submit" form="outreach-drawer-form" disabled={isUpdating} className="crm-btn-primary flex flex-1 items-center justify-center gap-1.5">
              <Save className="h-4 w-4" />
              {isUpdating ? 'Saving…' : 'Save contact'}
            </button>
            <button type="button" onClick={onClose} className="crm-btn-secondary">
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex gap-3">
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
            <button type="button" onClick={onClose} className="crm-btn-secondary flex-1">
              Close
            </button>
          </div>
        )
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
                {lead.email && (
                  <span className="crm-profile-chip">
                    <Mail className="h-3 w-3" />
                    {lead.email}
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
        <InteractionTimeline leadId={lead?._id} />
      ) : tab === 'relationship' ? (
        <form id="outreach-drawer-form" onSubmit={save} className="space-y-0">
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
        </form>
      ) : (
        <form id="outreach-drawer-form" onSubmit={save} className="space-y-0">
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

          <DrawerCollapsible title="Contact channels" subtitle="Emails, phones, WhatsApp">
            <div className="space-y-4 pt-4">
              <Field label="Primary outreach email" type="email" value={form.formEmail} onChange={(v) => set('formEmail', v)} />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {[
                  ['formEmailApollo', 'Apollo email'],
                  ['formEmailHunter', 'Hunter email'],
                  ['formEmailLusha', 'Lusha email'],
                  ['formPhoneLusha1', 'Lusha phone 1'],
                  ['formPhoneLusha2', 'Lusha phone 2'],
                  ['formPhone', 'Outreach phone'],
                ].map(([key, label]) => (
                  <Field key={key} label={label} value={form[key]} onChange={(v) => set(key, v)} />
                ))}
              </div>
              <Field label="WhatsApp number" value={form.formWhatsappNumber} onChange={(v) => set('formWhatsappNumber', v)} placeholder="e.g. 971501234567" />
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
        </form>
      )}
      </div>
    </Drawer>
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
