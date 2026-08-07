import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle, BriefcaseBusiness, CalendarDays, Check, CheckCircle2,
  ExternalLink, ListTodo, Loader2, Mail, MailOpen, MapPin, Plus, Save, Users,
} from 'lucide-react';
import { addLeadToCompany, crmApiFetch, fetchCompanyDetails, updateCompanyDetails } from '../../crmApi.js';
import Drawer from '../ui/Drawer.jsx';
import DrawerLoadingSkeleton from '../ui/DrawerLoadingSkeleton.jsx';
import DrawerTabs from './DrawerTabs.jsx';
import InteractionTimeline from './InteractionTimeline.jsx';
import PocQualificationBadge from './PocQualificationBadge.jsx';
import { ResponseStatusBadge } from './LeadTableComponents.jsx';
import CommunicationSourceDrawer from '../communications/CommunicationSourceDrawer.jsx';
import TaskDetailModal from '../tasks/TaskDetailModal.jsx';
import CreateOngoingJobModal from '../sales/CreateOngoingJobModal.jsx';
import { Alert, Badge, EmptyState, cn } from '../ui/primitives.jsx';

const ACTIVE_JOB_STAGES = new Set(['Job Done', 'Job Lost', 'Closed Won', 'Closed Lost']);
const STATUS_TONE = { prospect: 'neutral', client: 'success', partner: 'success', supplier: 'info' };

