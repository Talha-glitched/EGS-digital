import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  Clock3,
  Target,
  Trash2,
  UserRound,
} from 'lucide-react';
import Drawer from '../ui/Drawer.jsx';
import DrawerTabs from '../leads/DrawerTabs.jsx';
import DrawerCollapsible from '../leads/DrawerCollapsible.jsx';
import InteractionTimeline from '../leads/InteractionTimeline.jsx';
import SearchableMultiSelect from '../ui/SearchableMultiSelect.jsx';
import SearchableSelect from '../ui/SearchableSelect.jsx';
import { Alert, Badge, Field, LoadingState } from '../ui/primitives.jsx';
import PocQualificationBadge from '../leads/PocQualificationBadge.jsx';
import OpportunityTasksPanel from '../tasks/OpportunityTasksPanel.jsx';
import AutoSaveIndicator from '../ui/AutoSaveIndicator.jsx';
import AutoSaveCloseNotice from '../ui/AutoSaveCloseNotice.jsx';
import { useDebouncedAutoSave } from '../../hooks/useDebouncedAutoSave.js';
import {
  fetchOpportunity,
  fetchActiveUsers,
  updateOpportunity,
  normalizeId,
  formatCurrency,
} from '../../crmApi.js';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'tasks', label: 'Tasks' },
  { id: 'poc', label: 'POC' },
  { id: 'timeline', label: 'Timeline' },
];

