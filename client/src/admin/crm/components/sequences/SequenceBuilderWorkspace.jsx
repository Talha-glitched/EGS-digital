import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { crmApiFetch, updateCampaign } from '../../crmApi.js';
import {
  AUDIENCE_MODES,
  emptySequenceStep,
  GRADUATION_STEPS,
  isGraduationCampaign,
} from '../../constants/sequenceDefaults.js';
import SearchableSelect from '../ui/SearchableSelect.jsx';
import SearchableMultiSelect from '../ui/SearchableMultiSelect.jsx';
import {
  Alert,
  Badge,
  Field,
  LoadingState,
} from '../ui/primitives.jsx';
import {
  Plus,
  Trash2,
  Sparkles,
  Save,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  Mail,
  Users,
  Building2,
  Send,
  FileText,
  Clock,
  Zap,
} from 'lucide-react';

function buildAudienceQuery(audienceMode, companyIds, contactIds) {
  const params = new URLSearchParams();
  if (audienceMode === AUDIENCE_MODES.COMPANIES && companyIds.length) {
    params.set('companyIds', companyIds.join(','));
  }
  if (audienceMode === AUDIENCE_MODES.CONTACTS && contactIds.length) {
    params.set('leadIds', contactIds.join(','));
  }
  return params;
}

