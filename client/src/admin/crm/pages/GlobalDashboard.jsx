import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { crmApiFetch, fetchLeadById, notifyWorkspaceChanged } from '../crmApi.js';
import {
  PageShell,
  PageHeader,
  PageSection,
  Card,
  ListBody,
  ListRow,
  Badge,
  LoadingState,
  Alert,
  cn,
} from '../components/ui/primitives.jsx';
import { FolderKanban, ChevronRight } from 'lucide-react';
import DashboardOngoingJobsSection from '../components/dashboard/DashboardOngoingJobsSection.jsx';
import DashboardKeyRelationshipsSection from '../components/dashboard/DashboardKeyRelationshipsSection.jsx';
import DashboardLeadsSection from '../components/dashboard/DashboardLeadsSection.jsx';
import DailyReviewConsistency from '../components/dashboard/DailyReviewConsistency.jsx';
import OngoingJobDrawer from '../components/sales/OngoingJobDrawer.jsx';
import OutreachDrawer from '../components/leads/OutreachDrawer.jsx';

const STATUS_TONE = {
  'Active Planning': 'warning',
  'Active Campaigning': 'success',
  Completed: 'neutral',
  Archived: 'neutral',
};

export default function GlobalDashboard() {
  const [workingData, setWorkingData] = useState({ ongoingJobs: [], keyRelationships: [], leads: [] });
  const [reviewStatus, setReviewStatus] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Middle row synced expand state (Key Relationships & Leads expand together)
  const [middleRowExpanded, setMiddleRowExpanded] = useState(false);

  // Recent Campaigns collapsible state
  const [campaignsExpanded, setCampaignsExpanded] = useState(false);

  // Drawers state
  const [selectedOngoingJobId, setSelectedOngoingJobId] = useState(null);
  const [selectedLead, setSelectedLead] = useState(null);
  const [selectedLeadTab, setSelectedLeadTab] = useState('relationship');

  const loadDashboard = useCallback(async () => {
    try {
      const [wData, rStatus, projectList] = await Promise.all([
        crmApiFetch('/api/admin/dashboard/working-view'),
        crmApiFetch('/api/admin/daily-reviews/today'),
        crmApiFetch('/api/admin/projects'),
      ]);
      setWorkingData(wData || { ongoingJobs: [], keyRelationships: [], leads: [] });
      setReviewStatus(rStatus?.sections || null);
      setProjects(projectList || []);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to load dashboard working view.');
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    loadDashboard().finally(() => setLoading(false));
  }, [loadDashboard]);

  // Sync: same-window workspace changes, window focus, and 60s modest polling
  useEffect(() => {
    let timer = null;
    const handleRefresh = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        loadDashboard().catch(console.error);
      }, 150);
    };

    window.addEventListener('crm:workspace-changed', handleRefresh);
    window.addEventListener('focus', handleRefresh);
    const interval = window.setInterval(handleRefresh, 60000);

    return () => {
      window.clearTimeout(timer);
      window.clearInterval(interval);
      window.removeEventListener('crm:workspace-changed', handleRefresh);
      window.removeEventListener('focus', handleRefresh);
    };
  }, [loadDashboard]);

  const handleCompleteReview = async (section) => {
    setBusy(true);
    setError('');
    try {
      const record = await crmApiFetch('/api/admin/daily-reviews/complete', {
        method: 'POST',
        body: JSON.stringify({ section }),
      });

      setReviewStatus((prev) => ({
        ...prev,
        [section]: {
          isCompleted: true,
          completedByName: record.completedByName,
          completedAt: record.completedAt,
        },
      }));

      notifyWorkspaceChanged({ entity: 'daily-review', action: 'complete', section });
    } catch (err) {
      setError(err.message || 'Failed to record daily review completion.');
    } finally {
      setBusy(false);
    }
  };

  const handleOpenPersonDrawer = async (leadId, tab = 'relationship') => {
    if (!leadId) return;
    try {
      const fullLead = await fetchLeadById(leadId);
      setSelectedLead(fullLead);
      setSelectedLeadTab(tab);
    } catch (err) {
      console.error('Failed to load lead profile:', err);
      setError('Could not open contact profile.');
    }
  };

  if (loading) {
    return (
      <PageShell>
        <LoadingState label="Loading daily working dashboard…" />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader />

      {error && (
        <PageSection>
          <Alert tone="warning">{error}</Alert>
        </PageSection>
      )}

      {/* 1. Ongoing Jobs — Full Width (Header is Clickable Accordion) */}
      <PageSection>
        <DashboardOngoingJobsSection
          jobs={workingData.ongoingJobs}
          reviewStatus={reviewStatus?.ongoing_jobs}
          onCompleteReview={handleCompleteReview}
          onOpenJob={(id) => setSelectedOngoingJobId(id)}
          busy={busy}
        />
      </PageSection>

      {/* 2. Key Relationships & Leads — Two Columns (Synced Accordions) */}
      <PageSection>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <DashboardKeyRelationshipsSection
            relationships={workingData.keyRelationships}
            reviewStatus={reviewStatus?.key_relationships}
            onCompleteReview={handleCompleteReview}
            onOpenPerson={(id) => handleOpenPersonDrawer(id, 'follow_ups')}
            busy={busy}
            isExpanded={middleRowExpanded}
            onToggleExpand={() => setMiddleRowExpanded((prev) => !prev)}
          />
          <DashboardLeadsSection
            leads={workingData.leads}
            reviewStatus={reviewStatus?.leads}
            onCompleteReview={handleCompleteReview}
            onOpenPerson={(id) => handleOpenPersonDrawer(id, 'follow_ups')}
            busy={busy}
            isExpanded={middleRowExpanded}
            onToggleExpand={() => setMiddleRowExpanded((prev) => !prev)}
          />
        </div>
      </PageSection>

      {/* 3. Recent Campaigns (Left Column) & Daily Review Consistency (Right Column) */}
      <PageSection>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 items-start">
          {/* Recent Campaigns (Collapsible Header with Smooth CSS Grid Accordion) */}
          <Card className="p-0 border border-neutral-200/90 shadow-2xs bg-white">
            <div
              onClick={() => setCampaignsExpanded((prev) => !prev)}
              className="flex items-center justify-between p-3.5 bg-neutral-50/80 cursor-pointer hover:bg-neutral-100/70 transition border-b border-neutral-200/80"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-soft text-brand font-bold shrink-0">
                  <FolderKanban className="h-3.5 w-3.5" />
                </div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-ink">Recent Campaigns ({projects.length})</h3>
                  <ChevronRight
                    className={cn(
                      'h-3.5 w-3.5 text-neutral-400 transition-transform duration-300 ease-in-out',
                      campaignsExpanded && 'rotate-90 text-brand'
                    )}
                  />
                </div>
              </div>
              <Link
                to="/admin/crm/projects"
                onClick={(e) => e.stopPropagation()}
                className="text-[11px] font-semibold text-brand hover:underline"
              >
                View all
              </Link>
            </div>

            {/* Smooth CSS Grid Accordion Container */}
            <div
              className={cn(
                'grid transition-[grid-template-rows,opacity] duration-300 ease-in-out',
                campaignsExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0 pointer-events-none'
              )}
            >
              <div className="overflow-hidden">
                <ListBody className="divide-y divide-neutral-100 bg-white">
                  {projects.slice(0, 5).map((project) => (
                    <ListRow key={project._id} as={Link} to={`/admin/crm/projects/${project._id}`} className="group hover:bg-sky-50/50 py-2 px-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p className="truncate text-xs font-bold text-ink group-hover:text-brand">{project.projectName}</p>
                          <Badge tone={STATUS_TONE[project.status] || 'neutral'} className="py-0 px-1.5 text-[9px]">{project.status}</Badge>
                        </div>
                        <p className="mt-0.5 truncate text-[10px] text-neutral-500">
                          {project.milestone ? `${project.milestone} · ` : ''}
                          {project.targetCompaniesCount || 0} targets · {project.companiesWithPocsFound || 0} with POC
                        </p>
                      </div>
                      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-neutral-300 group-hover:text-brand transition" />
                    </ListRow>
                  ))}
                </ListBody>
              </div>
            </div>
          </Card>

          {/* Daily Review Consistency */}
          <DailyReviewConsistency />
        </div>
      </PageSection>

      {/* Ongoing Job Drawer */}
      {selectedOngoingJobId && (
        <OngoingJobDrawer
          ongoingJobId={selectedOngoingJobId}
          onClose={() => setSelectedOngoingJobId(null)}
          onUpdated={() => loadDashboard()}
        />
      )}

      {/* Contact Drawer */}
      <OutreachDrawer
        lead={selectedLead}
        initialTab={selectedLeadTab}
        onClose={() => setSelectedLead(null)}
        onLeadUpdated={() => loadDashboard()}
      />
    </PageShell>
  );
}
