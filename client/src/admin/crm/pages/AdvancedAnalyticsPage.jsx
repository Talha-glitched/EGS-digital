import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchComprehensiveAnalytics, formatCurrency, formatPercent } from '../crmApi.js';
import {
  PageShell,
  PageSection,
  MetricGrid,
  SplitGrid,
  StatCard,
  Card,
  CardHeader,
  LoadingState,
  Badge,
} from '../components/ui/primitives.jsx';
import { TrendingUp, Coins, Users, Building2, HelpCircle, RefreshCw, Database } from 'lucide-react';
import ClickableTableRow from '../components/ui/ClickableTableRow.jsx';
import {
  AdvancedFilterPopover,
  AdvancedFilterChips,
  useTableFilters,
  CAMPAIGN_ROI_FILTER_SCHEMA,
} from '../components/ui/advancedFilter/index.js';
import { SortableTableHeader, TableSortIndicator } from '../components/ui/SortableTableHeader.jsx';
import { useTableSort } from '../hooks/useTableSort.js';
import { campaignRoiSortAccessors } from '../hooks/tableSortAccessors.js';
import VendorPerformanceGrid from '../components/analytics/VendorPerformanceGrid.jsx';
import CampaignVendorPerformanceGrid from '../components/analytics/CampaignVendorPerformanceGrid.jsx';

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-AE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function AdvancedAnalyticsPage() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadAnalytics = (forceRefresh = false) => {
    if (forceRefresh) setRefreshing(true);
    else setLoading(true);

    fetchComprehensiveAnalytics({ forceRefresh })
      .then(setData)
      .catch(console.error)
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  };

  useEffect(() => {
    loadAnalytics(false);
  }, []);

  if (loading) {
    return (
      <PageShell>
        <LoadingState label="Loading database analytics snapshot..." />
      </PageShell>
    );
  }

  const {
    totalLeads = 0,
    totalCompanies = 0,
    totalCampaigns = 0,
    outcomes = {},
    statuses = {},
    stepsPerformance = [],
    vendorPerformance = [],
    campaignVendorPerformance = [],
    financials = {},
    campaignMetrics = []
  } = data;

  // 1. Calculations for Doughnut Chart - Outcomes
  const totalOutcomes = Object.values(outcomes).reduce((a, b) => a + b, 0) || 1;
  const outcomeSegments = [
    { label: 'Won', count: outcomes.Won || 0, color: '#10b981' },
    { label: 'Call Scheduled', count: outcomes['Call Scheduled'] || 0, color: '#3b82f6' },
    { label: 'Pending', count: outcomes.Pending || 0, color: '#6b7280' },
    { label: 'Opted Out', count: outcomes['Opted Out'] || 0, color: '#f59e0b' },
    { label: 'Lost', count: outcomes.Lost || 0, color: '#ef4444' }
  ].filter(s => s.count > 0);

  let accumulatedPercent = 0;
  const outcomeDoughnut = outcomeSegments.map(seg => {
    const percent = (seg.count / totalOutcomes) * 100;
    const strokeDash = 251.2; // 2 * pi * r (r=40)
    const dashOffset = strokeDash - (strokeDash * percent) / 100;
    const rotation = (accumulatedPercent / 100) * 360;
    accumulatedPercent += percent;
    return { ...seg, percent, dashOffset, rotation };
  });

  // 2. Calculations for Doughnut Chart - Data Vendors
  const totalVendorLeads = vendorPerformance.reduce((sum, v) => sum + (v.leadsCount || 0), 0) || 1;
  const vendorColors = {
    Apollo: '#f43f5e', // EGS Red Soft/Accent
    Hunter: '#fb923c', // Orange
    Lusha: '#06b6d4',  // Cyan
    Manual: '#64748b'  // Slate
  };
  let accumVendorPercent = 0;
  const vendorDoughnut = vendorPerformance.map(v => {
    const percent = (v.leadsCount / totalVendorLeads) * 100;
    const strokeDash = 251.2;
    const dashOffset = strokeDash - (strokeDash * percent) / 100;
    const rotation = (accumVendorPercent / 100) * 360;
    accumVendorPercent += percent;
    return { 
      label: v.source, 
      count: v.leadsCount, 
      color: vendorColors[v.source] || '#64748b', 
      percent, 
      dashOffset, 
      rotation 
    };
  }).filter(v => v.count > 0);

  // 3. Bar Chart Calculations - Campaign Revenue
  const maxRevenue = Math.max(...campaignMetrics.map(c => c.revenueWon || 0), 10000);
  
  // 4. Bar Chart Calculations - Sequence Steps Response Rates
  const maxReplyRate = Math.max(...stepsPerformance.map(s => s.rate || 0), 20);

  return (
    <PageShell>
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line bg-white px-6 py-4 shadow-sm rounded-2xl mb-6">
        <div>
          <h1 className="text-xl font-extrabold text-ink">Analytics & ROI Performance Reports</h1>
          <p className="text-xs text-neutral-500 font-medium mt-0.5 flex items-center gap-2">
            {data?.isCached ? (
              <span className="inline-flex items-center gap-1.5 text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                <Database className="h-3.5 w-3.5 text-emerald-600" />
                Saved Database Snapshot (Instant Load)
                {data.computedAt && ` • Computed ${new Date(data.computedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-blue-700 font-semibold bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                <span className="h-2 w-2 rounded-full bg-blue-500" />
                Live Recalculated Snapshot
                {data?.computedAt && ` • Updated ${new Date(data.computedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
              </span>
            )}
          </p>
        </div>

        <button
          type="button"
          onClick={() => loadAnalytics(true)}
          disabled={refreshing || loading}
          className="crm-btn-primary flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow transition disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          <span>{refreshing ? 'Recalculating Database...' : 'Refresh All Analytics'}</span>
        </button>
      </div>

      <PageSection>
        <MetricGrid>
          <StatCard compact label="Overall Yield ROI" value={formatPercent(financials.roiPercent)} helpText={`ROI on total cost of ${formatCurrency(financials.totalCost)}`} icon={TrendingUp} tone="brand" />
          <StatCard compact label="Total Revenue Won" value={formatCurrency(financials.totalRevenue)} helpText="From validated client contracts" icon={Coins} tone="success" />
          <StatCard compact label="Global POC Count" value={totalLeads} helpText="Individual contacts in database" icon={Users} tone="info" />
          <StatCard compact label="Company Coverage" value={totalCompanies} helpText={`Target companies across ${totalCampaigns} campaigns`} icon={Building2} />
        </MetricGrid>
      </PageSection>

      <PageSection>
        <SplitGrid>
        
        {/* Graph 1: Campaign Revenue Won */}
        <Card className="flex flex-col min-h-85">
          <CardHeader 
            title="Revenue Won by Campaign (AED)" 
            subtitle="Validated revenue generated across campaign projects" 
            action={
              <button
                type="button"
                onClick={() => loadAnalytics(true)}
                disabled={refreshing}
                className="crm-btn-ghost text-xs text-neutral-600 hover:text-red-600 hover:bg-red-50 flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-neutral-200"
                title="Recalculate revenue"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin text-red-600' : ''}`} />
                <span>Refresh</span>
              </button>
            }
          />
          <div className="flex flex-1 items-end gap-6 px-6 pb-6 pt-2">
            {campaignMetrics.length === 0 ? (
              <div className="w-full text-center text-xs text-neutral-400 py-16">No campaign data yet.</div>
            ) : (
              campaignMetrics.slice(0, 5).map((c, i) => {
                const heightPercent = Math.max((c.revenueWon / maxRevenue) * 100, 4);
                return (
                  <div key={c._id || i} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                    {/* Tooltip */}
                    <div className="absolute bottom-full mb-1 opacity-0 group-hover:opacity-100 bg-neutral-800 text-white text-2xs font-bold py-1 px-2 rounded pointer-events-none transition z-10 whitespace-nowrap">
                      {formatCurrency(c.revenueWon)}
                    </div>
                    {/* Bar */}
                    <div 
                      className="w-12 bg-linear-to-t from-red-700 to-brand hover:to-brand-hover rounded-t-md transition-all duration-500 ease-out cursor-pointer shadow-sm"
                      style={{ height: `${heightPercent}%` }}
                    />
                    {/* Label */}
                    <p className="text-2xs font-bold text-neutral-600 mt-2 truncate w-full text-center" title={c.projectName}>
                      {c.projectName.replace('Exhibition', '').replace('Campaign', '').trim()}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </Card>

        {/* Graph 2: Lead Outcome Segmentations */}
        <Card className="flex flex-col min-h-85">
          <CardHeader 
            title="Lead Segment Outcomes" 
            subtitle="Proportional breakdown of point of contact status states" 
            action={
              <button
                type="button"
                onClick={() => loadAnalytics(true)}
                disabled={refreshing}
                className="crm-btn-ghost text-xs text-neutral-600 hover:text-red-600 hover:bg-red-50 flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-neutral-200"
                title="Recalculate outcomes"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin text-red-600' : ''}`} />
                <span>Refresh</span>
              </button>
            }
          />
          <div className="flex flex-1 items-center justify-around px-6 pb-6 pt-2">
            {outcomeDoughnut.length === 0 ? (
              <div className="text-xs text-neutral-400">No outcomes tracked yet.</div>
            ) : (
              <>
                {/* SVG Doughnut */}
                <div className="relative h-40 w-40 shrink-0">
                  <svg className="h-full w-full" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" fill="transparent" stroke="#f1f5f9" strokeWidth="10" />
                    {outcomeDoughnut.map((seg, i) => (
                      <circle
                        key={i}
                        cx="50"
                        cy="50"
                        r="40"
                        fill="transparent"
                        stroke={seg.color}
                        strokeWidth="10"
                        strokeDasharray="251.2"
                        strokeDashoffset={seg.dashOffset}
                        transform={`rotate(${seg.rotation - 90} 50 50)`}
                        className="transition-all duration-700 ease-out origin-center"
                      />
                    ))}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-xl font-extrabold text-neutral-800 tabular-nums">{totalLeads}</span>
                    <span className="text-2xs uppercase font-bold tracking-wider text-neutral-400">POCs</span>
                  </div>
                </div>

                {/* Legend */}
                <div className="space-y-2.5 max-w-50">
                  {outcomeDoughnut.map((seg, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
                      <span className="text-neutral-500 font-semibold truncate max-w-25">{seg.label}:</span>
                      <span className="font-bold text-neutral-800 tabular-nums">{seg.count} ({seg.percent.toFixed(0)}%)</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </Card>

        {/* Graph 3: Sequence Performance (Reply Rates %) */}
        <Card className="flex flex-col min-h-85">
          <CardHeader 
            title="Step-by-Step Response Rate (%)" 
            subtitle="Which message step index yields the highest reply conversions" 
            action={
              <button
                type="button"
                onClick={() => loadAnalytics(true)}
                disabled={refreshing}
                className="crm-btn-ghost text-xs text-neutral-600 hover:text-red-600 hover:bg-red-50 flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-neutral-200"
                title="Recalculate response rates"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin text-red-600' : ''}`} />
                <span>Refresh</span>
              </button>
            }
          />
          <div className="flex flex-1 items-end gap-6 px-6 pb-6 pt-4">
            {stepsPerformance.map((step, i) => {
              const heightPercent = Math.max((step.rate / maxReplyRate) * 100, 4);
              return (
                <div key={i} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                  <div className="absolute bottom-full mb-1 opacity-0 group-hover:opacity-100 bg-neutral-800 text-white text-2xs font-bold py-1 px-2 rounded pointer-events-none transition whitespace-nowrap">
                    {step.rate.toFixed(1)}% ({step.replies} replies)
                  </div>
                  <div 
                    className="w-10 bg-linear-to-t from-blue-700 to-sky-400 hover:from-blue-600 hover:to-sky-300 rounded-t-md transition-all duration-500 ease-out cursor-pointer"
                    style={{ height: `${heightPercent}%` }}
                  />
                  <p className="text-2xs font-bold text-neutral-500 mt-2">Step {step.step}</p>
                  <p className="text-2xs text-neutral-400 font-mono">Sent: {step.sent}</p>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Graph 4: Data Discovery Vendors Coverage */}
        <Card className="flex flex-col min-h-85">
          <CardHeader 
            title="Discovery Source Contribution" 
            subtitle="Percentage of point of contact profiles added by source vendor" 
            action={
              <button
                type="button"
                onClick={() => loadAnalytics(true)}
                disabled={refreshing}
                className="crm-btn-ghost text-xs text-neutral-600 hover:text-red-600 hover:bg-red-50 flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-neutral-200"
                title="Recalculate vendor contribution"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin text-red-600' : ''}`} />
                <span>Refresh</span>
              </button>
            }
          />
          <div className="flex flex-1 items-center justify-around px-6 pb-6 pt-2">
            {vendorDoughnut.length === 0 ? (
              <div className="text-xs text-neutral-400">No vendor metrics loaded.</div>
            ) : (
              <>
                <div className="relative h-40 w-40 shrink-0">
                  <svg className="h-full w-full" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" fill="transparent" stroke="#f1f5f9" strokeWidth="8" />
                    {vendorDoughnut.map((seg, i) => (
                      <circle
                        key={i}
                        cx="50"
                        cy="50"
                        r="40"
                        fill="transparent"
                        stroke={seg.color}
                        strokeWidth="8"
                        strokeDasharray="251.2"
                        strokeDashoffset={seg.dashOffset}
                        transform={`rotate(${seg.rotation - 90} 50 50)`}
                        className="transition-all duration-700 ease-out origin-center"
                      />
                    ))}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-xl font-extrabold text-neutral-800 tabular-nums">{totalVendorLeads}</span>
                    <span className="text-2xs uppercase font-bold tracking-wider text-neutral-400">Sources</span>
                  </div>
                </div>

                <div className="space-y-2 max-w-50">
                  {vendorDoughnut.map((seg, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
                      <span className="text-neutral-500 font-semibold">{seg.label}:</span>
                      <span className="font-bold text-neutral-800 tabular-nums">{seg.count} ({seg.percent.toFixed(0)}%)</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </Card>
        </SplitGrid>
      </PageSection>

      <PageSection>
        <VendorPerformanceGrid vendorMatrix={vendorPerformance} onRefresh={() => loadAnalytics(true)} isRefreshing={refreshing} />
      </PageSection>

      <PageSection>
        <CampaignVendorPerformanceGrid campaignVendorPerformance={campaignVendorPerformance} onRefresh={() => loadAnalytics(true)} isRefreshing={refreshing} />
      </PageSection>

      <PageSection>
      <Card>
        <CardHeader 
          title="Campaigns Yield ROI Ledger" 
          subtitle="Direct financial inputs and contract yields for active campaigns" 
          action={
            <button
              type="button"
              onClick={() => loadAnalytics(true)}
              disabled={refreshing}
              className="crm-btn-ghost text-xs text-neutral-600 hover:text-red-600 hover:bg-red-50 flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-neutral-200"
              title="Recalculate ROI ledger"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin text-red-600' : ''}`} />
              <span>Refresh</span>
            </button>
          }
        />
        <CampaignRoiTable campaignMetrics={campaignMetrics} navigate={navigate} />
      </Card>
      </PageSection>
    </PageShell>
  );
}

function CampaignRoiTable({ campaignMetrics = [], navigate }) {
  const {
    filtered: visibleRows,
    filters: advancedFilters,
    setFilters: setAdvancedFilters,
    matchMode: advancedMatchMode,
  } = useTableFilters(campaignMetrics, CAMPAIGN_ROI_FILTER_SCHEMA);

  const { sortKey, sortDir, sortLabel, toggleSort, clearSort, sortItems } = useTableSort({
    defaultKey: 'roi',
    defaultDir: 'desc',
    accessors: campaignRoiSortAccessors,
  });

  const sortedRows = useMemo(() => sortItems(visibleRows), [visibleRows, sortItems]);

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-5 py-3">
        <AdvancedFilterPopover
          schema={CAMPAIGN_ROI_FILTER_SCHEMA}
          filters={advancedFilters}
          matchMode={advancedMatchMode}
          onChange={setAdvancedFilters}
        />
      </div>
      <AdvancedFilterChips
        schema={CAMPAIGN_ROI_FILTER_SCHEMA}
        filters={advancedFilters}
        onChange={setAdvancedFilters}
        className="px-5 pb-3"
      />
      <TableSortIndicator
        sortKey={sortKey}
        sortDir={sortDir}
        sortLabel={sortLabel}
        onToggle={() => toggleSort(sortKey)}
        onClear={clearSort}
      />
      <div className="crm-scroll overflow-x-auto">
        <table className="crm-table min-w-175">
          <thead>
            <tr className="crm-table-head">
              <SortableTableHeader label="Campaign Project" sortKey="projectName" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
              <SortableTableHeader label="UAE Milestone" sortKey="milestone" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
              <SortableTableHeader label="Date" sortKey="createdAt" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
              <SortableTableHeader label="Total Cost" sortKey="totalCost" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
              <SortableTableHeader label="Revenue Won" sortKey="revenueWon" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
              <SortableTableHeader label="Yield ROI" sortKey="roi" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
              <SortableTableHeader label="Status" sortKey="status" activeKey={sortKey} direction={sortDir} onSort={toggleSort} align="center" />
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((c) => (
              <ClickableTableRow
                key={c._id}
                onClick={() => navigate(`/admin/crm/projects/${c._id}`)}
              >
                <td className="font-semibold text-ink">{c.projectName}</td>
                <td className="text-neutral-500 font-medium">{c.milestone || 'General Exhibition'}</td>
                <td className="whitespace-nowrap text-xs text-neutral-600">{formatDate(c.createdAt)}</td>
                <td className="font-mono text-neutral-600">{formatCurrency(c.totalCost)}</td>
                <td className="font-mono text-emerald-700 font-semibold">{formatCurrency(c.revenueWon)}</td>
                <td className={`font-bold ${c.roi >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {formatPercent(c.roi)}
                </td>
                <td className="text-center">
                  <Badge tone={c.status === 'Active Campaigning' ? 'success' : 'neutral'}>
                    {c.status}
                  </Badge>
                </td>
              </ClickableTableRow>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
