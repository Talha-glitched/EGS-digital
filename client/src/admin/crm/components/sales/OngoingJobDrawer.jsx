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
import { Alert, Badge, Field, LoadingState, cn } from '../ui/primitives.jsx';
import PocQualificationBadge from '../leads/PocQualificationBadge.jsx';
import OngoingJobTasksPanel from '../tasks/OngoingJobTasksPanel.jsx';
import JobArtifactsPanel from '../jobs/JobArtifactsPanel.jsx';
import JobCloseoutPanel from '../jobs/JobCloseoutPanel.jsx';
import AddContactModal from '../leads/AddContactModal.jsx';
import {
  crmApiFetch,
  fetchOngoingJob,
  fetchActiveUsers,
  updateOngoingJob,
  normalizeId,
  formatCurrency,
} from '../../crmApi.js';

const LIFECYCLE_TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'tasks', label: 'Tasks' },
  { id: 'timeline', label: 'Timeline' },
];

const SUB_TABS = {
  overview: [
    { id: 'job_info', label: 'Job info' },
    { id: 'documentation', label: 'Documentation' },
  ],
  tasks: [],
  timeline: [],
};

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
  const [subTab, setSubTab] = useState('job_info');
  const [counts, setCounts] = useState({
    artifacts: 0,
    tasks: 0,
    timeline: 0,
  });

  const [grantedPermissions, setGrantedPermissions] = useState(null);
  useEffect(() => {
    let cancelled = false;
    crmApiFetch('/api/admin/status')
      .then((status) => { if (!cancelled) setGrantedPermissions(status?.user?.permissions || []); })
      .catch(() => { if (!cancelled) setGrantedPermissions([]); });
    return () => { cancelled = true; };
  }, []);

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
      const [
        data,
        artifactsData,
        tasksData,
        timelineData,
      ] = await Promise.all([
        fetchOngoingJob(targetId),
        crmApiFetch(`/api/admin/sales/ongoing-jobs/${targetId}/artifacts`).catch(() => null),
        crmApiFetch(`/api/admin/sales/tasks?status=Open&ongoingJobId=${targetId}`).catch(() => null),
        crmApiFetch(`/api/admin/sales/ongoing-jobs/${targetId}/timeline`).catch(() => null),
      ]);

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

      // Calculate counts
      const designsCount = artifactsData?.designSets?.length || 0;
      const quotesCount = artifactsData?.quotes?.length || 0;
      const openTasksCount = tasksData?.items?.length || 0;
      const timelineCount = timelineData?.length || 0;

      setCounts({
        artifacts: designsCount + quotesCount,
        tasks: openTasksCount,
        timeline: timelineCount,
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

  // Sum dynamic counts for parent lifecycle tabs
  const lifecycleTabsWithCounts = useMemo(() => {
    const overviewCount = (contacts?.length || 0) + (counts.artifacts || 0);
    const tasksCount = counts.tasks || 0;
    const timelineCount = counts.timeline || 0;

    return LIFECYCLE_TABS.map((tabItem) => {
      let count = undefined;
      if (tabItem.id === 'overview') count = overviewCount;
      if (tabItem.id === 'tasks') count = tasksCount;
      if (tabItem.id === 'timeline') count = timelineCount;
      return { ...tabItem, count };
    });
  }, [counts, contacts]);

  const visibleTabs = useMemo(
    () => lifecycleTabsWithCounts.filter((item) => !item.requires || (grantedPermissions || []).includes(item.requires)),
    [lifecycleTabsWithCounts, grantedPermissions]
  );

  const subTabs = useMemo(() => {
    const list = SUB_TABS[tab] || [];
    return list
      .filter((item) => !item.requires || (grantedPermissions || []).includes(item.requires))
      .map((subItem) => {
        let count = undefined;
        if (subItem.id === 'job_info') count = contacts.length;
        if (subItem.id === 'documentation') count = counts.artifacts;
        return { ...subItem, count };
      });
  }, [tab, grantedPermissions, counts, contacts]);

  const handleTabChange = useCallback((newTabId) => {
    setTab(newTabId);
    const subList = SUB_TABS[newTabId] || [];
    const visibleSubList = subList.filter((item) => !item.requires || (grantedPermissions || []).includes(item.requires));
    if (visibleSubList.length > 0) {
      setSubTab(visibleSubList[0].id);
    }
  }, [grantedPermissions]);

  useEffect(() => {
    if (grantedPermissions && !visibleTabs.some((item) => item.id === tab)) {
      setTab('overview');
      setSubTab('job_info');
    }
  }, [grantedPermissions, visibleTabs, tab]);

  useEffect(() => {
    function handleGlobalKeys(event) {
      if (!targetId) return;
      if (event.altKey && ['1', '2', '3'].includes(event.key)) {
        event.preventDefault();
        const tabMap = ['overview', 'tasks', 'timeline'];
        const selectedTab = tabMap[parseInt(event.key, 10) - 1];
        if (selectedTab) {
          const tabObj = LIFECYCLE_TABS.find(t => t.id === selectedTab);
          const hasAccess = !tabObj?.requires || (grantedPermissions || []).includes(tabObj.requires);
          if (hasAccess) {
            handleTabChange(selectedTab);
          }
        }
      }
    }
    window.addEventListener('keydown', handleGlobalKeys);
    return () => window.removeEventListener('keydown', handleGlobalKeys);
  }, [targetId, grantedPermissions, handleTabChange]);

  const update = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const isDirty = useMemo(() => {
    if (!detail) return false;
    const job = detail.ongoingJob || detail.opportunity;
    const origPrimary = normalizeId(job.primaryLeadId) || '';
    const origStakeholders = (job.stakeholderLeadIds || []).map((l) => normalizeId(l)).filter(Boolean);
    const origCollaborators = Array.isArray(job.collaborators) ? job.collaborators : [];
    return (
      form.name !== (job.name || '') ||
      form.stage !== (job.stage || '') ||
      String(form.valueAed ?? '') !== String(job.valueAed ?? '') ||
      form.eventName !== (job.eventName || '') ||
      form.owner !== (job.owner || '') ||
      form.primaryLeadId !== origPrimary ||
      JSON.stringify(form.stakeholderLeadIds) !== JSON.stringify(origStakeholders) ||
      JSON.stringify(form.collaborators) !== JSON.stringify(origCollaborators)
    );
  }, [form, detail]);

  const dispatch = useDispatch();
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = async () => {
    if (!targetId) return;
    setSaving(true);
    setError('');
    try {
      const payload = {
        name: form.name,
        stage: form.stage,
        valueAed: form.valueAed === '' ? null : Number(form.valueAed),
        eventName: form.eventName,
        owner: form.owner,
        primaryLeadId: form.primaryLeadId || null,
        stakeholderLeadIds: form.stakeholderLeadIds,
        collaborators: form.collaborators,
      };
      const updated = await updateOngoingJob(targetId, payload);
      const updatedJob = updated?.ongoingJob || updated?.opportunity || updated;
      setDetail((prev) => ({
        ...prev,
        ongoingJob: updatedJob,
        opportunity: updatedJob,
      }));
      dispatch(updateOngoingJobInState(updatedJob));
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
      onUpdated?.(updatedJob);
    } catch (err) {
      setError(err.message || 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  const savePoc = async (newPrimaryId) => {
    if (!targetId) return;
    try {
      const payload = {
        primaryLeadId: newPrimaryId || null,
      };
      const updated = await updateOngoingJob(targetId, payload);
      const updatedJob = updated?.ongoingJob || updated?.opportunity || updated;
      setDetail((prev) => ({
        ...prev,
        ongoingJob: updatedJob,
        opportunity: updatedJob,
      }));
      dispatch(updateOngoingJobInState(updatedJob));
      onUpdated?.(updatedJob);
    } catch (err) {
      console.error('Failed to save POC:', err);
    }
  };

  const handleContactCreated = (newContact) => {
    const newId = normalizeId(newContact._id);
    setForm((prev) => ({ ...prev, primaryLeadId: newId }));
    savePoc(newId);
    loadDetail();
  };

  const formatWhen = (value) => (value ? new Date(value).toLocaleDateString('en-AE', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

  const stageOptions = useMemo(() => {
    if (stages.length > 0) return stages;
    return ['New Lead', 'Qualification', 'Proposal Sent', 'Negotiation', 'Contract Sent', 'Closed Won', 'Closed Lost'];
  }, [stages]);

  const internalUserOptions = useMemo(() => {
    return activeUsers.map((u) => ({
      value: u.displayName || u.username,
      label: u.displayName ? `${u.displayName} (${u.role || 'User'})` : u.username,
    }));
  }, [activeUsers]);

  const contactOptions = useMemo(() => {
    return contacts.map((c) => ({
      value: normalizeId(c._id),
      label: `${c.name || c.email}${c.designation ? ` — ${c.designation}` : ''}`,
    }));
  }, [contacts]);

  const selectedContact = useMemo(() => {
    if (!form.primaryLeadId) return null;
    return contacts.find((c) => normalizeId(c._id) === form.primaryLeadId) || null;
  }, [contacts, form.primaryLeadId]);

  const stageTone = useMemo(() => {
    const s = form.stage || '';
    if (s === 'Closed Won') return 'success';
    if (s === 'Closed Lost') return 'neutral';
    if (['Negotiation', 'Contract Sent'].includes(s)) return 'warning';
    return 'brand';
  }, [form.stage]);

  return (
    <>
    <Drawer
      open={Boolean(targetId)}
      onClose={onClose}
      title={form.name || ongoingJob?.name || 'Ongoing Job'}
      subtitle={ongoingJob?.companyId?.companyName || 'Unknown company'}
      badge={stageTone ? <Badge tone={stageTone}>{form.stage}</Badge> : null}
      size="2xl"
      stackLevel={stackLevel}
      headerActions={(
        <div className="flex items-center gap-2">
          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(targetId)}
              className="crm-btn-secondary text-red-600 hover:bg-red-50 hover:text-red-700"
              title="Delete Ongoing Job"
              aria-label="Delete Ongoing Job"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
          {tab === 'overview' && subTab === 'job_info' && (
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !isDirty}
              className={cn(
                'crm-btn-primary gap-1.5 transition-all text-xs',
                saveSuccess && 'bg-emerald-600 hover:bg-emerald-600',
                !isDirty && !saving && !saveSuccess && 'opacity-60 cursor-not-allowed'
              )}
            >
              {saving ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Saving…
                </>
              ) : saveSuccess ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-300" />
                  Saved!
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5" />
                  Save
                </>
              )}
            </button>
          )}
        </div>
      )}
      footer={
        <div className="flex items-center gap-3">
          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(targetId)}
              className="crm-btn-ghost shrink-0 text-rose-600 hover:bg-rose-50"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          )}
          <div className="flex-1" />
          <button type="button" onClick={onClose} className="crm-btn-secondary shrink-0">
            Close
          </button>
          {tab === 'overview' && subTab === 'job_info' && (
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !isDirty}
              className={cn(
                'crm-btn-primary shrink-0 flex items-center gap-2 transition-all',
                saveSuccess && 'bg-emerald-600 hover:bg-emerald-600',
                !isDirty && !saving && !saveSuccess && 'opacity-60 cursor-not-allowed'
              )}
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : saveSuccess ? (
                <>
                  <Check className="h-4 w-4" />
                  Saved!
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save changes
                </>
              )}
            </button>
          )}
        </div>
      }
    >
      {loading ? (
        <LoadingState label="Loading Ongoing Job…" />
      ) : (
        <div className="crm-opp-drawer-content">
          {error && <Alert>{error}</Alert>}

          <DrawerTabs tabs={visibleTabs} active={tab} onChange={handleTabChange} />

          {/* Sub-tab Navigation */}
          {subTabs.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-5 border-b border-neutral-200 pb-2">
              {subTabs.map((subItem) => (
                <button
                  key={subItem.id}
                  type="button"
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-2xs font-bold flex items-center gap-1.5 transition-all",
                    subTab === subItem.id
                      ? "bg-neutral-800 text-white shadow-2xs"
                      : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200/70"
                  )}
                  onClick={() => setSubTab(subItem.id)}
                >
                  {subItem.label}
                  {typeof subItem.count === 'number' && (
                    <span className={cn(
                      "inline-flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] font-bold",
                      subTab === subItem.id ? "bg-white/20 text-white" : "bg-neutral-200 text-neutral-500"
                    )}>
                      {subItem.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {tab === 'overview' && subTab === 'job_info' && (
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
                </div>

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
              </div>
            </div>
          )}

          {tab === 'overview' && subTab === 'documentation' && (
            <div className="crm-drawer-tab-panel space-y-6">
              <section className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500">Designs & Quotes</h4>
                <JobArtifactsPanel ongoingJobId={targetId} contacts={contacts} active={tab === 'overview' && subTab === 'documentation'} />
              </section>

              <section className="space-y-3 pt-4 border-t border-neutral-200">
                <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500">Closeout & Handover</h4>
                <JobCloseoutPanel ongoingJobId={targetId} contacts={contacts} active={tab === 'overview' && subTab === 'documentation'} onChanged={() => setTimelineRefresh((value) => value + 1)} />
              </section>
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
