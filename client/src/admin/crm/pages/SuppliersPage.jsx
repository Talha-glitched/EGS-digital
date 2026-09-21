import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  PageShell,
  PageHeader,
  StatBand,
  StatBandItem,
  Badge,
  EmptyState,
  LoadingState,
  Alert,
} from '../components/ui/primitives.jsx';
import {
  Truck,
  Plus,
  Search,
  Star,
  Phone,
  Mail,
  ExternalLink,
  ChevronRight,
  Filter,
  ShoppingBag,
  Coins,
  Building2,
  Trash2,
} from 'lucide-react';
import { fetchSuppliers, formatCurrency } from '../crmApi.js';
import SupplierDetailsDrawer from '../components/suppliers/SupplierDetailsDrawer.jsx';
import AddSupplierModal from '../components/suppliers/AddSupplierModal.jsx';

function renderRatingBadge(rating) {
  if (!rating || rating === 0) {
    return <span className="text-2xs text-neutral-400 italic">No ratings yet</span>;
  }
  return (
    <div className="inline-flex items-center gap-1">
      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400 shrink-0" />
      <span className="text-xs font-bold text-neutral-800 tabular-nums">{rating}</span>
      <span className="text-2xs text-neutral-400">/ 5</span>
    </div>
  );
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [stats, setStats] = useState(null);
  const [services, setServices] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [serviceFilter, setServiceFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('active');

  // Modals & Drawers
  const [selectedSupplierId, setSelectedSupplierId] = useState(null);
  const [addModalOpen, setAddModalOpen] = useState(false);

  const loadSuppliers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchSuppliers({
        search: search.trim() || undefined,
        service: serviceFilter !== 'all' ? serviceFilter : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        limit: 100,
      });
      setSuppliers(data.items || []);
      setStats(data.stats || null);
      setServices(data.services || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err.message || 'Failed to load suppliers.');
    } finally {
      setLoading(false);
    }
  }, [search, serviceFilter, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadSuppliers();
    }, 200);
    return () => clearTimeout(timer);
  }, [loadSuppliers]);

  function handleSupplierSaved() {
    loadSuppliers();
  }

  function handleSupplierDeleted(id) {
    setSuppliers((prev) => prev.filter((s) => s.id !== id));
    if (selectedSupplierId === id) {
      setSelectedSupplierId(null);
    }
    loadSuppliers();
  }

  return (
    <PageShell>
      {/* Header */}
      <PageHeader
        title="Suppliers & Vendors"
        subtitle="Manage materials vendors, fabrication workshops, and track buy history with quality ratings"
        action={
          <button
            type="button"
            onClick={() => setAddModalOpen(true)}
            className="crm-btn-primary flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Supplier
          </button>
        }
      />

      {/* KPI Stats Band */}
      {stats && (
        <StatBand className="mt-5 grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-[var(--color-line)]">
          <StatBandItem
            label="Total Suppliers"
            value={stats.totalSuppliers}
            detail="Registered vendors"
            icon={Truck}
            tone="brand"
          />
          <StatBandItem
            label="Purchases Recorded"
            value={stats.totalPurchases}
            detail="Cumulative orders"
            icon={ShoppingBag}
            tone="info"
          />
          <StatBandItem
            label="Procurement Spend"
            value={formatCurrency(stats.totalSpend)}
            detail="Total buy volume"
            icon={Coins}
            tone="success"
          />
          <StatBandItem
            label="Avg Quality Rating"
            value={stats.overallAvgRating ? `${stats.overallAvgRating} / 5` : '—'}
            detail="Across all reviewed orders"
            icon={Star}
            tone="warning"
          />
        </StatBand>
      )}

      {/* Filters Toolbar */}
      <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-2 max-w-md relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            className="crm-input pl-9 text-xs"
            placeholder="Search suppliers by name, contact, service, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 text-xs"
            >
              Clear
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Service filter */}
          {services.length > 0 && (
            <select
              className="crm-input text-xs py-1.5! pr-8!"
              value={serviceFilter}
              onChange={(e) => setServiceFilter(e.target.value)}
            >
              <option value="all">All Services ({services.length})</option>
              {services.map((svc) => (
                <option key={svc} value={svc}>
                  {svc}
                </option>
              ))}
            </select>
          )}

          {/* Status filter */}
          <select
            className="crm-input text-xs py-1.5! pr-8!"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="active">Active Vendors</option>
            <option value="inactive">Inactive</option>
            <option value="all">All Statuses</option>
          </select>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="mt-4 rounded-2xl border border-neutral-200/90 bg-white overflow-hidden shadow-xs">
        {loading && <LoadingState label="Loading suppliers directory…" />}

        {error && !loading && (
          <div className="p-6">
            <Alert tone="error" onRetry={loadSuppliers}>
              {error}
            </Alert>
          </div>
        )}

        {!loading && !error && suppliers.length === 0 && (
          <EmptyState
            icon={Truck}
            title={search || serviceFilter !== 'all' ? 'No suppliers match your filters' : 'No suppliers added yet'}
            description="Add material vendors and fabrication partners to keep track of purchase history and quality ratings."
            action={
              <button
                type="button"
                onClick={() => setAddModalOpen(true)}
                className="crm-btn-primary flex items-center gap-2 text-xs"
              >
                <Plus className="h-4 w-4" />
                Add First Supplier
              </button>
            }
          />
        )}

        {!loading && !error && suppliers.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50/70 text-2xs font-semibold uppercase tracking-wider text-neutral-500">
                  <th className="py-3 px-4">Supplier Name</th>
                  <th className="py-3 px-4">Contact Info</th>
                  <th className="py-3 px-4">Services / Category</th>
                  <th className="py-3 px-4 text-center">Orders</th>
                  <th className="py-3 px-4 text-right">Total Spend</th>
                  <th className="py-3 px-4">Quality Rating</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {suppliers.map((supplier) => (
                  <tr
                    key={supplier.id}
                    onClick={() => setSelectedSupplierId(supplier.id)}
                    className="hover:bg-brand-soft/20 cursor-pointer transition group"
                  >
                    {/* Supplier Name & Person */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-neutral-700 font-bold text-xs group-hover:bg-brand group-hover:text-white transition">
                          <Truck className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-bold text-neutral-900 group-hover:text-brand transition text-sm">
                            {supplier.name}
                          </p>
                          {supplier.contactPerson && (
                            <p className="text-2xs text-neutral-500 font-medium">
                              {supplier.contactPerson}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Contact (Phone & Email) */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        {supplier.phone ? (
                          <span
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1.5 font-medium text-neutral-700 hover:text-emerald-700"
                          >
                            <Phone className="h-3 w-3 text-emerald-600" />
                            <a href={`tel:${supplier.phone}`}>{supplier.phone}</a>
                          </span>
                        ) : (
                          <span className="text-neutral-400 text-2xs">—</span>
                        )}
                        {supplier.email && (
                          <span
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1.5 text-2xs text-neutral-500 hover:text-sky-700"
                          >
                            <Mail className="h-3 w-3 text-sky-500" />
                            <a href={`mailto:${supplier.email}`}>{supplier.email}</a>
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Services */}
                    <td className="py-3.5 px-4 max-w-[220px]">
                      {supplier.service ? (
                        <div className="flex flex-wrap gap-1">
                          {supplier.service.split(',').slice(0, 3).map((tag, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center rounded-md bg-neutral-100 px-2 py-0.5 text-2xs font-medium text-neutral-700 truncate max-w-[150px]"
                            >
                              {tag.trim()}
                            </span>
                          ))}
                          {supplier.service.split(',').length > 3 && (
                            <span className="text-2xs text-neutral-400 font-medium self-center">
                              +{supplier.service.split(',').length - 3}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-neutral-400 italic text-2xs">Not specified</span>
                      )}
                    </td>

                    {/* Orders count */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap font-semibold text-neutral-700 tabular-nums">
                      {supplier.totalPurchases || 0}
                    </td>

                    {/* Total Spend */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap font-bold text-neutral-900 tabular-nums">
                      {formatCurrency(supplier.totalSpent || 0)}
                    </td>

                    {/* Quality Rating */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {renderRatingBadge(supplier.avgRating)}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <Badge tone={supplier.status === 'active' ? 'success' : 'neutral'}>
                        {supplier.status === 'active' ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>

                    {/* View Arrow */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end text-neutral-400 group-hover:text-brand transition">
                        <span className="text-2xs font-semibold mr-1 opacity-0 group-hover:opacity-100 transition">
                          View History
                        </span>
                        <ChevronRight className="h-4 w-4" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Supplier Details Drawer */}
      <SupplierDetailsDrawer
        open={Boolean(selectedSupplierId)}
        supplierId={selectedSupplierId}
        onClose={() => setSelectedSupplierId(null)}
        onSupplierUpdated={handleSupplierSaved}
        onSupplierDeleted={handleSupplierDeleted}
      />

      {/* Add Supplier Modal */}
      <AddSupplierModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSaved={handleSupplierSaved}
      />
    </PageShell>
  );
}
