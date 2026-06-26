import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BriefcaseBusiness,
  CalendarDays,
  Clock3,
  Mail,
  MapPin,
  MessageCircle,
  Pencil,
  Phone,
  Plus,
  Share2,
  StickyNote,
  Trash2,
  UserRound,
  ListTodo,
  Sparkles,
  Users,
} from 'lucide-react';
import { LoadingState, cn } from '../ui/primitives.jsx';
import InfoTip from '../ui/InfoTip.jsx';
import {
  crmApiFetch,
  fetchContactTimeline,
  fetchCompanyTimeline,
  fetchOpportunity,
  fetchOpportunityTimeline,
  createContactInteraction,
  updateContactInteraction,
  deleteInteractionWithUndo,
  normalizeId,
} from '../../crmApi.js';
import { useConfirmDelete } from '../../hooks/useConfirmDelete.js';
import LogInteractionModal from './LogInteractionModal.jsx';
import { interactionFormFromEvent } from '../../constants/interactionTypes.js';
import { TIMELINE_AUTOMATION } from '../../constants/automationHints.js';

const POLL_INTERVAL_MS = 30000;

const CHANNEL_META = {
  email: { icon: Mail, tone: 'sky' },
  email_outbound: { icon: Mail, tone: 'sky' },
  email_inbound: { icon: Mail, tone: 'emerald' },
  linkedin: { icon: Share2, tone: 'blue' },
  phone: { icon: Phone, tone: 'amber' },
  phone_call: { icon: Phone, tone: 'amber' },
  call: { icon: Phone, tone: 'amber' },
  whatsapp: { icon: MessageCircle, tone: 'green' },
  meeting: { icon: CalendarDays, tone: 'violet' },
  site_visit: { icon: MapPin, tone: 'amber' },
  event: { icon: Users, tone: 'brand' },
  referral: { icon: UserRound, tone: 'blue' },
  note: { icon: StickyNote, tone: 'neutral' },
  task: { icon: ListTodo, tone: 'violet' },
  opportunity: { icon: BriefcaseBusiness, tone: 'brand' },
  pipeline: { icon: BriefcaseBusiness, tone: 'brand' },
  profile: { icon: UserRound, tone: 'neutral' },
  status: { icon: Sparkles, tone: 'neutral' },
  poc_qualification: { icon: UserRound, tone: 'brand' },
  crm: { icon: UserRound, tone: 'neutral' },
};

