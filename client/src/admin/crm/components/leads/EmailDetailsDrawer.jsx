import { useEffect, useState } from 'react';
import { SendHorizontal, AlertCircle, Clock, Calendar, Mail, CheckCircle2, XCircle } from 'lucide-react';
import Drawer from '../ui/Drawer.jsx';
import { fetchSentEmailThread, sendSentEmailReply } from '../../crmApi.js';
import { cn } from '../ui/primitives.jsx';

function formatTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-AE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const STATUS_CONFIG = {
  pending: { className: 'bg-amber-50 text-amber-800 ring-amber-200/70', icon: Clock, label: 'Pending' },
  processing: { className: 'bg-blue-50 text-blue-800 ring-blue-200/70', icon: SendHorizontal, label: 'Sending...' },
  sent: { className: 'bg-emerald-50 text-emerald-800 ring-emerald-200/70', icon: CheckCircle2, label: 'Sent' },
  failed: { className: 'bg-red-50 text-red-800 ring-red-200/70', icon: AlertCircle, label: 'Failed' },
  cancelled: { className: 'bg-neutral-50 text-neutral-600 ring-neutral-200/70', icon: XCircle, label: 'Cancelled' },
};

function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status] || {
    className: 'bg-neutral-50 text-neutral-600 ring-neutral-200/70',
    icon: Clock,
    label: status,
  };
  const Icon = config.icon;
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset', config.className)}>
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  );
}

