import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { crmApiFetch, updateCampaign } from '../crmApi.js';
import CampaignInitWizard from '../components/wizards/CampaignInitWizard.jsx';
import CampaignStageControl from '../components/projects/CampaignStageControl.jsx';
import DataTableShell from '../components/ui/DataTableShell.jsx';
import ClickableTableRow from '../components/ui/ClickableTableRow.jsx';
import { TableHeaderLabel } from '../components/ui/InfoTip.jsx';
import { CAMPAIGN_AUTOMATION } from '../constants/automationHints.js';
import {
  PageShell,
  PageHeader,
  PageSection,
  MetricGrid,
  Card,
  EmptyState,
  LoadingState,
} from '../components/ui/primitives.jsx';
import {
  Megaphone,
  Plus,
  Building2,
  Users,
  MessageCircle,
} from 'lucide-react';
import {
  AdvancedFilterPopover,
  AdvancedFilterChips,
  useTableFilters,
  CAMPAIGN_FILTER_SCHEMA,
} from '../components/ui/advancedFilter/index.js';

function formatCount(value) {
  return Number(value || 0).toLocaleString('en-AE');
}

export default function ProjectsPage() {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [savingStageId, setSavingStageId] = useState(null);

  const {
    filtered: visibleCampaigns,
    filters: advancedFilters,
    setFilters: setAdvancedFilters,
    matchMode: advancedMatchMode,
  } = useTableFilters(campaigns, CAMPAIGN_FILTER_SCHEMA);

  useEffect(() => {
    crmApiFetch('/api/admin/projects')
      .then(setCampaigns)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function handleStageChange(campaignId, payload) {
    setSavingStageId(campaignId);
    try {
      const updated = await updateCampaign(campaignId, payload);
      setCampaigns((prev) => prev.map((campaign) => (
        campaign._id === campaignId ? { ...campaign, ...updated } : campaign
      )));
    } catch (error) {
      console.error(error);
    } finally {
      setSavingStageId(null);
    }
  }

  if (loading) {
    return (
      <PageShell>
        <LoadingState label="Loading campaigns…" />
      </PageShell>
    );
  }

  const totals = campaigns.reduce(
    (acc, campaign) => {
      acc.companies += campaign.targetCompaniesCount || 0;
      acc.pocs += campaign.pocsFound || 0;
      acc.replied += campaign.pocsResponded || 0;
      return acc;
    },
    { companies: 0, pocs: 0, replied: 0 },
  );

  return (
    <PageShell>
      <PageHeader
        action={
          <button type="button" onClick={() => setShowWizard(true)} className="crm-btn-primary">
            <Plus className="h-[18px] w-[18px]" />
            New campaign
          </button>
        }
      />

      <PageSection>
        <MetricGrid cols={4}>
          <InsightChip icon={Megaphone} label="Active campaigns" value={campaigns.length} />
          <InsightChip icon={Building2} label="Companies found" value={formatCount(totals.companies)} />
          <InsightChip icon={Users} label="POCs found" value={formatCount(totals.pocs)} />
          <InsightChip icon={MessageCircle} label="POCs responded" value={formatCount(totals.replied)} />
        </MetricGrid>
      </PageSection>

      <PageSection>
        <Card className="overflow-hidden">
          {campaigns.length === 0 ? (
            <EmptyState
              icon={Megaphone}
              title="No campaigns yet"
              description="Create a campaign for your next exhibition. Upload target companies, import contacts, then launch sequences."
              action={
                <button type="button" onClick={() => setShowWizard(true)} className="crm-btn-primary">
                  <Plus className="h-4 w-4" />
                  Create your first campaign
                </button>
              }
            />
          ) : (
            <>
              <div className="flex flex-col gap-3 border-b border-[var(--color-line)] px-4 py-3 sm:flex-row sm:items-center">
                <AdvancedFilterPopover
                  schema={CAMPAIGN_FILTER_SCHEMA}
                  filters={advancedFilters}
                  matchMode={advancedMatchMode}
                  onChange={setAdvancedFilters}
                />
              </div>
              <AdvancedFilterChips
                schema={CAMPAIGN_FILTER_SCHEMA}
                filters={advancedFilters}
                onChange={setAdvancedFilters}
                className="px-4 py-3"
              />
              {visibleCampaigns.length === 0 ? (
                <EmptyState
                  icon={Megaphone}
                  title="No campaigns match"
                  description="Try adjusting your search or advanced filters."
                />
              ) : (
            <DataTableShell minWidth={1100}>
              <table className="crm-table">
                <thead>
                  <tr className="crm-table-head">
                    <th>Campaign</th>
                    <th className="crm-table-stage-col"><TableHeaderLabel label="Stage" hint={CAMPAIGN_AUTOMATION.stage} /></th>
                    <th className="text-right"><TableHeaderLabel label="Companies found" hint={CAMPAIGN_AUTOMATION.companiesFound} align="right" /></th>
                    <th className="text-right"><TableHeaderLabel label="Companies reached" hint={CAMPAIGN_AUTOMATION.companiesReached} align="right" /></th>
                    <th className="text-right"><TableHeaderLabel label="POCs found" hint={CAMPAIGN_AUTOMATION.pocsFound} align="right" /></th>
                    <th className="text-right"><TableHeaderLabel label="POCs emailed" hint={CAMPAIGN_AUTOMATION.pocsEmailed} align="right" /></th>
                    <th className="text-right"><TableHeaderLabel label="POCs responded" hint={CAMPAIGN_AUTOMATION.pocsResponded} align="right" /></th>
                    <th className="text-right"><TableHeaderLabel label="In queue" hint={CAMPAIGN_AUTOMATION.inQueue} align="right" /></th>
                    <th className="text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleCampaigns.map((campaign) => (
                    <ClickableTableRow
                      key={campaign._id}
                      onClick={() => navigate(`/admin/crm/projects/${campaign._id}`)}
                    >
                      <td>
                        <p className="font-semibold text-[var(--color-ink)]">{campaign.projectName}</p>
                        {campaign.milestone ? (
                          <p className="mt-0.5 text-[11px] text-neutral-500">{campaign.milestone}</p>
                        ) : null}
                      </td>
                      <td className="crm-table-stage-col">
                        <CampaignStageControl
                          compact
                          status={campaign.status}
                          statusSource={campaign.statusSource}
                          saving={savingStageId === campaign._id}
                          onChange={(payload) => handleStageChange(campaign._id, payload)}
                        />
                      </td>
                      <td className="text-right tabular-nums font-medium text-neutral-800">
                        {formatCount(campaign.targetCompaniesCount)}
                      </td>
                      <td className="text-right tabular-nums text-neutral-700">
                        {formatCount(campaign.companiesReached)}
                      </td>
                      <td className="text-right tabular-nums text-neutral-700">
                        {formatCount(campaign.pocsFound)}
                      </td>
                      <td className="text-right tabular-nums text-neutral-700">
                        {formatCount(campaign.pocsEmailed)}
                      </td>
                      <td className="text-right tabular-nums font-medium text-emerald-700">
                        {formatCount(campaign.pocsResponded)}
                      </td>
                      <td className="text-right tabular-nums text-neutral-500">
                        {formatCount(campaign.activeQueues)}
                      </td>
                      <td className="text-center text-xs font-bold text-brand">Open</td>
                    </ClickableTableRow>
                  ))}
                </tbody>
              </table>
            </DataTableShell>
              )}
            </>
          )}
        </Card>
      </PageSection>

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

function InsightChip({ icon: Icon, label, value }) {
  return (
    <div className="crm-card crm-stat-card">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-600">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">{label}</p>
        <p className="text-sm font-bold tabular-nums text-[var(--color-ink)]">{value}</p>
      </div>
    </div>
  );
}
