import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Boxes, Camera, History, MapPin, Plus, Printer, RotateCcw, ScanLine, Trash2, Warehouse, X } from 'lucide-react';
import { crmApiFetch } from '../crmApi.js';
import { getMediaUrl } from '../utils/mediaUrl.js';
import { Alert, Badge, EmptyState, LoadingState, PageHeader, PageSection, PageShell, StatCard } from '../components/ui/primitives.jsx';
import { Modal } from '../components/ui/Modal.jsx';

function CameraScanner({ onDetected, onClose }) {
  const videoRef = useRef(null);
  const [message, setMessage] = useState('Starting camera…');
  useEffect(() => {
    let stream;
    let timer;
    let cancelled = false;
    async function start() {
      if (!('BarcodeDetector' in window) || !navigator.mediaDevices?.getUserMedia) {
        setMessage('Camera QR detection is not supported on this device.');
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (cancelled) return;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
        setMessage('Point the camera at the QR code.');
        timer = setInterval(async () => {
          try {
            const codes = await detector.detect(videoRef.current);
            if (codes[0]?.rawValue) {
              onDetected(codes[0].rawValue);
              onClose();
            }
          } catch {
            /* keep scanning */
          }
        }, 450);
      } catch {
        setMessage('Camera permission was unavailable.');
      }
    }
    start();
    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [onDetected, onClose]);
  return (
    <div className="relative overflow-hidden rounded-xl bg-neutral-950">
      <video ref={videoRef} muted playsInline className="aspect-video w-full object-cover" />
      <div className="absolute inset-x-0 bottom-0 bg-neutral-950/75 p-3 text-center text-xs text-white">{message}</div>
      <button className="absolute right-2 top-2 rounded-full bg-white/90 p-2" onClick={onClose} aria-label="Close scanner"><X className="h-4 w-4" /></button>
    </div>
  );
}

function extractSlug(rawValue) {
  const trimmed = String(rawValue || '').trim();
  if (!trimmed) return '';
  const match = trimmed.match(/\/inventory\/i\/([a-z0-9]+)/i);
  if (match) return match[1];
  return trimmed.replace(/^https?:\/\//, '').replace(/\/$/, '');
}

function ItemCard({ item, onOpen }) {
  return (
    <button onClick={() => onOpen(item)} className="flex flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white text-left transition hover:border-brand hover:shadow-sm">
      <div className="aspect-square w-full overflow-hidden bg-neutral-100">
        {item.photoUrl ? <img src={getMediaUrl(item.photoUrl)} alt={item.name} className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-neutral-300"><Boxes className="h-8 w-8" /></div>}
      </div>
      <div className="p-3">
        <p className="text-sm font-semibold text-neutral-900">{item.name}</p>
        <div className="mt-1.5 flex flex-wrap gap-1">
          {item.status === 'job'
            ? <Badge tone="info">At: {item.jobTitle || 'Job'}</Badge>
            : <Badge tone="success">Warehouse</Badge>}
          {!item.labelPrintedAt && <Badge tone="warning">New label</Badge>}
        </div>
      </div>
    </button>
  );
}

function ItemDetail({ item, jobs, busy, onClose, onSendToJob, onReturn, onArchive }) {
  const [jobId, setJobId] = useState('');
  const [qrOpen, setQrOpen] = useState(false);
  const qrUrl = getMediaUrl(`/api/admin/inventory/items/${encodeURIComponent(item.slug)}/qr.svg`);

  return (
    <Modal open onClose={onClose} title={item.name} subtitle={item.slug} icon={Boxes} size="md" footer={<button className="crm-btn-secondary" onClick={onClose}>Close</button>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100">
          {item.photoUrl ? <img src={getMediaUrl(item.photoUrl)} alt={item.name} className="aspect-square w-full object-cover" /> : <div className="flex aspect-square items-center justify-center text-neutral-300"><Boxes className="h-10 w-10" /></div>}
        </div>
        <div className="flex flex-col gap-3">
          <div>
            {item.status === 'job'
              ? <Badge tone="info">Currently at: {item.jobTitle || 'a Job'}</Badge>
              : <Badge tone="success">Currently in Warehouse</Badge>}
          </div>

          {item.status === 'warehouse' ? (
            <div className="rounded-lg border border-neutral-200 p-3">
              <label className="text-xs font-medium text-neutral-600">Send to Job
                <select className="crm-select mt-1.5 w-full" value={jobId} onChange={(e) => setJobId(e.target.value)}>
                  <option value="">Choose a Job</option>
                  {jobs.map((entry) => <option key={entry.id} value={entry.id}>{entry.jobNumber ? `${entry.jobNumber} · ` : ''}{entry.name}</option>)}
                </select>
              </label>
              <button className="crm-btn-primary mt-2 w-full justify-center" disabled={busy || !jobId} onClick={() => onSendToJob(item.id, jobId)}><Warehouse className="h-4 w-4" />Send to Job</button>
            </div>
          ) : (
            <button className="crm-btn-primary justify-center" disabled={busy} onClick={() => onReturn(item.id)}><Warehouse className="h-4 w-4" />Return to Warehouse</button>
          )}

          <button className="crm-btn-secondary justify-center" onClick={() => setQrOpen((v) => !v)}><ScanLine className="h-4 w-4" />{qrOpen ? 'Hide' : 'Show'} QR code</button>
          {qrOpen && (
            <div className="rounded-lg border border-neutral-200 p-3 text-center">
              <img src={qrUrl} alt={`QR code for ${item.name}`} className="mx-auto w-40" />
              <p className="mt-2 text-xs font-semibold text-neutral-700">{item.name}</p>
              <p className="text-2xs text-neutral-400">{item.slug}</p>
              <p className="mt-1 text-2xs text-neutral-400">The name and code are printed on the label itself, so it's still identifiable off the sheet.</p>
              <a href={qrUrl} download={`${item.slug}.svg`} className="crm-btn-secondary mt-2 w-full justify-center text-xs">Download QR (SVG)</a>
            </div>
          )}

          <button className="crm-btn-secondary justify-center text-red-600" disabled={busy} onClick={() => onArchive(item.id)}><Trash2 className="h-4 w-4" />Remove item</button>
          <p className="text-center text-2xs text-neutral-400">Removed items stay recoverable — the photo is kept for 60 days before it's cleared out.</p>
        </div>
      </div>
    </Modal>
  );
}

// Invisible on screen — only appears on the printed page. There's nothing to navigate to
// or close: it mounts off-screen, waits for the QR images to actually load, opens the OS
// print dialog, and unmounts itself as soon as that dialog closes (print or cancel), via
// the 'afterprint' event.
function PrintLabelSheet({ items, onDone }) {
  useEffect(() => {
    let cancelled = false;
    function triggerPrint() {
      if (!cancelled) window.print();
    }
    function handleAfterPrint() { onDone(); }
    window.addEventListener('afterprint', handleAfterPrint);

    const images = Array.from(document.querySelectorAll('.crm-print-label-sheet img'));
    const pending = images.filter((img) => !img.complete);
    if (!pending.length) {
      triggerPrint();
    } else {
      let remaining = pending.length;
      const onSettle = () => { remaining -= 1; if (remaining <= 0) triggerPrint(); };
      pending.forEach((img) => {
        img.addEventListener('load', onSettle, { once: true });
        img.addEventListener('error', onSettle, { once: true });
      });
    }
    const fallback = setTimeout(triggerPrint, 4000);

    return () => {
      cancelled = true;
      clearTimeout(fallback);
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, [onDone]);
  return (
    // Off-screen normally, but .crm-print-host resets to static during print — otherwise
    // the label sheet's absolute positioning stays relative to this offset ancestor and
    // renders off the printed page too (a blank print was exactly this bug).
    <div className="crm-print-host fixed left-[-10000px] top-0">
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 10mm; }
          body * { visibility: hidden; }
          .crm-print-host { position: static !important; left: auto !important; top: auto !important; }
          .crm-print-label-sheet, .crm-print-label-sheet * { visibility: visible; }
          .crm-print-label-sheet { position: absolute; top: 0; left: 0; width: 100%; }
        }
      `}</style>
      {/* Each label's QR already has the item's name and code baked into the image itself
          (see getItemQrSvg), so a sheet of these stays identifiable even off the page. */}
      <div className="crm-print-label-sheet grid grid-cols-5 gap-[3mm]">
        {items.map((item) => (
          <div key={item.id} className="flex items-center justify-center border border-neutral-300 p-1.5 break-inside-avoid">
            <img src={getMediaUrl(`/api/admin/inventory/items/${encodeURIComponent(item.slug)}/qr.svg`)} alt={item.name} className="w-[3.4cm]" />
          </div>
        ))}
      </div>
    </div>
  );
}

function PrintPicker({ open, items, onClose, onPrint }) {
  const [selected, setSelected] = useState(() => new Set());
  useEffect(() => {
    if (open) setSelected(new Set(items.filter((item) => !item.labelPrintedAt).map((item) => item.id)));
  }, [open, items]);

  function toggle(id) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const unprintedCount = items.filter((item) => !item.labelPrintedAt).length;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Print labels"
      subtitle="New items are pre-selected. Tick anything else you want to (re)print."
      icon={Printer}
      size="md"
      footer={(
        <>
          <button className="crm-btn-secondary" onClick={onClose}>Cancel</button>
          <button
            className="crm-btn-primary"
            disabled={!selected.size}
            onClick={() => onPrint(items.filter((item) => selected.has(item.id)))}
          >
            <Printer className="h-4 w-4" />Print {selected.size} label{selected.size === 1 ? '' : 's'}
          </button>
        </>
      )}
    >
      <div className="mb-3 flex flex-wrap gap-2">
        <button type="button" className="crm-btn-secondary text-xs" onClick={() => setSelected(new Set(items.filter((item) => !item.labelPrintedAt).map((item) => item.id)))}>Select unprinted ({unprintedCount})</button>
        <button type="button" className="crm-btn-secondary text-xs" onClick={() => setSelected(new Set(items.map((item) => item.id)))}>Select all ({items.length})</button>
        <button type="button" className="crm-btn-secondary text-xs" onClick={() => setSelected(new Set())}>Clear</button>
      </div>
      <div className="max-h-96 overflow-y-auto rounded-lg border border-neutral-200">
        {items.map((item) => (
          <label key={item.id} className="flex cursor-pointer items-center gap-3 border-b border-neutral-100 p-2 last:border-b-0 hover:bg-neutral-50">
            <input type="checkbox" checked={selected.has(item.id)} onChange={() => toggle(item.id)} className="h-4 w-4" />
            <div className="h-9 w-9 shrink-0 overflow-hidden rounded-md bg-neutral-100">
              {item.photoUrl ? <img src={getMediaUrl(item.photoUrl)} alt={item.name} className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-neutral-300"><Boxes className="h-4 w-4" /></div>}
            </div>
            <p className="min-w-0 flex-1 truncate text-sm font-medium text-neutral-900">{item.name}</p>
            {item.labelPrintedAt
              ? <Badge tone="neutral">Printed {new Date(item.labelPrintedAt).toLocaleDateString('en-AE', { day: 'numeric', month: 'short' })}</Badge>
              : <Badge tone="warning">New</Badge>}
          </label>
        ))}
      </div>
    </Modal>
  );
}

function MarkPrintedConfirm({ open, count, onConfirm, onDismiss }) {
  return (
    <Modal
      open={open}
      onClose={onDismiss}
      title="Have they printed?"
      icon={Printer}
      size="md"
      footer={(
        <>
          <button className="crm-btn-secondary" onClick={onDismiss}>No, not yet</button>
          <button className="crm-btn-primary" onClick={onConfirm}>Yes, mark as printed</button>
        </>
      )}
    >
      <p className="text-sm text-neutral-600">Have all {count} selected label{count === 1 ? '' : 's'} come out of the printer?</p>
    </Modal>
  );
}

function RecentlyRemoved({ open, items, busy, onClose, onRestore }) {
  return (
    <Modal open={open} onClose={onClose} title="Recently removed" subtitle="Photos are kept for 60 days after removal, then cleared automatically." icon={History} size="md">
      {!items.length ? (
        <EmptyState title="Nothing removed" description="Items you remove will show up here for 60 days." />
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-3 rounded-lg border border-neutral-200 p-2">
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-neutral-100">
                {item.photoUrl ? <img src={getMediaUrl(item.photoUrl)} alt={item.name} className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-neutral-300"><Boxes className="h-5 w-5" /></div>}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-neutral-900">{item.name}</p>
                <p className="text-2xs text-neutral-400">Removed {new Date(item.deletedAt).toLocaleDateString('en-AE', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
              </div>
              <button className="crm-btn-secondary shrink-0 text-xs" disabled={busy || !item.photoUrl} onClick={() => onRestore(item.id)}>
                <RotateCcw className="h-3.5 w-3.5" />{item.photoUrl ? 'Restore' : 'Photo purged'}
              </button>
            </div>
          ))}
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
  const [addOpen, setAddOpen] = useState(false);
  const [name, setName] = useState('');
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [scanOpen, setScanOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [printBatch, setPrintBatch] = useState(null);
  const [confirmBatch, setConfirmBatch] = useState(null);
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

  const warehouseCount = useMemo(() => items.filter((entry) => entry.status === 'warehouse').length, [items]);
  const jobCount = items.length - warehouseCount;

  function pickPhoto(file) {
    setPhotoFile(file);
    setPhotoPreview(file ? URL.createObjectURL(file) : '');
  }

  async function submitNewItem(e) {
    e.preventDefault();
    if (!name.trim() || !photoFile) return;
    setBusy(true);
    setError('');
    try {
      const form = new FormData();
      form.append('name', name.trim());
      form.append('photo', photoFile);
      await crmApiFetch('/api/admin/inventory/items', { method: 'POST', body: form });
      setName('');
      pickPhoto(null);
      setAddOpen(false);
      await load();
    } catch (err) {
      setError(err.message || 'Could not register item.');
    } finally {
      setBusy(false);
    }
  }

  async function handleSendToJob(itemId, jobId) {
    setBusy(true);
    setError('');
    try {
      await crmApiFetch(`/api/admin/inventory/items/${itemId}/send-to-job`, { method: 'POST', body: JSON.stringify({ jobId }) });
      setActiveItem(null);
      navigate('/admin/crm/inventory');
      await load();
    } catch (err) {
      setError(err.message || 'Could not send item to Job.');
    } finally {
      setBusy(false);
    }
  }

  async function handleReturn(itemId) {
    setBusy(true);
    setError('');
    try {
      await crmApiFetch(`/api/admin/inventory/items/${itemId}/return`, { method: 'POST' });
      setActiveItem(null);
      navigate('/admin/crm/inventory');
      await load();
    } catch (err) {
      setError(err.message || 'Could not return item.');
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

  function handlePrintSelected(selectedItems) {
    setPickerOpen(false);
    setPrintBatch(selectedItems);
  }

  function handlePrintDone() {
    const ids = (printBatch || []).map((item) => item.id);
    setPrintBatch(null);
    if (ids.length) setConfirmBatch(ids);
  }

  async function handleConfirmPrinted() {
    const ids = confirmBatch || [];
    setConfirmBatch(null);
    if (!ids.length) return;
    try {
      await crmApiFetch('/api/admin/inventory/items/mark-printed', { method: 'POST', body: JSON.stringify({ itemIds: ids }) });
      await load();
    } catch (err) {
      setError(err.message || 'Could not mark labels as printed.');
    }
  }

  function handleScanned(rawValue) {
    const foundSlug = extractSlug(rawValue);
    if (foundSlug) navigate(`/admin/crm/inventory/i/${foundSlug}`);
  }

  if (loading) return <PageShell><LoadingState label="Loading warehouse items…" /></PageShell>;

  return (
    <PageShell className="max-w-none">
      <PageHeader actions={
        <div className="flex flex-wrap gap-2">
          <button className="crm-btn-secondary" onClick={() => setScanOpen(true)}><ScanLine className="h-4 w-4" />Scan QR</button>
          <button className="crm-btn-secondary" onClick={() => setPickerOpen(true)} disabled={!items.length || !!printBatch}><Printer className="h-4 w-4" />Print labels</button>
          <button className="crm-btn-secondary" onClick={openRemoved}><History className="h-4 w-4" />Recently removed</button>
          <button className="crm-btn-primary" onClick={() => setAddOpen(true)}><Plus className="h-4 w-4" />Add item</button>
        </div>
      } />
      <PageSection>
        {error && <Alert>{error}</Alert>}
        <div className="grid gap-3 sm:grid-cols-2">
          <StatCard compact label="In warehouse" value={warehouseCount} icon={Warehouse} />
          <StatCard compact label="Out at Jobs" value={jobCount} icon={MapPin} />
        </div>

        {!items.length ? (
          <EmptyState title="No items yet" description="Photograph and add the furniture and equipment you want to track." />
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {items.map((item) => <ItemCard key={item.id} item={item} onOpen={(entry) => navigate(`/admin/crm/inventory/i/${entry.slug}`)} />)}
          </div>
        )}
      </PageSection>

      <Modal open={addOpen} onClose={() => { setAddOpen(false); pickPhoto(null); setName(''); }} title="Add warehouse item" subtitle="A photo and a name — that's all it takes." icon={Camera} size="md" footer={<><button className="crm-btn-secondary" onClick={() => setAddOpen(false)}>Cancel</button><button form="add-item-form" className="crm-btn-primary" disabled={busy || !name.trim() || !photoFile}>Add item</button></>}>
        <form id="add-item-form" className="grid gap-4" onSubmit={submitNewItem}>
          <label className="text-xs font-medium text-neutral-600">Photo
            <div className="mt-1.5 flex items-center gap-3">
              {photoPreview
                ? <img src={photoPreview} alt="Preview" className="h-20 w-20 rounded-lg object-cover" />
                : <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-neutral-100 text-neutral-300"><Camera className="h-6 w-6" /></div>}
              <input type="file" accept="image/*" capture="environment" onChange={(e) => pickPhoto(e.target.files?.[0] || null)} className="text-xs" />
            </div>
          </label>
          <label className="text-xs font-medium text-neutral-600">Name
            <input className="crm-input mt-1.5 w-full" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Grey ottoman" required />
          </label>
        </form>
      </Modal>

      <Modal open={scanOpen} onClose={() => setScanOpen(false)} title="Scan a QR code" subtitle="Opens the matching item so you can confirm before sticking a label on." icon={ScanLine} size="md">
        {scanOpen && <CameraScanner onDetected={handleScanned} onClose={() => setScanOpen(false)} />}
      </Modal>

      {activeItem && (
        <ItemDetail
          item={activeItem}
          jobs={jobs}
          busy={busy}
          onClose={() => navigate('/admin/crm/inventory')}
          onSendToJob={handleSendToJob}
          onReturn={handleReturn}
          onArchive={handleArchive}
        />
      )}

      <PrintPicker open={pickerOpen} items={items} onClose={() => setPickerOpen(false)} onPrint={handlePrintSelected} />
      {printBatch && <PrintLabelSheet items={printBatch} onDone={handlePrintDone} />}
      <MarkPrintedConfirm open={!!confirmBatch} count={confirmBatch?.length || 0} onConfirm={handleConfirmPrinted} onDismiss={() => setConfirmBatch(null)} />

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
