import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { crmApiFetch, formatCurrency, formatPercent } from '../crmApi.js';
import CoverageMetricsBanner from '../components/analytics/CoverageMetricsBanner.jsx';
import VendorPerformanceGrid from '../components/analytics/VendorPerformanceGrid.jsx';
import LeadTableView from '../components/leads/LeadTableView.jsx';
import DataBlenderWizard from '../components/wizards/DataBlenderWizard.jsx';
import SequenceBuilder from '../components/wizards/SequenceBuilder.jsx';
import {
  PageShell,
  PageHeader,
  Tabs,
  Toast,
  LoadingState,
  InfoPanel,
  Badge,
} from '../components/ui/primitives.jsx';
import { ArrowRight, Building2, Users, Coins } from 'lucide-react';

const STATUS_TONE = {
  'Active Planning': 'warning',
  'Active Campaigning': 'success',
  Completed: 'neutral',
  Archived: 'neutral',
};

export default function ProjectDetailWorkspace() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [leads, setLeads] = useState([]);
  const [tab, setTab] = useState('leads');
  const [toast, setToast] = useState('');

  const refresh = useCallback(async () => {
    const [proj, anal, leadData] = await Promise.all([
      crmApiFetch(`/api/admin/projects/${id}`),
      crmApiFetch(`/api/admin/analytics/projects/${id}`),
      crmApiFetch(`/api/admin/projects/${id}/leads?limit=200`),
    ]);
    setProject(proj);
    setAnalytics(anal);
    setLeads(leadData.items || []);
  }, [id]);

  useEffect(() => {
    refresh().catch(console.error);
  }, [refresh]);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 4500);
  }

  if (!project) {
    return (
      <PageShell>
        <LoadingState label="Loading project workspace…" />
      </PageShell>
    );
  }

  const needsTargets = (project.targetCompaniesCount || 0) === 0;
  const needsLeads = leads.length === 0;

  const tabs = [
    {
      id: 'leads',
      label: 'Leads',
      description: 'Every point-of-contact matched to your target companies, with delivery status and source attribution.',
    },
    {
      id: 'ingest',
      label: 'Import contacts',
      description: 'Upload Apollo, Hunter, or Lusha exports. Map columns, preview deduplication, then merge into this project.',
    },
    {
      id: 'sequence',
      label: 'Email sequence',
      description: 'Build a multi-step drip with day delays and optional AI personalization, then enroll eligible leads.',
    },
    {
      id: 'analytics',
      label: 'Analytics',
      description: 'Vendor performance, open rates, and ROI metrics cached for fast loading.',
    },
  ];

  return (
    <PageShell>
      <Toast message={toast} onDismiss={() => setToast('')} />

      <PageHeader
        title={project.projectName}
        subtitle={
          project.milestone
            ? `${project.milestone} — targets, contacts, sequences, and ROI for this campaign.`
            : 'Exhibition outreach campaign workspace.'
        }
        action={<Badge tone={STATUS_TONE[project.status] || 'warning'}>{project.status}</Badge>}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MiniStat icon={Building2} label="Target companies" value={project.targetCompaniesCount || 0} />
        <MiniStat icon={Users} label="Leads" value={leads.length} />
        <MiniStat icon={Coins} label="Campaign cost" value={formatCurrency(project.financialLedger?.totalProjectCost)} />
        <MiniStat icon={ArrowRight} label="ROI" value={formatPercent(analytics?.roiPercent)} accent />
      </div>

      {(needsTargets || needsLeads) && tab === 'leads' && (
        <InfoPanel title="Complete your project setup">
          {needsTargets && (
            <p className="mb-1.5">
              <strong>No target companies yet.</strong> Importing contacts will automatically create companies from each
              contact&apos;s email domain, so you can start in the{' '}
              <button type="button" onClick={() => setTab('ingest')} className="font-semibold text-brand underline-offset-2 hover:underline">
                Import contacts
              </button>{' '}
              tab right away.
            </p>
          )}
          {needsLeads && !needsTargets && (
            <p>
              <strong>No contacts imported.</strong> Open the{' '}
              <button type="button" onClick={() => setTab('ingest')} className="font-semibold text-brand underline-offset-2 hover:underline">
                Import contacts
              </button>{' '}
              tab to upload your Apollo, Hunter, or Lusha export.
            </p>
          )}
        </InfoPanel>
      )}

      <CoverageMetricsBanner analytics={analytics} project={project} />

      <Tabs items={tabs} active={tab} onChange={setTab} />

      <div>
        {tab === 'leads' && <LeadTableView leadsData={leads} campaignsList={[project]} projectId={id} />}
        {tab === 'ingest' && (
          <DataBlenderWizard
            projectId={id}
            onCancel={() => setTab('leads')}
            onComplete={(result) => {
              const created = result.companiesCreated ? `, created ${result.companiesCreated} companies` : '';
              showToast(`Imported ${result.inserted} new leads, merged ${result.merged}${created}.`);
              refresh();
              setTab('leads');
            }}
          />
        )}
        {tab === 'sequence' && (
          <SequenceBuilder
            projectId={id}
            leadCount={leads.length}
            onEnrolled={(result) => {
              showToast(`Enrolled ${result.enrolled} leads — emails send during UAE business hours only.`);
              refresh();
            }}
          />
        )}
        {tab === 'analytics' && <VendorPerformanceGrid vendorMatrix={analytics?.vendorMatrix || []} />}
      </div>

      {tab === 'leads' && leads.length > 0 && (
        <div className="flex justify-end">
          <button type="button" onClick={() => setTab('sequence')} className="crm-btn-secondary">
            Set up email sequence
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </PageShell>
  );
}

function MiniStat({ icon: Icon, label, value, accent }) {
  return (
    <div className="crm-card flex items-center gap-3 p-4">
      <div className={`crm-stat-icon shrink-0 ${accent ? 'bg-brand-soft text-brand' : 'bg-neutral-100 text-neutral-600'}`}>
        <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
      </div>
      <div className="min-w-0">
        <p className="truncate text-[12px] font-medium text-neutral-500">{label}</p>
        <p className="truncate text-lg font-bold tabular-nums text-[var(--color-ink)]">{value}</p>
      </div>
    </div>
  );
}
