import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { crmApiFetch, formatCurrency, formatPercent } from '../crmApi.js';
import CampaignInitWizard from '../components/wizards/CampaignInitWizard.jsx';
import { Plus, TrendingUp, Users, Inbox, FolderKanban, ChevronRight, Building2, BriefcaseBusiness, ListTodo, AlertTriangle, ArrowUpRight, Clock3, MessageCircle } from 'lucide-react';
import { formatDeadlineLabel, getDeadlineTone } from '../components/tasks/taskUtils.js';
import {
  PageShell,
  PageHeader,
  PageSection,
  MetricGrid,
  SplitGrid,
  ListBody,
  ListRow,
  StatBand,
  StatBandItem,
  Card,
  CardHeader,
  StatCard,
  EmptyState,
  LoadingState,
  WorkflowGuide,
  Badge,
} from '../components/ui/primitives.jsx';

const ONBOARDING_STEPS = [
  {
    title: 'Create a project',
    body: 'Name your exhibition campaign and upload the list of target companies you want to win.',
  },
  {
    title: 'Import contacts',
    body: 'Inside the project, use Import to upload Apollo, Hunter, or Lusha exports. Duplicates merge automatically.',
  },
  {
    title: 'Launch sequences',
    body: 'Open Email Sequences under Leads, build a multi-step drip, pick your audience, and launch or save as draft.',
  },
];

const STATUS_TONE = {
  'Active Planning': 'warning',
  'Active Campaigning': 'success',
  Completed: 'neutral',
  Archived: 'neutral',
};

const DEMO_SUMMARY = {
  metrics: { activeOpportunities: 9, pipelineValue: 3795000, weightedPipeline: 2322250, closingSoon: 5, overdueTasks: 2, interestedReplies7d: 4, failedSendJobs: 0, pendingContacts: 186 },
  openTasks: [
    { _id: 'demo-dash-task-1', title: 'Call Apex Energy procurement director', priority: 'High', dueAt: '2026-06-21T10:00:00', companyId: { companyName: 'Apex Energy Systems' } },
    { _id: 'demo-dash-task-2', title: 'Send revised Gulfood proposal', priority: 'High', dueAt: '2026-06-21T14:30:00', companyId: { companyName: 'Al Noor Foods' } },
    { _id: 'demo-dash-task-3', title: 'Confirm venue walkthrough attendees', priority: 'Normal', dueAt: '2026-06-22T09:30:00', companyId: { companyName: 'Northbridge University' } },
    { _id: 'demo-dash-task-4', title: 'Finalize signage bill of quantities', priority: 'Normal', dueAt: '2026-06-24T16:00:00', companyId: { companyName: 'Crescent Holdings' } },
  ],
  recentOpportunities: [
    { _id: 'demo-dash-opp-1', name: 'World Trade Centre pavilion', stage: 'Negotiation', valueAed: 740000, probability: 80, companyId: { companyName: 'Orion Defence' } },
    { _id: 'demo-dash-opp-2', name: 'University ceremony programme', stage: 'Contract Sent', valueAed: 390000, probability: 90, companyId: { companyName: 'Emirates Technical University' } },
    { _id: 'demo-dash-opp-3', name: 'Gulfood custom island stand', stage: 'Proposal Sent', valueAed: 275000, probability: 65, companyId: { companyName: 'Al Noor Foods' } },
    { _id: 'demo-dash-opp-4', name: 'ADIPEC double-decker stand', stage: 'Discovery / Site Visit', valueAed: 680000, probability: 45, companyId: { companyName: 'Apex Energy Systems' } },
  ],
};