function when(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-AE', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}
function money(value) { return new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED', maximumFractionDigits: 0 }).format(Number(value) || 0); }
function initials(value = '') { return value.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || '?'; }

function SummaryCard({ label, value, icon: Icon, tone = 'neutral', onClick }) {
  const content = <><Icon className={cn('h-4 w-4', tone === 'brand' ? 'text-brand' : tone === 'success' ? 'text-emerald-600' : 'text-neutral-400')} /><div><p className="text-xl font-bold text-neutral-900">{value}</p><p className="text-2xs font-semibold uppercase tracking-wide text-neutral-400">{label}</p></div></>;
  return onClick ? <button type="button" onClick={onClick} className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white p-3 text-left hover:border-brand/30 hover:bg-brand-soft/15">{content}</button> : <div className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white p-3">{content}</div>;
}

export default function CompanyDetailsDrawer({ companyId, onClose, onPersonSelected, onUpdated, onDelete }) {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('overview');
  const [timelineCount, setTimelineCount] = useState(null);
  const [source, setSource] = useState(null);
  const [taskOpen, setTaskOpen] = useState(false);
  const [jobOpen, setJobOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [profile, setProfile] = useState({ companyName: '', domain: '', organizationType: 'prospect' });
  const [contactForm, setContactForm] = useState({ email: '', name: '', designation: '', campaignId: '' });

  const load = useCallback(async () => {
    if (!companyId) return;
    setLoading(true); setError('');
    try {
      const result = await fetchCompanyDetails(companyId);
      setData(result);
      setProfile({ companyName: result.company.companyName || '', domain: result.company.domain || '', organizationType: result.company.organizationType || 'prospect' });
    } catch (err) { setError(err.message || 'Failed to load the Account workspace.'); }
    finally { setLoading(false); }
  }, [companyId]);

  useEffect(() => { if (companyId) { setTab('overview'); load(); } }, [companyId, load]);

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'people', label: 'People', count: data?.summary?.contacts || 0 },
    { id: 'communications', label: 'Email', count: data?.summary?.conversations || 0 },
    { id: 'jobs', label: 'Jobs', count: (data?.summary?.activeJobs || 0) + (data?.summary?.completedJobs || 0) },
    { id: 'tasks', label: 'Tasks', count: data?.summary?.openTasks || 0 },
    { id: 'timeline', label: 'Timeline', count: timelineCount ?? undefined },
    { id: 'details', label: 'Details' },
  ];

  const companyOption = useMemo(() => data ? [{ _id: companyId, companyName: data.company.companyName, domain: data.company.domain }] : [], [companyId, data]);
  const campaignOptions = useMemo(() => (data?.campaigns || []).map((item) => ({ _id: item.id, projectName: item.name })), [data]);
  const ownerOptions = useMemo(() => (data?.users || []).map((item) => ({ value: item.userId, label: item.label })), [data]);

  async function saveProfile() {
    setBusy(true); setError(''); setSaveSuccess(false);
    try { await updateCompanyDetails(companyId, profile); await load(); onUpdated?.(); setSaveSuccess(true); window.setTimeout(() => setSaveSuccess(false), 2200); }
    catch (err) { setError(err.message || 'Could not update company identity.'); }
    finally { setBusy(false); }
  }

  async function addContact(event) {
    event.preventDefault();
    if (!contactForm.email.trim()) return;
    setBusy(true); setError('');
    try { await addLeadToCompany(companyId, contactForm); setContactForm({ email: '', name: '', designation: '', campaignId: '' }); await load(); onUpdated?.(); }
    catch (err) { setError(err.message || 'Could not add the contact.'); }
    finally { setBusy(false); }
  }

  async function createTask(payload) {
    setBusy(true); setError('');
    try {
      await crmApiFetch('/api/admin/sales/tasks', { method: 'POST', body: JSON.stringify({ ...payload, companyId, ownerUserId: payload.owner || null, owner: null }) });
      setTaskOpen(false); await load();
    } catch (err) { setError(err.message || 'Could not create the task.'); }
    finally { setBusy(false); }
  }

  function openJob(job) { onClose?.(); navigate(`/admin/crm/ongoing-jobs?recordType=ongoing_job&recordId=${job.id}`); }
  function openTask(task) { onClose?.(); navigate(`/admin/crm/tasks?recordType=task&recordId=${task.id}`); }

  return (
    <>
      <Drawer
        open={Boolean(companyId)} onClose={onClose} size="2xl" stackLevel={0}
        title={data?.company?.companyName || 'Account workspace'}
        subtitle="People, relationships, communication, Jobs and accountable work"
        footer={!loading ? <div className="flex w-full items-center gap-2">{onDelete && <button type="button" className="crm-btn-ghost text-rose-600" onClick={() => onDelete({ _id: companyId, companyName: data?.company?.companyName })}>Delete company</button>}<div className="flex-1" /><button type="button" className="crm-btn-secondary" onClick={onClose}>Close</button>{tab === 'details' && <button type="button" className="crm-btn-primary" disabled={busy || !profile.companyName.trim()} onClick={saveProfile}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : saveSuccess ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}{saveSuccess ? 'Saved' : 'Save identity'}</button>}</div> : null}
      >
        {loading ? <DrawerLoadingSkeleton /> : data ? <div className="space-y-4">
          {error && <Alert><AlertCircle className="mr-2 inline h-4 w-4" />{error}</Alert>}
          <section className="crm-drawer-hero">
            <div className="flex flex-wrap items-start gap-4">
              <div className="crm-profile-avatar is-brand">{initials(data.company.companyName)}</div>
              <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="text-base font-bold">{data.company.companyName}</h2><Badge tone={STATUS_TONE[data.company.organizationType] || 'neutral'}>{data.company.organizationType || 'prospect'}</Badge>{data.company.hasResponded && <ResponseStatusBadge hasResponded respondedAt={data.company.lastRespondedAt} compact />}</div><div className="mt-2 flex flex-wrap gap-2 text-xs text-neutral-500">{data.company.domain && <span className="crm-profile-chip"><ExternalLink className="h-3 w-3" />{data.company.domain}</span>}{data.company.locations?.map((location) => <span key={location.id} className="crm-profile-chip"><MapPin className="h-3 w-3" />{location.name || location.geography || location.type}</span>)}</div></div>
              <div className="flex flex-wrap gap-2"><button className="crm-btn-secondary text-xs" onClick={() => setTaskOpen(true)}><ListTodo className="h-4 w-4" />New task</button><button className="crm-btn-primary text-xs" onClick={() => setJobOpen(true)}><BriefcaseBusiness className="h-4 w-4" />New Job</button></div>
            </div>
          </section>

          <DrawerTabs tabs={tabs} active={tab} onChange={setTab} />

          {tab === 'overview' && <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
              <SummaryCard label="Contacts" value={data.summary.contacts} icon={Users} onClick={() => setTab('people')} />
              <SummaryCard label="Leads" value={data.summary.leads} icon={MailOpen} tone="brand" onClick={() => setTab('people')} />
              <SummaryCard label="Key relationships" value={data.summary.keyRelationships} icon={CheckCircle2} tone="success" onClick={() => setTab('people')} />
              <SummaryCard label="Active Jobs" value={data.summary.activeJobs} icon={BriefcaseBusiness} tone="brand" onClick={() => setTab('jobs')} />
              <SummaryCard label="Open tasks" value={data.summary.openTasks} icon={ListTodo} onClick={() => setTab('tasks')} />
              <SummaryCard label="Conversations" value={data.summary.conversations} icon={Mail} onClick={() => setTab('communications')} />
            </div>
            <section className="rounded-xl border border-neutral-200 bg-white p-4"><div className="flex items-center justify-between"><div><h3 className="text-sm font-semibold">What needs attention</h3><p className="mt-1 text-xs text-neutral-500">Current exceptions and next actions for this account.</p></div></div><div className="mt-3 grid gap-2 sm:grid-cols-2">{data.tasks.slice(0, 6).map((task) => <button key={task.id} onClick={() => openTask(task)} className={cn('rounded-lg border p-3 text-left', task.status === 'blocked' ? 'border-red-200 bg-red-50' : task.status === 'waiting' ? 'border-violet-200 bg-violet-50' : 'border-neutral-200 bg-neutral-50')}><div className="flex items-center justify-between gap-2"><strong className="text-xs">{task.title}</strong><Badge tone={task.status === 'blocked' ? 'warning' : 'neutral'}>{task.status}</Badge></div><p className="mt-1 text-2xs text-neutral-500">{task.jobTitle || 'Account task'} · {task.dueAt ? `Due ${when(task.dueAt)}` : 'No due date'}</p></button>)}{!data.tasks.length && <p className="text-xs text-neutral-400">No open account tasks.</p>}</div></section>
            <section className="rounded-xl border border-neutral-200 bg-white p-4"><h3 className="text-sm font-semibold">Recent account movement</h3><div className="mt-3 grid gap-2 sm:grid-cols-2">{data.jobs.active.slice(0, 4).map((job) => <button key={job.id} onClick={() => openJob(job)} className="rounded-lg border border-neutral-100 bg-neutral-50 p-3 text-left hover:border-brand/30"><div className="flex justify-between gap-2"><strong className="text-xs">{job.jobNumber ? `${job.jobNumber} · ` : ''}{job.title}</strong><Badge tone="info">{job.stage}</Badge></div><p className="mt-1 text-2xs text-neutral-500">{money(job.valueAed)} · {job.owner || 'Unassigned'}{job.nextAction ? ` · ${job.nextAction}` : ''}</p></button>)}{data.conversations.slice(0, 4).map((conversation) => <button key={conversation.id} onClick={() => setSource({ conversationId: conversation.id })} className="rounded-lg border border-neutral-100 bg-neutral-50 p-3 text-left hover:border-brand/30"><div className="flex justify-between gap-2"><strong className="truncate text-xs">{conversation.subject || 'Email conversation'}</strong><Badge tone={conversation.replyCount ? 'success' : 'neutral'}>{conversation.replyCount ? `${conversation.replyCount} replies` : 'No reply'}</Badge></div><p className="mt-1 truncate text-2xs text-neutral-500">{conversation.latestBody || 'No message preview'} · {when(conversation.lastMessageAt)}</p></button>)}</div></section>
            <section className="rounded-xl border border-neutral-200 bg-white p-4"><div className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-brand" /><h3 className="text-sm font-semibold">Campaign history</h3><Badge tone="neutral">{data.campaigns.length}</Badge></div><div className="mt-3 grid gap-2 sm:grid-cols-2">{data.campaigns.map((campaign) => <div key={campaign.id} className="rounded-lg border border-neutral-100 bg-neutral-50 p-3"><div className="flex items-center justify-between gap-2"><strong className="text-xs">{campaign.name}</strong><Badge tone={campaign.replyCount ? 'success' : 'neutral'}>{campaign.pursuitState || campaign.lifecycle}</Badge></div><p className="mt-1 text-2xs text-neutral-500">{campaign.contactCount} contacts · {campaign.sentCount} sent · {campaign.replyCount} replies</p></div>)}{!data.campaigns.length && <p className="text-xs text-neutral-400">No campaign history.</p>}</div></section>
          </div>}

          {tab === 'people' && <div className="space-y-5">
            <section><div className="mb-2"><h3 className="text-sm font-semibold">Key Relationships</h3><p className="text-xs text-neutral-500">Confirmed right POCs with manual relationship confirmation.</p></div><PeopleList items={data.keyRelationships} empty="No confirmed Key Relationships." onOpen={onPersonSelected} /></section>
            <section><div className="mb-2"><h3 className="text-sm font-semibold">Leads</h3><p className="text-xs text-neutral-500">People who replied and are not yet Key Relationships.</p></div><PeopleList items={data.repliedLeads} empty="No replied leads outside Key Relationships." onOpen={onPersonSelected} /></section>
            <section><div className="mb-2"><h3 className="text-sm font-semibold">Other contacts</h3><p className="text-xs text-neutral-500">Known people who have not replied.</p></div><PeopleList items={data.people.filter((person) => !person.hasResponded)} empty="No other contacts." onOpen={onPersonSelected} /></section>
            <form onSubmit={addContact} className="grid gap-2 rounded-xl border border-dashed border-neutral-300 p-4 sm:grid-cols-2"><h3 className="text-xs font-semibold sm:col-span-2">Add contact</h3><input required type="email" className="crm-input" placeholder="Email" value={contactForm.email} onChange={(e) => setContactForm((v) => ({ ...v, email: e.target.value }))} /><input className="crm-input" placeholder="Full name" value={contactForm.name} onChange={(e) => setContactForm((v) => ({ ...v, name: e.target.value }))} /><input className="crm-input" placeholder="Job title" value={contactForm.designation} onChange={(e) => setContactForm((v) => ({ ...v, designation: e.target.value }))} /><select className="crm-select" value={contactForm.campaignId} onChange={(e) => setContactForm((v) => ({ ...v, campaignId: e.target.value }))}><option value="">No campaign</option>{data.campaigns.map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.name}</option>)}</select><button disabled={busy} className="crm-btn-secondary sm:col-span-2"><Plus className="h-4 w-4" />Add contact</button></form>
          </div>}

          {tab === 'communications' && <div className="space-y-2">{data.conversations.map((conversation) => <button key={conversation.id} onClick={() => setSource({ conversationId: conversation.id })} className="w-full rounded-xl border border-neutral-200 bg-white p-4 text-left hover:border-brand/30"><div className="flex flex-wrap items-center justify-between gap-2"><div><strong className="text-xs">{conversation.subject || 'Email conversation'}</strong><p className="mt-1 text-2xs text-neutral-500">{conversation.campaignName || 'Direct / no campaign'} · {conversation.messageCount} messages · {when(conversation.lastMessageAt)}</p></div><Badge tone={conversation.replyCount ? 'success' : 'neutral'}>{conversation.replyCount ? `${conversation.replyCount} replies` : 'No reply'}</Badge></div><p className="mt-2 line-clamp-2 text-xs text-neutral-600">{conversation.latestBody || 'No message preview available.'}</p></button>)}{!data.conversations.length && <EmptyState icon={Mail} title="No email conversations" description="Campaign and direct conversations associated with this company will appear here." />}</div>}

          {tab === 'jobs' && <div className="space-y-5"><JobList title="Active Jobs" items={data.jobs.active} onOpen={openJob} /><JobList title="Completed / lost Jobs" items={data.jobs.completed} onOpen={openJob} /></div>}
          {tab === 'tasks' && <div className="space-y-2">{data.tasks.map((task) => <button key={task.id} onClick={() => openTask(task)} className="flex w-full items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white p-4 text-left hover:border-brand/30"><div><strong className="text-xs">{task.title}</strong><p className="mt-1 text-2xs text-neutral-500">{task.jobTitle || 'Account task'} · {task.owner || 'Unassigned'} · {task.dueAt ? when(task.dueAt) : 'No due date'}</p></div><Badge tone={task.status === 'blocked' ? 'warning' : task.status === 'waiting' ? 'info' : 'neutral'}>{task.status}</Badge></button>)}{!data.tasks.length && <EmptyState icon={ListTodo} title="No open tasks" description="Create an accountable next action for this company." />}</div>}
          {tab === 'timeline' && <InteractionTimeline companyId={companyId} contacts={data.people} showContact onCountChange={setTimelineCount} />}
          {tab === 'details' && <div className="space-y-5"><section className="grid gap-4 rounded-xl border border-neutral-200 bg-white p-4 sm:grid-cols-2"><label className="text-xs font-medium text-neutral-600">Company name<input className="crm-input mt-1.5" value={profile.companyName} onChange={(e) => setProfile((v) => ({ ...v, companyName: e.target.value }))} /></label><label className="text-xs font-medium text-neutral-600">Account type<select className="crm-select mt-1.5" value={profile.organizationType} onChange={(e) => setProfile((v) => ({ ...v, organizationType: e.target.value }))}><option value="prospect">Prospect</option><option value="client">Client</option><option value="partner">Partner</option><option value="supplier">Supplier</option></select></label><label className="text-xs font-medium text-neutral-600 sm:col-span-2">Domain<input className="crm-input mt-1.5" value={profile.domain} onChange={(e) => setProfile((v) => ({ ...v, domain: e.target.value }))} /></label></section><section className="rounded-xl border border-neutral-200 bg-white p-4"><h3 className="text-xs font-semibold">Company contact methods</h3><div className="mt-2 flex flex-wrap gap-2">{data.company.contactMethods.map((method) => <Badge key={method.id} tone="neutral">{method.type}: {method.value}</Badge>)}{!data.company.contactMethods.length && <span className="text-xs text-neutral-400">No generic company contact methods.</span>}</div></section><section className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-xs leading-5 text-neutral-600"><strong>No duplicate account notes:</strong> customer communication remains in Email, accountable follow-up remains in Tasks, and delivery knowledge remains in each Job’s versioned Job Memory.</section></div>}
        </div> : <Alert>{error || 'Account unavailable.'}</Alert>}
      </Drawer>

      <CommunicationSourceDrawer source={source} onClose={() => setSource(null)} stackLevel={1} />
      {taskOpen && <TaskDetailModal open mode="create" onClose={() => setTaskOpen(false)} onSave={createTask} busy={busy} error={error} companies={companyOption} opportunities={data?.jobs?.active || []} ownerOptions={ownerOptions} defaultCompanyId={companyId} defaultOwner={data?.currentUserId || ''} />}
      <CreateOngoingJobModal open={jobOpen} onClose={() => setJobOpen(false)} onCreated={async () => { setJobOpen(false); await load(); }} companies={companyOption} campaigns={campaignOptions} contacts={data?.people || []} defaultCompanyId={companyId} currentUser={data?.users?.find((user) => user.userId === data.currentUserId)?.label || ''} />
    </>
  );
}

