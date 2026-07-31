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
  ArrowRight,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { LoadingState, cn } from '../ui/primitives.jsx';
import InfoTip from '../ui/InfoTip.jsx';
import {
  crmApiFetch,
  fetchContactTimeline,
  fetchCompanyTimeline,
  fetchCompanyDetails,
  fetchOngoingJob,
  fetchOngoingJobTimeline,
  createContactInteraction,
  updateContactInteraction,
  deleteInteractionWithUndo,
  normalizeId,
} from '../../crmApi.js';
import { useConfirmDelete } from '../../hooks/useConfirmDelete.js';
import LogInteractionModal from './LogInteractionModal.jsx';
import { interactionFormFromEvent } from '../../constants/interactionTypes.js';
import { TIMELINE_AUTOMATION } from '../../constants/automationHints.js';
import {
  directionTone,
  formatRelativeWhen,
  formatWhen,
  resolveDirectionLabel,
  resolveInteractionBody,
  resolveInteractionDirection,
  resolveInteractionParties,
  resolveInteractionTypeLabel,
  resolveOutcomeLabel,
} from './interactionTimelineUtils.js';

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

function TimelineEventCard({
  event,
  index,
  showContact,
  isDeleting,
  onEdit,
  onDelete,
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const meta = CHANNEL_META[event.channel] || CHANNEL_META[event.type] || CHANNEL_META.crm;
  const Icon = meta.icon;
  const isManual = event.source === 'manual' || event.editable;
  const direction = resolveInteractionDirection(event);
  const parties = resolveInteractionParties(event, direction);
  const typeLabel = resolveInteractionTypeLabel(event);
  const directionLabel = resolveDirectionLabel(direction, event);
  const outcomeLabel = resolveOutcomeLabel(event);
  const body = resolveInteractionBody(event);
  const subject = event.meta?.subject || (event.type?.startsWith('email') && event.title ? event.title : null);
  const relativeWhen = formatRelativeWhen(event.timestamp);
  const absoluteWhen = formatWhen(event.timestamp);
  const dotTone = direction === 'inbound' ? 'emerald' : direction === 'internal' ? 'neutral' : meta.tone;
  const isEmailEvent = event.channel === 'email' || event.type === 'email_outbound' || event.type === 'email_inbound';
  const isLongBody = body && body.length > 180;

  return (
    <article
      className="crm-timeline-item"
      style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
    >
      <div className={cn('crm-timeline-dot', `tone-${dotTone}`)}>
        <Icon className="h-3.5 w-3.5" strokeWidth={2} />
      </div>
      <div className={cn('crm-timeline-card', `crm-timeline-card--${directionTone(direction)}`)}>
        <div className="crm-timeline-card-head">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[13px] font-semibold text-[var(--color-ink)]">{typeLabel}</p>
              <span className={cn('crm-timeline-direction', `is-${directionTone(direction)}`)}>
                {directionLabel}
              </span>
              {event.meta?.intent && (
                <span className={cn(
                  'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                  event.meta.intent === 'Interested' ? 'bg-emerald-100 text-emerald-800' : event.meta.intent === 'Opt Out' ? 'bg-rose-100 text-rose-800' : 'bg-sky-100 text-sky-800'
                )}>
                  {event.meta.intent}
                </span>
              )}
              {event.meta?.systemInbox && (
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] font-medium text-slate-700" title="System Inbox account">
                  Received at: {event.meta.systemInbox}
                </span>
              )}
              {event.meta?.vendorSource && (
                <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-[10px] font-bold text-indigo-700" title="Discovery tool that provided this confirmed email">
                  Confirmed ({event.meta.vendorSource})
                </span>
              )}
            </div>
            <div className="crm-timeline-when">
              <time dateTime={event.timestamp}>{absoluteWhen}</time>
              {relativeWhen ? <span className="crm-timeline-when-relative">· {relativeWhen}</span> : null}
            </div>
          </div>
          {isManual && (
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => onEdit(event)}
                className="crm-timeline-action"
                aria-label="Edit interaction"
              >
                <Pencil className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={() => onDelete(event)}
                disabled={isDeleting}
                className="crm-timeline-action danger"
                aria-label="Delete interaction"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>

        <div className="crm-timeline-parties">
          <span className="crm-timeline-party is-from" title="From">{parties.from}</span>
          <ArrowRight className="crm-timeline-party-arrow" aria-hidden="true" />
          <span className="crm-timeline-party is-to" title="To">{parties.to}</span>
        </div>

        {subject && isEmailEvent && (
          <p className="mt-1 text-xs font-semibold text-neutral-800">
            Subject: {subject}
          </p>
        )}

        {body && (
          <div className="mt-1.5">
            <div className={cn(
              'crm-timeline-body whitespace-pre-wrap font-sans text-xs text-neutral-700 leading-relaxed transition-all',
              !isExpanded && isLongBody && 'line-clamp-3'
            )}>
              {body}
            </div>
            {isLongBody && (
              <button
                type="button"
                onClick={() => setIsExpanded((prev) => !prev)}
                className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-bold text-brand hover:text-brand-dark transition"
              >
                {isExpanded ? (
                  <>
                    <ChevronUp className="h-3 w-3" /> Show Less
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3 w-3" /> View Full Message
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {event.meta?.location && (
          <p className="crm-timeline-meta-line">
            <MapPin className="h-3 w-3 shrink-0" />
            {event.meta.location}
          </p>
        )}

        {event.meta?.attendees && (
          <p className="crm-timeline-meta-line">
            <Users className="h-3 w-3 shrink-0" />
            With {event.meta.attendees}
          </p>
        )}

        {event.meta?.relatedContacts?.length > 1 && (
          <p className="crm-timeline-meta-line">
            <UserRound className="h-3 w-3 shrink-0" />
            Associated contacts: {event.meta.relatedContacts.map((contact) => contact.name).join(', ')}
          </p>
        )}

        <div className="crm-timeline-card-foot">
          <span className={cn('crm-timeline-badge', isManual ? 'is-manual' : 'is-automated')}>
            {isManual ? 'Manual log' : 'Automated'}
          </span>
          {outcomeLabel && (
            <span className="crm-timeline-outcome">{outcomeLabel}</span>
          )}
          {event.meta?.durationMinutes ? (
            <span className="crm-timeline-meta-chip">{event.meta.durationMinutes} min</span>
          ) : null}
          {showContact && event.contactName && (
            <span className="crm-timeline-meta-chip">Re: {event.contactName}</span>
          )}
          {isManual && event.actor && (
            <span className="crm-timeline-meta-chip">Logged by {event.actor}</span>
          )}
        </div>
      </div>
    </article>
  );
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
  ongoingJobId,
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
  const [companyContacts, setCompanyContacts] = useState([]);
  const mountedRef = useRef(true);

  const resolvedLeadId = normalizeId(leadId);
  const resolvedCompanyId = normalizeId(companyId);
  const resolvedOngoingJobId = normalizeId(ongoingJobId || opportunityId);
  const resolvedOpportunityId = resolvedOngoingJobId;
  const hasScope = Boolean(resolvedLeadId || resolvedCompanyId || resolvedOngoingJobId);

  const logContacts = useMemo(() => (
    contacts.length ? contacts : (opportunityContacts.length ? opportunityContacts : companyContacts)
  ), [contacts, opportunityContacts, companyContacts]);

  const canLog = Boolean(resolvedLeadId || logContacts.length > 0);

  const loadTimeline = useCallback(async ({ silent = false } = {}) => {
    if (!hasScope) return;
    if (!silent) setLoading(true);
    else setSyncing(true);
    setError('');
    try {
      const data = resolvedOngoingJobId
        ? await fetchOngoingJobTimeline(resolvedOngoingJobId)
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
  }, [hasScope, resolvedLeadId, resolvedCompanyId, resolvedOngoingJobId, onCountChange]);

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
    if (contacts.length || !resolvedCompanyId || resolvedOpportunityId) {
      setCompanyContacts([]);
      return undefined;
    }
    let cancelled = false;
    fetchCompanyDetails(resolvedCompanyId)
      .then((data) => {
        if (!cancelled) setCompanyContacts(data.leads || []);
      })
      .catch(() => {
        if (!cancelled) setCompanyContacts([]);
      });
    return () => {
      cancelled = true;
    };
  }, [contacts.length, resolvedCompanyId, resolvedOpportunityId]);

  useEffect(() => {
    if (!resolvedOpportunityId) {
      setOpportunityContacts([]);
      return undefined;
    }
    let cancelled = false;
    fetchOngoingJob(resolvedOpportunityId)
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

  const handleSubmit = async ({ leadId: submitLeadId, leadIds, payload }) => {
    const targetLeadId = normalizeId(submitLeadId || resolvedLeadId || leadIds?.[0]);
    if (!targetLeadId) {
      throw new Error('Select at least one contact for this interaction.');
    }
    setSaving(true);
    try {
      if (modalMode === 'edit' && editingEvent?.meta?.interactionId) {
        await updateContactInteraction(editingEvent.meta.interactionId, {
          ...payload,
          leadId: targetLeadId,
        });
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
                {monthEvents.map((event, index) => (
                  <TimelineEventCard
                    key={event.id}
                    event={event}
                    index={index}
                    showContact={showContact}
                    isDeleting={deletingId === event?.meta?.interactionId}
                    onEdit={openEdit}
                    onDelete={handleDelete}
                  />
                ))}
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
        defaultLeadIds={
          modalMode === 'edit' && editingEvent?.meta
            ? [
                editingEvent.meta.primaryLeadId || editingEvent.contactId,
                ...(editingEvent.meta.relatedLeadIds || []),
              ].filter(Boolean)
            : undefined
        }
        saving={saving}
        mode={modalMode}
      />
    </div>
  );
}