function formatWhen(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-AE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function groupByMonth(events) {
  const groups = new Map();
  events.forEach((event) => {
    const date = new Date(event.timestamp);
    const key = Number.isNaN(date.getTime())
      ? 'Unknown'
      : date.toLocaleString('en-AE', { month: 'long', year: 'numeric' });
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(event);
  });
  return [...groups.entries()];
}

function listenState(syncStatus) {
  if (syncStatus?.imapReady && syncStatus?.smtpReady) {
    return { label: 'Listening', tone: 'is-live', title: 'SMTP sending and IMAP inbox sync are active. New emails and replies appear automatically.' };
  }
  if (syncStatus?.imapReady || syncStatus?.smtpReady) {
    return {
      label: 'Partial sync',
      tone: 'is-partial',
      title: [
        `SMTP: ${syncStatus?.smtpReady ? 'ready' : 'not configured'}`,
        `IMAP: ${syncStatus?.imapReady ? 'ready' : 'not configured'}`,
      ].join(' · '),
    };
  }
  return {
    label: 'Manual only',
    tone: 'is-idle',
    title: 'Email automation is not fully configured. Manual interactions still log here; automated sequence and reply events need SMTP and IMAP.',
  };
}

export default function InteractionTimeline({
  leadId,
  companyId,
  opportunityId,
  showContact = false,
  contacts = [],
  onCountChange,
  refreshSignal,
}) {
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState([]);
  const [error, setError] = useState('');
  const [syncStatus, setSyncStatus] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [editingEvent, setEditingEvent] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState('');
  const [opportunityContacts, setOpportunityContacts] = useState([]);
  const mountedRef = useRef(true);

  const resolvedLeadId = normalizeId(leadId);
  const resolvedCompanyId = normalizeId(companyId);
  const resolvedOpportunityId = normalizeId(opportunityId);
  const hasScope = Boolean(resolvedLeadId || resolvedCompanyId || resolvedOpportunityId);

  const logContacts = useMemo(() => (
    contacts.length ? contacts : opportunityContacts
  ), [contacts, opportunityContacts]);

  const canLog = Boolean(resolvedLeadId || logContacts.length > 0);

  const loadTimeline = useCallback(async ({ silent = false } = {}) => {
    if (!hasScope) return;
    if (!silent) setLoading(true);
    else setSyncing(true);
    setError('');
    try {
      const data = resolvedOpportunityId
        ? await fetchOpportunityTimeline(resolvedOpportunityId)
        : resolvedLeadId
          ? await fetchContactTimeline(resolvedLeadId)
          : await fetchCompanyTimeline(resolvedCompanyId);
      const nextEvents = data.events || [];
      if (!mountedRef.current) return;
      setEvents(nextEvents);
      onCountChange?.(nextEvents.length);
    } catch (err) {
      if (!mountedRef.current) return;
      if (!silent) {
        setError(err.message || 'Failed to load timeline.');
        setEvents([]);
        onCountChange?.(0);
      }
    } finally {
      if (!mountedRef.current) return;
      if (!silent) setLoading(false);
      setSyncing(false);
    }
  }, [hasScope, resolvedLeadId, resolvedCompanyId, resolvedOpportunityId, onCountChange]);

  const loadSyncStatus = useCallback(async () => {
    try {
      const status = await crmApiFetch('/api/admin/status');
      if (mountedRef.current) setSyncStatus(status);
    } catch {
      if (mountedRef.current) setSyncStatus(null);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!resolvedOpportunityId) {
      setOpportunityContacts([]);
      return undefined;
    }
    let cancelled = false;
    fetchOpportunity(resolvedOpportunityId)
      .then((data) => {
        if (cancelled) return;
        const companyContacts = data.contacts || [];
        const primary = data.opportunity?.primaryLeadId;
        const primaryId = normalizeId(primary?._id || primary);
        if (!primaryId || companyContacts.some((contact) => normalizeId(contact._id) === primaryId)) {
          setOpportunityContacts(companyContacts);
          return;
        }
        setOpportunityContacts([
          {
            _id: primaryId,
            name: primary.name,
            email: primary.email,
            designation: primary.designation,
          },
          ...companyContacts,
        ]);
      })
      .catch(() => {
        if (!cancelled) setOpportunityContacts([]);
      });
    return () => {
      cancelled = true;
    };
  }, [resolvedOpportunityId]);

  useEffect(() => {
    if (!hasScope) return undefined;
    loadTimeline();
    loadSyncStatus();
    const pollId = window.setInterval(() => {
      loadTimeline({ silent: true });
      loadSyncStatus();
    }, POLL_INTERVAL_MS);
    return () => window.clearInterval(pollId);
  }, [hasScope, loadTimeline, loadSyncStatus]);

  useEffect(() => {
    if (!hasScope || refreshSignal == null) return;
    loadTimeline({ silent: true });
  }, [hasScope, refreshSignal, loadTimeline]);

  useEffect(() => {
    if (!hasScope) return undefined;
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        loadTimeline({ silent: true });
        loadSyncStatus();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [hasScope, loadTimeline, loadSyncStatus]);

  const openCreate = () => {
    setModalMode('create');
    setEditingEvent(null);
    setModalOpen(true);
  };

  const openEdit = (event) => {
    setModalMode('edit');
    setEditingEvent(event);
    setModalOpen(true);
  };

  const handleSubmit = async ({ leadId: submitLeadId, payload }) => {
    const targetLeadId = normalizeId(submitLeadId || resolvedLeadId);
    if (!targetLeadId) {
      throw new Error('Select which contact this interaction is about.');
    }
    setSaving(true);
    try {
      if (modalMode === 'edit' && editingEvent?.meta?.interactionId) {
        await updateContactInteraction(editingEvent.meta.interactionId, payload);
      } else {
        await createContactInteraction(targetLeadId, payload);
      }
      await loadTimeline({ silent: true });
    } finally {
      setSaving(false);
    }
  };

  const confirmDeleteInteraction = useConfirmDelete({
    resourceType: 'interaction',
    deleteFn: deleteInteractionWithUndo,
    onRemoved: () => loadTimeline({ silent: true }),
    onRestored: () => loadTimeline({ silent: true }),
    defaultConfirm: 'Remove this interaction from the timeline?',
  });

  const handleDelete = async (event) => {
    const interactionId = event?.meta?.interactionId;
    if (!interactionId) return;
    setDeletingId(interactionId);
    try {
      await confirmDeleteInteraction(
        interactionId,
        `Deleted interaction: ${event.title || 'Interaction'}`,
      );
    } catch (err) {
      setError(err.message || 'Failed to delete interaction.');
    } finally {
      setDeletingId('');
    }
  };

  const listen = listenState(syncStatus);

  if (!hasScope) {
    return (
      <div className="crm-timeline-empty">
        <Clock3 className="h-8 w-8 text-neutral-300" strokeWidth={1.5} />
        <p className="mt-3 text-sm font-semibold text-[var(--color-ink)]">Timeline unavailable</p>
        <p className="mt-1 max-w-sm text-xs leading-relaxed text-neutral-500">
          Link a contact or company to start building an interaction history.
        </p>
      </div>
    );
  }

  if (loading) {
    return <LoadingState label="Loading interaction history…" />;
  }

  return (
    <div className="crm-timeline-shell">
      <div className="crm-timeline-toolbar">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-[var(--color-ink)]">Interaction history</p>
            <InfoTip text={TIMELINE_AUTOMATION.hint} label="About interaction timeline" />
            <span
              className={cn('crm-timeline-listen', listen.tone, syncing && 'is-syncing')}
              title={listen.title}
            >
              <span className="crm-timeline-listen-dot" aria-hidden="true" />
              {listen.label}
            </span>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-neutral-500">
            Automated outreach and deal updates, plus anything your team logs manually.
          </p>
        </div>
        {canLog && (
          <button type="button" onClick={openCreate} className="crm-btn-primary shrink-0 py-1.5 text-xs">
            <Plus className="h-3.5 w-3.5" />
            Log interaction
          </button>
        )}
      </div>

      {error && (
        <div className="crm-timeline-error">
          <p className="text-sm text-red-700">{error}</p>
          <button type="button" onClick={() => loadTimeline()} className="mt-2 text-xs font-semibold text-red-700 underline">
            Try again
          </button>
        </div>
      )}

      {!error && !events.length && (
        <div className="crm-timeline-empty">
          <Clock3 className="h-8 w-8 text-neutral-300" strokeWidth={1.5} />
          <p className="mt-3 text-sm font-semibold text-[var(--color-ink)]">No interactions yet</p>
          <p className="mt-1 max-w-sm text-xs leading-relaxed text-neutral-500">
            Sequence emails, replies, calls, and meetings will appear here automatically when channels are connected. You can also log conversations manually so everyone on the team has context.
          </p>
          {canLog && (
            <button type="button" onClick={openCreate} className="crm-btn-secondary mt-4 text-xs">
              <Plus className="h-3.5 w-3.5" />
              Log first interaction
            </button>
          )}
        </div>
      )}

      {!error && events.length > 0 && (
        <div className="crm-timeline">
          {groupByMonth(events).map(([month, monthEvents]) => (
            <section key={month} className="crm-timeline-group">
              <h4 className="crm-timeline-month">{month}</h4>
              <div className="crm-timeline-track">
                {monthEvents.map((event, index) => {
                  const meta = CHANNEL_META[event.channel] || CHANNEL_META[event.type] || CHANNEL_META.crm;
                  const Icon = meta.icon;
                  const isManual = event.source === 'manual' || event.editable;
                  const isDeleting = deletingId === event?.meta?.interactionId;

                  return (
                    <article
                      key={event.id}
                      className="crm-timeline-item"
                      style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
                    >
                      <div className={cn('crm-timeline-dot', `tone-${meta.tone}`)}>
                        <Icon className="h-3.5 w-3.5" strokeWidth={2} />
                      </div>
                      <div className="crm-timeline-card">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-[13px] font-semibold text-[var(--color-ink)]">{event.title}</p>
                              <span className={cn('crm-timeline-badge', isManual ? 'is-manual' : 'is-automated')}>
                                {isManual ? 'Manual' : 'Automated'}
                              </span>
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-1">
                            <time className="text-[11px] text-neutral-400">{formatWhen(event.timestamp)}</time>
                            {isManual && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => openEdit(event)}
                                  className="crm-timeline-action"
                                  aria-label="Edit interaction"
                                >
                                  <Pencil className="h-3 w-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDelete(event)}
                                  disabled={isDeleting}
                                  className="crm-timeline-action danger"
                                  aria-label="Delete interaction"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                        {event.detail && (
                          <p className="mt-1.5 text-xs leading-relaxed text-neutral-600 whitespace-pre-wrap">{event.detail}</p>
                        )}
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] font-medium text-neutral-400">
                          <span>{event.actor}</span>
                          {showContact && event.contactName && (
                            <>
                              <span>·</span>
                              <span>{event.contactName}</span>
                            </>
                          )}
                          {event.meta?.outcomeLabel && (
                            <>
                              <span>·</span>
                              <span>{event.meta.outcomeLabel}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      <LogInteractionModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        initialValues={modalMode === 'edit' && editingEvent ? interactionFormFromEvent(editingEvent) : undefined}
        contacts={logContacts}
        defaultLeadId={resolvedLeadId || logContacts[0]?._id || ''}
        saving={saving}
        mode={modalMode}
      />
    </div>
  );
}
