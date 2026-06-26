import { useCallback, useEffect, useState } from 'react';
import { crmApiFetch } from '../crmApi.js';
import UnifiedInboxWorkspace from '../components/inbox/UnifiedInboxWorkspace.jsx';
import { Modal } from '../components/ui/Modal.jsx';
import { PageShell, PageSection, LoadingState, Field, Alert } from '../components/ui/primitives.jsx';

export default function InboxPage() {
  const [replies, setReplies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [wonThread, setWonThread] = useState(null);
  const [wonAmount, setWonAmount] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionBusy, setActionBusy] = useState(false);

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
    return (
      <PageShell>
        <LoadingState label="Syncing inbox…" />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageSection>
        <UnifiedInboxWorkspace initialReplies={replies} onAction={handleAction} replyCount={replies.length} />
      </PageSection>
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
    </PageShell>
  );
}
