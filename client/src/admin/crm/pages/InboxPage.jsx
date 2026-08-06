import { useCallback, useEffect, useState } from 'react';
import { crmApiFetch } from '../crmApi.js';
import UnifiedInboxWorkspace from '../components/inbox/UnifiedInboxWorkspace.jsx';
import { Modal } from '../components/ui/Modal.jsx';
import { PageShell, PageSection, LoadingState, Field, Alert } from '../components/ui/primitives.jsx';
import CommunicationJobModal from '../components/communications/CommunicationJobModal.jsx';

export function InboxWorkspaceContent({ embedded = false }) {
  const [replies, setReplies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [wonThread, setWonThread] = useState(null);
  const [wonAmount, setWonAmount] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionBusy, setActionBusy] = useState(false);
  const [jobThread, setJobThread] = useState(null);

  const load = useCallback(async () => {
    const data = await crmApiFetch('/api/admin/inbox?limit=100');
    setReplies(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    load().catch(console.error);
    crmApiFetch('/api/admin/inbox/sync', { method: 'POST' }).then(load).catch(() => {});
  }, [load]);

  async function handleAction(action, thread) {
    if (action === 'job') {
      setJobThread(thread);
      return;
    }
    if (action === 'blacklist') {
      await crmApiFetch(`/api/admin/inbox/${thread._id}/blacklist`, { method: 'POST' });
      load();
    }
    if (action === 'won') {
      setWonThread(thread);
      setWonAmount('');
      setActionError('');
    }
  }

  async function confirmWon(e) {
    e.preventDefault();
    const amount = Number(wonAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setActionError('Enter a closed deal amount greater than zero.');
      return;
    }
    setActionBusy(true);
    setActionError('');
    try {
      await crmApiFetch(`/api/admin/inbox/${wonThread._id}/won`, {
        method: 'POST',
        body: JSON.stringify({ amount, description: 'Closed from inbox' }),
      });
      setWonThread(null);
      await load();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setActionBusy(false);
    }
  }

  if (loading) {
    if (embedded) return <LoadingState label="Syncing inbox…" />;
    return (
      <PageShell>
        <LoadingState label="Syncing inbox…" />
      </PageShell>
    );
  }

  const content = (
    <>
      <div className={embedded ? '' : undefined}>
        <UnifiedInboxWorkspace initialReplies={replies} onAction={handleAction} replyCount={replies.length} />
      </div>
      <Modal
        open={Boolean(wonThread)}
        onClose={() => !actionBusy && setWonThread(null)}
        title="Mark opportunity won"
        subtitle={`Record the AED contract value for ${wonThread?.companyName || wonThread?.pocName || 'this contact'}.`}
        size="md"
      >
        <form onSubmit={confirmWon} className="space-y-5">
          {actionError && <Alert>{actionError}</Alert>}
          <Field label="Closed deal amount (AED)" required hint="Use the signed or internally approved contract value.">
            <input
              type="number"
              min="1"
              step="1"
              autoFocus
              className="crm-input"
              value={wonAmount}
              onChange={(e) => setWonAmount(e.target.value)}
              placeholder="65000"
            />
          </Field>
          <div className="flex justify-end gap-3 border-t border-[var(--color-line)] pt-4">
            <button type="button" className="crm-btn-secondary" disabled={actionBusy} onClick={() => setWonThread(null)}>Cancel</button>
            <button type="submit" className="crm-btn-primary" disabled={actionBusy}>{actionBusy ? 'Recording…' : 'Confirm won deal'}</button>
          </div>
        </form>
      </Modal>
      <CommunicationJobModal open={Boolean(jobThread)} onClose={() => setJobThread(null)} conversationId={jobThread?._id} defaultMessageId={jobThread?.history?.at(-1)?.messageId} onCreated={load} />
    </>
  );

  if (embedded) return content;
  return <PageShell><PageSection>{content}</PageSection></PageShell>;
}

export default function InboxPage() {
  return <InboxWorkspaceContent />;
}
