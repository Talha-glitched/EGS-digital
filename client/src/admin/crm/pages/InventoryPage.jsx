import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Boxes, Building2, History, MapPin, Package, Plus, RotateCcw, Search, Trash2, Warehouse, X, FileText, Ban, Layers } from 'lucide-react';
import { crmApiFetch } from '../crmApi.js';
import { getMediaUrl } from '../utils/mediaUrl.js';
import { Alert, Badge, EmptyState, LoadingState, PageHeader, PageSection, PageShell, StatCard } from '../components/ui/primitives.jsx';
import { Modal } from '../components/ui/Modal.jsx';

function ItemCard({ item, onOpen }) {
  const primaryPhoto = (item.photoUrls && item.photoUrls[0]) || item.photoUrl;
  const photoCount = item.photoUrls?.length || (item.photoUrl ? 1 : 0);

  return (
    <button onClick={() => onOpen(item)} className="group flex flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white text-left transition hover:border-neutral-400 hover:shadow-md">
      <div className="relative aspect-square w-full overflow-hidden bg-neutral-100">
        {primaryPhoto ? (
          <img src={getMediaUrl(primaryPhoto)} alt={item.name} className="h-full w-full object-cover transition group-hover:scale-105" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-neutral-300">
            <Boxes className="h-10 w-10" />
          </div>
        )}
        {photoCount > 1 && (
          <div className="absolute bottom-2 right-2 rounded-md bg-neutral-900/80 px-2 py-0.5 text-3xs font-medium text-white shadow-sm backdrop-blur-xs">
            {photoCount} photos
          </div>
        )}
        <div className="absolute top-2 left-2">
          <Badge tone="neutral" className="bg-white/90 text-neutral-800 shadow-xs backdrop-blur-xs font-semibold">
            Qty: {item.quantity || 1}
          </Badge>
        </div>
      </div>
      <div className="flex flex-1 flex-col justify-between p-3">
        <div>
          <p className="line-clamp-1 text-sm font-semibold text-neutral-900">{item.name}</p>
          {item.notes && <p className="mt-1 line-clamp-1 text-2xs text-neutral-500">{item.notes}</p>}
        </div>
        <div className="mt-2.5 flex flex-wrap gap-1">
          {item.status === 'job' && (
            <Badge tone="info" icon={MapPin}>At Job: {item.jobTitle || 'Job Site'}</Badge>
          )}
          {item.status === 'warehouse' && (
            <Badge tone="success" icon={Warehouse}>In Warehouse</Badge>
          )}
          {item.status === 'discarded' && (
            <Badge tone="danger" icon={Ban}>Discarded</Badge>
          )}
        </div>
      </div>
    </button>
  );
}

