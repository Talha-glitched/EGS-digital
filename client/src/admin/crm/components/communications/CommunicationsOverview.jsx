import { Link } from 'react-router-dom';
import { crmApiFetch } from '../../crmApi.js';
import {
  AlertTriangle,
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  Clock3,
  Link2,
  Mail,
  MessageSquareReply,
  Search,
  SendHorizontal,
} from 'lucide-react';
import CommunicationSourceDrawer from './CommunicationSourceDrawer.jsx';
import ReplyReviewModal from './ReplyReviewModal.jsx';
import { Badge, EmptyState, LoadingState, StatBand, StatBandItem } from '../ui/primitives.jsx';
import { useState } from 'react';

function when(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-AE', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function MessageRow({ item, onOpen, showJobs = false }) {
  return (
    <button
      type="button"
      onClick={() => onOpen({ conversationId: item.conversationId, messageId: item.messageId })}
      className="block w-full border-b border-[var(--color-line)] px-4 py-3 text-left transition last:border-b-0 hover:bg-neutral-50"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-[var(--color-ink)]">{item.subject || 'Email conversation'}</p>
          <p className="mt-0.5 truncate text-[10px] text-neutral-500">
            {[item.personName, item.companyName, item.campaignName].filter(Boolean).join(' · ') || 'Direct communication'}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {item.direction && <Badge tone={item.direction === 'inbound' ? 'success' : 'info'}>{item.direction === 'inbound' ? 'Received' : 'Sent'}</Badge>}
          {item.intent && <Badge tone={item.intent === 'Interested' ? 'success' : 'neutral'}>{item.intent}</Badge>}
          <span className="text-[10px] text-neutral-400">{when(item.occurredAt || item.lastMessageAt)}</span>
        </div>
      </div>
      <p className="mt-2 line-clamp-2 text-[11px] leading-relaxed text-neutral-600">{item.preview || 'No message preview available.'}</p>
      {showJobs && item.jobs?.length ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {item.jobs.map((job) => <Badge key={job.id} tone="info">{job.jobNumber ? `${job.jobNumber} · ` : ''}{job.title}</Badge>)}
        </div>
      ) : null}
    </button>
  );
}

function AttentionRow({ item, owners, onOpen, onReview, onAssign, assigning }) {
  return (
    <div className="border-b border-[var(--color-line)] px-4 py-3 last:border-b-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <button type="button" onClick={() => onOpen({ conversationId: item.conversationId, messageId: item.messageId })} className="min-w-0 flex-1 text-left">
          <p className="truncate text-xs font-semibold text-[var(--color-ink)]">{item.subject || 'Email reply'}</p>
          <p className="mt-0.5 truncate text-[10px] text-neutral-500">{[item.personName, item.companyName, item.campaignName].filter(Boolean).join(' · ') || 'Direct communication'}</p>
          <p className="mt-2 line-clamp-2 text-[11px] leading-relaxed text-neutral-600">{item.preview || 'No message preview available.'}</p>
        </button>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <span className="text-[10px] text-neutral-400">{when(item.occurredAt)}</span>
          <select aria-label="Review owner" className="crm-select !w-36 !py-1 text-[10px]" value={item.ownerUserId || ''} disabled={assigning} onChange={(event) => onAssign(item, event.target.value)}>
            <option value="">Unassigned</option>
            {owners.map((owner) => <option key={owner.id} value={owner.id}>{owner.name}</option>)}
          </select>
          <button type="button" className="crm-btn-primary !px-2.5 !py-1.5 text-[11px]" onClick={() => onReview(item)}><CheckCircle2 className="h-3.5 w-3.5" />Review</button>
        </div>
      </div>
    </div>
  );
}

