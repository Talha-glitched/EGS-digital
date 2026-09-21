import { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal.jsx';
import { Field, Alert } from '../ui/primitives.jsx';
import { Truck, Loader2 } from 'lucide-react';
import { createSupplier, updateSupplier } from '../../crmApi.js';

export default function AddSupplierModal({
  open,
  initialSupplier = null,
  onClose,
  onSaved,
}) {
  const isEdit = Boolean(initialSupplier);

  const [name, setName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [service, setService] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('active');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialSupplier) {
      setName(initialSupplier.name || '');
      setContactPerson(initialSupplier.contactPerson || '');
      setPhone(initialSupplier.phone || '');
      setEmail(initialSupplier.email || '');
      setService(initialSupplier.service || '');
      setAddress(initialSupplier.address || '');
      setNotes(initialSupplier.notes || '');
      setStatus(initialSupplier.status || 'active');
    } else {
      setName('');
      setContactPerson('');
      setPhone('');
      setEmail('');
      setService('');
      setAddress('');
      setNotes('');
      setStatus('active');
    }
    setError('');
  }, [initialSupplier, open]);

  if (!open) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) {
      setError('Supplier or company name is required.');
      return;
    }

    setBusy(true);
    setError('');

    const payload = {
      name: name.trim(),
      contactPerson: contactPerson.trim() || null,
      phone: phone.trim() || null,
      email: email.trim() || null,
      service: service.trim() || null,
      address: address.trim() || null,
      notes: notes.trim() || null,
      status,
    };

    try {
      let saved;
      if (isEdit) {
        saved = await updateSupplier(initialSupplier.id, payload);
      } else {
        saved = await createSupplier(payload);
      }
      onSaved?.(saved);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save supplier.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit Supplier' : 'Add New Supplier'}
      subtitle={
        isEdit
          ? `Update profile and contact information for ${initialSupplier.name}`
          : 'Register a materials vendor, fabrication workshop, or equipment supplier'
      }
      icon={Truck}
      accent="brand"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert tone="error">{error}</Alert>}

        <Field label="Supplier / Company Name" required hint="Legal or commercial business name">
          <input
            type="text"
            className="crm-input font-medium"
            placeholder="e.g. Gulf Aluminium Systems, Danube Building Materials"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
          />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Primary Contact Person" hint="Sales rep or account manager">
            <input
              type="text"
              className="crm-input"
              placeholder="e.g. Tariq Mahmood"
              value={contactPerson}
              onChange={(e) => setContactPerson(e.target.value)}
            />
          </Field>

          <Field label="Phone / WhatsApp" hint="Mobile or direct office line">
            <input
              type="tel"
              className="crm-input"
              placeholder="e.g. +971 50 123 4567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Email Address">
            <input
              type="email"
              className="crm-input"
              placeholder="e.g. sales@vendor.ae"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>

          <Field label="Status">
            <select
              className="crm-input"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="active">Active Vendor</option>
              <option value="inactive">Inactive / On Hold</option>
            </select>
          </Field>
        </div>

        <Field
          label="Service / Materials Supplied"
          hint="Comma-separated categories or trades (e.g. Aluminium, Glass, Wood, Acrylic, LED)"
        >
          <input
            type="text"
            className="crm-input"
            placeholder="e.g. Aluminium Extrusions, Plywood, Acrylic Letters, Powder Coating"
            value={service}
            onChange={(e) => setService(e.target.value)}
          />
        </Field>

        <Field label="Location / Warehouse Address">
          <input
            type="text"
            className="crm-input"
            placeholder="e.g. Al Quoz Industrial 1, Warehouse #4, Dubai"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </Field>

        <Field label="Internal Notes / Terms" hint="Payment terms, credit days, delivery turnaround">
          <textarea
            className="crm-input min-h-[64px]"
            placeholder="e.g. 30 days payment terms, requires 2 days notice for custom CNC jobs..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
          />
        </Field>

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-neutral-100">
          <button
            type="button"
            onClick={onClose}
            className="crm-btn-secondary"
            disabled={busy}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="crm-btn-primary flex items-center gap-2"
            disabled={busy}
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {busy ? 'Saving Supplier…' : isEdit ? 'Save Changes' : 'Add Supplier'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
