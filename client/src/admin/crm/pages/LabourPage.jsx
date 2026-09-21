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
  HardHat,
  Plus,
  Search,
  Phone,
  MessageCircle,
  Hammer,
  Paintbrush,
  Sparkles,
  Users,
  Edit2,
  Trash2,
  Coins,
  ShieldCheck,
} from 'lucide-react';
import { fetchLabour, deleteLabour, formatCurrency } from '../crmApi.js';
import AddLabourModal from '../components/labour/AddLabourModal.jsx';

function getTradeBadge(trade = '') {
  const lower = trade.toLowerCase();
  if (lower.includes('carpenter')) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800 border border-amber-200">
        <Hammer className="h-3.5 w-3.5 text-amber-600" />
        {trade}
      </span>
    );
  }
  if (lower.includes('painter')) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-lg bg-sky-50 px-2.5 py-1 text-xs font-bold text-sky-800 border border-sky-200">
        <Paintbrush className="h-3.5 w-3.5 text-sky-600" />
        {trade}
      </span>
    );
  }
  if (lower.includes('plasterer') || lower.includes('paster')) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-lg bg-purple-50 px-2.5 py-1 text-xs font-bold text-purple-800 border border-purple-200">
        <Sparkles className="h-3.5 w-3.5 text-purple-600" />
        {trade}
      </span>
    );
  }
  if (lower.includes('helper')) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800 border border-emerald-200">
        <Users className="h-3.5 w-3.5 text-emerald-600" />
        {trade}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-100 px-2.5 py-1 text-xs font-bold text-neutral-800 border border-neutral-200">
      <HardHat className="h-3.5 w-3.5 text-neutral-600" />
      {trade}
    </span>
  );
}

function getStatusBadge(status) {
  switch (status) {
    case 'available':
      return <Badge tone="info">Available</Badge>;
    case 'active':
      return <Badge tone="success">Active</Badge>;
    case 'busy':
      return <Badge tone="warning">Busy on Site</Badge>;
    case 'inactive':
    default:
      return <Badge tone="neutral">Inactive</Badge>;
  }
}

