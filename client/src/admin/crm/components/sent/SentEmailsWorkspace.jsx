import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Search, SendHorizontal } from 'lucide-react';
import { cn, EmptyState } from '../ui/primitives.jsx';

function formatSentAt(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  return date.toLocaleString('en-AE', {
    day: 'numeric',
    month: 'short',
    year: sameDay ? undefined : 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function SentEmailDetail({ email }) {
  if (!email) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
        <SendHorizontal className="mb-3 h-8 w-8 text-neutral-300" strokeWidth={1.5} />
        <p className="text-sm font-medium text-neutral-500">Select a sent email to read the full message.</p>
      </div>
    );
  }

  const contactName = email.lead?.name || email.recipientEmail || 'Contact';

  return (
    <div className="crm-scroll flex min-h-0 flex-1 flex-col overflow-y-auto">
      <div className="border-b border-[var(--color-line)] px-6 py-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
          {email.campaign?.projectName || 'Campaign'} · Step {email.stepNumber}
        </p>
        <h2 className="mt-1 text-lg font-semibold leading-snug text-[var(--color-ink)]">
          {email.renderedSubject || '(No subject)'}
        </h2>
        <dl className="mt-4 grid gap-3 text-xs sm:grid-cols-2">
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">To</dt>
            <dd className="mt-0.5 font-medium text-[var(--color-ink)]">{email.recipientEmail || '—'}</dd>
            <dd className="text-neutral-500">{contactName}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">Sent</dt>
            <dd className="mt-0.5 font-medium text-[var(--color-ink)]">{formatSentAt(email.sentAt)}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">Company</dt>
            <dd className="mt-0.5 text-[var(--color-ink)]">{email.company?.companyName || '—'}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">Sequence</dt>
            <dd className="mt-0.5 text-[var(--color-ink)]">{email.sequence?.name || '—'}</dd>
          </div>
        </dl>
        {email.campaign?._id && (
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              to={`/admin/crm/projects/${email.campaign._id}`}
              className="crm-btn-secondary !py-1.5 text-[11px]"
            >
              Open campaign
            </Link>
            <Link
              to={`/admin/crm/sequences?edit=${email.sequence?._id || ''}`}
              className="crm-btn-secondary !py-1.5 text-[11px]"
            >
              Open sequence
            </Link>
          </div>
        )}
      </div>

      <div className="px-6 py-5">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-neutral-400">Message</p>
        <div className="rounded-xl border border-[var(--color-line)] bg-neutral-50/60 px-4 py-4">
          <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-[var(--color-ink)]">
            {email.renderedBody || 'No message body recorded.'}
          </pre>
        </div>
        {email.providerMessageId && (
          <p className="mt-3 break-all text-[10px] text-neutral-400">
            Message ID: {email.providerMessageId}
          </p>
        )}
      </div>
    </div>
  );
}

export default function SentEmailsWorkspace({
  emails = [],
  total = 0,
  sentToday = 0,
  campaigns = [],
  campaignId = '',
  onCampaignChange,
  search = '',
  onSearchChange,
  page = 1,
  pages = 0,
  onPageChange,
  loading = false,
}) {
  const [activeId, setActiveId] = useState('');

  useEffect(() => {
    if (!emails.length) {
      setActiveId('');
      return;
    }
    if (!emails.some((row) => row._id === activeId)) {
      setActiveId(emails[0]._id);
    }
  }, [emails, activeId]);

  const activeEmail = useMemo(
    () => emails.find((row) => row._id === activeId) || emails[0] || null,
    [activeId, emails],
  );

  return (
    <div className="crm-card flex min-h-[560px] flex-col overflow-hidden md:h-[calc(100vh-168px)] md:flex-row">
      <aside className="flex h-80 w-full shrink-0 flex-col border-b border-[var(--color-line)] bg-neutral-50/40 md:h-auto md:w-[380px] md:border-b-0 md:border-r">
        <div className="border-b border-[var(--color-line)] bg-white px-5 py-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-[var(--color-ink)]">
            <SendHorizontal className="h-4 w-4 text-brand" strokeWidth={1.75} />
            Sent emails
            <span className="text-xs font-medium text-neutral-400">({total})</span>
          </h2>
          <p className="mt-1 text-[11px] text-neutral-500">
            {sentToday} sent today · copies saved to your mailbox Sent folder when IMAP is configured
          </p>

          <div className="mt-3 space-y-2">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
              <input
                type="search"
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search subject, contact, company…"
                className="crm-input w-full py-2 pl-9 text-xs"
              />
            </label>
            <select
              value={campaignId}
              onChange={(e) => onCampaignChange(e.target.value)}
              className="crm-input w-full py-2 text-xs"
            >
              <option value="">All campaigns</option>
              {campaigns.map((campaign) => (
                <option key={campaign._id} value={campaign._id}>
                  {campaign.projectName || 'Campaign'}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="crm-scroll flex-1 overflow-y-auto">
          {loading && emails.length === 0 ? (
            <div className="p-6 text-center text-xs text-neutral-400">Loading sent emails…</div>
          ) : emails.length === 0 ? (
            <EmptyState
              icon={Mail}
              title="No sent emails yet"
              body="Launch a sequence in Send mode to deliver outbound messages. They will appear here once SMTP delivery completes."
            />
          ) : (
            emails.map((email) => {
              const selected = activeEmail?._id === email._id;
              return (
                <button
                  key={email._id}
                  type="button"
                  onClick={() => setActiveId(email._id)}
                  className={cn(
                    'block w-full border-b border-[var(--color-line)] px-5 py-4 text-left transition',
                    selected ? 'bg-white shadow-[inset_3px_0_0_0_var(--color-brand)]' : 'hover:bg-white/70',
                  )}
                >
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="truncate text-[10px] font-semibold uppercase tracking-wide text-neutral-400">
                      {email.campaign?.projectName || 'Campaign'}
                    </span>
                    <span className="shrink-0 text-[10px] text-neutral-400">Step {email.stepNumber}</span>
                  </div>
                  <p className="truncate text-sm font-semibold text-[var(--color-ink)]">
                    {email.renderedSubject || '(No subject)'}
                  </p>
                  <p className="truncate text-xs text-neutral-500">
                    {email.lead?.name || email.recipientEmail}
                    {email.company?.companyName ? ` · ${email.company.companyName}` : ''}
                  </p>
                  <p className="mt-1 text-[10px] text-neutral-400">{formatSentAt(email.sentAt)}</p>
                </button>
              );
            })
          )}
        </div>

        {pages > 1 && (
          <div className="flex items-center justify-between border-t border-[var(--color-line)] bg-white px-4 py-3">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => onPageChange(page - 1)}
              className="crm-btn-ghost !py-1.5 text-[11px] disabled:opacity-40"
            >
              Previous
            </button>
            <span className="text-[11px] text-neutral-500">
              Page {page} of {pages}
            </span>
            <button
              type="button"
              disabled={page >= pages || loading}
              onClick={() => onPageChange(page + 1)}
              className="crm-btn-ghost !py-1.5 text-[11px] disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}
      </aside>

      <section className="flex min-h-[480px] min-w-0 flex-1 flex-col bg-white md:min-h-0">
        <SentEmailDetail email={activeEmail} />
      </section>
    </div>
  );
}
