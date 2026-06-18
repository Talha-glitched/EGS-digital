import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { crmApiFetch, formatCurrency, formatPercent } from '../crmApi.js';
import CampaignInitWizard from '../components/wizards/CampaignInitWizard.jsx';
import { Modal } from '../components/ui/Modal.jsx';
import { Plus, TrendingUp, Users, Inbox, FolderKanban, ChevronRight, Building2 } from 'lucide-react';
import {
  PageShell,
  PageHeader,
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
    body: 'Name your exhibition campaign, set budget baselines, and upload the list of target companies you want to win.',
  },
  {
    title: 'Import contacts',
    body: 'Inside the project, use Import to upload Apollo, Hunter, or Lusha exports. Duplicates merge automatically.',
  },
  {
    title: 'Launch sequences',
    body: 'Build a multi-step email drip, enroll leads, and track replies in the Inbox. ROI updates as deals close.',
  },
];

const STATUS_TONE = {
  'Active Planning': 'warning',
  'Active Campaigning': 'success',
  Completed: 'neutral',
  Archived: 'neutral',
};

export default function GlobalDashboard() {
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState(null);
  const [projects, setProjects] = useState([]);
  const [showWizard, setShowWizard] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([crmApiFetch('/api/admin/analytics/global'), crmApiFetch('/api/admin/projects')])
      .then(([globalData, projectList]) => {
        setAnalytics(globalData);
        setProjects(projectList);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <PageShell>
        <LoadingState label="Loading dashboard…" />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title="Dashboard"
        subtitle="Portfolio ROI, active outreach queues, and every exhibition campaign in one place."
        action={
          <button type="button" onClick={() => setShowWizard(true)} className="crm-btn-primary">
            <Plus className="h-[18px] w-[18px]" />
            New project
          </button>
        }
      />

      <Modal
        open={showWizard}
        onClose={() => setShowWizard(false)}
        title="Create exhibition project"
        subtitle="Set up a new campaign in three steps. Import contacts and launch sequences once the project exists."
        size="xl"
      >
        <CampaignInitWizard
          onCancel={() => setShowWizard(false)}
          onComplete={(projectId) => {
            setShowWizard(false);
            navigate(`/admin/crm/projects/${projectId}`);
          }}
        />
      </Modal>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Portfolio ROI"
          value={formatPercent(analytics?.roiPercent)}
          icon={TrendingUp}
          tone="brand"
          helpText="Return on all campaign spend vs. logged deal revenue."
        />
        <StatCard
          label="Revenue won"
          value={formatCurrency(analytics?.validatedRevenueWon)}
          icon={Building2}
          tone="success"
          helpText="Closed deals attributed to campaigns."
        />
        <StatCard
          label="Total leads"
          value={analytics?.leadCount ?? 0}
          icon={Users}
          helpText="Individual contacts across all projects."
        />
        <StatCard
          label="Active send queues"
          value={analytics?.activeQueues ?? 0}
          icon={Inbox}
          tone="info"
          helpText="Leads currently enrolled in live email sequences."
        />
      </div>

      {!projects.length && (
        <div className="space-y-3">
          <h2 className="text-[15px] font-semibold text-[var(--color-ink)]">Getting started</h2>
          <WorkflowGuide steps={ONBOARDING_STEPS} />
        </div>
      )}

      <Card>
        <CardHeader
          title="Your projects"
          subtitle="Each project is one exhibition or outreach initiative with its own targets, leads, and ROI."
          action={projects.length ? <Badge tone="neutral">{projects.length}</Badge> : null}
        />
        {projects.length ? (
          <div className="divide-y divide-[var(--color-line)]">
            {projects.map((project) => (
              <Link
                key={project._id}
                to={`/admin/crm/projects/${project._id}`}
                className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-neutral-50/70"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
                  <FolderKanban className="h-5 w-5" strokeWidth={1.75} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2.5">
                    <p className="truncate text-sm font-semibold text-[var(--color-ink)] group-hover:text-brand">
                      {project.projectName}
                    </p>
                    <Badge tone={STATUS_TONE[project.status] || 'neutral'}>{project.status}</Badge>
                  </div>
                  <p className="mt-0.5 truncate text-[13px] text-neutral-500">
                    {project.milestone ? `${project.milestone} · ` : ''}
                    {project.targetCompaniesCount || 0} target companies
                  </p>
                </div>
                <div className="hidden shrink-0 text-right sm:block">
                  <p className="text-sm font-semibold tabular-nums text-[var(--color-ink)]">
                    {formatCurrency(project.financialLedger?.validatedRevenueWon)}
                  </p>
                  <p className="text-[11px] uppercase tracking-wide text-neutral-400">revenue</p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-neutral-300 transition-transform group-hover:translate-x-0.5 group-hover:text-brand" />
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={FolderKanban}
            title="No projects yet"
            description="Create a project for your next exhibition. Upload target companies, import contacts from your prospecting tools, then launch personalized email sequences."
            action={
              <button type="button" onClick={() => setShowWizard(true)} className="crm-btn-primary">
                <Plus className="h-[18px] w-[18px]" />
                Create your first project
              </button>
            }
          />
        )}
      </Card>
    </PageShell>
  );
}