export default function SequenceBuilderWorkspace({
  sequenceId = null,
  initialCampaignId = '',
  campaigns = [],
  mailStatus = null,
  onSaved,
  onCancel,
}) {
  const [campaignId, setCampaignId] = useState(initialCampaignId || campaigns[0]?._id || '');
  const [sequenceName, setSequenceName] = useState('Outreach sequence');
  const [steps, setSteps] = useState([emptySequenceStep(1)]);
  const [currentSequenceId, setCurrentSequenceId] = useState(sequenceId);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [isActive, setIsActive] = useState(false);

  const [audienceMode, setAudienceMode] = useState(AUDIENCE_MODES.CAMPAIGN);
  const [companyIds, setCompanyIds] = useState([]);
  const [contactIds, setContactIds] = useState([]);
  const [audiencePreview, setAudiencePreview] = useState({ eligible: 0, netNew: 0, alreadyEnrolled: 0 });

  const [fromEmail, setFromEmail] = useState('');
  const [fromName, setFromName] = useState('');

  const [companies, setCompanies] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(Boolean(sequenceId));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [launchArmed, setLaunchArmed] = useState(false);

  const selectedCampaign = useMemo(
    () => campaigns.find((c) => c._id === campaignId) || null,
    [campaigns, campaignId],
  );

  const companyOptions = useMemo(
    () => companies.map((c) => ({ value: c._id, label: c.companyName || c.name || 'Company', hint: c.industry })),
    [companies],
  );

  const contactOptions = useMemo(
    () => contacts.map((l) => ({
      value: l._id,
      label: l.name || l.email || 'Contact',
      hint: [l.email, l.designation].filter(Boolean).join(' · '),
    })),
    [contacts],
  );

  const campaignOptions = useMemo(
    () => campaigns.map((c) => ({
      value: c._id,
      label: c.projectName || 'Campaign',
      hint: [c.milestone, c.status].filter(Boolean).join(' · '),
    })),
    [campaigns],
  );

  const refreshAudience = useCallback(async (seqId = currentSequenceId) => {
    if (!campaignId) return;
    const params = buildAudienceQuery(audienceMode, companyIds, contactIds);
    if (seqId) params.set('sequenceId', seqId);
    try {
      const preview = await crmApiFetch(`/api/admin/projects/${campaignId}/audience-preview?${params}`);
      setAudiencePreview(preview);
    } catch {
      setAudiencePreview({ eligible: 0, netNew: 0, alreadyEnrolled: 0 });
    }
  }, [audienceMode, campaignId, companyIds, contactIds, currentSequenceId]);

  useEffect(() => {
    if (!campaignId) return undefined;
    crmApiFetch(`/api/admin/projects/${campaignId}/companies?limit=500`)
      .then((data) => setCompanies(data.items || []))
      .catch(() => setCompanies([]));
    crmApiFetch(`/api/admin/projects/${campaignId}/leads?limit=500&deliveryStatus=Pending%20Inqueue`)
      .then((data) => setContacts(data.items || []))
      .catch(() => setContacts([]));
  }, [campaignId]);

  useEffect(() => {
    if (!sequenceId) {
      if (initialCampaignId) setCampaignId(initialCampaignId);
      const campaign = campaigns.find((c) => c._id === (initialCampaignId || campaignId));
      if (campaign) {
        setFromEmail(campaign.fromEmail || '');
        setFromName(campaign.fromName || 'Exhibit Graphic Sign');
        if (isGraduationCampaign(campaign.projectName, campaign.milestone)) {
          setSteps(GRADUATION_STEPS);
        }
      }
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    setError('');
    crmApiFetch(`/api/admin/sequences/${sequenceId}`)
      .then((seq) => {
        setCurrentSequenceId(seq._id);
        setCampaignId(String(seq.campaignId));
        setSequenceName(seq.name || 'Outreach sequence');
        setSteps(seq.steps?.length ? seq.steps : [emptySequenceStep(1)]);
        setIsActive(Boolean(seq.isActive));
        setFromEmail(seq.campaign?.fromEmail || '');
        setFromName(seq.campaign?.fromName || 'Exhibit Graphic Sign');
        setActiveStepIndex(0);
      })
      .catch(() => setError('Failed to load sequence.'))
      .finally(() => setLoading(false));
  }, [sequenceId, initialCampaignId, campaigns]);

  useEffect(() => {
    if (selectedCampaign && !sequenceId) {
      setFromEmail(selectedCampaign.fromEmail || '');
      setFromName(selectedCampaign.fromName || 'Exhibit Graphic Sign');
    }
  }, [selectedCampaign, sequenceId]);

  useEffect(() => {
    const timer = setTimeout(() => refreshAudience(), 250);
    return () => clearTimeout(timer);
  }, [refreshAudience]);

  const updateStep = (index, field, value) => {
    setLaunchArmed(false);
    setSteps((prev) => prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)));
  };

  const addStep = () => {
    setLaunchArmed(false);
    const next = steps.length + 1;
    const nextSteps = [...steps, emptySequenceStep(next)];
    setSteps(nextSteps);
    setActiveStepIndex(nextSteps.length - 1);
  };

  const removeStep = (index) => {
    setLaunchArmed(false);
    if (steps.length <= 1) return;
    const nextSteps = steps.filter((_, i) => i !== index).map((s, i) => ({ ...s, stepOrder: i + 1 }));
    setSteps(nextSteps);
    setActiveStepIndex(Math.max(0, index - 1));
  };

  async function persistSender() {
    if (!campaignId) return;
    await updateCampaign(campaignId, { fromEmail, fromName });
  }

  async function saveSequence({ launch = false } = {}) {
    if (!campaignId) {
      setError('Select a campaign before saving.');
      return;
    }

    if (launch && !launchArmed) {
      setLaunchArmed(true);
      setSuccess(`Review settings, then confirm to enroll ${audiencePreview.netNew} contact(s).`);
      setError('');
      return;
    }

    if (launch && audiencePreview.netNew === 0) {
      setError('No eligible contacts match your audience selection.');
      return;
    }

    if (launch && !mailStatus?.smtpReady) {
      setError('SMTP is not configured. Connect email sending before launching.');
      return;
    }

    setBusy(true);
    setError('');
    setSuccess('');

    try {
      await persistSender();

      let seqId = currentSequenceId;
      if (!seqId) {
        const created = await crmApiFetch(`/api/admin/projects/${campaignId}/sequences`, {
          method: 'POST',
          body: JSON.stringify({ name: sequenceName, steps }),
        });
        seqId = created._id;
        setCurrentSequenceId(seqId);
      } else {
        await crmApiFetch(`/api/admin/sequences/${seqId}`, {
          method: 'PATCH',
          body: JSON.stringify({ name: sequenceName, steps }),
        });
      }

      if (launch) {
        const enrollBody = { sequenceId: seqId, confirmEnrollment: true };
        if (audienceMode === AUDIENCE_MODES.COMPANIES && companyIds.length) {
          enrollBody.companyIds = companyIds;
        }
        if (audienceMode === AUDIENCE_MODES.CONTACTS && contactIds.length) {
          enrollBody.leadIds = contactIds;
        }

        const result = await crmApiFetch(`/api/admin/projects/${campaignId}/enroll`, {
          method: 'POST',
          body: JSON.stringify(enrollBody),
        });
        setIsActive(true);
        setLaunchArmed(false);
        setSuccess(`Sequence launched — ${result.enrolled} contact(s) enrolled. Sending via SMTP now.`);
        await refreshAudience(seqId);
      } else {
        setLaunchArmed(false);
        setSuccess('Draft saved. No contacts were enrolled.');
      }

      onSaved?.({ sequenceId: seqId, launched: launch });
    } catch (err) {
      setError(err.message || 'Failed to save sequence.');
      setLaunchArmed(false);
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <LoadingState label="Loading sequence builder…" />;
  }

  const activeStep = steps[activeStepIndex] || steps[0];
  const totalDelay = steps.reduce((sum, s, i) => sum + (i === 0 ? 0 : Number(s.dayDelay) || 0), 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={onCancel} className="crm-btn-ghost py-1.5 text-xs">
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to sequences
        </button>
        <div className="flex flex-wrap items-center gap-2">
          {isActive && <Badge tone="success">Live</Badge>}
          <Badge tone="info">{steps.length} step{steps.length === 1 ? '' : 's'}</Badge>
          <Badge tone="neutral">~{totalDelay}d span</Badge>
        </div>
      </div>

      <div className="crm-card overflow-hidden border border-[var(--color-line)]">
        <div className="border-b border-[var(--color-line)] bg-gradient-to-r from-slate-50 to-white px-5 py-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0 flex-1">
              <label className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">Sequence name</label>
              <input
                className="crm-input mt-1 w-full max-w-md py-2 text-sm font-semibold"
                value={sequenceName}
                onChange={(e) => setSequenceName(e.target.value)}
                placeholder="e.g. Exhibition follow-up drip"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => saveSequence({ launch: false })}
                disabled={busy}
                className="crm-btn-secondary"
              >
                <Save className="h-4 w-4" />
                Save draft
              </button>
              <button
                type="button"
                onClick={() => saveSequence({ launch: true })}
                disabled={busy || audiencePreview.netNew === 0}
                className={`crm-btn-primary ${launchArmed ? 'ring-2 ring-orange-200' : ''}`}
              >
                {launchArmed ? (
                  <>
                    <Zap className="h-4 w-4" />
                    Confirm launch ({audiencePreview.netNew})
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Launch now
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="mx-5 mt-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}
        {success && (
          <div className="mx-5 mt-4">
            <Alert tone="success">{success}</Alert>
          </div>
        )}

        <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="border-b border-[var(--color-line)] p-5 lg:border-b-0 lg:border-r">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-bold text-[var(--color-ink)]">Email steps</h3>
              <button type="button" onClick={addStep} className="crm-btn-ghost py-1 text-xs">
                <Plus className="h-3.5 w-3.5" />
                Add step
              </button>
            </div>

            <div className="grid gap-5 xl:grid-cols-[220px_minmax(0,1fr)]">
              <div className="crm-scroll max-h-[480px] space-y-2 overflow-y-auto pr-1">
                {steps.map((step, idx) => {
                  const selected = activeStepIndex === idx;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveStepIndex(idx)}
                      className={`w-full rounded-xl border p-3 text-left transition ${selected ? 'border-brand bg-brand-soft/30 ring-1 ring-brand' : 'border-[var(--color-line)] bg-white hover:border-neutral-300'}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white ${selected ? 'bg-brand' : 'bg-neutral-400'}`}>
                            {idx + 1}
                          </span>
                          <div>
                            <p className="text-xs font-semibold text-[var(--color-ink)]">Step {idx + 1}</p>
                            <p className="text-[10px] text-neutral-500">
                              {idx === 0 ? 'On enroll' : `+${step.dayDelay || 0} days`}
                            </p>
                          </div>
                        </div>
                        {steps.length > 1 && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); removeStep(idx); }}
                            className="text-neutral-300 hover:text-rose-600"
                            aria-label={`Remove step ${idx + 1}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                      <p className="mt-2 truncate rounded bg-neutral-50 px-2 py-1 font-mono text-[10px] text-neutral-500">
                        {step.subjectTemplate || 'No subject'}
                      </p>
                    </button>
                  );
                })}
              </div>

              <div className="space-y-4 rounded-xl border border-[var(--color-line)] bg-neutral-50/40 p-4">
                <h4 className="text-xs font-bold text-neutral-700">Step {activeStepIndex + 1} content</h4>

                <Field label="Delay after previous (days)" hint={activeStepIndex === 0 ? 'First step sends when enrolled.' : undefined}>
                  <input
                    type="number"
                    min="0"
                    disabled={activeStepIndex === 0}
                    className="crm-input py-2 text-sm"
                    value={activeStep.dayDelay}
                    onChange={(e) => updateStep(activeStepIndex, 'dayDelay', Number(e.target.value))}
                  />
                </Field>

                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--color-line)] bg-white p-3 text-sm">
                  <input
                    type="checkbox"
                    checked={activeStep.useAiPersonalization}
                    onChange={(e) => updateStep(activeStepIndex, 'useAiPersonalization', e.target.checked)}
                  />
                  <Sparkles className="h-4 w-4 text-brand" />
                  AI personalization
                </label>

                {activeStep.useAiPersonalization && (
                  <Field label="AI prompt">
                    <input
                      className="crm-input py-2 text-sm"
                      value={activeStep.aiPrompt || ''}
                      onChange={(e) => updateStep(activeStepIndex, 'aiPrompt', e.target.value)}
                      placeholder="e.g. Reference their industry and recent exhibition"
                    />
                  </Field>
                )}

                <Field label="Subject line" hint="Use {{name}}, {{company}}, {{first}}">
                  <input
                    className="crm-input py-2 font-mono text-sm"
                    value={activeStep.subjectTemplate}
                    onChange={(e) => updateStep(activeStepIndex, 'subjectTemplate', e.target.value)}
                  />
                </Field>

                <Field label="Email body">
                  <textarea
                    rows={8}
                    className="crm-input resize-y font-mono text-sm leading-relaxed"
                    value={activeStep.bodyTemplate}
                    onChange={(e) => updateStep(activeStepIndex, 'bodyTemplate', e.target.value)}
                  />
                </Field>
              </div>
            </div>
          </div>

          <div className="crm-scroll max-h-[calc(100vh-220px)] space-y-5 overflow-y-auto p-5">
            <section>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-[var(--color-ink)]">
                <Building2 className="h-4 w-4 text-brand" />
                Campaign
              </h3>
              <Field label="Attach to campaign" hint="Sequences belong to a campaign for tracking and sender identity.">
                <SearchableSelect
                  value={campaignId}
                  onChange={setCampaignId}
                  options={campaignOptions}
                  placeholder="Select campaign…"
                  disabled={Boolean(isActive)}
                />
              </Field>
              {selectedCampaign && (
                <Link
                  to={`/admin/crm/projects/${campaignId}`}
                  className="mt-2 inline-flex text-xs font-medium text-brand hover:underline"
                >
                  Open campaign workspace
                </Link>
              )}
            </section>

            <section>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-[var(--color-ink)]">
                <Users className="h-4 w-4 text-brand" />
                Audience
              </h3>
              <div className="space-y-2">
                {[
                  { id: AUDIENCE_MODES.CAMPAIGN, label: 'Entire campaign', desc: 'All never-contacted leads in queue' },
                  { id: AUDIENCE_MODES.COMPANIES, label: 'Specific companies', desc: 'Target selected exhibitors' },
                  { id: AUDIENCE_MODES.CONTACTS, label: 'Specific contacts', desc: 'Hand-pick individual POCs' },
                ].map((mode) => (
                  <label
                    key={mode.id}
                    className={`flex cursor-pointer gap-3 rounded-xl border p-3 transition ${audienceMode === mode.id ? 'border-brand bg-brand-soft/20' : 'border-[var(--color-line)] bg-white hover:border-neutral-300'}`}
                  >
                    <input
                      type="radio"
                      name="audienceMode"
                      checked={audienceMode === mode.id}
                      onChange={() => { setAudienceMode(mode.id); setLaunchArmed(false); }}
                      className="mt-0.5"
                    />
                    <div>
                      <p className="text-sm font-semibold text-[var(--color-ink)]">{mode.label}</p>
                      <p className="text-[11px] text-neutral-500">{mode.desc}</p>
                    </div>
                  </label>
                ))}
              </div>

              {audienceMode === AUDIENCE_MODES.COMPANIES && (
                <div className="mt-3">
                  <Field label="Companies">
                    <SearchableMultiSelect
                      values={companyIds}
                      onChange={setCompanyIds}
                      options={companyOptions}
                      placeholder="Select companies…"
                    />
                  </Field>
                </div>
              )}

              {audienceMode === AUDIENCE_MODES.CONTACTS && (
                <div className="mt-3">
                  <Field label="Contacts" hint="Only Pending Inqueue contacts are eligible.">
                    <SearchableMultiSelect
                      values={contactIds}
                      onChange={setContactIds}
                      options={contactOptions}
                      placeholder="Select contacts…"
                    />
                  </Field>
                </div>
              )}

              <div className="mt-4 grid grid-cols-3 gap-2">
                <AudienceStat label="Eligible" value={audiencePreview.eligible} />
                <AudienceStat label="Already in" value={audiencePreview.alreadyEnrolled} />
                <AudienceStat label="Will enroll" value={audiencePreview.netNew} accent />
              </div>
            </section>

            <section>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-[var(--color-ink)]">
                <Mail className="h-4 w-4 text-brand" />
                Sender
              </h3>
              {!mailStatus?.smtpReady && (
                <Alert tone="warning" className="mb-3 text-xs">
                  SMTP not connected — you can save drafts but cannot launch until email is configured.
                </Alert>
              )}
              <div className="space-y-3">
                <Field label="From name">
                  <input
                    className="crm-input py-2 text-sm"
                    value={fromName}
                    onChange={(e) => setFromName(e.target.value)}
                  />
                </Field>
                <Field label="From email">
                  <input
                    type="email"
                    className="crm-input py-2 text-sm"
                    value={fromEmail}
                    onChange={(e) => setFromEmail(e.target.value)}
                  />
                </Field>
              </div>
            </section>

            <section className="rounded-xl border border-dashed border-[var(--color-line)] bg-neutral-50/60 p-4">
              <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-[var(--color-ink)]">
                <Clock className="h-4 w-4 text-neutral-400" />
                Launch options
              </h3>
              <ul className="space-y-2 text-xs leading-relaxed text-neutral-600">
                <li className="flex gap-2">
                  <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-neutral-400" />
                  <span><strong>Save draft</strong> — stores steps without enrolling anyone.</span>
                </li>
                <li className="flex gap-2">
                  <Send className="mt-0.5 h-3.5 w-3.5 shrink-0 text-neutral-400" />
                  <span><strong>Launch now</strong> — enrolls eligible contacts and schedules sends per step delays.</span>
                </li>
                <li className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-neutral-400" />
                  <span>Replies automatically pause the sequence for that contact.</span>
                </li>
              </ul>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

function AudienceStat({ label, value, accent }) {
  return (
    <div className={`rounded-lg border px-2.5 py-2 text-center ${accent ? 'border-brand/30 bg-brand-soft/30' : 'border-[var(--color-line)] bg-white'}`}>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">{label}</p>
      <p className={`mt-0.5 text-lg font-bold tabular-nums ${accent ? 'text-brand' : 'text-[var(--color-ink)]'}`}>{value}</p>
    </div>
  );
}
