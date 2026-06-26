import { CAMPAIGN_STATUS_SHORT, CAMPAIGN_STATUS_TONE, CAMPAIGN_STATUSES } from '../../constants/campaignStatus.js';
import { CAMPAIGN_AUTOMATION } from '../../constants/automationHints.js';
import InfoTip from '../ui/InfoTip.jsx';
import { Hand, Sparkles } from 'lucide-react';

export default function CampaignStageControl({
  status,
  statusSource = 'auto',
  onChange,
  saving = false,
  compact = false,
  showHint = false,
}) {
  const tone = CAMPAIGN_STATUS_TONE[status] || 'neutral';
  const isAuto = statusSource !== 'manual';

  function handleStatusChange(event) {
    event.stopPropagation();
    onChange({ status: event.target.value, statusSource: 'manual' });
  }

  function handleResumeAuto(event) {
    event.stopPropagation();
    onChange({ statusSource: 'auto' });
  }

  if (compact) {
    return (
      <div className="crm-stage-control crm-stage-control--compact" onClick={(e) => e.stopPropagation()}>
        <select
          className={`crm-stage-select crm-stage-select--compact crm-stage-select--${tone}`}
          value={status}
          disabled={saving}
          onChange={handleStatusChange}
          aria-label={`Campaign stage: ${status}`}
          title={status}
        >
          {CAMPAIGN_STATUSES.map((option) => (
            <option key={option} value={option} title={option}>
              {CAMPAIGN_STATUS_SHORT[option] || option}
            </option>
          ))}
        </select>
        {!isAuto ? (
          <button
            type="button"
            className="crm-stage-auto-btn"
            disabled={saving}
            onClick={handleResumeAuto}
            title="Resume automatic stage"
            aria-label="Resume automatic stage"
          >
            <Sparkles className="h-2.5 w-2.5" />
          </button>
        ) : (
          <span className="crm-stage-mode" title="Stage updates automatically">
            <Sparkles className="h-2.5 w-2.5" />
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="crm-stage-control">
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wide text-neutral-400">
          Stage
          {showHint ? <InfoTip text={CAMPAIGN_AUTOMATION.stage} /> : null}
        </span>
        <span className={`crm-stage-mode-badge ${isAuto ? 'is-auto' : 'is-manual'}`}>
          {isAuto ? (
            <>
              <Sparkles className="h-3 w-3" />
              Auto
            </>
          ) : (
            <>
              <Hand className="h-3 w-3" />
              Manual
            </>
          )}
        </span>
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-2">
        <select
          className="crm-select crm-stage-select-full"
          value={status}
          disabled={saving}
          onChange={handleStatusChange}
          aria-label="Campaign stage"
        >
          {CAMPAIGN_STATUSES.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        {!isAuto ? (
          <button
            type="button"
            className="crm-btn-ghost text-xs"
            disabled={saving}
            onClick={handleResumeAuto}
          >
            <Sparkles className="h-3.5 w-3.5" />
            Use automatic stage
          </button>
        ) : (
          <p className="text-[11px] text-neutral-500">
            Moves to Campaigning when outreach starts; Planning until then.
          </p>
        )}
      </div>
    </div>
  );
}
