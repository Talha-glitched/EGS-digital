import { useEffect, useState } from 'react';
import { RefreshCw, UserPlus } from 'lucide-react';
import { Alert } from '../ui/primitives.jsx';
import { Modal } from '../ui/Modal.jsx';

const EMPLOYMENT_LABELS = { permanent: 'Permanent', temporary: 'Temporary', contract: 'Contract', freelance: 'Freelance' };

function generatePassword(length = 14) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$';
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

const initial = {
  name: '', resourceType: 'employee', identifier: '', jobTitle: '', employmentType: 'permanent',
  capabilityTags: '', hourlyCostAed: '', joinedOn: '', loginMode: 'none', userId: '',
  loginEmail: '', loginPassword: '', loginRole: 'sales_rep', sendWelcomeEmail: true,
};

export default function EmployeeCreateModal({ open, onClose, data, onSave }) {
  const [form, setForm] = useState(initial); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  useEffect(() => { if (open) { setForm({ ...initial, sendWelcomeEmail: Boolean(data.emailReady) }); setError(''); } }, [open, data.emailReady]);
  const unlinkedUsers = (data.users || []).filter((user) => !user.linkedResourceId);

  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const payload = { ...form, userId: form.loginMode === 'existing' ? form.userId : '', capabilityTags: form.capabilityTags.split(',').map((item) => item.trim()).filter(Boolean) };
      await onSave(payload); onClose();
    } catch (err) { setError(err.message || 'Could not create employee.'); } finally { setBusy(false); }
  }

  return <Modal open={open} onClose={onClose} title="Add employee or contractor" subtitle="Create one operational identity and optionally create or link its ERP/CRM login." icon={UserPlus} size="lg" footer={<><button className="crm-btn-secondary" onClick={onClose}>Cancel</button><button type="submit" form="employee-create-form" className="crm-btn-primary" disabled={busy || !form.name.trim()}>{busy ? 'Creating…' : 'Create person'}</button></>}>
    <form id="employee-create-form" className="grid gap-4 sm:grid-cols-2" onSubmit={submit}>
      {error && <div className="sm:col-span-2"><Alert>{error}</Alert></div>}
      <label className="text-xs font-medium text-neutral-600">Type<select className="crm-select mt-1.5 w-full" value={form.resourceType} onChange={(e) => setForm((v) => ({ ...v, resourceType: e.target.value, employmentType: e.target.value === 'contractor' ? 'contract' : 'permanent' }))}><option value="employee">Employee</option><option value="contractor">Contractor</option></select></label>
      <label className="text-xs font-medium text-neutral-600">Name<input className="crm-input mt-1.5 w-full" value={form.name} onChange={(e) => setForm((v) => ({ ...v, name: e.target.value }))} required /></label>
      <label className="text-xs font-medium text-neutral-600">Job title<input className="crm-input mt-1.5 w-full" value={form.jobTitle} onChange={(e) => setForm((v) => ({ ...v, jobTitle: e.target.value }))} placeholder="Installer, designer, supervisor" /></label>
      <label className="text-xs font-medium text-neutral-600">Employment type<select className="crm-select mt-1.5 w-full" value={form.employmentType} onChange={(e) => setForm((v) => ({ ...v, employmentType: e.target.value }))}>{data.employmentTypes.map((item) => <option key={item} value={item}>{EMPLOYMENT_LABELS[item]}</option>)}</select></label>
      <label className="text-xs font-medium text-neutral-600">Employee / contractor code<input className="crm-input mt-1.5 w-full" value={form.identifier} onChange={(e) => setForm((v) => ({ ...v, identifier: e.target.value }))} /></label>
      <label className="text-xs font-medium text-neutral-600">Joined<input type="date" className="crm-input mt-1.5 w-full" value={form.joinedOn} onChange={(e) => setForm((v) => ({ ...v, joinedOn: e.target.value }))} /></label>
      <label className="text-xs font-medium text-neutral-600 sm:col-span-2">Operational skills<input className="crm-input mt-1.5 w-full" value={form.capabilityTags} onChange={(e) => setForm((v) => ({ ...v, capabilityTags: e.target.value }))} placeholder="Installation, electrical, driving, carpentry" /></label>
      <label className="text-xs font-medium text-neutral-600">Hourly planning cost AED<input type="number" min="0" step="0.01" className="crm-input mt-1.5 w-full" value={form.hourlyCostAed} onChange={(e) => setForm((v) => ({ ...v, hourlyCostAed: e.target.value }))} /></label>
      <label className="text-xs font-medium text-neutral-600">ERP/CRM access<select className="crm-select mt-1.5 w-full" value={form.loginMode} onChange={(e) => setForm((v) => ({ ...v, loginMode: e.target.value }))}><option value="none">No login needed</option>{data.canManageUsers && <option value="existing">Link existing user</option>}{data.canManageUsers && <option value="create">Create new login</option>}</select></label>

      {form.loginMode === 'existing' && <label className="text-xs font-medium text-neutral-600 sm:col-span-2">Existing ERP/CRM user<select className="crm-select mt-1.5 w-full" value={form.userId} onChange={(e) => { const user = unlinkedUsers.find((item) => item.id === e.target.value); setForm((v) => ({ ...v, userId: e.target.value, name: user?.name || v.name })); }} required><option value="">Select an unlinked user…</option>{unlinkedUsers.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.email}</option>)}</select><span className="mt-1 block text-2xs text-neutral-400">The login display name becomes the shared employee name.</span></label>}

      {form.loginMode === 'create' && <div className="grid gap-4 rounded-xl border border-brand/20 bg-brand-soft/20 p-4 sm:col-span-2 sm:grid-cols-2"><div className="sm:col-span-2"><p className="text-xs font-semibold">New ERP/CRM login</p><p className="mt-1 text-2xs text-neutral-500">The account and employee are created together. If either fails, neither is saved.</p></div><label className="text-xs font-medium text-neutral-600">Login email<input type="email" className="crm-input mt-1.5 w-full" value={form.loginEmail} onChange={(e) => setForm((v) => ({ ...v, loginEmail: e.target.value }))} required /></label><label className="text-xs font-medium text-neutral-600">CRM role<select className="crm-select mt-1.5 w-full" value={form.loginRole} onChange={(e) => setForm((v) => ({ ...v, loginRole: e.target.value }))}>{data.roleOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label><label className="text-xs font-medium text-neutral-600 sm:col-span-2">Temporary password<div className="mt-1.5 flex gap-2"><input type="text" minLength="8" className="crm-input w-full" value={form.loginPassword} onChange={(e) => setForm((v) => ({ ...v, loginPassword: e.target.value }))} required /><button type="button" className="crm-btn-secondary" title="Generate password" onClick={() => setForm((v) => ({ ...v, loginPassword: generatePassword() }))}><RefreshCw className="h-4 w-4" /></button></div></label>{data.emailReady && <label className="flex items-start gap-2 text-xs sm:col-span-2"><input type="checkbox" className="mt-0.5" checked={form.sendWelcomeEmail} onChange={(e) => setForm((v) => ({ ...v, sendWelcomeEmail: e.target.checked }))} /><span><strong>Email login details</strong><span className="mt-0.5 block text-2xs text-neutral-500">Send the login URL and temporary password after creation.</span></span></label>}</div>}
    </form>
  </Modal>;
}
