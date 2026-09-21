import { useState, useEffect, useCallback } from 'react';
import Drawer from '../ui/Drawer.jsx';
import DrawerLoadingSkeleton from '../ui/DrawerLoadingSkeleton.jsx';
import { Badge, Alert, EmptyState, cn } from '../ui/primitives.jsx';
import {
  Truck,
  Phone,
  Mail,
  MapPin,
  User,
  Plus,
  Trash2,
  Edit2,
  Calendar,
  Star,
  ExternalLink,
  MessageCircle,
  Receipt,
  Briefcase,
  ShoppingBag,
} from 'lucide-react';
import {
  fetchSupplierDetails,
  deleteSupplier,
  deleteSupplierPurchase,
  formatCurrency,
} from '../../crmApi.js';
import AddPurchaseModal from './AddPurchaseModal.jsx';
import AddSupplierModal from './AddSupplierModal.jsx';

function renderStars(rating) {
  if (!rating) {
    return <span className="text-2xs text-neutral-400 italic">Unrated</span>;
  }
  return (
    <div className="flex items-center gap-1" title={`${rating} out of 5 stars`}>
      <div className="flex items-center text-amber-400">
        {[1, 2, 3, 4, 5].map((s) => (
          <Star
            key={s}
            className={`h-3.5 w-3.5 ${
              s <= Math.round(rating)
                ? 'fill-amber-400 text-amber-400'
                : 'text-neutral-300'
            }`}
          />
        ))}
      </div>
      <span className="text-xs font-semibold text-amber-700 ml-1 tabular-nums">
        {rating}
      </span>
    </div>
  );
}

