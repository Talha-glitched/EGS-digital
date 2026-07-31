import { useEffect, useState, useCallback } from 'react';
import {
  Search, Plus, Filter, Edit3, Trash2, X, ChevronLeft, ChevronRight,
  Briefcase, DollarSign, CheckCircle2, AlertCircle, Calendar, Layers,
  XCircle
} from 'lucide-react';
import { crmApiFetch } from '../crmApi.js';
import { cn } from '../components/ui/primitives.jsx';

const STATUS_STYLES = {
  'Job Done': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Job Lost': 'bg-rose-50 text-rose-700 border-rose-200',
  'Inquiry': 'bg-sky-50 text-sky-700 border-sky-200',
  'In Production': 'bg-amber-50 text-amber-800 border-amber-200',
  'Design': 'bg-purple-50 text-purple-700 border-purple-200',
  'Waiting Balance Payment': 'bg-orange-50 text-orange-800 border-orange-200',
  'Quotation Sent': 'bg-indigo-50 text-indigo-700 border-indigo-200',
  'Waiting Adv/ PO': 'bg-yellow-50 text-yellow-800 border-yellow-200',
  'Ready': 'bg-teal-50 text-teal-700 border-teal-200',
  'Installation': 'bg-cyan-50 text-cyan-700 border-cyan-200',
};

function formatCurrency(val) {
  const num = Number(val) || 0;
  return new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED', maximumFractionDigits: 2 }).format(num);
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return '—';
  }
}

