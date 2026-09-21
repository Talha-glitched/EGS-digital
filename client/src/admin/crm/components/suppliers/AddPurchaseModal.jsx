import { useState } from 'react';
import { Modal } from '../ui/Modal.jsx';
import { Field, Alert } from '../ui/primitives.jsx';
import { ShoppingBag, Star, Loader2 } from 'lucide-react';
import { addSupplierPurchase } from '../../crmApi.js';

const RATING_LABELS = {
  1: 'Poor — Quality issues or delayed',
  2: 'Fair — Acceptable but needed touchups',
  3: 'Good — Standard quality, met expectations',
  4: 'Very Good — High quality finish & on time',
  5: 'Excellent — Flawless finish & outstanding service',
};

export default function AddPurchaseModal({
  open,
  supplier,
  onClose,
  onPurchaseAdded,
}) {
  const [itemDescription, setItemDescription] = useState('');
  const [cost, setCost] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [qualityRating, setQualityRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [jobReference, setJobReference] = useState('');
  const [invoiceReference, setInvoiceReference] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (!open || !supplier) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!itemDescription.trim()) {
      setError('Please describe what was bought.');
      return;
    }
    const parsedCost = parseFloat(cost);
    if (!Number.isFinite(parsedCost) || parsedCost < 0) {
      setError('Please enter a valid purchase cost in AED.');
      return;
    }

    setBusy(true);
    setError('');

    try {
      const newPurchase = await addSupplierPurchase(supplier.id, {
        itemDescription: itemDescription.trim(),
        cost: parsedCost,
        currency: 'AED',
        purchaseDate,
        qualityRating: qualityRating || null,
        jobReference: jobReference.trim() || null,
        invoiceReference: invoiceReference.trim() || null,
        notes: notes.trim() || null,
      });

      // Reset
      setItemDescription('');
      setCost('');
      setNotes('');
      setJobReference('');
      setInvoiceReference('');
      setQualityRating(5);

      onPurchaseAdded?.(newPurchase);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to record purchase.');
    } finally {
      setBusy(false);
    }
  }

  const activeRating = hoverRating || qualityRating;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Record Buy History"
      subtitle={`Add purchase record for ${supplier.name}`}
      icon={ShoppingBag}
      accent="brand"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert tone="error">{error}</Alert>}

        <Field label="What was bought / Service description" required hint="e.g. 50x 18mm Commercial Plywood, Acrylic 3D Letters, Powder-coated frames">
          <textarea
            className="crm-input min-h-[72px]"
            placeholder="Describe the items, materials, or services purchased..."
            value={itemDescription}
            onChange={(e) => setItemDescription(e.target.value)}
            rows={2}
            required
            autoFocus
          />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Cost (AED)" required>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-neutral-400">
                AED
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                className="crm-input pl-12 font-medium tabular-nums"
                placeholder="0.00"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                required
              />
            </div>
          </Field>

          <Field label="Purchase Date" required>
            <input
              type="date"
              className="crm-input"
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
              required
            />
          </Field>
        </div>

        {/* Quality Rating with interactive stars */}
        <div className="rounded-xl border border-neutral-200/80 bg-neutral-50/60 p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-600">
              Quality Rating
            </span>
            <span className="text-xs font-medium text-amber-600">
              {activeRating ? `${activeRating} of 5 Stars` : 'Unrated'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 pt-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => setQualityRating(star)}
                className="p-1 text-neutral-300 transition-transform hover:scale-115 focus:outline-none"
                title={`${star} Star${star > 1 ? 's' : ''}`}
              >
                <Star
                  className={`h-6 w-6 transition-colors ${
                    star <= activeRating
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-neutral-300'
                  }`}
                  strokeWidth={1.75}
                />
              </button>
            ))}
          </div>

          {activeRating > 0 && (
            <p className="text-2xs font-medium text-neutral-500">
              {RATING_LABELS[activeRating]}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Job / Project Reference" hint="Optional, e.g. DWTC Gitex stand">
            <input
              type="text"
              className="crm-input"
              placeholder="e.g. Gitex 2026 - Stand 4B"
              value={jobReference}
              onChange={(e) => setJobReference(e.target.value)}
            />
          </Field>

          <Field label="Invoice / Receipt #" hint="Optional supplier invoice reference">
            <input
              type="text"
              className="crm-input"
              placeholder="e.g. INV-2026-904"
              value={invoiceReference}
              onChange={(e) => setInvoiceReference(e.target.value)}
            />
          </Field>
        </div>

        <Field label="Quality Notes / Feedback" hint="Delivery timing, material consistency, defects, or satisfaction">
          <textarea
            className="crm-input min-h-[64px]"
            placeholder="Add any notes about this order, material quality, or turnaround time..."
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
            {busy ? 'Saving Purchase…' : 'Record Purchase'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