export default function OpportunityDrawer({
  opportunityId,
  onClose,
  onUpdated,
  onDelete,
  stages = [],
  stackLevel = 0,
}) {
  const [tab, setTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detail, setDetail] = useState(null);
  const [timelineRefresh, setTimelineRefresh] = useState(0);

  const [form, setForm] = useState({
    name: '',
    stage: '',
    valueAed: '',
    nextAction: '',
    eventName: '',
    notes: '',
    primaryLeadId: '',
    stakeholderLeadIds: [],
    campaignId: '',
    owner: '',
    collaborators: [],
  });
  const [activeUsers, setActiveUsers] = useState([]);

  const loadDetail = useCallback(async () => {
    if (!opportunityId) return;
    setLoading(true);
    setError('');
    try {
      const data = await fetchOpportunity(opportunityId);
      setDetail(data);
      const opp = data.opportunity;
      setForm({
        name: opp.name || '',
        stage: opp.stage || '',
        valueAed: opp.valueAed ?? '',
        nextAction: opp.nextAction || '',
        eventName: opp.eventName || '',
        notes: opp.notes || '',
        primaryLeadId: normalizeId(opp.primaryLeadId) || '',
        stakeholderLeadIds: (opp.stakeholderLeadIds || []).map((lead) => normalizeId(lead)).filter(Boolean),
        campaignId: normalizeId(opp.campaignId) || '',
        owner: opp.owner || '',
        collaborators: Array.isArray(opp.collaborators) ? opp.collaborators : [],
      });
    } catch (err) {
      setError(err.message || 'Failed to load opportunity.');
    } finally {
      setLoading(false);
    }
  }, [opportunityId]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  useEffect(() => {
    fetchActiveUsers().then(setActiveUsers).catch(() => setActiveUsers([]));
  }, []);

  const opportunity = detail?.opportunity;
  const contacts = useMemo(() => {
    const base = detail?.contacts || [];
    const primary = opportunity?.primaryLeadId;
    const primaryId = normalizeId(primary?._id || primary);
    if (!primaryId || base.some((contact) => normalizeId(contact._id) === primaryId)) {
      return base;
    }
    return [
      {
        _id: primaryId,
        name: primary.name,
        email: primary.email,
        designation: primary.designation,
        pocQualification: primary.pocQualification,
      },
      ...base,
    ];
  }, [detail?.contacts, opportunity?.primaryLeadId]);

  const contactOptions = useMemo(
    () => contacts.map((contact) => ({
      value: contact._id,
      label: contact.name || contact.email,
      hint: [contact.designation, contact.email].filter(Boolean).join(' · '),
    })),
    [contacts],
  );
  const internalUserOptions = useMemo(
    () => activeUsers.map((user) => ({
      value: user.displayName,
      label: user.displayName,
      hint: user.email || user.role || '',
    })),
    [activeUsers],
  );

  const selectedContact = contacts.find((c) => normalizeId(c._id) === normalizeId(form.primaryLeadId));
  const stageOptions = useMemo(() => {
    const source = detail?.stages?.length ? detail.stages : stages;
    const merged = [...source];
    if (form.stage && !merged.includes(form.stage)) merged.unshift(form.stage);
    return merged;
  }, [detail?.stages, form.stage, stages]);

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  const persistOpportunity = useCallback(async (currentForm) => {
    if (!opportunityId) return;
    setError('');
    try {
      const updated = await updateOpportunity(opportunityId, {
        ...currentForm,
        valueAed: currentForm.valueAed === '' ? 0 : Number(currentForm.valueAed),
        primaryLeadId: currentForm.primaryLeadId || null,
      });
      onUpdated?.(updated);
      setDetail((prev) => (prev ? { ...prev, opportunity: { ...prev.opportunity, ...updated } } : prev));
      setTimelineRefresh((value) => value + 1);
    } catch (err) {
      setError(err.message || 'Failed to save opportunity.');
      throw err;
    }
  }, [opportunityId, onUpdated]);

  const { status: saveStatus, requestClose, closingNotice } = useDebouncedAutoSave({
    snapshot: form,
    onSave: persistOpportunity,
    enabled: Boolean(opportunityId) && tab === 'overview' && !loading,
    resetKey: opportunityId,
  });

  const guardedClose = useCallback(
    () => requestClose(onClose),
    [requestClose, onClose],
  );

  useEffect(() => {
    if (saveStatus !== 'error') return;
    setError('Failed to save opportunity changes. Please try again.');
  }, [saveStatus]);

  async function savePoc(leadId) {
    if (!opportunityId) return;
    setError('');
    try {
      const updated = await updateOpportunity(opportunityId, { primaryLeadId: leadId || null });
      update('primaryLeadId', leadId || '');
      onUpdated?.(updated);
      await loadDetail();
      setTimelineRefresh((value) => value + 1);
    } catch (err) {
      setError(err.message || 'Failed to update POC.');
    }
  }

  const stageTone = form.stage === 'Closed Won' ? 'success' : form.stage === 'Closed Lost' ? 'neutral' : 'info';

  function formatWhen(value) {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleString('en-AE', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  return (
    <>
    <Drawer
      open={Boolean(opportunityId)}
      onClose={guardedClose}
      title={loading ? 'Loading…' : opportunity?.name || 'Opportunity'}
      subtitle={opportunity?.companyId?.companyName || 'Sales opportunity'}
      size="2xl"
      stackLevel={stackLevel}
      footer={(
        <div className="flex items-center gap-3">
          {onDelete && opportunity && !loading ? (
            <button
              type="button"
              className="crm-btn-ghost shrink-0 text-rose-600 hover:bg-rose-50"
              onClick={() => onDelete(opportunity)}
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          ) : null}
          {tab === 'overview' ? <AutoSaveIndicator status={saveStatus} className="flex-1" /> : <span className="flex-1" />}
          <button type="button" className="crm-btn-secondary shrink-0" onClick={guardedClose}>Close</button>
        </div>
      )}
    >
      {loading ? (
        <LoadingState label="Loading opportunity…" />
      ) : (
        <div className="crm-opp-drawer-content">
          {error && <Alert>{error}</Alert>}

          <div className="crm-opp-drawer-metrics">
            <div className="crm-opp-metric">
              <span className="crm-opp-metric-head">
                <Target className="h-4 w-4 text-brand" />
                Value
              </span>
              <p className="crm-opp-metric-value tabular-nums">{formatCurrency(opportunity?.valueAed)}</p>
            </div>
            <div className="crm-opp-metric">
              <span className="crm-opp-metric-head">Stage</span>
              <Badge tone={stageTone}>{form.stage || '—'}</Badge>
            </div>
            <div className="crm-opp-metric">
              <span className="crm-opp-metric-head">
                <UserRound className="h-4 w-4 text-brand" />
                Owner
              </span>
              <p className="crm-opp-metric-value">{opportunity?.owner || '—'}</p>
            </div>
          </div>

          <div className="crm-opp-meta-bar">
            <span className="crm-opp-meta-item"><CalendarDays className="h-3.5 w-3.5" />Opened {formatWhen(opportunity?.createdAt)}</span>
            <span className="crm-opp-meta-item"><Clock3 className="h-3.5 w-3.5" />Updated {formatWhen(opportunity?.updatedAt)} by {opportunity?.lastModifiedBy || opportunity?.owner || '—'}</span>
          </div>

          <DrawerTabs tabs={TABS} active={tab} onChange={setTab} />

          {tab === 'overview' && (
            <div className="crm-drawer-tab-panel">
              <div className="crm-drawer-section space-y-5">
                <div className="crm-opp-form-grid">
                  <Field label="Opportunity name" required>
                    <input className="crm-input" value={form.name} onChange={(e) => update('name', e.target.value)} required />
                  </Field>
                  <Field label="Stage">
                    <SearchableSelect
                      value={form.stage}
                      onChange={(value) => update('stage', value)}
                      options={stageOptions.map((stage) => ({ value: stage, label: stage }))}
                      placeholder="Select stage…"
                      searchPlaceholder="Search stages…"
                    />
                  </Field>
                  <Field label="Contract value (AED)">
                    <input type="number" min="0" className="crm-input" value={form.valueAed} onChange={(e) => update('valueAed', e.target.value)} />
                  </Field>
                  <Field label="Event / exhibition">
                    <input className="crm-input" value={form.eventName} onChange={(e) => update('eventName', e.target.value)} />
                  </Field>
                  <Field label="Owner">
                    <SearchableSelect
                      value={form.owner}
                      onChange={(value) => update('owner', value)}
                      options={internalUserOptions}
                      placeholder="Assign owner…"
                      searchPlaceholder="Search internal users…"
                      emptyLabel="No users match."
                    />
                  </Field>
                </div>
                <Field label="Internal collaborators">
                  <SearchableMultiSelect
                    values={form.collaborators}
                    onChange={(values) => update('collaborators', values)}
                    options={internalUserOptions}
                    placeholder="Select collaborators…"
                    searchPlaceholder="Search internal users…"
                    emptyLabel="No users match."
                  />
                </Field>
                <Field label="Next action">
                  <input className="crm-input" value={form.nextAction} onChange={(e) => update('nextAction', e.target.value)} />
                </Field>
                <Field label="Notes">
                  <textarea className="crm-input min-h-[112px] resize-y" value={form.notes} onChange={(e) => update('notes', e.target.value)} />
                </Field>
              </div>
            </div>
          )}

          {tab === 'tasks' && (
            <div className="crm-drawer-tab-panel">
              <OpportunityTasksPanel
                opportunityId={opportunityId}
                companyId={normalizeId(opportunity?.companyId)}
                opportunityOwner={opportunity?.owner}
                preview={String(opportunityId).startsWith('demo-')}
                active={tab === 'tasks'}
              />
            </div>
          )}

          {tab === 'poc' && (
            <div className="crm-drawer-tab-panel space-y-5">
              <DrawerCollapsible title="Primary point of contact" defaultOpen>
                <div className="space-y-4">
                  <p className="text-sm leading-relaxed text-neutral-600">
                    The selected client contacts link this opportunity to their interaction timeline and the company record across the CRM.
                  </p>
                  <Field label="POC for this deal">
                    <SearchableSelect
                      value={form.primaryLeadId}
                      onChange={(value) => {
                        update('primaryLeadId', value);
                        savePoc(value);
                      }}
                      options={contactOptions}
                      placeholder="Select POC…"
                      searchPlaceholder="Search contacts…"
                      emptyLabel="No contacts linked to this company."
                    />
                  </Field>
                  <Field label="Additional client stakeholders">
                    <SearchableMultiSelect
                      values={form.stakeholderLeadIds}
                      onChange={(values) => update('stakeholderLeadIds', values.filter((value) => String(value) !== String(form.primaryLeadId)))}
                      options={contactOptions.filter((option) => String(option.value) !== String(form.primaryLeadId))}
                      placeholder="Select stakeholders…"
                      searchPlaceholder="Search contacts…"
                      emptyLabel="No additional contacts linked to this company."
                    />
                  </Field>

                  {selectedContact && (
                    <div className="rounded-xl border border-[var(--color-line)] bg-neutral-50/80 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-[var(--color-ink)]">{selectedContact.name || selectedContact.email}</p>
                          <p className="text-xs text-neutral-500">{selectedContact.designation || 'Contact'}</p>
                          <p className="mt-1 text-xs text-neutral-500">{selectedContact.email}</p>
                        </div>
                        <PocQualificationBadge status={selectedContact.pocQualification?.status} />
                      </div>
                    </div>
                  )}

                  {form.stakeholderLeadIds.length > 0 && (
                    <div className="rounded-xl border border-[var(--color-line)] bg-neutral-50/80 p-4">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">Stakeholders</p>
                      <div className="space-y-2">
                        {contacts
                          .filter((contact) => form.stakeholderLeadIds.includes(normalizeId(contact._id)))
                          .map((contact) => (
                            <div key={normalizeId(contact._id)} className="text-sm text-[var(--color-ink)]">
                              <p className="font-medium">{contact.name || contact.email}</p>
                              <p className="text-xs text-neutral-500">{[contact.designation, contact.email].filter(Boolean).join(' · ')}</p>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              </DrawerCollapsible>

              {form.primaryLeadId && (
                <DrawerCollapsible title="POC interaction timeline" defaultOpen>
                  <InteractionTimeline
                    leadId={form.primaryLeadId}
                    companyId={normalizeId(opportunity?.companyId)}
                    contacts={contacts}
                    showContact
                  />
                </DrawerCollapsible>
              )}
            </div>
          )}

          {tab === 'timeline' && (
            <div className="crm-drawer-tab-panel">
              <InteractionTimeline
                opportunityId={opportunityId}
                leadId={form.primaryLeadId || undefined}
                contacts={contacts}
                showContact={Boolean(form.primaryLeadId)}
                refreshSignal={timelineRefresh || undefined}
              />
            </div>
          )}
        </div>
      )}
    </Drawer>
    <AutoSaveCloseNotice open={closingNotice} />
    </>
  );
}