function ItemDetail({ item, jobs, busy, onClose, onSaveItem, onArchive }) {
  const photoList = item.photoUrls?.length ? item.photoUrls : (item.photoUrl ? [item.photoUrl] : []);
  const [selectedPhotoIdx, setSelectedPhotoIdx] = useState(0);

  const [name, setName] = useState(item.name || '');
  const [quantity, setQuantity] = useState(item.quantity || 1);
  const [notes, setNotes] = useState(item.notes || '');
  const [status, setStatus] = useState(item.status || 'warehouse');
  const [jobId, setJobId] = useState(item.jobId || '');
  const [formError, setFormError] = useState('');

  const activePhoto = photoList[selectedPhotoIdx] || photoList[0];

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('Item name is required.');
      return;
    }
    if (status === 'job' && !jobId) {
      setFormError('Please select a job site.');
      return;
    }
    setFormError('');
    await onSaveItem(item.id, {
      name: name.trim(),
      quantity: Math.max(1, parseInt(quantity, 10) || 1),
      notes: notes.trim(),
      status,
      jobId: status === 'job' ? jobId : null,
    });
  }

  return (
    <Modal open onClose={onClose} title={item.name} subtitle={`Item ID: ${item.slug || item.id}`} icon={Boxes} size="lg" footer={<button type="button" className="crm-btn-secondary" onClick={onClose}>Close</button>}>
      <form onSubmit={handleSubmit} className="grid gap-5 sm:grid-cols-2">
        {/* Left Column: Photos Gallery */}
        <div className="flex flex-col gap-3">
          <div className="overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100">
            {activePhoto ? (
              <img src={getMediaUrl(activePhoto)} alt={item.name} className="aspect-square w-full object-cover" />
            ) : (
              <div className="flex aspect-square items-center justify-center text-neutral-300">
                <Boxes className="h-12 w-12" />
              </div>
            )}
          </div>
          {photoList.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {photoList.map((photo, idx) => (
                <button
                  type="button"
                  key={idx}
                  onClick={() => setSelectedPhotoIdx(idx)}
                  className={`h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 transition ${selectedPhotoIdx === idx ? 'border-brand shadow-sm' : 'border-transparent opacity-70 hover:opacity-100'}`}
                >
                  <img src={getMediaUrl(photo)} alt={`Thumbnail ${idx + 1}`} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
          <div className="rounded-lg bg-neutral-50 p-3 text-2xs text-neutral-500">
            <p className="font-semibold text-neutral-700">Photo count: {photoList.length}</p>
            <p className="mt-0.5">Multiple photos can be uploaded when registering inventory items.</p>
          </div>
        </div>

        {/* Right Column: Item Fields & Status Management */}
        <div className="flex flex-col gap-4">
          {formError && <Alert tone="danger">{formError}</Alert>}

          <label className="text-xs font-medium text-neutral-700">Item Name
            <input
              className="crm-input mt-1 w-full"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Grey ottoman"
              required
            />
          </label>

          <label className="text-xs font-medium text-neutral-700">Quantity
            <input
              type="number"
              min="1"
              className="crm-input mt-1 w-full"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
            />
          </label>

          <label className="text-xs font-medium text-neutral-700">Notes / Details
            <textarea
              className="crm-input mt-1 w-full text-xs"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add dimensions, condition, serial number, or storage location notes..."
            />
          </label>

          {/* Status Selector */}
          <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3.5">
            <span className="text-xs font-semibold text-neutral-900">Current Status</span>
            <div className="mt-2.5 grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setStatus('warehouse')}
                className={`flex flex-col items-center justify-center gap-1 rounded-lg border p-2 text-xs font-medium transition ${status === 'warehouse' ? 'border-emerald-600 bg-emerald-50 text-emerald-800 font-semibold shadow-xs' : 'border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-100'}`}
              >
                <Warehouse className="h-4 w-4" />
                <span>Warehouse</span>
              </button>

              <button
                type="button"
                onClick={() => setStatus('job')}
                className={`flex flex-col items-center justify-center gap-1 rounded-lg border p-2 text-xs font-medium transition ${status === 'job' ? 'border-blue-600 bg-blue-50 text-blue-800 font-semibold shadow-xs' : 'border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-100'}`}
              >
                <MapPin className="h-4 w-4" />
                <span>At Job Site</span>
              </button>

              <button
                type="button"
                onClick={() => setStatus('discarded')}
                className={`flex flex-col items-center justify-center gap-1 rounded-lg border p-2 text-xs font-medium transition ${status === 'discarded' ? 'border-rose-600 bg-rose-50 text-rose-800 font-semibold shadow-xs' : 'border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-100'}`}
              >
                <Ban className="h-4 w-4" />
                <span>Discarded</span>
              </button>
            </div>

            {status === 'job' && (
              <div className="mt-3">
                <label className="text-xs font-medium text-neutral-700">Assign Job Site
                  <select
                    className="crm-select mt-1 w-full text-xs"
                    value={jobId}
                    onChange={(e) => setJobId(e.target.value)}
                    required
                  >
                    <option value="">Choose a Job...</option>
                    {jobs.map((entry) => (
                      <option key={entry.id} value={entry.id}>
                        {entry.jobNumber ? `${entry.jobNumber} · ` : ''}{entry.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}
          </div>

          <div className="mt-2 flex flex-col gap-2">
            <button type="submit" className="crm-btn-primary w-full justify-center" disabled={busy}>
              Save Changes
            </button>
            <button type="button" className="crm-btn-secondary w-full justify-center text-red-600 hover:bg-red-50" disabled={busy} onClick={() => onArchive(item.id)}>
              <Trash2 className="h-4 w-4" />Remove Item
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

function RecentlyRemoved({ open, items, busy, onClose, onRestore }) {
  return (
    <Modal open={open} onClose={onClose} title="Recently removed" subtitle="Removed items stay recoverable for 60 days." icon={History} size="md">
      {!items.length ? (
        <EmptyState title="Nothing removed" description="Items you remove will show up here for 60 days." />
      ) : (
        <div className="flex flex-col gap-2 max-h-96 overflow-y-auto">
          {items.map((item) => {
            const primaryPhoto = (item.photoUrls && item.photoUrls[0]) || item.photoUrl;
            return (
              <div key={item.id} className="flex items-center gap-3 rounded-lg border border-neutral-200 p-2.5">
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-neutral-100">
                  {primaryPhoto ? (
                    <img src={getMediaUrl(primaryPhoto)} alt={item.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-neutral-300">
                      <Boxes className="h-5 w-5" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-neutral-900">{item.name}</p>
                  <p className="text-2xs text-neutral-400">Qty: {item.quantity || 1} · Removed {new Date(item.deletedAt).toLocaleDateString('en-AE', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                </div>
                <button className="crm-btn-secondary shrink-0 text-xs" disabled={busy} onClick={() => onRestore(item.id)}>
                  <RotateCcw className="h-3.5 w-3.5" />Restore
                </button>
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}

export default function InventoryPage() {
  const navigate = useNavigate();
  const { slug } = useParams();
  const [items, setItems] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Filtering & Tabs State
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Add Item Modal State
  const [addOpen, setAddOpen] = useState(false);
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [photoFiles, setPhotoFiles] = useState([]);
  const [photoPreviews, setPhotoPreviews] = useState([]);

  // Active Item Modal & Removed items
  const [activeItem, setActiveItem] = useState(null);
  const [removedOpen, setRemovedOpen] = useState(false);
  const [removedItems, setRemovedItems] = useState([]);

  const load = useCallback(async () => {
    try {
      setError('');
      const data = await crmApiFetch('/api/admin/inventory');
      setItems(data.items || []);
      setJobs(data.jobs || []);
    } catch (err) {
      setError(err.message || 'Failed to load inventory.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const loadRemoved = useCallback(async () => {
    try {
      const data = await crmApiFetch('/api/admin/inventory/removed');
      setRemovedItems(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Failed to load removed items.');
    }
  }, []);

  useEffect(() => {
    if (!slug) { setActiveItem(null); return; }
    (async () => {
      try {
        const item = await crmApiFetch(`/api/admin/inventory/by-slug/${encodeURIComponent(slug)}`);
        setActiveItem(item);
      } catch (err) {
        setError(err.message || 'Item not found.');
        navigate('/admin/crm/inventory');
      }
    })();
  }, [slug, navigate]);

  // Counts for tabs & stat cards
  const counts = useMemo(() => {
    const warehouse = items.filter((i) => i.status === 'warehouse').length;
    const job = items.filter((i) => i.status === 'job').length;
    const discarded = items.filter((i) => i.status === 'discarded').length;
    return { all: items.length, warehouse, job, discarded };
  }, [items]);

  // Filtered items based on status tab and search query
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = (item.name || '').toLowerCase().includes(q);
        const matchNotes = (item.notes || '').toLowerCase().includes(q);
        const matchJob = (item.jobTitle || '').toLowerCase().includes(q);
        if (!matchName && !matchNotes && !matchJob) return false;
      }
      return true;
    });
  }, [items, statusFilter, searchQuery]);

  function handlePhotoPick(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const newFiles = [...photoFiles, ...files].slice(0, 10);
    setPhotoFiles(newFiles);
    setPhotoPreviews(newFiles.map((file) => URL.createObjectURL(file)));
  }

  function removePhotoAt(index) {
    const nextFiles = photoFiles.filter((_, i) => i !== index);
    setPhotoFiles(nextFiles);
    setPhotoPreviews(nextFiles.map((file) => URL.createObjectURL(file)));
  }

  function resetAddForm() {
    setName('');
    setQuantity(1);
    setNotes('');
    setPhotoFiles([]);
    setPhotoPreviews([]);
    setAddOpen(false);
  }

  async function submitNewItem(e) {
    e.preventDefault();
    if (!name.trim() || !photoFiles.length) return;
    setBusy(true);
    setError('');
    try {
      const form = new FormData();
      form.append('name', name.trim());
      form.append('quantity', String(Math.max(1, parseInt(quantity, 10) || 1)));
      if (notes.trim()) form.append('notes', notes.trim());

      photoFiles.forEach((file) => {
        form.append('photos', file);
      });

      await crmApiFetch('/api/admin/inventory/items', { method: 'POST', body: form });
      resetAddForm();
      await load();
    } catch (err) {
      setError(err.message || 'Could not register item.');
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveItem(itemId, updatePayload) {
    setBusy(true);
    setError('');
    try {
      await crmApiFetch(`/api/admin/inventory/items/${itemId}`, {
        method: 'PATCH',
        body: JSON.stringify(updatePayload),
      });
      setActiveItem(null);
      navigate('/admin/crm/inventory');
      await load();
    } catch (err) {
      setError(err.message || 'Could not update item.');
    } finally {
      setBusy(false);
    }
  }

  async function handleArchive(itemId) {
    setBusy(true);
    setError('');
    try {
      await crmApiFetch(`/api/admin/inventory/items/${itemId}`, { method: 'DELETE' });
      setActiveItem(null);
      navigate('/admin/crm/inventory');
      await load();
    } catch (err) {
      setError(err.message || 'Could not remove item.');
    } finally {
      setBusy(false);
    }
  }

  async function handleRestore(itemId) {
    setBusy(true);
    setError('');
    try {
      await crmApiFetch(`/api/admin/inventory/items/${itemId}/restore`, { method: 'POST' });
      await Promise.all([load(), loadRemoved()]);
    } catch (err) {
      setError(err.message || 'Could not restore item.');
    } finally {
      setBusy(false);
    }
  }

  function openRemoved() {
    setRemovedOpen(true);
    loadRemoved();
  }

  if (loading) return <PageShell><LoadingState label="Loading inventory items…" /></PageShell>;

  return (
    <PageShell className="max-w-none">
      <PageHeader actions={
        <div className="flex flex-wrap gap-2">
          <button className="crm-btn-secondary text-xs" onClick={openRemoved}>
            <History className="h-4 w-4" />Recently Removed
          </button>
          <button className="crm-btn-primary text-xs" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" />Add Item
          </button>
        </div>
      } />

      <PageSection>
        {error && <Alert tone="danger">{error}</Alert>}

        {/* Stat Cards Overview */}
        <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
          <StatCard compact label="Total Items" value={counts.all} icon={Package} />
          <StatCard compact label="In Warehouse" value={counts.warehouse} icon={Warehouse} />
          <StatCard compact label="At Job Sites" value={counts.job} icon={MapPin} />
          <StatCard compact label="Discarded" value={counts.discarded} icon={Ban} />
        </div>

        {/* Search and Category Filter Toolbar */}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-neutral-200 pb-3">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto rounded-lg bg-neutral-100 p-1 text-xs">
            <button
              onClick={() => setStatusFilter('all')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition ${statusFilter === 'all' ? 'bg-white text-neutral-900 shadow-xs font-semibold' : 'text-neutral-600 hover:text-neutral-900'}`}
            >
              <span>All Items</span>
              <span className="rounded-full bg-neutral-200 px-1.5 py-0.2 text-3xs font-semibold">{counts.all}</span>
            </button>

            <button
              onClick={() => setStatusFilter('warehouse')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition ${statusFilter === 'warehouse' ? 'bg-white text-emerald-800 shadow-xs font-semibold' : 'text-neutral-600 hover:text-neutral-900'}`}
            >
              <Warehouse className="h-3.5 w-3.5 text-emerald-600" />
              <span>In Warehouse</span>
              <span className="rounded-full bg-emerald-100 text-emerald-800 px-1.5 py-0.2 text-3xs font-semibold">{counts.warehouse}</span>
            </button>

            <button
              onClick={() => setStatusFilter('job')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition ${statusFilter === 'job' ? 'bg-white text-blue-800 shadow-xs font-semibold' : 'text-neutral-600 hover:text-neutral-900'}`}
            >
              <MapPin className="h-3.5 w-3.5 text-blue-600" />
              <span>At Job Site</span>
              <span className="rounded-full bg-blue-100 text-blue-800 px-1.5 py-0.2 text-3xs font-semibold">{counts.job}</span>
            </button>

            <button
              onClick={() => setStatusFilter('discarded')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition ${statusFilter === 'discarded' ? 'bg-white text-rose-800 shadow-xs font-semibold' : 'text-neutral-600 hover:text-neutral-900'}`}
            >
              <Ban className="h-3.5 w-3.5 text-rose-600" />
              <span>Discarded</span>
              <span className="rounded-full bg-rose-100 text-rose-800 px-1.5 py-0.2 text-3xs font-semibold">{counts.discarded}</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-neutral-400" />
            <input
              type="text"
              placeholder="Search by name or notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="crm-input w-full pl-8 text-xs"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-2.5 text-neutral-400 hover:text-neutral-600">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Grid Display */}
        {!filteredItems.length ? (
          <EmptyState
            title={items.length ? "No matching items" : "No inventory items yet"}
            description={items.length ? "Try clearing your search query or selecting a different category tab." : "Add furniture, equipment, and materials to track their status and location."}
          />
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {filteredItems.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                onOpen={(entry) => navigate(`/admin/crm/inventory/i/${entry.slug || entry.id}`)}
              />
            ))}
          </div>
        )}
      </PageSection>

      {/* Add Item Modal */}
      <Modal
        open={addOpen}
        onClose={resetAddForm}
        title="Add Inventory Item"
        subtitle="Specify name, quantity, notes, and upload one or more photos."
        icon={Plus}
        size="md"
        footer={(
          <>
            <button type="button" className="crm-btn-secondary" onClick={resetAddForm}>Cancel</button>
            <button form="add-item-form" type="submit" className="crm-btn-primary" disabled={busy || !name.trim() || !photoFiles.length}>
              {busy ? 'Adding...' : 'Add Item'}
            </button>
          </>
        )}
      >
        <form id="add-item-form" className="grid gap-4" onSubmit={submitNewItem}>
          <label className="text-xs font-medium text-neutral-700">Photos (1 or more)
            <div className="mt-1.5 flex flex-wrap gap-2.5">
              {photoPreviews.map((previewUrl, idx) => (
                <div key={idx} className="relative h-20 w-20 overflow-hidden rounded-lg border border-neutral-200 bg-neutral-50 group">
                  <img src={previewUrl} alt={`Preview ${idx + 1}`} className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removePhotoAt(idx)}
                    className="absolute right-1 top-1 rounded-full bg-neutral-900/75 p-1 text-white opacity-90 hover:opacity-100"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {photoFiles.length < 10 && (
                <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-neutral-300 bg-neutral-50 text-neutral-500 hover:border-neutral-400 hover:bg-neutral-100">
                  <Plus className="h-5 w-5" />
                  <span className="mt-1 text-3xs font-medium">Add Photo</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoPick}
                    className="hidden"
                  />
                </label>
              )}
            </div>
            <p className="mt-1 text-3xs text-neutral-400">Select multiple photo files if available.</p>
          </label>

          <label className="text-xs font-medium text-neutral-700">Name
            <input
              className="crm-input mt-1 w-full"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Executive Desk, Grey Ottoman"
              required
            />
          </label>

          <label className="text-xs font-medium text-neutral-700">Quantity
            <input
              type="number"
              min="1"
              className="crm-input mt-1 w-full"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
            />
          </label>

          <label className="text-xs font-medium text-neutral-700">Notes
            <textarea
              className="crm-input mt-1 w-full text-xs"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional description, dimensions, serials..."
            />
          </label>
        </form>
      </Modal>

      {/* Item Detail Modal */}
      {activeItem && (
        <ItemDetail
          item={activeItem}
          jobs={jobs}
          busy={busy}
          onClose={() => navigate('/admin/crm/inventory')}
          onSaveItem={handleSaveItem}
          onArchive={handleArchive}
        />
      )}

      {/* Recently Removed Modal */}
      <RecentlyRemoved
        open={removedOpen}
        items={removedItems}
        busy={busy}
        onClose={() => setRemovedOpen(false)}
        onRestore={handleRestore}
      />
    </PageShell>
  );
}
