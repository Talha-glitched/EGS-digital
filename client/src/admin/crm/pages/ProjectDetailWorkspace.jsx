import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { crmApiFetch, formatPercent, updateCampaign } from '../crmApi.js';
import ProjectDatabaseTable from '../components/projects/ProjectDatabaseTable.jsx';
import CampaignStageControl from '../components/projects/CampaignStageControl.jsx';
import ExhibitorImportModal from '../components/projects/ExhibitorImportModal.jsx';
import ContactBlenderModal from '../components/projects/ContactBlenderModal.jsx';
import ProjectPerformanceModal from '../components/projects/ProjectPerformanceModal.jsx';
import CompanyDetailsDrawer from '../components/leads/CompanyDetailsDrawer.jsx';
import OutreachDrawer from '../components/leads/OutreachDrawer.jsx';
import InfoTip from '../components/ui/InfoTip.jsx';
import { CAMPAIGN_AUTOMATION } from '../constants/automationHints.js';
import {
  PageShell,
  PageSection,
  Toast,
  LoadingState,
  ProgressBar,
} from '../components/ui/primitives.jsx';
import {
  Building2,
  Users,
  MessageCircle,
  Upload,
  Sparkles,
  Layers,
  BarChart3,
  ChevronLeft,
  TrendingUp,
} from 'lucide-react';

const EMAILED_STATUSES = ['Emailed Outbound', 'Replied', 'Bounced / Invalid'];

export default function ProjectDetailWorkspace() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [leads, setLeads] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [toast, setToast] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState(null);
  const [selectedLead, setSelectedLead] = useState(null);
  const [modal, setModal] = useState(null);
  const [savingStage, setSavingStage] = useState(false);

  const refresh = useCallback(async () => {
    const [proj, anal, leadData, companyData] = await Promise.all([
      crmApiFetch(`/api/admin/projects/${id}`),
      crmApiFetch(`/api/admin/analytics/projects/${id}`),
      crmApiFetch(`/api/admin/projects/${id}/leads?limit=500`),
      crmApiFetch(`/api/admin/projects/${id}/companies?limit=500`),
    ]);
    setProject(proj);
    setAnalytics(anal);
    setLeads(leadData.items || []);
    setCompanies(companyData.items || []);
  }, [id]);

  useEffect(() => {
    refresh().catch(console.error);
  }, [refresh]);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 4500);
  }

  function handleImported(msg) {
    showToast(msg);
    refresh();
  }

  function handleLeadUpdated() {
    refresh();
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

  if (!project) {
    return (
      <PageShell compact>
        <LoadingState label="Loading project…" />
      </PageShell>
    );
  }

  const target = project.targetCompaniesCount || 0;
  const pocPct = analytics?.pocDiscoveryPercent ?? 0;
  const replyPct = analytics?.interactionProgressPercent ?? 0;
  const pocsEmailed = leads.filter((lead) => EMAILED_STATUSES.includes(lead.deliveryStatus)).length;
  const pocsResponded = leads.filter((lead) => lead.deliveryStatus === 'Replied').length;
  const pocReplyPct = pocsEmailed ? (pocsResponded / pocsEmailed) * 100 : 0;

  return (
    <PageShell compact>
      <Toast message={toast} onDismiss={() => setToast('')} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/admin/crm/projects" className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-500 hover:text-brand">
          <ChevronLeft className="h-3.5 w-3.5" />
          All campaigns
        </Link>
        <CampaignStageControl
          status={project.status}
          statusSource={project.statusSource}
          onChange={handleStageChange}
          saving={savingStage}
          showHint
        />
      </div>

      <PageSection>
        <div className="crm-card px-4 py-3.5 lg:px-5">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
            <CompactStat icon={Building2} label="Exhibitors" value={target} />
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
              fraction={`${project.companiesWithPocsFound || 0}/${target}`}
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

          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[var(--color-line)] pt-3">
            <ActionBtn icon={Upload} label="Add exhibitors" onClick={() => setModal('exhibitors')} />
            <ActionBtn icon={Sparkles} label="Contact blender" onClick={() => setModal('blender')} />
            <Link
              to={`/admin/crm/sequences?new=1&campaign=${id}`}
              className="crm-btn-secondary inline-flex items-center gap-1.5 py-1.5 text-xs"
            >
              <Layers className="h-3.5 w-3.5" />
              Email sequences
            </Link>
            <ActionBtn icon={BarChart3} label="Performance" onClick={() => setModal('performance')} variant="secondary" />
          </div>
        </div>
      </PageSection>

      <PageSection>
        <ProjectDatabaseTable
          companies={companies}
          leads={leads}
          onCompanyClick={setSelectedCompanyId}
          onLeadClick={setSelectedLead}
        />
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

      <CompanyDetailsDrawer
        companyId={selectedCompanyId}
        onClose={() => setSelectedCompanyId(null)}
        onPersonSelected={setSelectedLead}
        onUpdated={refresh}
      />

      <OutreachDrawer
        lead={selectedLead}
        onClose={() => setSelectedLead(null)}
        onLeadUpdated={handleLeadUpdated}
        stackLevel={selectedCompanyId ? 1 : 0}
      />
    </PageShell>
  );
}

function CompactStat({ icon: Icon, label, value, accent, hint }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className={`h-3.5 w-3.5 ${accent ? 'text-brand' : 'text-neutral-400'}`} strokeWidth={2} />
      <span className="text-neutral-500">{label}</span>
      <span className={`font-bold tabular-nums ${accent ? 'text-brand' : 'text-[var(--color-ink)]'}`}>{value}</span>
      {hint && <InfoTip text={hint} label={`About ${label}`} />}
    </div>
  );
}

function ProgressBlock({ label, hint, value, fraction, tone }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2 text-[10px] font-bold uppercase tracking-wide text-neutral-400">
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

function ActionBtn({ icon: Icon, label, onClick, variant = 'primary' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={variant === 'secondary' ? 'crm-btn-secondary py-1.5 text-xs' : 'crm-btn-primary py-1.5 text-xs'}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}