export default function LabourPage() {
  const [labourList, setLabourList] = useState([]);
  const [stats, setStats] = useState(null);
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [tradeFilter, setTradeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editingLabour, setEditingLabour] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchLabour({
        search: search.trim() || undefined,
        trade: tradeFilter !== 'all' ? tradeFilter : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        limit: 100,
      });
      setLabourList(data.items || []);
      setStats(data.stats || null);
      setTrades(data.trades || []);
    } catch (err) {
      setError(err.message || 'Failed to load outsource labour.');
    } finally {
      setLoading(false);
    }
  }, [search, tradeFilter, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 200);
    return () => clearTimeout(timer);
  }, [loadData]);

  async function handleDelete(labour) {
    const confirmed = window.confirm(`Remove ${labour.name} (${labour.trade}) from labour directory?`);
    if (!confirmed) return;

    try {
      await deleteLabour(labour.id);
      loadData();
    } catch (err) {
      alert(err.message || 'Failed to delete record.');
    }
  }

  function handleSaved() {
    loadData();
  }

  const QUICK_TRADE_TABS = [
    { id: 'all', label: 'All Trades', count: stats?.totalLabour },
    { id: 'Carpenter', label: 'Carpenters', count: stats?.carpenters },
    { id: 'Painter', label: 'Painters', count: stats?.painters },
    { id: 'Plasterer', label: 'Plasterers', count: stats?.plasterers },
    { id: 'Helper', label: 'Helpers', count: stats?.helpers },
  ];

  return (
    <PageShell>
      {/* Header */}
      <PageHeader
        title="Outsource Labour Directory"
        subtitle="Manage external craftsmen, technicians, and site helpers: carpenters, painters, plasterers, and general workers"
        action={
          <button
            type="button"
            onClick={() => {
              setEditingLabour(null);
              setAddModalOpen(true);
            }}
            className="crm-btn-primary flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Outsource Labour
          </button>
        }
      />

      {/* KPI Stats Band */}
      {stats && (
        <StatBand className="mt-5 grid grid-cols-2 lg:grid-cols-5 divide-y lg:divide-y-0 lg:divide-x divide-[var(--color-line)]">
          <StatBandItem
            label="Total Workers"
            value={stats.totalLabour}
            detail="Registered craftsmen"
            icon={HardHat}
            tone="brand"
          />
          <StatBandItem
            label="Carpenters"
            value={stats.carpenters}
            detail="Framing & joinery"
            icon={Hammer}
            tone="warning"
          />
          <StatBandItem
            label="Painters"
            value={stats.painters}
            detail="Duco & PU finishes"
            icon={Paintbrush}
            tone="info"
          />
          <StatBandItem
            label="Plasterers"
            value={stats.plasterers}
            detail="Gypsum & jointing"
            icon={Sparkles}
            tone="brand"
          />
          <StatBandItem
            label="Site Helpers"
            value={stats.helpers}
            detail="Assembly & logistics"
            icon={Users}
            tone="success"
          />
        </StatBand>
      )}

      {/* Trade Category Filter Tabs */}
      <div className="mt-6 flex flex-wrap items-center gap-1.5 border-b border-neutral-200 pb-3">
        {QUICK_TRADE_TABS.map((t) => {
          const active = tradeFilter.toLowerCase() === t.id.toLowerCase();
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTradeFilter(t.id)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
                active
                  ? 'bg-neutral-900 text-white shadow-xs'
                  : 'bg-white text-neutral-600 hover:bg-neutral-100 border border-neutral-200/80'
              }`}
            >
              <span>{t.label}</span>
              {t.count !== undefined && (
                <span
                  className={`rounded-full px-1.5 py-0.2 text-3xs font-bold tabular-nums ${
                    active ? 'bg-white/20 text-white' : 'bg-neutral-100 text-neutral-500'
                  }`}
                >
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Search & Status Toolbar */}
      <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-2 max-w-md relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            className="crm-input pl-9 text-xs"
            placeholder="Search by worker name, phone, trade, or notes..."
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

        <div className="flex items-center gap-2">
          <select
            className="crm-input text-xs py-1.5! pr-8!"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="available">Available Now</option>
            <option value="busy">Busy / On Site</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Main Labour Table */}
      <div className="mt-4 rounded-2xl border border-neutral-200/90 bg-white overflow-hidden shadow-xs">
        {loading && <LoadingState label="Loading outsource labour directory…" />}

        {error && !loading && (
          <div className="p-6">
            <Alert tone="error" onRetry={loadData}>
              {error}
            </Alert>
          </div>
        )}

        {!loading && !error && labourList.length === 0 && (
          <EmptyState
            icon={HardHat}
            title={search || tradeFilter !== 'all' ? 'No workers match your filters' : 'No outsource labour registered yet'}
            description="Register freelance plasterers, carpenters, painters, and site helpers for quick deployment on jobs."
            action={
              <button
                type="button"
                onClick={() => {
                  setEditingLabour(null);
                  setAddModalOpen(true);
                }}
                className="crm-btn-primary flex items-center gap-2 text-xs"
              >
                <Plus className="h-4 w-4" />
                Add First Worker
              </button>
            }
          />
        )}

        {!loading && !error && labourList.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50/70 text-2xs font-semibold uppercase tracking-wider text-neutral-500">
                  <th className="py-3 px-4">Worker Name</th>
                  <th className="py-3 px-4">Trade / What He Does</th>
                  <th className="py-3 px-4">Contact (Phone / WhatsApp)</th>
                  <th className="py-3 px-4">Daily Rate</th>
                  <th className="py-3 px-4">Hourly Rate</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4">Skills & Notes</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {labourList.map((worker) => {
                  const cleanPhone = worker.contact ? worker.contact.replace(/[^0-9+]/g, '') : '';
                  const waLink = cleanPhone ? `https://wa.me/${cleanPhone.replace(/^\+/, '')}` : null;

                  return (
                    <tr
                      key={worker.id}
                      className="hover:bg-neutral-50/80 transition group"
                    >
                      {/* Name & Initials */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white font-bold text-xs">
                            {worker.name
                              .split(' ')
                              .map((n) => n[0])
                              .slice(0, 2)
                              .join('')
                              .toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-neutral-900 text-sm">
                              {worker.name}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Trade / What he does */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {getTradeBadge(worker.trade)}
                      </td>

                      {/* Contact */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <a
                            href={`tel:${worker.contact}`}
                            className="inline-flex items-center gap-1 font-semibold text-neutral-800 hover:text-emerald-700 transition"
                          >
                            <Phone className="h-3 w-3 text-emerald-600" />
                            {worker.contact}
                          </a>
                          {waLink && (
                            <a
                              href={waLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center justify-center h-6 w-6 rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition"
                              title="Chat on WhatsApp"
                            >
                              <MessageCircle className="h-3.5 w-3.5" />
                            </a>
                          )}
                        </div>
                      </td>

                      {/* Daily Rate */}
                      <td className="py-3.5 px-4 whitespace-nowrap font-semibold text-neutral-900 tabular-nums">
                        {worker.dailyRate != null ? (
                          <span>AED {worker.dailyRate} <span className="text-3xs text-neutral-400 font-normal">/ day</span></span>
                        ) : (
                          <span className="text-neutral-400 text-2xs">—</span>
                        )}
                      </td>

                      {/* Hourly Rate */}
                      <td className="py-3.5 px-4 whitespace-nowrap font-medium text-neutral-600 tabular-nums">
                        {worker.hourlyRate != null ? (
                          <span>AED {worker.hourlyRate} <span className="text-3xs text-neutral-400 font-normal">/ hr</span></span>
                        ) : (
                          <span className="text-neutral-400 text-2xs">—</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {getStatusBadge(worker.status)}
                      </td>

                      {/* Notes / Skills */}
                      <td className="py-3.5 px-4 max-w-[280px]">
                        <p className="text-xs text-neutral-600 line-clamp-2">
                          {worker.notes || '—'}
                        </p>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingLabour(worker);
                              setAddModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-800 transition"
                            title="Edit Labour Details"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(worker)}
                            className="p-1.5 rounded-lg text-neutral-400 hover:bg-red-50 hover:text-red-600 transition"
                            title="Delete Record"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Labour Modal */}
      <AddLabourModal
        open={addModalOpen}
        initialLabour={editingLabour}
        onClose={() => {
          setAddModalOpen(false);
          setEditingLabour(null);
        }}
        onSaved={handleSaved}
      />
    </PageShell>
  );
}
