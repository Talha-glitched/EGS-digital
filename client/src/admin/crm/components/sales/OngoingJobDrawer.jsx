import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { updateOngoingJobInState } from '../../store/slices/projectsSlice.js';
import {
  CalendarDays,
  Clock3,
  Target,
  Trash2,
  UserRound,
  Save,
  Check,
  Loader2,
} from 'lucide-react';
import Drawer from '../ui/Drawer.jsx';
import DrawerTabs from '../leads/DrawerTabs.jsx';
import DrawerCollapsible from '../leads/DrawerCollapsible.jsx';
import InteractionTimeline from '../leads/InteractionTimeline.jsx';
import SearchableMultiSelect from '../ui/SearchableMultiSelect.jsx';
import SearchableSelect from '../ui/SearchableSelect.jsx';
import { Alert, Badge, Field, LoadingState } from '../ui/primitives.jsx';
import PocQualificationBadge from '../leads/PocQualificationBadge.jsx';
import OngoingJobTasksPanel from '../tasks/OngoingJobTasksPanel.jsx';
import JobMemoryPanel from '../jobs/JobMemoryPanel.jsx';
import JobDeliveryPanel from '../jobs/JobDeliveryPanel.jsx';
import JobArtifactsPanel from '../jobs/JobArtifactsPanel.jsx';
import JobProductionPanel from '../jobs/JobProductionPanel.jsx';
import JobProcurementPanel from '../jobs/JobProcurementPanel.jsx';
import JobCostingPanel from '../jobs/JobCostingPanel.jsx';
import JobCloseoutPanel from '../jobs/JobCloseoutPanel.jsx';
import JobSettlementPanel from '../jobs/JobSettlementPanel.jsx';
import AddContactModal from '../leads/AddContactModal.jsx';
import {
  crmApiFetch,
  fetchOngoingJob,
  fetchActiveUsers,
  updateOngoingJob,
  normalizeId,
  formatCurrency,
} from '../../crmApi.js';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'delivery', label: 'Scope & Plan' },
  { id: 'artifacts', label: 'Designs & Quotes' },
  { id: 'production', label: 'Production' },
  { id: 'procurement', label: 'Suppliers' },
  // Financial tabs are gated on finance permissions server-side. They are
  // hidden here too so a designer is not shown a tab that will 403.
  { id: 'costing', label: 'Costing', requires: 'finance:read' },
  { id: 'settlement', label: 'Settlement', requires: 'finance:read' },
  { id: 'closeout', label: 'Closeout' },
  { id: 'memory', label: 'Job Memory' },
  { id: 'tasks', label: 'Tasks' },
  { id: 'poc', label: 'POC' },
  { id: 'timeline', label: 'Timeline' },
];