export default function CompletedJobsPage() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [categories, setCategories] = useState({ typesOfJob: [], statuses: [], salesPersons: [], responsiblePersons: [], years: [] });
  const [metrics, setMetrics] = useState({ totalJobs: 0, totalAmount: 0, totalReceived: 0, totalBalance: 0 });
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, limit: 50, total: 0 });

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [salesPersonFilter, setSalesPersonFilter] = useState('All');
  const [responsibleFilter, setResponsibleFilter] = useState('All');
  const [yearFilter, setYearFilter] = useState('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [formData, setFormData] = useState({
    jobNo: '',
    date: new Date().toISOString().split('T')[0],
    salesPerson: '',
    company: '',
    contactPerson: '',
    contactNumber: '',
    email: '',
    typeOfJob: 'Large Format Printing',
    description: '',
    currentStatus: 'Job Done',
    responsiblePerson: '',
    dueDate: '',
    amount: 0,
    received: 0,
    balance: 0,
    jobReview: '',
  });
  const [saving, setSaving] = useState(false);

  const fetchJobs = useCallback(async (page = 1) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        page,
        limit: 50,
        ...(search ? { search } : {}),
        ...(statusFilter !== 'All' ? { currentStatus: statusFilter } : {}),
        ...(typeFilter !== 'All' ? { typeOfJob: typeFilter } : {}),
        ...(salesPersonFilter !== 'All' ? { salesPerson: salesPersonFilter } : {}),
        ...(responsibleFilter !== 'All' ? { responsiblePerson: responsibleFilter } : {}),
        ...(yearFilter !== 'All' ? { year: yearFilter } : {}),
        ...(startDate ? { startDate } : {}),
        ...(endDate ? { endDate } : {}),
      });

      const res = await crmApiFetch(`/api/admin/sales/completed-jobs?${params.toString()}`);
      setJobs(res.items || []);
      setCategories(res.categories || { typesOfJob: [], statuses: [], salesPersons: [], responsiblePersons: [], years: [] });
      setMetrics(res.metrics || { totalJobs: 0, totalAmount: 0, totalReceived: 0, totalBalance: 0 });
      setPagination({
        page: res.page || 1,
        totalPages: res.totalPages || 1,
        limit: res.limit || 50,
        total: res.total || 0,
      });
    } catch (err) {
      setError(err.message || 'Failed to load completed jobs.');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, typeFilter, salesPersonFilter, responsibleFilter, yearFilter, startDate, endDate]);

  useEffect(() => {
    fetchJobs(1);
  }, [fetchJobs]);

  function handleResetFilters() {
    setSearch('');
    setStatusFilter('All');
    setTypeFilter('All');
    setSalesPersonFilter('All');
    setResponsibleFilter('All');
    setYearFilter('All');
    setStartDate('');
    setEndDate('');
  }

  function handleOpenCreate() {
    setEditingJob(null);
    const defaultSales = categories.salesPersons?.[0] || 'Shahzad';
    const defaultType = categories.typesOfJob?.[0] || 'Large Format Printing';
    const defaultResp = categories.responsiblePersons?.[0] || 'Shahzad';
    setFormData({
      jobNo: '',
      date: new Date().toISOString().split('T')[0],
      salesPerson: defaultSales,
      customSalesPerson: '',
      company: '',
      contactPerson: '',
      contactNumber: '',
      email: '',
      typeOfJob: defaultType,
      customTypeOfJob: '',
      description: '',
      currentStatus: 'Job Done',
      customCurrentStatus: '',
      responsiblePerson: defaultResp,
      customResponsiblePerson: '',
      dueDate: '',
      amount: 0,
      received: 0,
      balance: 0,
      jobReview: '',
    });
    setModalOpen(true);
  }

  function handleOpenEdit(job) {
    setEditingJob(job);
    const knownTypes = categories.typesOfJob || [];
    const knownStatuses = categories.statuses || [];
    const knownSales = categories.salesPersons || [];
    const knownResp = categories.responsiblePersons || [];

    const isTypeKnown = knownTypes.includes(job.typeOfJob);
    const isStatusKnown = knownStatuses.includes(job.currentStatus);
    const isSalesKnown = !job.salesPerson || knownSales.includes(job.salesPerson);
    const isRespKnown = !job.responsiblePerson || knownResp.includes(job.responsiblePerson);

    setFormData({
      jobNo: job.jobNo || '',
      date: job.date ? new Date(job.date).toISOString().split('T')[0] : '',
      salesPerson: isSalesKnown ? (job.salesPerson || '') : 'Other',
      customSalesPerson: isSalesKnown ? '' : (job.salesPerson || ''),
      company: job.company || '',
      contactPerson: job.contactPerson || '',
      contactNumber: job.contactNumber || '',
      email: job.email || '',
      typeOfJob: isTypeKnown ? job.typeOfJob : (job.typeOfJob ? 'Other' : 'Large Format Printing'),
      customTypeOfJob: isTypeKnown ? '' : (job.typeOfJob || ''),
      description: job.description || '',
      currentStatus: isStatusKnown ? job.currentStatus : (job.currentStatus ? 'Other' : 'Job Done'),
      customCurrentStatus: isStatusKnown ? '' : (job.currentStatus || ''),
      responsiblePerson: isRespKnown ? (job.responsiblePerson || '') : 'Other',
      customResponsiblePerson: isRespKnown ? '' : (job.responsiblePerson || ''),
      dueDate: job.dueDate ? new Date(job.dueDate).toISOString().split('T')[0] : '',
      amount: job.amount || 0,
      received: job.received || 0,
      balance: job.balance || 0,
      jobReview: job.jobReview || '',
    });
    setModalOpen(true);
  }

  async function handleSaveJob(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const payloadToSave = {
        ...formData,
        salesPerson: formData.salesPerson === 'Other' ? (formData.customSalesPerson.trim() || 'Other') : formData.salesPerson,
        typeOfJob: formData.typeOfJob === 'Other' ? (formData.customTypeOfJob.trim() || 'Other') : formData.typeOfJob,
        currentStatus: formData.currentStatus === 'Other' ? (formData.customCurrentStatus.trim() || 'Other') : formData.currentStatus,
        responsiblePerson: formData.responsiblePerson === 'Other' ? (formData.customResponsiblePerson.trim() || 'Other') : formData.responsiblePerson,
      };

      if (editingJob) {
        await crmApiFetch(`/api/admin/sales/completed-jobs/${editingJob._id}`, {
          method: 'PATCH',
          body: JSON.stringify(payloadToSave),
        });
      } else {
        await crmApiFetch('/api/admin/sales/completed-jobs', {
          method: 'POST',
          body: JSON.stringify(payloadToSave),
        });
      }
      setModalOpen(false);
      fetchJobs(pagination.page);
    } catch (err) {
      alert(err.message || 'Failed to save completed job');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteJob(id) {
    if (!window.confirm('Are you sure you want to delete this completed job record?')) return;
    try {
      await crmApiFetch(`/api/admin/sales/completed-jobs/${id}`, { method: 'DELETE' });
      fetchJobs(pagination.page);
    } catch (err) {
      alert(err.message || 'Failed to delete completed job');
    }
  }

  function handleAmountReceivedChange(field, val) {
    const num = Number(val) || 0;
    setFormData((prev) => {
      const updated = { ...prev, [field]: num };
      const amt = field === 'amount' ? num : prev.amount;
      const rec = field === 'received' ? num : prev.received;
      updated.balance = Math.max(0, amt - rec);
      return updated;
    });
  }

  const hasActiveFilters = search || statusFilter !== 'All' || typeFilter !== 'All' || salesPersonFilter !== 'All' || responsibleFilter !== 'All' || yearFilter !== 'All' || startDate || endDate;

  return (
    <div className="crm-page-shell space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[var(--color-line)]">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[var(--color-ink)] flex items-center gap-2">
            <Briefcase className="h-5.5 w-5.5 text-brand shrink-0" /> Jobs Done
          </h1>
          <p className="text-xs text-[var(--color-ink-muted)] mt-0.5">
            Completed production jobs repository. Automatically populated when an Ongoing Job reaches Job Done stage.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleOpenCreate}
            className="crm-btn-primary"
          >
            <Plus className="h-4 w-4" /> Add Completed Job
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="crm-metric-grid cols-4">
        <div className="crm-card p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-[var(--color-ink-muted)]">Total Jobs Done</p>
            <p className="text-2xl font-extrabold text-[var(--color-ink)] mt-1">{metrics.totalJobs}</p>
          </div>
          <div className="h-10 w-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700">
            <Layers className="h-5 w-5" />
          </div>
        </div>

        <div className="crm-card p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-[var(--color-ink-muted)]">Total Value (AED)</p>
            <p className="text-2xl font-extrabold text-[var(--color-ink)] mt-1">{formatCurrency(metrics.totalAmount)}</p>
          </div>
          <div className="h-10 w-10 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
            <DollarSign className="h-5 w-5" />
          </div>
        </div>

        <div className="crm-card p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-[var(--color-ink-muted)]">Total Received</p>
            <p className="text-2xl font-extrabold text-emerald-700 mt-1">{formatCurrency(metrics.totalReceived)}</p>
          </div>
          <div className="h-10 w-10 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </div>

        <div className="crm-card p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-[var(--color-ink-muted)]">Outstanding Balance</p>
            <p className="text-2xl font-extrabold text-rose-600 mt-1">{formatCurrency(metrics.totalBalance)}</p>
          </div>
          <div className="h-10 w-10 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
            <AlertCircle className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Filter Panel */}
      <div className="crm-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-[var(--color-ink)] flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-[var(--color-ink-muted)]" /> Filters & Search
          </span>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-xs text-brand hover:underline font-medium flex items-center gap-1"
            >
              <XCircle className="h-3.5 w-3.5" /> Clear All Filters
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2.5">
          {/* Search */}
          <div className="relative sm:col-span-2 md:col-span-2">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search Job #, company, desc..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="crm-input pl-8"
            />
          </div>

          {/* Year Filter */}
          <div>
            <select
              value={yearFilter}
              onChange={(e) => {
                setYearFilter(e.target.value);
                setStartDate('');
                setEndDate('');
              }}
              className="crm-select"
            >
              <option value="All">All Years</option>
              {(categories.years || []).map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="crm-select"
            >
              <option value="All">All Statuses</option>
              {(categories.statuses || []).map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Type Filter */}
          <div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="crm-select"
            >
              <option value="All">All Job Types</option>
              {(categories.typesOfJob || []).map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Sales Person Filter */}
          <div>
            <select
              value={salesPersonFilter}
              onChange={(e) => setSalesPersonFilter(e.target.value)}
              className="crm-select"
            >
              <option value="All">All Sales Persons</option>
              {(categories.salesPersons || []).map((sp) => (
                <option key={sp} value={sp}>{sp}</option>
              ))}
            </select>
          </div>

          {/* Responsible Person Filter */}
          <div>
            <select
              value={responsibleFilter}
              onChange={(e) => setResponsibleFilter(e.target.value)}
              className="crm-select"
            >
              <option value="All">All Responsible</option>
              {(categories.responsiblePersons || []).map((rp) => (
                <option key={rp} value={rp}>{rp}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Date Range Sub-row */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 text-xs">
          <span className="text-[var(--color-ink-muted)] font-medium flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5 text-slate-400" /> Custom Date Range:
          </span>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setYearFilter('All');
              }}
              className="crm-input !py-1 text-xs"
              placeholder="From Date"
            />
            <span className="text-slate-400">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setYearFilter('All');
              }}
              className="crm-input !py-1 text-xs"
              placeholder="To Date"
            />
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="crm-card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 text-xs flex items-center justify-center gap-2">
            <div className="h-4 w-4 rounded-full border-2 border-brand border-t-transparent animate-spin" />
            Loading Jobs Done repository...
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-600 text-xs font-medium">{error}</div>
        ) : jobs.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">No completed job records found matching filters.</div>
        ) : (
          <div className="crm-table-scroll">
            <table className="crm-table">
              <thead>
                <tr>
                  <th className="w-16">Job #</th>
                  <th className="w-28">Date</th>
                  <th className="min-w-[180px]">Company & Contact</th>
                  <th className="w-28">Sales Person</th>
                  <th className="w-36">Job Type</th>
                  <th className="min-w-[200px]">Description</th>
                  <th className="w-32">Status</th>
                  <th className="w-28">Responsible</th>
                  <th className="w-24 text-right">Amount</th>
                  <th className="w-24 text-right">Received</th>
                  <th className="w-24 text-right">Balance</th>
                  <th className="min-w-[150px]">Review / Notes</th>
                  <th className="w-16 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-line)]">
                {jobs.map((job) => {
                  const statusStyle = STATUS_STYLES[job.currentStatus] || 'bg-slate-100 text-slate-700 border-slate-200';
                  return (
                    <tr key={job._id} className="crm-table-row">
                      <td className="font-bold text-brand">#{job.jobNo || '—'}</td>
                      <td className="text-slate-600 whitespace-nowrap">{formatDate(job.date)}</td>
                      <td>
                        <div className="font-semibold text-[var(--color-ink)]">{job.company || '—'}</div>
                        {job.contactPerson && (
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {job.contactPerson} {job.contactNumber ? `(${job.contactNumber})` : ''}
                          </div>
                        )}
                      </td>
                      <td className="font-medium text-slate-700">{job.salesPerson || '—'}</td>
                      <td>
                        <span className="inline-block rounded px-2 py-0.5 text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                          {job.typeOfJob || 'General'}
                        </span>
                      </td>
                      <td className="max-w-[240px] truncate text-slate-700" title={job.description}>
                        {job.description || '—'}
                      </td>
                      <td className="whitespace-nowrap">
                        <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold border', statusStyle)}>
                          {job.currentStatus || 'Job Done'}
                        </span>
                      </td>
                      <td className="text-slate-600">{job.responsiblePerson || '—'}</td>
                      <td className="text-right font-semibold text-slate-900">{formatCurrency(job.amount)}</td>
                      <td className="text-right font-semibold text-emerald-700">{formatCurrency(job.received)}</td>
                      <td className="text-right font-semibold text-rose-600">{formatCurrency(job.balance)}</td>
                      <td className="max-w-[180px] truncate text-slate-500" title={job.jobReview}>
                        {job.jobReview || '—'}
                      </td>
                      <td className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(job)}
                            className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                            title="Edit Job"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteJob(job._id)}
                            className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                            title="Delete Job"
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

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="crm-table-pagination is-bottom">
            <span className="crm-table-pagination-summary">
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} total completed jobs)
            </span>
            <div className="crm-table-pagination-controls">
              <button
                type="button"
                disabled={pagination.page <= 1}
                onClick={() => fetchJobs(pagination.page - 1)}
                className="crm-btn-secondary crm-table-pagination-btn"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Prev
              </button>
              <button
                type="button"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchJobs(pagination.page + 1)}
                className="crm-btn-secondary crm-table-pagination-btn"
              >
                Next <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit / Create Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="crm-card w-full max-w-2xl overflow-hidden shadow-xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-line)] bg-slate-50/50">
              <h3 className="text-base font-bold text-[var(--color-ink)] flex items-center gap-2">
                <Briefcase className="h-4.5 w-4.5 text-brand" />
                {editingJob ? `Edit Job #${editingJob.jobNo}` : 'Add New Completed Job'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <form onSubmit={handleSaveJob} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto crm-scroll">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Job Number</label>
                  <input
                    type="number"
                    value={formData.jobNo}
                    onChange={(e) => setFormData({ ...formData, jobNo: e.target.value })}
                    placeholder="Auto-generated if empty"
                    className="crm-input"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="crm-input"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Company Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    placeholder="e.g. Al Bustan Bakery"
                    className="crm-input"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Person</label>
                  <input
                    type="text"
                    value={formData.contactPerson}
                    onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                    placeholder="e.g. Muhammad Ahmad"
                    className="crm-input"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Number</label>
                  <input
                    type="text"
                    value={formData.contactNumber}
                    onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
                    placeholder="e.g. 055-5519275"
                    className="crm-input"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="e.g. info@client.com"
                    className="crm-input"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Sales Person</label>
                  <select
                    value={formData.salesPerson}
                    onChange={(e) => setFormData({ ...formData, salesPerson: e.target.value })}
                    className="crm-select"
                  >
                    <option value="">Select Sales Person</option>
                    {(categories.salesPersons || []).map((sp) => (
                      <option key={sp} value={sp}>{sp}</option>
                    ))}
                    <option value="Other">Other (Custom)</option>
                  </select>
                  {formData.salesPerson === 'Other' && (
                    <input
                      type="text"
                      required
                      value={formData.customSalesPerson}
                      onChange={(e) => setFormData({ ...formData, customSalesPerson: e.target.value })}
                      placeholder="Write custom sales person..."
                      className="crm-input mt-1.5"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Responsible Person</label>
                  <select
                    value={formData.responsiblePerson}
                    onChange={(e) => setFormData({ ...formData, responsiblePerson: e.target.value })}
                    className="crm-select"
                  >
                    <option value="">Select Responsible Person</option>
                    {(categories.responsiblePersons || []).map((rp) => (
                      <option key={rp} value={rp}>{rp}</option>
                    ))}
                    <option value="Other">Other (Custom)</option>
                  </select>
                  {formData.responsiblePerson === 'Other' && (
                    <input
                      type="text"
                      required
                      value={formData.customResponsiblePerson}
                      onChange={(e) => setFormData({ ...formData, customResponsiblePerson: e.target.value })}
                      placeholder="Write custom responsible person..."
                      className="crm-input mt-1.5"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Type of Job Category</label>
                  <select
                    value={formData.typeOfJob}
                    onChange={(e) => setFormData({ ...formData, typeOfJob: e.target.value })}
                    className="crm-select"
                  >
                    {(categories.typesOfJob || []).map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                    <option value="Other">Other (Custom)</option>
                  </select>
                  {formData.typeOfJob === 'Other' && (
                    <input
                      type="text"
                      required
                      value={formData.customTypeOfJob}
                      onChange={(e) => setFormData({ ...formData, customTypeOfJob: e.target.value })}
                      placeholder="Write custom job category..."
                      className="crm-input mt-1.5"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Current Status / Step</label>
                  <select
                    value={formData.currentStatus}
                    onChange={(e) => setFormData({ ...formData, currentStatus: e.target.value })}
                    className="crm-select"
                  >
                    {(categories.statuses || []).map((st) => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                    <option value="Other">Other (Custom)</option>
                  </select>
                  {formData.currentStatus === 'Other' && (
                    <input
                      type="text"
                      required
                      value={formData.customCurrentStatus}
                      onChange={(e) => setFormData({ ...formData, customCurrentStatus: e.target.value })}
                      placeholder="Write custom step status..."
                      className="crm-input mt-1.5"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className="crm-input"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2.5 sm:col-span-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Amount (AED)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.amount}
                      onChange={(e) => handleAmountReceivedChange('amount', e.target.value)}
                      className="crm-input font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Received (AED)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.received}
                      onChange={(e) => handleAmountReceivedChange('received', e.target.value)}
                      className="crm-input font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Balance (AED)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.balance}
                      onChange={(e) => setFormData({ ...formData, balance: Number(e.target.value) || 0 })}
                      className="crm-input font-semibold text-rose-600"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Review / Internal Notes</label>
                  <textarea
                    rows={2}
                    value={formData.jobReview}
                    onChange={(e) => setFormData({ ...formData, jobReview: e.target.value })}
                    placeholder="Feedback, issues faced, or completed notes..."
                    className="crm-input min-h-[70px] resize-y"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--color-line)]">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="crm-btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="crm-btn-primary"
                >
                  {saving ? 'Saving...' : 'Save Job Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
