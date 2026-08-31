import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { crmApiFetch, formatPercent, updateCampaign, fetchAllProjectLeads, fetchAllProjectCompanies, fetchConfiguredEmailAccounts } from '../crmApi.js';
import ProjectDatabaseTable from '../components/projects/ProjectDatabaseTable.jsx';
import CampaignStageControl from '../components/projects/CampaignStageControl.jsx';
import ExhibitorImportModal from '../components/projects/ExhibitorImportModal.jsx';
import ContactBlenderModal from '../components/projects/ContactBlenderModal.jsx';
import ProjectPerformanceModal from '../components/projects/ProjectPerformanceModal.jsx';
import ProjectResourcesModal from '../components/projects/ProjectResourcesModal.jsx';
import CampaignLaunchMonitorModal from '../components/projects/CampaignLaunchMonitorModal.jsx';
import CompanyDetailsDrawer from '../components/leads/CompanyDetailsDrawer.jsx';
import OutreachDrawer from '../components/leads/OutreachDrawer.jsx';
import EmailDetailsDrawer from '../components/leads/EmailDetailsDrawer.jsx';
import TaskTable from '../components/tasks/TaskTable.jsx';
import InfoTip from '../components/ui/InfoTip.jsx';
import { CAMPAIGN_AUTOMATION } from '../constants/automationHints.js';
import {
  PageShell,
  PageSection,
  Toast,
  LoadingState,
  ProgressBar,
  Card,
  CardHeader,
  EmptyState,
  cn,
} from '../components/ui/primitives.jsx';
import {
  Building2,
  BriefcaseBusiness,
  Users,
  MessageCircle,
  Upload,
  Layers,
  BarChart3,
  ChevronLeft,
  TrendingUp,
  CalendarCheck2,
  FolderKanban,
  Send,
  Mail,
} from 'lucide-react';
import { buildOwnerOptions } from '../components/tasks/taskUtils.js';

const EMAILED_STATUSES = ['Emailed Outbound', 'Replied', 'Bounced / Invalid'];