export default function GlobalDashboard() {
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState(null);
  const [projects, setProjects] = useState([]);
  const [summary, setSummary] = useState(null);
  const [showWizard, setShowWizard] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadDashboard = useCallback(async () => {
    const [globalData, projectList, workspaceSummary] = await Promise.all([
      crmApiFetch('/api/admin/analytics/global'),
      crmApiFetch('/api/admin/projects'),
      crmApiFetch('/api/admin/workspace/summary'),
    ]);
    setAnalytics(globalData);
    setProjects(projectList);
    setSummary(workspaceSummary);
  }, []);

  async function handleToggleTask(taskId) {
    setSummary((prev) => prev ? {
      ...prev,
      openTasks: prev.openTasks?.filter((t) => t._id !== taskId) || [],
    } : prev);
    try {
      await crmApiFetch(`/api/admin/sales/tasks/${taskId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'Done' }),
      });
    } catch {
      loadDashboard().catch(() => {});
    }
  }

  useEffect(() => {
    loadDashboard()
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [loadDashboard]);

  useEffect(() => {
    let timer = null;
    function handleWorkspaceChanged() {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        loadDashboard().catch(console.error);
      }, 150);
    }
    window.addEventListener('crm:workspace-changed', handleWorkspaceChanged);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('crm:workspace-changed', handleWorkspaceChanged);
    };
  }, [loadDashboard]);

  if (loading) {
    return (
      <PageShell>
        <LoadingState label="Loading dashboard…" />
      </PageShell>
    );
  }

  const previewMode = !summary
    || (
      !summary?.metrics?.activeOpportunities
      && !summary?.openTasks?.length
      && !summary?.recentOpportunities?.length
    );
  const workspace = previewMode ? DEMO_SUMMARY : summary;

  return (
    <PageShell>
      <PageHeader
        action={
          <>
            <Link to="/admin/crm/projects" className="crm-btn-secondary"><FolderKanban className="h-4 w-4" />All campaigns</Link>
            <button type="button" onClick={() => setShowWizard(true)} className="crm-btn-primary"><Plus className="h-[18px] w-[18px]" />New campaign</button>
          </>
        }
      />

      {(workspace?.metrics?.overdueTasks > 0 || workspace?.metrics?.failedSendJobs > 0 || workspace?.metrics?.interestedReplies7d > 0) && (
        <PageSection>
          <div className="crm-card flex flex-col gap-4 border-l-4 border-l-amber-500 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-700"><AlertTriangle className="h-4 w-4" /></div>
              <div>
                <p className="text-sm font-semibold text-[var(--color-ink)]">Attention needed</p>
                <p className="mt-0.5 text-xs leading-relaxed text-neutral-500">
                  {workspace.metrics.overdueTasks || 0} overdue follow-up(s), {workspace.metrics.interestedReplies7d || 0} interested reply/replies this week, and {workspace.metrics.failedSendJobs || 0} failed send job(s).
                </p>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Link to="/admin/crm/tasks" className="crm-btn-secondary">Review follow-ups<ArrowUpRight className="h-4 w-4" /></Link>
              {workspace?.metrics?.failedSendJobs > 0 ? (
                <Link to="/admin/crm/email?tab=failed" className="crm-btn-secondary">Review failed sends<ArrowUpRight className="h-4 w-4" /></Link>
              ) : null}
            </div>
          </div>
        </PageSection>
      )}

      <PageSection>
        <MetricGrid>
          <StatCard compact label="Open pipeline" value={formatCurrency(workspace?.metrics?.pipelineValue)} helpText={`${workspace?.metrics?.activeOpportunities || 0} active opportunities`} icon={BriefcaseBusiness} tone="brand" />
          <StatCard compact label="Weighted forecast" value={formatCurrency(workspace?.metrics?.weightedPipeline)} helpText={`${workspace?.metrics?.closingSoon || 0} expected to close in 30 days`} icon={TrendingUp} tone="success" />
          <StatCard compact label="Interested replies" value={workspace?.metrics?.interestedReplies7d || 0} helpText="Received during the last 7 days" icon={MessageCircle} tone="info" />
          <StatCard compact label="Overdue tasks" value={workspace?.metrics?.overdueTasks || 0} helpText="Follow-ups currently past due" icon={ListTodo} tone={workspace?.metrics?.overdueTasks ? 'warning' : 'neutral'} />
        </MetricGrid>
      </PageSection>

      <PageSection>
        <SplitGrid>
          <Card>
            <CardHeader title="Next actions" subtitle="The open follow-ups with the nearest due dates." action={<Link to="/admin/crm/tasks" className="text-xs font-semibold text-brand hover:underline">View all</Link>} />
            {workspace?.openTasks?.length ? (
              <ListBody>
                {workspace.openTasks.map((task) => (
                  <ListRow key={task._id} className="items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => handleToggleTask(task._id)}
                      title="Mark task completed"
                      aria-label={`Mark task completed: ${task.title}`}
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-neutral-300 bg-white text-transparent transition hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-600"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 fill-current" />
                    </button>
                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${task.priority === 'High' ? 'bg-red-500' : 'bg-sky-500'}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold text-[var(--color-ink)]">{task.title}</p>
                      <p className="mt-0.5 text-xs text-neutral-500">{task.companyId?.companyName || task.opportunityId?.name || 'General follow-up'}</p>
                    </div>
                    {task.dueAt && (
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <span className="flex items-center gap-1 text-[11px] text-neutral-400">
                          <Clock3 className="h-3 w-3" />
                          {new Date(task.dueAt).toLocaleDateString('en-AE', { day: 'numeric', month: 'short' })}
                        </span>
                        {(() => {
                          const tone = getDeadlineTone(task.dueAt, task.status);
                          const label = formatDeadlineLabel(task.dueAt, task.status);
                          if (!tone || !label) return null;
                          const styles = { overdue: 'bg-red-100 text-red-700', today: 'bg-amber-100 text-amber-700', upcoming: 'bg-emerald-100 text-emerald-700' };
                          return <span className={`inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${styles[tone]}`}>{label}</span>;
                        })()}
                      </div>
                    )}
                  </ListRow>
                ))}
              </ListBody>
            ) : (
              <EmptyState icon={ListTodo} title="No open follow-ups" description="Create a task when a conversation needs a call, meeting, proposal, or reminder." action={<Link to="/admin/crm/tasks" className="crm-btn-secondary"><Plus className="h-4 w-4" />Create task</Link>} />
            )}
          </Card>

          <Card>
            <CardHeader title="Recent opportunities" subtitle="Commercial conversations most recently updated." action={<Link to="/admin/crm/pipeline" className="text-xs font-semibold text-brand hover:underline">View pipeline</Link>} />
            {workspace?.recentOpportunities?.length ? (
              <ListBody>
                {workspace.recentOpportunities.map((item) => (
                  <ListRow key={item._id} as={Link} to="/admin/crm/pipeline" className="group hover:bg-neutral-50/80">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand"><BriefcaseBusiness className="h-4 w-4" /></div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold text-[var(--color-ink)] group-hover:text-brand">{item.name}</p>
                      <p className="mt-0.5 truncate text-xs text-neutral-500">{item.companyId?.companyName || 'Unknown company'} · {item.stage}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-[13px] font-bold tabular-nums text-[var(--color-ink)]">{formatCurrency(item.valueAed)}</p>
                      <p className="text-[10px] text-neutral-400">{item.probability || 0}% probability</p>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-neutral-300 group-hover:text-brand" />
                  </ListRow>
                ))}
              </ListBody>
            ) : (
              <EmptyState icon={BriefcaseBusiness} title="No sales opportunities" description="Turn a qualified reply into a tracked opportunity with value, stage, owner, and next action." action={<Link to="/admin/crm/pipeline" className="crm-btn-primary"><Plus className="h-4 w-4" />Create opportunity</Link>} />
            )}
          </Card>
        </SplitGrid>
      </PageSection>

      <PageSection>
        <StatBand>
          <StatBandItem as={Link} to="/admin/crm/finance" label="Campaign ROI" value={formatPercent(analytics?.roiPercent)} detail="Manage in Finance" icon={TrendingUp} tone="brand" />
          <StatBandItem as={Link} to="/admin/crm/finance" label="Revenue won" value={formatCurrency(analytics?.validatedRevenueWon)} detail="Log closed deals" icon={Building2} tone="success" />
          <StatBandItem label="Contacts in campaigns" value={analytics?.leadCount ?? 0} detail="Across all projects" icon={Users} />
          <StatBandItem as={Link} to="/admin/crm/sequences" label="Active sequences" value={analytics?.activeQueues ?? 0} detail="Manage email drips" icon={Inbox} tone="info" />
        </StatBand>
      </PageSection>

      {!projects.length && (
        <PageSection>
          <h2 className="text-[15px] font-semibold text-[var(--color-ink)]">Getting started</h2>
          <WorkflowGuide steps={ONBOARDING_STEPS} />
        </PageSection>
      )}

      {projects.length > 0 && (
        <PageSection>
          <Card>
            <CardHeader
              title="Recent campaigns"
              subtitle={`Quick access to active outreach projects.${analytics?.computedAt ? ` Updated ${new Date(analytics.computedAt).toLocaleString('en-AE')}.` : ''}`}
              action={<Link to="/admin/crm/projects" className="text-xs font-semibold text-brand hover:underline">View all</Link>}
            />
            <ListBody>
              {projects.slice(0, 5).map((project) => (
                <ListRow key={project._id} as={Link} to={`/admin/crm/projects/${project._id}`} className="group hover:bg-neutral-50/80">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
                    <FolderKanban className="h-5 w-5" strokeWidth={1.75} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-semibold text-[var(--color-ink)] group-hover:text-brand">{project.projectName}</p>
                      <Badge tone={STATUS_TONE[project.status] || 'neutral'}>{project.status}</Badge>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-neutral-500">
                      {project.milestone ? `${project.milestone} · ` : ''}
                      {project.targetCompaniesCount || 0} targets · {project.companiesWithPocsFound || 0} with POC
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-neutral-300 group-hover:text-brand" />
                </ListRow>
              ))}
            </ListBody>
          </Card>
        </PageSection>
      )}

      <CampaignInitWizard
        open={showWizard}
        onClose={() => setShowWizard(false)}
        onComplete={(projectId) => {
          setShowWizard(false);
          navigate(`/admin/crm/projects/${projectId}`);
        }}
      />
    </PageShell>
  );
}
