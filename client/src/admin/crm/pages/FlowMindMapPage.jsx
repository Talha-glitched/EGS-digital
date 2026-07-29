import { useEffect, useMemo, useState } from 'react';
import { crmApiFetch } from '../crmApi.js';
import { 
  PageShell, 
  PageHeader, 
  Card, 
  Badge, 
  LoadingState, 
  EmptyState,
  Alert,
  Field 
} from '../components/ui/primitives.jsx';
import { 
  Layers, 
  Plus, 
  Trash2, 
  Play, 
  Clock, 
  Sparkles, 
  ChevronDown, 
  Save, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';
import SearchableSelect from '../components/ui/SearchableSelect.jsx';

const GRADUATION_STEPS = [
  {
    stepOrder: 1,
    dayDelay: 0,
    subjectTemplate: '[University]: ceremony scale planning',
    bodyTemplate: `Hi [First],\n\nOne reason I am reaching out is that EGS has handled graduation work at UAE-wide scale. In 2025, EGS delivered seven HCT grand ceremonies across Dubai, Abu Dhabi, Sharjah, Ras Al Khaimah and Fujairah for 4,500 graduates and 13,500 guests.\n\nBest Regards,\nMasuood-ul-Rasheed\nExhibit Graphic Sign`,
    useAiPersonalization: true,
    aiPrompt: 'Personalize the intro hook.'
  }
];

function emptyStep(order) {
  return {
    stepOrder: order,
    dayDelay: order === 1 ? 0 : 3,
    subjectTemplate: `{{company}} — stand execution support (Step ${order})`,
    bodyTemplate: `Hi {{name}},\n\nWe support regional companies with custom exhibition stands in Dubai & Abu Dhabi.\n\nWould you be open for a short call?\n\nBest,\nEGS Team`,
    useAiPersonalization: true,
    aiPrompt: '',
  };
}

export default function FlowMindMapPage() {
  const [campaigns, setCampaigns] = useState([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState('');
  const [leadsCount, setLeadsCount] = useState(0);
  
  const [sequenceName, setSequenceName] = useState('Campaign Drip Sequence');
  const [steps, setSteps] = useState([emptyStep(1)]);
  const [sequenceId, setSequenceId] = useState(null);
  
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [launchArmed, setLaunchArmed] = useState(false);

  // Fetch campaigns initially
  useEffect(() => {
    crmApiFetch('/api/admin/projects')
      .then(list => {
        setCampaigns(list);
        if (list.length) {
          setSelectedCampaignId(list[0]._id);
        } else {
          setLoading(false);
        }
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  // Fetch sequence and leads for selected campaign
  useEffect(() => {
    if (!selectedCampaignId) return;

    setBusy(true);
    setError('');
    setSuccess('');
    
    Promise.all([
      crmApiFetch(`/api/admin/projects/${selectedCampaignId}/sequences`),
      crmApiFetch(`/api/admin/projects/${selectedCampaignId}/leads?limit=1&deliveryStatus=Pending%20Inqueue`)
    ])
      .then(([seqList, leadData]) => {
        setLeadsCount(leadData.total || 0);
        
        if (seqList.length) {
          const activeSeq = seqList[0];
          setSequenceId(activeSeq._id);
          setSequenceName(activeSeq.name || 'Campaign Drip Sequence');
          setSteps(activeSeq.steps?.length ? activeSeq.steps : [emptyStep(1)]);
        } else {
          setSequenceId(null);
          // Pre-populate based on project name if it contains "graduation"
          const project = campaigns.find(c => c._id === selectedCampaignId);
          const isGraduation = String(project?.projectName || '').toLowerCase().includes('graduation');
          setSteps(isGraduation ? GRADUATION_STEPS : [emptyStep(1)]);
        }
        setActiveStepIndex(0);
      })
      .catch(err => {
        console.error(err);
        setError('Failed to load campaign sequences.');
      })
      .finally(() => {
        setBusy(false);
        setLoading(false);
      });
  }, [selectedCampaignId, campaigns]);

  const campaignOptions = useMemo(
    () => campaigns.map((c) => ({
      value: c._id,
      label: c.projectName,
    })),
    [campaigns],
  );

  const updateStep = (index, field, value) => {
    setLaunchArmed(false);
    setSteps(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s));
  };

  const addStepNode = () => {
    setLaunchArmed(false);
    const nextOrder = steps.length + 1;
    const newSteps = [...steps, emptyStep(nextOrder)];
    setSteps(newSteps);
    setActiveStepIndex(newSteps.length - 1);
  };

  const removeStepNode = (index) => {
    setLaunchArmed(false);
    if (steps.length <= 1) return;
    const newSteps = steps.filter((_, i) => i !== index).map((s, i) => ({ ...s, stepOrder: i + 1 }));
    setSteps(newSteps);
    setActiveStepIndex(Math.max(0, index - 1));
  };

  const saveSequence = async ({ publish = false } = {}) => {
    if (publish && !launchArmed) {
      setLaunchArmed(true);
      setSuccess(`Review the sequence, then confirm launch. Only ${leadsCount} never-contacted lead(s) are eligible.`);
      return;
    }
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      let seqId = sequenceId;
      if (!seqId) {
        const seq = await crmApiFetch(`/api/admin/projects/${selectedCampaignId}/sequences`, {
          method: 'POST',
          body: JSON.stringify({ name: sequenceName, steps }),
        });
        seqId = seq._id;
        setSequenceId(seqId);
      } else {
        await crmApiFetch(`/api/admin/sequences/${seqId}`, {
          method: 'PATCH',
          body: JSON.stringify({ name: sequenceName, steps }),
        });
      }
      
      if (publish && leadsCount > 0) {
        await crmApiFetch(`/api/admin/projects/${selectedCampaignId}/enroll`, {
          method: 'POST',
          body: JSON.stringify({ sequenceId: seqId, confirmEnrollment: true }),
        });
        setLaunchArmed(false);
        setSuccess('Sequence published and eligible leads enrolled successfully.');
      } else {
        setLaunchArmed(false);
        setSuccess('Draft saved. No contacts were enrolled.');
      }
    } catch (err) {
      setError(err.message || 'Failed to save sequence.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <PageShell>
        <LoadingState label="Loading Mind-Map builder..." />
      </PageShell>
    );
  }

  if (campaigns.length === 0) {
    return (
      <PageShell>
        <EmptyState
          icon={Layers}
          title="No campaigns available"
          description="Create a project campaign first to build flow sequences."
        />
      </PageShell>
    );
  }

  const activeStep = steps[activeStepIndex] || steps[0];

  return (
    <PageShell>
      <PageHeader 
        title="Campaign sequences" 
        subtitle="Design, review, and deliberately launch multi-step outreach campaigns."
      />

      <div className="crm-card p-4 flex flex-col gap-3 sm:flex-row sm:items-center justify-between border-b border-line bg-slate-50/50">
        <div className="flex items-center gap-3 flex-1">
          <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Select Campaign Flow:</label>
          <SearchableSelect
            className="max-w-sm"
            value={selectedCampaignId}
            onChange={(value) => { setSelectedCampaignId(value); setLaunchArmed(false); }}
            options={campaignOptions}
            placeholder="Select campaign…"
            searchPlaceholder="Search campaigns…"
            emptyLabel="No campaigns match."
          />
        </div>
        <div className="flex items-center gap-2">
          <Badge tone="info" className="shrink-0">{leadsCount} eligible lead(s)</Badge>
          <button
            type="button" 
            onClick={() => saveSequence({ publish: false })}
            disabled={busy}
            className="crm-btn-secondary py-1.5 px-3 flex items-center gap-1.5 text-xs font-bold"
          >
            <Save className="h-4 w-4" />
            Save draft
          </button>
          <button
            type="button"
            onClick={() => saveSequence({ publish: true })}
            disabled={busy || leadsCount === 0}
            className={`crm-btn-primary py-1.5 px-3 flex items-center gap-1.5 text-xs font-bold ${launchArmed ? 'ring-2 ring-red-200' : ''}`}
          >
            <CheckCircle2 className="h-4 w-4" />
            {busy ? 'Launching...' : launchArmed ? `Confirm ${leadsCount} lead(s)` : 'Review & launch'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start min-h-125">
        {/* Visual Mind-Map Canvas */}
        <div className="crm-card p-6 flex flex-col items-center bg-slate-50/20 border border-line h-137.5 relative overflow-y-auto">
          <div className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest absolute top-4 left-4">Mind-Map Workspace Canvas</div>
          
          {/* Start node */}
          <div className="flex flex-col items-center mt-12 w-full">
            <div className="flex items-center justify-center h-10 px-5 rounded-full border border-neutral-300 bg-white font-extrabold text-neutral-600 text-xs shadow-sm select-none">
              🚀 START CAMPAIGN
            </div>
            
            {/* SVG connector arrow */}
            <svg className="h-8 w-1" viewBox="0 0 4 32">
              <line x1="2" y1="0" x2="2" y2="28" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="3 3" />
              <polygon points="0,24 4,24 2,32" fill="#94a3b8" />
            </svg>
          </div>

          {/* Steps list nodes */}
          <div className="flex flex-col items-center w-full space-y-0">
            {steps.map((step, idx) => {
              const isActive = activeStepIndex === idx;
              return (
                <div key={idx} className="flex flex-col items-center w-full">
                  
                  {/* Step Card block */}
                  <div 
                    onClick={() => setActiveStepIndex(idx)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setActiveStepIndex(idx);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    aria-pressed={isActive}
                    className={`w-64 crm-mindmap-node rounded-xl border p-4 cursor-pointer select-none ${isActive ? 'border-brand bg-red-50/20 shadow-md ring-1 ring-brand' : 'border-neutral-200 bg-white hover:border-neutral-300 shadow-sm'}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white ${isActive ? 'bg-brand' : 'bg-neutral-500'}`}>
                          {idx + 1}
                        </span>
                        <div>
                          <p className="text-xs font-bold text-neutral-800">Email Step {idx + 1}</p>
                          <p className="text-[10px] text-neutral-500 font-medium">
                            {idx === 0 ? 'Instant dispatch' : `Wait ${step.dayDelay} day(s)`}
                          </p>
                        </div>
                      </div>
                      
                      {/* Delete node trigger */}
                      {steps.length > 1 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeStepNode(idx);
                          }}
                          className="text-neutral-400 hover:text-rose-600 transition"
                          title="Remove Step"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    
                    <div className="mt-2.5 truncate font-mono text-[10px] text-neutral-500 bg-neutral-50 border border-neutral-100 rounded p-1">
                      {step.subjectTemplate || 'No subject configured'}
                    </div>

                    {step.useAiPersonalization && (
                      <div className="mt-2 flex items-center gap-1 text-[9px] font-bold text-brand uppercase tracking-wider">
                        <Sparkles className="h-2.5 w-2.5" />
                        AI Personalized
                      </div>
                    )}
                  </div>

                  {/* SVG Connector Line to next step / Add button */}
                  {idx < steps.length - 1 ? (
                    <svg className="h-8 w-1" viewBox="0 0 4 32">
                      <line x1="2" y1="0" x2="2" y2="28" stroke="#cbd5e1" strokeWidth="2" />
                      <polygon points="0,24 4,24 2,32" fill="#94a3b8" />
                    </svg>
                  ) : (
                    <div className="flex flex-col items-center">
                      <svg className="h-8 w-1" viewBox="0 0 4 32">
                        <line x1="2" y1="0" x2="2" y2="28" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="3 3" />
                        <polygon points="0,24 4,24 2,32" fill="#94a3b8" />
                      </svg>
                      
                      {/* Add new node button */}
                      <button
                        type="button"
                        onClick={addStepNode}
                        className="flex h-7 px-3 items-center gap-1.5 rounded-full border border-dashed border-neutral-400 bg-white text-[11px] font-semibold text-neutral-600 hover:border-brand hover:text-brand hover:bg-red-50/10 transition shadow-sm"
                      >
                        <Plus className="h-3 w-3" />
                        Add Drip Step
                      </button>
                    </div>
                  )}

                </div>
              );
            })}
          </div>
        </div>

        {/* Step configuration panel */}
        <div className="crm-card p-5 space-y-5 border border-line h-137.5 overflow-y-auto">
          <div>
            <h3 className="text-sm font-bold text-neutral-800 flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-brand" />
              Configure Drip Step {activeStepIndex + 1}
            </h3>
            <p className="text-[11px] text-neutral-500 mt-1">Configure timings and personalization rules below.</p>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-800">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          
          {success && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-lg">
              {success}
            </div>
          )}

          <div className="space-y-4 text-xs">
            <Field label="Drip Timing Delay" hint="Wait delay from previous campaign step.">
              <div className="relative">
                <Clock className="absolute left-3 top-2.5 h-3.5 w-3.5 text-neutral-400" />
                <input
                  type="number"
                  min="0"
                  disabled={activeStepIndex === 0}
                  className="crm-input crm-input-has-icon py-1.5 text-xs"
                  value={activeStep.dayDelay}
                  onChange={(e) => updateStep(activeStepIndex, 'dayDelay', Number(e.target.value))}
                />
              </div>
              {activeStepIndex === 0 && (
                <p className="text-[9px] text-neutral-400 font-medium mt-1">Step 1 sends instantly upon enrollment.</p>
              )}
            </Field>

            <label className="flex items-center gap-2.5 rounded-lg border border-line bg-white p-2.5 cursor-pointer">
              <input
                type="checkbox"
                className="h-3.5 w-3.5 rounded border-neutral-300 text-brand focus:ring-brand"
                checked={activeStep.useAiPersonalization}
                onChange={(e) => updateStep(activeStepIndex, 'useAiPersonalization', e.target.checked)}
              />
              <Sparkles className="h-3.5 w-3.5 text-brand" />
              <span className="font-semibold text-neutral-700">AI Personalization Hook</span>
            </label>

            {activeStep.useAiPersonalization && (
              <Field label="AI Personalization Hook Prompt">
                <input 
                  type="text" 
                  className="crm-input py-1.5 text-xs" 
                  value={activeStep.aiPrompt || ''}
                  onChange={(e) => updateStep(activeStepIndex, 'aiPrompt', e.target.value)}
                  placeholder="e.g. Customize intro based on company website details"
                />
              </Field>
            )}

            <Field label="Email Subject line" hint="Use [First] or [University] tags.">
              <input 
                type="text" 
                className="crm-input py-1.5 text-xs font-mono" 
                value={activeStep.subjectTemplate}
                onChange={(e) => updateStep(activeStepIndex, 'subjectTemplate', e.target.value)}
              />
            </Field>

            <Field label="Email Body Message Template">
              <textarea 
                rows={8}
                className="crm-input text-xs font-mono resize-none leading-relaxed" 
                value={activeStep.bodyTemplate}
                onChange={(e) => updateStep(activeStepIndex, 'bodyTemplate', e.target.value)}
              />
            </Field>
          </div>

        </div>
      </div>
    </PageShell>
  );
}