function PeopleList({ items, empty, onOpen }) {
  if (!items.length) return <div className="rounded-xl border border-dashed border-neutral-200 p-4 text-xs text-neutral-400">{empty}</div>;
  return <div className="space-y-2">{items.map((person) => <button key={person.id} type="button" onClick={() => onOpen?.(person)} className="flex w-full items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white p-3 text-left hover:border-brand/30"><div className="flex min-w-0 items-center gap-3"><div className="crm-profile-avatar is-neutral h-9! w-9! text-xs!">{initials(person.name)}</div><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><strong className="truncate text-xs">{person.name || person.email || 'Unnamed contact'}</strong><PocQualificationBadge status={person.pocQualification.status} compact /></div><p className="mt-1 truncate text-2xs text-neutral-500">{person.designation || 'Role not set'}{person.email ? ` · ${person.email}` : ''}</p></div></div><div className="flex shrink-0 items-center gap-2">{person.hasResponded && <ResponseStatusBadge hasResponded respondedAt={person.lastRespondedAt} compact />}{person.isKeyRelationship && <Badge tone="success">Key Relationship</Badge>}</div></button>)}</div>;
}

function JobList({ title, items, onOpen }) {
  return <section><div className="mb-2 flex items-center gap-2"><BriefcaseBusiness className="h-4 w-4 text-brand" /><h3 className="text-sm font-semibold">{title}</h3><Badge tone="neutral">{items.length}</Badge></div><div className="space-y-2">{items.map((job) => <button key={job.id} onClick={() => onOpen(job)} className="flex w-full items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white p-4 text-left hover:border-brand/30"><div><strong className="text-xs">{job.jobNumber ? `${job.jobNumber} · ` : ''}{job.title}</strong><p className="mt-1 text-2xs text-neutral-500">{job.owner || 'Unassigned'} · {money(job.valueAed)} · updated {when(job.updatedAt)}</p></div><Badge tone={ACTIVE_JOB_STAGES.has(job.stage) ? 'neutral' : 'info'}>{job.stage}</Badge></button>)}{!items.length && <div className="rounded-xl border border-dashed border-neutral-200 p-4 text-xs text-neutral-400">No Jobs in this group.</div>}</div></section>;
}