export default function CommunicationsOverview({ data, loading, search, onSearchChange, onNavigate, onRefresh }) {
  const [source, setSource] = useState(null);
  const [reviewTarget, setReviewTarget] = useState(null);
  const [assigningId, setAssigningId] = useState('');
  const [assignmentError, setAssignmentError] = useState('');
  const summary = data?.summary || {};
  const results = data?.search?.items || [];
  const attention = data?.attention || [];

  async function assign(item, ownerUserId) {
    if (!ownerUserId) return;
    setAssigningId(item.reviewItemId); setAssignmentError('');
    try {
      await crmApiFetch(`/api/admin/communications-workspace/reviews/${encodeURIComponent(item.reviewItemId)}/assign`, { method: 'POST', body: JSON.stringify({ ownerUserId }) });
      await onRefresh?.();
    } catch (err) {
      setAssignmentError(err.message || 'Could not assign this review.');
    } finally {
      setAssigningId('');
    }
  }

  if (loading && !data) return <LoadingState label="Loading communication priorities…" />;

  return (
    <div className="space-y-4">
      <StatBand>
        <StatBandItem as="button" onClick={() => onNavigate('inbox')} icon={MessageSquareReply} tone="success" label="Reply conversations" value={summary.inboxThreads || 0} detail={`${summary.unlinkedReplies || 0} not yet linked to a Job`} />
        <StatBandItem as="button" onClick={() => onNavigate('attention')} icon={Clock3} tone="warning" label="Needs human review" value={summary.needsReview || 0} detail="Pending reply decisions" />
        <StatBandItem as="button" onClick={() => onNavigate('failed')} icon={AlertTriangle} tone="warning" label="Delivery issues" value={summary.deliveryIssues || 0} detail="Failed, cancelled or held" />
        <StatBandItem as="button" onClick={() => onNavigate('linked')} icon={Link2} tone="info" label="Linked conversations" value={summary.linkedThreads || 0} detail="Connected to operational Jobs" />
        <StatBandItem as="button" onClick={() => onNavigate('outbox')} icon={SendHorizontal} tone="brand" label="Queued sends" value={summary.queuedSends || 0} detail={`${summary.sentToday || 0} sent today`} />
      </StatBand>

      <section className="crm-card overflow-hidden">
        <div className="border-b border-[var(--color-line)] px-4 py-3">
          <h2 className="text-xs font-semibold text-[var(--color-ink)]">Search all message evidence</h2>
          <p className="mt-0.5 text-[10px] text-neutral-500">Search subject, email text, contact, company or campaign. Results always open the immutable source conversation.</p>
          <label className="relative mt-3 block max-w-2xl">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input type="search" className="crm-input w-full pl-9 text-xs" value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder="Search every sent and received email…" />
          </label>
        </div>
        {search.trim() ? (
          loading && !results.length ? <LoadingState label="Searching messages…" /> : results.length ? (
            <div>{results.map((item) => <MessageRow key={item.messageId} item={item} showJobs onOpen={setSource} />)}</div>
          ) : <EmptyState icon={Search} title="No matching communication" description="Try a company, person, campaign, subject or phrase from the email." />
        ) : (
          <div className="grid gap-3 p-4 md:grid-cols-3">
            <button type="button" onClick={() => onNavigate('inbox')} className="rounded-xl border border-neutral-200 p-4 text-left hover:border-brand/30"><Mail className="h-5 w-5 text-brand" /><strong className="mt-3 block text-xs">Review replies</strong><span className="mt-1 block text-[10px] text-neutral-500">Qualify the POC, follow up or send the conversation to a Job.</span></button>
            <button type="button" onClick={() => onNavigate('outbox')} className="rounded-xl border border-neutral-200 p-4 text-left hover:border-brand/30"><SendHorizontal className="h-5 w-5 text-brand" /><strong className="mt-3 block text-xs">Manage outreach</strong><span className="mt-1 block text-[10px] text-neutral-500">Launch batches and monitor the live send queue.</span></button>
            <button type="button" onClick={() => onNavigate('linked')} className="rounded-xl border border-neutral-200 p-4 text-left hover:border-brand/30"><BriefcaseBusiness className="h-5 w-5 text-brand" /><strong className="mt-3 block text-xs">Trace linked work</strong><span className="mt-1 block text-[10px] text-neutral-500">See which conversations became requirements, tasks, decisions or issues.</span></button>
          </div>
        )}
      </section>

      <section className="crm-card overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-[var(--color-line)] px-4 py-3">
          <div><h2 className="text-xs font-semibold">Replies awaiting human review</h2><p className="mt-0.5 text-[10px] text-neutral-500">AI does not classify these; a person owns the decision.</p></div>
          <button type="button" onClick={() => onNavigate('inbox')} className="crm-btn-ghost text-xs">Open Inbox <ArrowRight className="h-3.5 w-3.5" /></button>
        </div>
        {assignmentError && <div className="p-3"><Alert>{assignmentError}</Alert></div>}
        {attention.length ? <div>{attention.map((item) => <AttentionRow key={item.reviewItemId} item={item} owners={data?.owners || []} onOpen={setSource} onReview={setReviewTarget} onAssign={assign} assigning={assigningId === item.reviewItemId} />)}</div> : <EmptyState icon={MessageSquareReply} title="No pending reply reviews" description="New replies requiring a decision will appear here." />}
      </section>
      <CommunicationSourceDrawer source={source} onClose={() => setSource(null)} />
      <ReplyReviewModal item={reviewTarget} owners={data?.owners || []} currentUserId={data?.currentUserId || ''} onClose={() => setReviewTarget(null)} onResolved={onRefresh} />
    </div>
  );
}

export function LinkedCommunicationsWorkspace({ data, loading }) {
  const [source, setSource] = useState(null);
  const items = data?.linked || [];
  if (loading && !data) return <LoadingState label="Loading linked conversations…" />;
  return (
    <div className="crm-card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-line)] px-4 py-3">
        <div><h2 className="text-xs font-semibold">Communication linked to operational work</h2><p className="mt-0.5 text-[10px] text-neutral-500">One source conversation can support more than one Job without copying its email body.</p></div>
        <Link to="/admin/crm/ongoing-jobs" className="crm-btn-secondary text-xs"><BriefcaseBusiness className="h-3.5 w-3.5" />Open Jobs</Link>
      </div>
      {items.length ? <div>{items.map((item) => <MessageRow key={item.conversationId} item={item} showJobs onOpen={setSource} />)}</div> : <EmptyState icon={Link2} title="No linked conversations" description="Use Send to Job from Inbox or Sent to connect communication evidence to operational work." />}
      <CommunicationSourceDrawer source={source} onClose={() => setSource(null)} />
    </div>
  );
}