export default function EmailDetailsDrawer({
  email,
  onClose,
  onLeadClick,
  onCompanyClick,
  stackLevel = 0,
}) {
  const [thread, setThread] = useState(null);
  const [loadingThread, setLoadingThread] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [replyError, setReplyError] = useState('');

  useEffect(() => {
    if (!email?._id || email.status !== 'sent') {
      setThread(null);
      return;
    }
    setLoadingThread(true);
    setReplyError('');
    setThread(null);
    fetchSentEmailThread(email._id)
      .then((data) => setThread(data))
      .catch((err) => setReplyError(err.message || 'Failed to load thread.'))
      .finally(() => setLoadingThread(false));
  }, [email]);

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || !email?._id) return;
    setSendingReply(true);
    setReplyError('');
    try {
      const data = await sendSentEmailReply(email._id, replyText);
      if (data.replyMessage) {
        setThread((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            history: [...prev.history, data.replyMessage],
          };
        });
        setReplyText('');
      }
    } catch (err) {
      setReplyError(err.message || 'Failed to send reply.');
    } finally {
      setSendingReply(false);
    }
  };

  if (!email) return null;

  const contactName = email.lead?.name || email.recipientEmail || 'Contact';

  return (
    <Drawer
      open={Boolean(email)}
      onClose={onClose}
      title={email.renderedSubject || '(No subject)'}
      subtitle={`${email.campaign?.projectName || 'Campaign'} · Step ${email.stepNumber}`}
      size="lg"
      stackLevel={stackLevel}
    >
      <div className="space-y-6">
        {/* Email Metadata */}
        <div className="rounded-xl border border-[var(--color-line)] bg-neutral-50/50 p-4">
          <div className="grid gap-4 sm:grid-cols-2 text-xs">
            <div>
              <span className="block font-semibold text-neutral-400 uppercase tracking-wider text-[10px]">Recipient</span>
              {email.lead?._id ? (
                <button
                  type="button"
                  onClick={() => onLeadClick?.(email.lead)}
                  className="mt-1 font-semibold text-brand hover:underline text-left text-xs"
                >
                  {contactName}
                </button>
              ) : (
                <span className="mt-1 block text-[var(--color-ink)] text-xs">{contactName}</span>
              )}
              <span className="block text-neutral-500 font-mono mt-0.5">{email.recipientEmail}</span>
            </div>

            <div>
              <span className="block font-semibold text-neutral-400 uppercase tracking-wider text-[10px]">Company</span>
              {email.company?._id ? (
                <button
                  type="button"
                  onClick={() => onCompanyClick?.(email.company._id)}
                  className="mt-1 font-semibold text-brand hover:underline text-left block text-xs"
                >
                  {email.company?.companyName || '—'}
                </button>
              ) : (
                <span className="mt-1 block text-[var(--color-ink)] text-xs">—</span>
              )}
            </div>

            <div>
              <span className="block font-semibold text-neutral-400 uppercase tracking-wider text-[10px]">Status</span>
              <div className="mt-1 flex items-center gap-2">
                <StatusBadge status={email.status} />
                {email.lead?.hasResponded && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-800 ring-1 ring-inset ring-emerald-200/70">
                    Replied
                  </span>
                )}
              </div>
            </div>

            <div>
              <span className="block font-semibold text-neutral-400 uppercase tracking-wider text-[10px]">
                {email.status === 'pending' ? 'Scheduled For' : 'Sent At'}
              </span>
              <span className="mt-1 block text-[var(--color-ink)] text-xs">
                {formatTime(email.status === 'pending' ? email.scheduledFor : email.sentAt)}
              </span>
            </div>

            {email.sequence?.name && (
              <div className="sm:col-span-2">
                <span className="block font-semibold text-neutral-400 uppercase tracking-wider text-[10px]">Sequence</span>
                <span className="mt-1 block text-[var(--color-ink)] text-xs">{email.sequence?.name}</span>
              </div>
            )}
          </div>

          {email.status === 'failed' && email.errorMessage && (
            <div className="mt-4 rounded-lg bg-red-50 p-3 text-xs text-red-800 border border-red-200 flex gap-2 items-start">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-600" />
              <div>
                <p className="font-semibold">Delivery Failed</p>
                <p className="mt-1 text-red-700/90 font-mono text-[11px] leading-relaxed break-words">{email.errorMessage}</p>
              </div>
            </div>
          )}
        </div>

        {/* Conversation History / Outbound Body */}
        <div>
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-neutral-400">Message & Thread</h3>

          {loadingThread && !thread ? (
            <div className="py-8 text-center text-xs text-neutral-400 font-medium">Loading conversation thread…</div>
          ) : (
            <div className="space-y-4">
              {!thread || !thread.history || thread.history.length === 0 ? (
                <div className="rounded-xl border border-[var(--color-line)] bg-white p-4">
                  <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-[var(--color-ink)]">
                    {email.renderedBody || 'No message body recorded.'}
                  </pre>
                </div>
              ) : (
                thread.history.map((msg, index) => {
                  const outbound = msg.type === 'outbound';
                  return (
                    <div key={index} className={cn('flex', outbound ? 'justify-end' : 'justify-start')}>
                      <div
                        className={cn(
                          'max-w-xl w-full rounded-2xl px-4 py-3 shadow-sm border',
                          outbound ? 'border-[var(--color-line)] bg-white text-neutral-700' : 'bg-[var(--color-ink)] border-[var(--color-ink)] text-white'
                        )}
                      >
                        <div
                          className={cn(
                            'mb-2 flex items-center justify-between gap-4 border-b pb-1.5 text-[10px] font-semibold uppercase tracking-wider',
                            outbound ? 'border-[var(--color-line)] text-neutral-400' : 'border-white/15 text-white/60'
                          )}
                        >
                          <span>{outbound ? (msg.step ? `Step ${msg.step}` : 'Outbound Reply') : 'Inbound Reply'}</span>
                          <span>{formatTime(msg.timestamp)}</span>
                        </div>
                        <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.body}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Quick Reply Form */}
        {email.status === 'sent' && (
          <div className="border-t border-[var(--color-line)] pt-5">
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-neutral-400">Quick Reply</h3>
            <form onSubmit={handleSendReply} className="space-y-3">
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Type your email reply here..."
                rows={4}
                required
                className="crm-input w-full text-sm"
                disabled={sendingReply}
              />
              {replyError && <p className="text-xs text-red-500">{replyError}</p>}
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={sendingReply || !replyText.trim()}
                  className="crm-btn-primary flex items-center gap-2 text-xs"
                >
                  {sendingReply ? 'Sending...' : 'Send Reply'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </Drawer>
  );
}