export default function OngoingJobDrawer({
  ongoingJobId,
  opportunityId,
  onClose,
  onUpdated,
  onDelete,
  stages = [],
  stackLevel = 0,
}) {
  const targetId = ongoingJobId || opportunityId;
  const [tab, setTab] = useState('overview');
  const [grantedPermissions, setGrantedPermissions] = useState(null);
  useEffect(() => {
    let cancelled = false;
    crmApiFetch('/api/admin/status')
      .then((status) => { if (!cancelled) setGrantedPermissions(status?.user?.permissions || []); })
      // On failure, fall back to hiding the gated tabs rather than showing
      // financial surfaces we could not confirm the user is allowed to open.
      .catch(() => { if (!cancelled) setGrantedPermissions([]); });
    return () => { cancelled = true; };
  }, []);
  const visibleTabs = useMemo(
    () => TABS.filter((item) => !item.requires || (grantedPermissions || []).includes(item.requires)),
    [grantedPermissions],
  );
  // If the active tab becomes hidden, fall back to Overview instead of
  // rendering an empty panel.
  useEffect(() => {
    if (grantedPermissions && !visibleTabs.some((item) => item.id === tab)) setTab('overview');
  }, [grantedPermissions, visibleTabs, tab]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detail, setDetail] = useState(null);
  const [timelineRefresh, setTimelineRefresh] = useState(0);
  const [showAddContact, setShowAddContact] = useState(false);

  const [form, setForm] = useState({
    name: '',
    stage: '',
    valueAed: '',
    eventName: '',
    primaryLeadId: '',
    stakeholderLeadIds: [],
    campaignId: '',
    owner: '',
    collaborators: [],
  });
  const [activeUsers, setActiveUsers] = useState([]);

  const loadDetail = useCallback(async () => {
    if (!targetId) return;
    setLoading(true);
    setError('');
    try {
      const data = await fetchOngoingJob(targetId);
      setDetail(data);
      const job = data.ongoingJob || data.opportunity;
      setForm({
        name: job.name || '',
        stage: job.stage || '',
        valueAed: job.valueAed ?? '',
        eventName: job.eventName || '',
        primaryLeadId: normalizeId(job.primaryLeadId) || '',
        stakeholderLeadIds: (job.stakeholderLeadIds || []).map((lead) => normalizeId(lead)).filter(Boolean),
        campaignId: normalizeId(job.campaignId) || '',
        owner: job.owner || '',
        collaborators: Array.isArray(job.collaborators) ? job.collaborators : [],
      });
    } catch (err) {
      setError(err.message || 'Failed to load Ongoing Job.');
    } finally {
      setLoading(false);
    }
  }, [targetId]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  useEffect(() => {
    fetchActiveUsers().then(setActiveUsers).catch(() => setActiveUsers([]));
  }, []);

  const ongoingJob = detail?.ongoingJob || detail?.opportunity;
  const contacts = useMemo(() => {
    const base = detail?.contacts || [];
    const primary = ongoingJob?.primaryLeadId;
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
  }, [detail?.contacts, ongoingJob?.primaryLeadId]);

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

  const dispatch = useDispatch();
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = useCallback(async () => {
    if (!targetId) return;
    setSaving(true);
    setError('');
    setSaveSuccess(false);

    try {
      const updated = await updateOngoingJob(targetId, {
        ...form,
        valueAed: form.valueAed === '' ? 0 : Number(form.valueAed),
        primaryLeadId: form.primaryLeadId || null,
      });
      dispatch(updateOngoingJobInState(updated));
      onUpdated?.(updated);
      setDetail((prev) => (prev ? { ...prev, ongoingJob: { ...(prev.ongoingJob || prev.opportunity), ...updated } } : prev));
      setTimelineRefresh((value) => value + 1);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      setError(err.message || 'Failed to save Ongoing Job.');
    } finally {
      setSaving(false);
    }
  }, [targetId, form, dispatch, onUpdated]);

  async function savePoc(leadId) {
    if (!targetId) return;
    setError('');
    try {
      const updated = await updateOngoingJob(targetId, { primaryLeadId: leadId || null });
      update('primaryLeadId', leadId || '');
      dispatch(updateOngoingJobInState(updated));
      onUpdated?.(updated);
      await loadDetail();
      setTimelineRefresh((value) => value + 1);
    } catch (err) {
      setError(err.message || 'Failed to update POC.');
    }
  }

  function handleContactCreated(newContact) {
    const newId = normalizeId(newContact._id);
    setShowAddContact(false);
    savePoc(newId);
  }

  const stageTone = form.stage === 'Closed Won' || form.stage === 'Job Done' ? 'success' : (form.stage === 'Closed Lost' || form.stage === 'Job Lost') ? 'neutral' : 'info';

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
      open={Boolean(targetId)}
      onClose={onClose}
      title={loading ? 'Loading…' : ongoingJob?.name || 'Ongoing Job'}
      subtitle={ongoingJob?.companyId?.companyName || 'Ongoing Job Workspace'}
      size="2xl"
      stackLevel={stackLevel}
      footer={(
        <div className="flex items-center gap-3">
          {onDelete && ongoingJob && !loading ? (
            <button
              type="button"
              className="crm-btn-ghost shrink-0 text-rose-600 hover:bg-rose-50"
              onClick={() => onDelete(ongoingJob)}
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          ) : null}
          <div className="flex-1" />
          <button type="button" className="crm-btn-secondary shrink-0" onClick={onClose}>Close</button>
          {tab === 'overview' && (
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="crm-btn-primary shrink-0 flex items-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : saveSuccess ? (
                <>
                  <Check className="h-4 w-4 text-emerald-300" />
                  Saved!
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Changes
                </>
              )}
            </button>
          )}
        </div>
      )}
    >
      {loading ? (
        <LoadingState label="Loading Ongoing Job…" />
      ) : (
        <div className="crm-opp-drawer-content">
          {error && <Alert>{error}</Alert>}

          <div className="crm-opp-drawer-metrics">
            <div className="crm-opp-metric">
              <span className="crm-opp-metric-head">
                <Target className="h-4 w-4 text-brand" />
                Value
              </span>
              <p className="crm-opp-metric-value tabular-nums">{formatCurrency(ongoingJob?.valueAed)}</p>
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
              <p className="crm-opp-metric-value">{ongoingJob?.owner || '—'}</p>
            </div>
          </div>

          <div className="crm-opp-meta-bar">
            <span className="crm-opp-meta-item"><CalendarDays className="h-3.5 w-3.5" />Opened {formatWhen(ongoingJob?.createdAt)}</span>
            <span className="crm-opp-meta-item"><Clock3 className="h-3.5 w-3.5" />Updated {formatWhen(ongoingJob?.updatedAt)} by {ongoingJob?.lastModifiedBy || ongoingJob?.owner || '—'}</span>
          </div>

          <DrawerTabs tabs={visibleTabs} active={tab} onChange={setTab} />

          {tab === 'overview' && (
            <div className="crm-drawer-tab-panel">
              <div className="crm-drawer-section space-y-5">
                <div className="crm-opp-form-grid">
                  <Field label="Ongoing Job name" required>
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
              </div>
            </div>
          )}

          {tab === 'delivery' && (
            <div className="crm-drawer-tab-panel">
              <JobDeliveryPanel ongoingJobId={targetId} active={tab === 'delivery'} />
            </div>
          )}

          {tab === 'artifacts' && (
            <div className="crm-drawer-tab-panel">
              <JobArtifactsPanel ongoingJobId={targetId} contacts={contacts} active={tab === 'artifacts'} />
            </div>
          )}

          {tab === 'production' && (
            <div className="crm-drawer-tab-panel">
              <JobProductionPanel ongoingJobId={targetId} active={tab === 'production'} />
            </div>
          )}
          {tab === 'procurement' && (
            <div className="crm-opp-section">
              <JobProcurementPanel ongoingJobId={targetId} active={tab === 'procurement'} />
            </div>
          )}
          {tab === 'costing' && (
            <div className="crm-drawer-tab-panel">
              <JobCostingPanel ongoingJobId={targetId} active={tab === 'costing'} />
            </div>
          )}
          {tab === 'settlement' && (
            <div className="crm-drawer-tab-panel">
              <JobSettlementPanel ongoingJobId={targetId} active={tab === 'settlement'} />
            </div>
          )}
          {tab === 'closeout' && (
            <div className="crm-drawer-tab-panel">
              <JobCloseoutPanel ongoingJobId={targetId} contacts={contacts} active={tab === 'closeout'} onChanged={() => setTimelineRefresh((value) => value + 1)} />
            </div>
          )}

          {tab === 'memory' && (
            <div className="crm-drawer-tab-panel">
              <JobMemoryPanel
                ongoingJobId={targetId}
                active={tab === 'memory'}
                onChanged={() => setTimelineRefresh((value) => value + 1)}
              />
            </div>
          )}

          {tab === 'tasks' && (
            <div className="crm-drawer-tab-panel">
              <OngoingJobTasksPanel
                ongoingJobId={targetId}
                companyId={normalizeId(ongoingJob?.companyId)}
                ongoingJobOwner={ongoingJob?.owner}
                preview={String(targetId).startsWith('demo-')}
                active={tab === 'tasks'}
              />
            </div>
          )}

          {tab === 'poc' && (
            <div className="crm-drawer-tab-panel space-y-5">
              <DrawerCollapsible title="Primary point of contact" defaultOpen>
                <div className="space-y-4">
                  <p className="text-sm leading-relaxed text-neutral-600">
                    The selected client contacts link this Ongoing Job to their interaction timeline and the company record across the CRM.
                  </p>
                  <Field label="POC for this job">
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
                      onCreateNew={() => setShowAddContact(true)}
                      createLabel="Create new contact"
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
                    companyId={normalizeId(ongoingJob?.companyId)}
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
                ongoingJobId={targetId}
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

    <AddContactModal
      open={showAddContact}
      onClose={() => setShowAddContact(false)}
      onCreated={handleContactCreated}
      initialCompanyId={normalizeId(ongoingJob?.companyId)}
      initialCompanyName={ongoingJob?.companyId?.companyName}
    />
    </>
  );
}