export default function ProjectDetailWorkspace() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [leads, setLeads] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [toast, setToast] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState(null);
  const [selectedLead, setSelectedLead] = useState(null);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [modal, setModal] = useState(null);
  const [savingStage, setSavingStage] = useState(false);
  const [emailAccounts, setEmailAccounts] = useState([]);
  const [savingSender, setSavingSender] = useState(false);

  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'companies';

  const handleTabChange = (tabName) => {
    setSearchParams((prev) => {
      prev.set('tab', tabName);
      return prev;
    }, { replace: true });
  };

  // Sync selected email from URL params
  useEffect(() => {
    const emailId = searchParams.get('emailId');
    if (emailId) {
      crmApiFetch(`/api/admin/sent-emails/${emailId}`)
        .then((data) => {
          setSelectedEmail(data);
        })
        .catch((err) => {
          console.error('Failed to load initial email detail:', err);
          // If not found, clear emailId from query params
          setSearchParams((prev) => {
            prev.delete('emailId');
            return prev;
          }, { replace: true });
        });
    } else {
      setSelectedEmail(null);
    }
  }, [searchParams, setSearchParams]);

  const handleEmailClick = (email) => {
    setSearchParams((prev) => {
      prev.set('emailId', email._id);
      return prev;
    }, { replace: true });
  };

  const handleCloseEmailDrawer = () => {
    setSearchParams((prev) => {
      prev.delete('emailId');
      return prev;
    }, { replace: true });
  };

  const refresh = useCallback(async () => {
    const [proj, anal, leadData, companyData] = await Promise.all([
      crmApiFetch(`/api/admin/projects/${id}`),
      crmApiFetch(`/api/admin/analytics/projects/${id}`),
      fetchAllProjectLeads(id),
      fetchAllProjectCompanies(id),
    ]);
    const [opportunityData, taskData] = await Promise.all([
      crmApiFetch(`/api/admin/sales/opportunities?campaignId=${encodeURIComponent(id)}`),
      crmApiFetch(`/api/admin/sales/tasks?status=All&campaignId=${encodeURIComponent(id)}`),
    ]);
    setProject(proj);
    setAnalytics(anal);
    setLeads(leadData.items || []);
    setCompanies(companyData.items || []);
    setOpportunities(opportunityData.items || []);
    setTasks(taskData.items || []);
  }, [id]);

  useEffect(() => {
    refresh().catch(console.error);
    fetchConfiguredEmailAccounts().then((accounts) => {
      if (Array.isArray(accounts)) setEmailAccounts(accounts);
    }).catch(console.error);
  }, [refresh]);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 4500);
  }

  function handleImported(msg) {
    showToast(msg);
    refresh();
  }

  function handleLeadUpdated(updatedLead) {
    if (updatedLead && updatedLead._id) {
      setLeads((prev) => prev.map((l) => (l._id === updatedLead._id ? { ...l, ...updatedLead } : l)));
    }
    showToast('Contact updated.');
  }

  async function handleStageChange(payload) {
    setSavingStage(true);
    try {
      const updated = await updateCampaign(id, payload);
      setProject((prev) => ({ ...prev, ...updated }));
      showToast(payload.statusSource === 'auto' ? 'Automatic stage enabled.' : 'Campaign stage updated.');
    } catch (error) {
      showToast(error.message || 'Failed to update stage.');
    } finally {
      setSavingStage(false);
    }
  }

  async function handleSenderChange(e) {
    const newEmail = e.target.value;
    setSavingSender(true);
    try {
      const matched = emailAccounts.find((a) => a.email.toLowerCase() === String(newEmail).toLowerCase());
      const newName = matched?.name || 'Exhibit Graphic Sign';
      const updated = await updateCampaign(id, { fromEmail: newEmail, fromName: newName });
      setProject((prev) => ({ ...prev, ...updated, fromEmail: newEmail, fromName: newName }));
      showToast(`Sender mailbox updated to ${newEmail}`);
    } catch (error) {
      showToast(error.message || 'Failed to update sender mailbox.');
    } finally {
      setSavingSender(false);
    }
  }

  const openTasks = useMemo(() => tasks.filter((task) => task.status !== 'Done'), [tasks]);
  const ownerOptions = useMemo(() => buildOwnerOptions(tasks, opportunities.map((item) => item.owner)), [tasks, opportunities]);

  if (!project) {
    return (
      <PageShell compact>
        <LoadingState label="Loading project…" />
      </PageShell>
    );
  }

  const target = companies.length;
  const withPocs = new Set(leads.map((lead) => String(lead.companyId || '')).filter(Boolean)).size;
  const pocPct = target ? (withPocs / target) * 100 : 0;
  const replyPct = analytics?.interactionProgressPercent ?? 0;
  const pocsEmailed = leads.filter((lead) => EMAILED_STATUSES.includes(lead.deliveryStatus)).length;
  const pocsResponded = leads.filter((lead) => lead.hasResponded).length;
  const pocReplyPct = pocsEmailed ? (pocsResponded / pocsEmailed) * 100 : 0;

  return (
    <PageShell compact>
      <Toast message={toast} onDismiss={() => setToast('')} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/admin/crm/projects" className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-500 hover:text-brand">
          <ChevronLeft className="h-3.5 w-3.5" />
          All campaigns
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-[var(--color-line)] bg-white px-2.5 py-1 text-xs shadow-2xs">
            <Mail className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
            <span className="text-2xs font-bold uppercase tracking-wider text-neutral-400">Sender:</span>
            <select
              className="bg-transparent font-semibold text-neutral-700 focus:outline-none cursor-pointer text-xs"
              value={project.fromEmail || ''}
              disabled={savingSender}
              onChange={handleSenderChange}
              title="Change sender mailbox for this campaign"
            >
              {emailAccounts.length > 0 ? (
                emailAccounts.map((acc) => (
                  <option key={acc.email} value={acc.email}>
                    {acc.name ? `${acc.name} (${acc.email})` : acc.email}
                  </option>
                ))
              ) : (
                <option value={project.fromEmail || ''}>{project.fromEmail || 'Default Mailbox'}</option>
              )}
            </select>
          </div>
          <CampaignStageControl
            status={project.status}
            statusSource={project.statusSource}
            onChange={handleStageChange}
            saving={savingStage}
            showHint
          />
        </div>
      </div>

      <PageSection>
        <div className="crm-card px-4 py-3.5 lg:px-5">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
            <CompactStat icon={Building2} label="Companies" value={target} />
            <CompactStat icon={Users} label="POCs" value={leads.length} />
            <CompactStat
              icon={MessageCircle}
              label="Replied"
              value={project.companiesRespondedCount || 0}
              hint={CAMPAIGN_AUTOMATION.companiesReplied}
            />
            <CompactStat
              icon={BarChart3}
              label="Discovery"
              value={formatPercent(pocPct)}
              accent
              hint={CAMPAIGN_AUTOMATION.discoveryRate}
            />
            <CompactStat
              icon={TrendingUp}
              label="Reply rate"
              value={formatPercent(replyPct)}
              hint={CAMPAIGN_AUTOMATION.replyRate}
            />
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <ProgressBlock
              label="POC discovery"
              hint={CAMPAIGN_AUTOMATION.discoveryRate}
              value={pocPct}
              fraction={`${withPocs}/${target}`}
              tone="brand"
            />
            <ProgressBlock
              label="Companies replied"
              hint={CAMPAIGN_AUTOMATION.companiesReplied}
              value={replyPct}
              fraction={`${project.companiesRespondedCount || 0}/${target}`}
              tone="success"
            />
            <ProgressBlock
              label="POC reply rate"
              hint={CAMPAIGN_AUTOMATION.pocReplyRate}
              value={pocReplyPct}
              fraction={`${pocsResponded}/${pocsEmailed}`}
              tone="success"
            />
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
            <div className="flex flex-wrap items-center gap-2">
              <ActionBtn icon={Upload} label="Add companies" onClick={() => setModal('exhibitors')} />
              <ActionBtn icon={Users} label="Import contacts" onClick={() => setModal('blender')} />
              <Link
                to={`/admin/crm/sequences?new=1&campaign=${id}`}
                className="crm-btn-secondary inline-flex items-center gap-1.5 py-1.5 text-xs"
              >
                <Layers className="h-3.5 w-3.5" />
                Email sequences
              </Link>
              <ActionBtn icon={BarChart3} label="Performance" onClick={() => setModal('performance')} variant="secondary" />
              <ActionBtn icon={Send} label="Send progress" onClick={() => setModal('monitor')} variant="secondary" />
            </div>
            <div className="ml-auto">
              <ActionBtn
                icon={FolderKanban}
                label="Resources"
                onClick={() => setModal('resources')}
                variant="secondary"
              />
            </div>
          </div>
        </div>
      </PageSection>

      <PageSection>
        <ProjectDatabaseTable
          projectId={id}
          view={activeTab}
          onViewChange={handleTabChange}
          onEmailClick={handleEmailClick}
          companies={companies}
          leads={leads}
          onCompanyClick={setSelectedCompanyId}
          onLeadClick={setSelectedLead}
          onCompanyRemoved={() => refresh()}
          onLeadRemoved={() => refresh()}
          onRestored={() => refresh()}
        />
      </PageSection>

      <PageSection>
        <div className="grid gap-4 xl:grid-cols-[1.1fr,0.9fr]">
          <Card className="overflow-hidden">
            <CardHeader
              title="Linked opportunities"
              subtitle="Sales workspaces connected to this campaign context."
              action={<Link to="/admin/crm/pipeline" className="text-xs font-semibold text-brand hover:underline">Open pipeline</Link>}
            />
            {!opportunities.length ? (
              <EmptyState
                icon={BriefcaseBusiness}
                title="No linked opportunities"
                description="Campaign context is optional. Link this campaign on an opportunity when commercial work begins."
              />
            ) : (
              <div className="divide-y divide-line">
                {opportunities.map((opportunity) => (
                  <Link
                    key={opportunity._id}
                    to="/admin/crm/pipeline"
                    className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-neutral-50/70"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink">{opportunity.name}</p>
                      <p className="mt-0.5 truncate text-xs text-neutral-500">
                        {opportunity.companyId?.companyName || 'Unknown company'} · {opportunity.stage}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-bold tabular-nums text-ink">{(opportunity.valueAed || 0).toLocaleString('en-AE')} AED</p>
                      <p className="text-xs text-neutral-400">{opportunity.owner || 'Unassigned'}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Card>

          <Card className="overflow-hidden">
            <CardHeader
              title="Execution tasks"
              subtitle="Tasks attached to opportunities linked with this campaign."
              action={<Link to="/admin/crm/tasks" className="text-xs font-semibold text-brand hover:underline">Open tasks</Link>}
            />
            {!tasks.length ? (
              <EmptyState
                icon={CalendarCheck2}
                title="No execution tasks yet"
                description="Create tasks from linked opportunities to track prework, delivery prep, and follow-through."
              />
            ) : (
              <TaskTable
                tasks={openTasks.length ? openTasks : tasks}
                opportunities={opportunities}
                ownerOptions={ownerOptions}
                showAccountColumn={false}
                embedded
              />
            )}
          </Card>
        </div>
      </PageSection>

      <ExhibitorImportModal
        open={modal === 'exhibitors'}
        onClose={() => setModal(null)}
        projectId={id}
        onImported={handleImported}
      />

      <ContactBlenderModal
        open={modal === 'blender'}
        onClose={() => setModal(null)}
        projectId={id}
        onImported={handleImported}
      />

      <ProjectPerformanceModal
        open={modal === 'performance'}
        onClose={() => setModal(null)}
        project={project}
        analytics={analytics}
        leads={leads}
      />

      <ProjectResourcesModal
        open={modal === 'resources'}
        onClose={() => setModal(null)}
        projectName={project?.projectName}
      />

      <CampaignLaunchMonitorModal
        open={modal === 'monitor'}
        onClose={() => setModal(null)}
        projectId={id}
        projectName={project?.projectName}
      />

      <CompanyDetailsDrawer
        companyId={selectedCompanyId}
        onClose={() => setSelectedCompanyId(null)}
        onPersonSelected={setSelectedLead}
        onUpdated={refresh}
        stackLevel={selectedEmail ? 1 : 0}
      />

      <EmailDetailsDrawer
        email={selectedEmail}
        onClose={handleCloseEmailDrawer}
        onLeadClick={(lead) => setSelectedLead(lead)}
        onCompanyClick={(companyId) => setSelectedCompanyId(companyId)}
        stackLevel={0}
      />

      <OutreachDrawer
        lead={selectedLead}
        onClose={() => setSelectedLead(null)}
        onLeadUpdated={handleLeadUpdated}
        stackLevel={selectedCompanyId || selectedEmail ? 1 : 0}
      />
    </PageShell>
  );
}

function CompactStat({ icon: Icon, label, value, accent, hint }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className={`h-3.5 w-3.5 ${accent ? 'text-brand' : 'text-neutral-400'}`} strokeWidth={2} />
      <span className="text-neutral-500">{label}</span>
      <span className={`font-bold tabular-nums ${accent ? 'text-brand' : 'text-ink'}`}>{value}</span>
      {hint && <InfoTip text={hint} label={`About ${label}`} />}
    </div>
  );
}

function ProgressBlock({ label, hint, value, fraction, tone }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2 text-2xs font-bold uppercase tracking-wide text-neutral-400">
        <span className="inline-flex items-center gap-1">
          {label}
          {hint ? <InfoTip text={hint} label={`About ${label}`} /> : null}
        </span>
        <span className="tabular-nums">{fraction}</span>
      </div>
      <ProgressBar value={value} tone={tone} />
    </div>
  );
}

function ActionBtn({ icon: Icon, label, onClick, variant = 'primary', className = '' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        variant === 'secondary' ? 'crm-btn-secondary py-1.5 text-xs' : 'crm-btn-primary py-1.5 text-xs',
        className
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}
