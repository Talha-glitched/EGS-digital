import { Modal } from '../ui/Modal.jsx';
import { ProgressBar } from '../ui/primitives.jsx';
import VendorPerformanceGrid from '../analytics/VendorPerformanceGrid.jsx';
import CoverageMetricsBanner from '../analytics/CoverageMetricsBanner.jsx';
import { ModalPreviewMetrics, ModalSection, ModalStack } from '../ui/workspaceModalParts.jsx';
import { CAMPAIGN_AUTOMATION } from '../../constants/automationHints.js';
import InfoTip from '../ui/InfoTip.jsx';
import { formatPercent } from '../../crmApi.js';
import { BarChart3 } from 'lucide-react';

export default function ProjectPerformanceModal({ open, onClose, project, analytics, leads = [] }) {
  const EMAILED_STATUSES = ['Emailed Outbound', 'Replied', 'Bounced / Invalid'];
  const pocsEmailed = leads.filter((lead) => EMAILED_STATUSES.includes(lead.deliveryStatus)).length;
  const pocsResponded = leads.filter((lead) => lead.deliveryStatus === 'Replied').length;
  const pocReplyPct = pocsEmailed ? (pocsResponded / pocsEmailed) * 100 : 0;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Performance metrics"
      subtitle={project?.projectName ? `${project.projectName} — coverage and vendor quality` : 'Campaign diagnostics'}
      icon={BarChart3}
      accent="amber"
      size="2xl"
    >
      <ModalStack>
        <ModalPreviewMetrics
          items={[
            { label: 'POC discovery', value: formatPercent(analytics?.pocDiscoveryPercent) },
            { label: 'Company reply', value: formatPercent(analytics?.interactionProgressPercent), tone: 'success' },
            { label: 'POC reply', value: formatPercent(pocReplyPct), tone: 'success' },
            { label: 'Target companies', value: project?.targetCompaniesCount ?? 0 },
          ]}
        />

        <ModalSection title="Coverage progress" description="Live rates calculated from campaign data and inbox sync.">
          <div className="crm-modal-progress-grid cols-3">
            <ProgressBlock
              label="POC discovery"
              hint={CAMPAIGN_AUTOMATION.discoveryRate}
              value={analytics?.pocDiscoveryPercent ?? 0}
              fraction={`${project?.companiesWithPocsFound || 0}/${project?.targetCompaniesCount || 0}`}
              tone="brand"
            />
            <ProgressBlock
              label="Companies replied"
              hint={CAMPAIGN_AUTOMATION.replyRate}
              value={analytics?.interactionProgressPercent ?? 0}
              fraction={`${project?.companiesRespondedCount || 0}/${project?.targetCompaniesCount || 0}`}
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
        </ModalSection>

        <CoverageMetricsBanner analytics={analytics} project={project} />

        <ModalSection title="Vendor sources" description="Leads, engagement, and revenue by discovery tool (Apollo, Hunter, Lusha, Manual).">
          <div className="mb-2 flex items-center gap-1.5">
            <InfoTip text={CAMPAIGN_AUTOMATION.vendorSources} label="About vendor sources" />
          </div>
          <VendorPerformanceGrid vendorMatrix={analytics?.vendorMatrix ?? []} />
        </ModalSection>
      </ModalStack>
    </Modal>
  );
}

function ProgressBlock({ label, hint, value, fraction, tone }) {
  return (
    <div className="crm-modal-progress-card">
      <div className="mb-2.5 flex items-center justify-between gap-2 text-2xs font-bold uppercase tracking-wide text-neutral-400">
        <span className="inline-flex items-center gap-1">
          {label}
          {hint ? <InfoTip text={hint} label={`About ${label}`} /> : null}
        </span>
        <span className="tabular-nums text-neutral-600">{fraction}</span>
      </div>
      <ProgressBar value={value} tone={tone} />
      <p className="mt-2 text-right text-xs font-bold tabular-nums text-[var(--color-ink)]">{formatPercent(value)}</p>
    </div>
  );
}
