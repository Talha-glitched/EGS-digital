import { useEffect, useMemo, useState } from 'react';
import { Link2, RefreshCw, UserPlus } from 'lucide-react';
import { crmApiFetch } from '../../crmApi.js';
import { Alert, Badge, EmptyState } from '../ui/primitives.jsx';
import { Modal } from '../ui/Modal.jsx';

export default function EmployeeUserSyncModal({ open, onClose, data, onChanged }) {
  const candidates = useMemo(() => (data.userSyncCandidates || []).filter((item) => item.isActive), [data.userSyncCandidates]);
  const unlinkedPeople = useMemo(() => (data.people || []).filter((item) => !item.userId && item.status === 'active'), [data.people]);
  const [selections, setSelections] = useState({}); const [busyId, setBusyId] = useState(''); const [error, setError] = useState('');
  useEffect(() => { if (!open) return; setSelections(Object.fromEntries(candidates.map((user) => [user.id, user.suggestedResourceId || '']))); setError(''); }, [open, candidates]);

  async function act(user, mode) {
    setBusyId(user.id); setError('');
    try {
      if (mode === 'link') await crmApiFetch('/api/admin/employee-operations/sync/link', { method: 'POST', body: JSON.stringify({ userId: user.id, resourceId: selections[user.id] }) });
      else await crmApiFetch(`/api/admin/employee-operations/sync/users/${user.id}/create-employee`, { method: 'POST', body: JSON.stringify({ resourceType: 'employee', employmentType: 'permanent' }) });
      await onChanged();
    } catch (err) { setError(err.message || 'Could not synchronize this user.'); } finally { setBusyId(''); }
  }

  return <Modal open={open} onClose={onClose} title="Sync ERP/CRM users" subtitle="Review every link manually. Login identity stays in Users; operational information stays in Employees." icon={RefreshCw} size="lg" footer={<button className="crm-btn-secondary" onClick={onClose}>Done</button>}>
    {error && <Alert>{error}</Alert>}
    {!candidates.length ? <EmptyState icon={Link2} title="No ERP/CRM users found" description="Create an employee with a new login to establish the first linked identity." /> : <div className="space-y-3">{candidates.map((user) => <div key={user.id} className="rounded-xl border border-neutral-200 p-3"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold">{user.name}</p><p className="mt-0.5 text-[10px] text-neutral-500">{user.email} · {String(user.role || '').replaceAll('_', ' ')}</p></div>{user.linkedResourceId ? <Badge tone="success">Linked to {user.linkedResourceName}</Badge> : user.suggestedResourceId ? <Badge tone="info">Suggested name match</Badge> : <Badge tone="warning">Not linked</Badge>}</div>{!user.linkedResourceId && <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]"><select className="crm-select text-xs" value={selections[user.id] || ''} onChange={(e) => setSelections((current) => ({ ...current, [user.id]: e.target.value }))}><option value="">Select existing employee…</option>{unlinkedPeople.map((person) => <option key={person.id} value={person.id}>{person.name}{person.jobTitle ? ` · ${person.jobTitle}` : ''}</option>)}</select><button className="crm-btn-secondary" disabled={busyId === user.id || !selections[user.id]} onClick={() => act(user, 'link')}><Link2 className="h-3.5 w-3.5" />Confirm link</button><button className="crm-btn-primary" disabled={busyId === user.id} onClick={() => act(user, 'create')}><UserPlus className="h-3.5 w-3.5" />Create employee</button></div>}</div>)}</div>}
  </Modal>;
}