export default function SupplierDetailsDrawer({
  supplierId,
  open,
  onClose,
  onSupplierUpdated,
  onSupplierDeleted,
}) {
  const [supplier, setSupplier] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deletingPurchaseId, setDeletingPurchaseId] = useState(null);

  const loadData = useCallback(async () => {
    if (!supplierId) return;
    setLoading(true);
    setError('');
    try {
      const data = await fetchSupplierDetails(supplierId);
      setSupplier(data);
    } catch (err) {
      setError(err.message || 'Failed to load supplier details.');
    } finally {
      setLoading(false);
    }
  }, [supplierId]);

  useEffect(() => {
    if (open && supplierId) {
      loadData();
    }
  }, [open, supplierId, loadData]);

  async function handleDeleteSupplier() {
    if (!supplier) return;
    const confirmed = window.confirm(
      `Are you sure you want to remove supplier "${supplier.name}"?`
    );
    if (!confirmed) return;

    try {
      await deleteSupplier(supplier.id);
      onSupplierDeleted?.(supplier.id);
      onClose();
    } catch (err) {
      alert(err.message || 'Failed to delete supplier.');
    }
  }

  async function handleDeletePurchase(purchaseId) {
    const confirmed = window.confirm(
      'Are you sure you want to remove this purchase record?'
    );
    if (!confirmed) return;

    setDeletingPurchaseId(purchaseId);
    try {
      await deleteSupplierPurchase(supplier.id, purchaseId);
      await loadData();
      onSupplierUpdated?.();
    } catch (err) {
      alert(err.message || 'Failed to delete purchase record.');
    } finally {
      setDeletingPurchaseId(null);
    }
  }

  function handlePurchaseAdded() {
    loadData();
    onSupplierUpdated?.();
  }

  function handleSupplierSaved(updated) {
    setSupplier((prev) => ({ ...prev, ...updated }));
    onSupplierUpdated?.();
  }

  const cleanPhone = supplier?.phone ? supplier.phone.replace(/[^0-9+]/g, '') : '';
  const waLink = cleanPhone ? `https://wa.me/${cleanPhone.replace(/^\+/, '')}` : null;

  return (
    <>
      <Drawer
        open={open}
        onClose={onClose}
        size="lg"
        title={supplier?.name || 'Supplier Workspace'}
        subtitle="Supplier profile, contact info, and purchase history"
        badge={
          supplier && (
            <Badge tone={supplier.status === 'active' ? 'success' : 'neutral'}>
              {supplier.status === 'active' ? 'Active Vendor' : 'Inactive'}
            </Badge>
          )
        }
        headerActions={
          supplier && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setEditModalOpen(true)}
                className="flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 shadow-xs"
                title="Edit Supplier Profile"
              >
                <Edit2 className="h-3.5 w-3.5 text-neutral-500" />
                Edit
              </button>
              <button
                type="button"
                onClick={handleDeleteSupplier}
                className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 shadow-xs"
                title="Delete Supplier"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          )
        }
      >
        {loading && <DrawerLoadingSkeleton />}

        {error && !loading && (
          <Alert tone="error" onRetry={loadData}>
            {error}
          </Alert>
        )}

        {!loading && supplier && (
          <div className="space-y-6 pb-6">
            {/* Top Quick Profile & Summary Band */}
            <div className="rounded-2xl border border-neutral-200/90 bg-white p-5 shadow-xs">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-xl font-bold tracking-tight text-neutral-900">
                    {supplier.name}
                  </h3>
                  {supplier.contactPerson && (
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs text-neutral-500 font-medium">
                      <User className="h-3.5 w-3.5 text-neutral-400" />
                      Contact: {supplier.contactPerson}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {supplier.phone && (
                    <a
                      href={`tel:${supplier.phone}`}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900 transition"
                    >
                      <Phone className="h-3.5 w-3.5 text-emerald-600" />
                      {supplier.phone}
                    </a>
                  )}
                  {waLink && (
                    <a
                      href={waLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition"
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                      WhatsApp
                    </a>
                  )}
                  {supplier.email && (
                    <a
                      href={`mailto:${supplier.email}`}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700 hover:bg-sky-100 transition"
                    >
                      <Mail className="h-3.5 w-3.5" />
                      Email
                    </a>
                  )}
                </div>
              </div>

              {/* Service & Location info */}
              <div className="mt-4 pt-4 border-t border-neutral-100 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span className="text-2xs font-semibold uppercase tracking-wider text-neutral-400">
                    Services / Materials Supplied
                  </span>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {supplier.service ? (
                      supplier.service.split(',').map((tag, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center rounded-lg bg-neutral-100 px-2.5 py-1 text-2xs font-semibold text-neutral-700"
                        >
                          {tag.trim()}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-neutral-400 italic">No services specified</span>
                    )}
                  </div>
                </div>

                <div>
                  <span className="text-2xs font-semibold uppercase tracking-wider text-neutral-400">
                    Address / Workshop Location
                  </span>
                  <p className="mt-1 flex items-start gap-1.5 text-xs text-neutral-600">
                    <MapPin className="h-3.5 w-3.5 text-neutral-400 shrink-0 mt-0.5" />
                    <span>{supplier.address || 'No location address recorded'}</span>
                  </p>
                </div>
              </div>

              {supplier.notes && (
                <div className="mt-3.5 pt-3 border-t border-neutral-100">
                  <span className="text-2xs font-semibold uppercase tracking-wider text-neutral-400">
                    Notes & Terms
                  </span>
                  <p className="mt-1 text-xs text-neutral-600 leading-relaxed bg-neutral-50/70 p-2.5 rounded-xl">
                    {supplier.notes}
                  </p>
                </div>
              )}
            </div>

            {/* Metrics Band */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-neutral-200/90 bg-white p-3.5">
                <p className="text-2xs font-semibold uppercase tracking-wider text-neutral-400">
                  Total Spend
                </p>
                <p className="mt-1 text-base font-bold text-neutral-900 tabular-nums">
                  {formatCurrency(supplier.totalSpent || 0)}
                </p>
              </div>

              <div className="rounded-xl border border-neutral-200/90 bg-white p-3.5">
                <p className="text-2xs font-semibold uppercase tracking-wider text-neutral-400">
                  Orders / Buys
                </p>
                <p className="mt-1 text-base font-bold text-neutral-900 tabular-nums">
                  {supplier.totalPurchases || 0}
                </p>
              </div>

              <div className="rounded-xl border border-neutral-200/90 bg-white p-3.5">
                <p className="text-2xs font-semibold uppercase tracking-wider text-neutral-400">
                  Quality Score
                </p>
                <div className="mt-1">
                  {renderStars(supplier.avgRating)}
                </div>
              </div>
            </div>

            {/* Buy History Section */}
            <div className="rounded-2xl border border-neutral-200/90 bg-white overflow-hidden shadow-xs">
              <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200 bg-neutral-50/40">
                <div className="flex items-center gap-2.5">
                  <ShoppingBag className="h-4 w-4 text-brand" />
                  <div>
                    <h4 className="text-sm font-bold text-neutral-900">
                      Buy History
                    </h4>
                    <p className="text-2xs text-neutral-500">
                      Purchased items, materials, costs, and quality ratings
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setPurchaseModalOpen(true)}
                  className="crm-btn-primary flex items-center gap-1.5 text-xs py-1.5! px-3!"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Record Purchase
                </button>
              </div>

              {(!supplier.purchases || supplier.purchases.length === 0) ? (
                <EmptyState
                  icon={ShoppingBag}
                  title="No purchases recorded yet"
                  description="Keep track of every material purchase, invoice cost, and quality rating for this vendor."
                  action={
                    <button
                      type="button"
                      onClick={() => setPurchaseModalOpen(true)}
                      className="crm-btn-primary text-xs py-1.5! px-3!"
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Record First Purchase
                    </button>
                  }
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-neutral-200 bg-neutral-50/60 text-2xs font-semibold uppercase tracking-wider text-neutral-500">
                        <th className="py-2.5 px-4">Date</th>
                        <th className="py-2.5 px-4">What Was Bought</th>
                        <th className="py-2.5 px-4">Cost</th>
                        <th className="py-2.5 px-4">Quality Rating</th>
                        <th className="py-2.5 px-4">Reference</th>
                        <th className="py-2.5 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {supplier.purchases.map((purchase) => (
                        <tr
                          key={purchase.id}
                          className="hover:bg-neutral-50/80 transition group"
                        >
                          <td className="py-3 px-4 whitespace-nowrap font-medium text-neutral-600 tabular-nums">
                            {purchase.purchaseDate
                              ? new Date(purchase.purchaseDate).toLocaleDateString('en-GB', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                })
                              : '—'}
                          </td>

                          <td className="py-3 px-4 max-w-[280px]">
                            <p className="font-semibold text-neutral-900 leading-snug">
                              {purchase.itemDescription}
                            </p>
                            {purchase.notes && (
                              <p className="mt-0.5 text-2xs text-neutral-500 italic line-clamp-2">
                                "{purchase.notes}"
                              </p>
                            )}
                          </td>

                          <td className="py-3 px-4 whitespace-nowrap font-bold text-neutral-900 tabular-nums">
                            {formatCurrency(purchase.cost)}
                          </td>

                          <td className="py-3 px-4 whitespace-nowrap">
                            {renderStars(purchase.qualityRating)}
                          </td>

                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="flex flex-col gap-0.5">
                              {purchase.jobReference && (
                                <span className="inline-flex items-center gap-1 text-2xs font-medium text-neutral-700">
                                  <Briefcase className="h-3 w-3 text-neutral-400" />
                                  {purchase.jobReference}
                                </span>
                              )}
                              {purchase.invoiceReference && (
                                <span className="inline-flex items-center gap-1 text-2xs font-mono text-neutral-500">
                                  <Receipt className="h-3 w-3 text-neutral-400" />
                                  {purchase.invoiceReference}
                                </span>
                              )}
                              {!purchase.jobReference && !purchase.invoiceReference && (
                                <span className="text-neutral-400 text-2xs">—</span>
                              )}
                            </div>
                          </td>

                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => handleDeletePurchase(purchase.id)}
                              disabled={deletingPurchaseId === purchase.id}
                              className="text-neutral-400 hover:text-red-600 transition p-1"
                              title="Delete Purchase"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </Drawer>

      {/* Add Purchase Modal */}
      {supplier && (
        <AddPurchaseModal
          open={purchaseModalOpen}
          supplier={supplier}
          onClose={() => setPurchaseModalOpen(false)}
          onPurchaseAdded={handlePurchaseAdded}
        />
      )}

      {/* Edit Supplier Modal */}
      {supplier && (
        <AddSupplierModal
          open={editModalOpen}
          initialSupplier={supplier}
          onClose={() => setEditModalOpen(false)}
          onSaved={handleSupplierSaved}
        />
      )}
    </>
  );
}
