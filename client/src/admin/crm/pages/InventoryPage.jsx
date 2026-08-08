import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Boxes, Camera, MapPin, Plus, Printer, ScanLine, Trash2, Warehouse, X } from 'lucide-react';
import { crmApiFetch } from '../crmApi.js';
import { Alert, Badge, EmptyState, LoadingState, PageHeader, PageSection, PageShell, StatCard, cn } from '../components/ui/primitives.jsx';
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
        {item.photoUrl ? <img src={item.photoUrl} alt={item.name} className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-neutral-300"><Boxes className="h-8 w-8" /></div>}
      </div>
      <div className="p-3">
        <p className="text-sm font-semibold text-neutral-900">{item.name}</p>
        <div className="mt-1.5">
          {item.status === 'job'
            ? <Badge tone="info">At: {item.jobTitle || 'Job'}</Badge>
            : <Badge tone="success">Warehouse</Badge>}
        </div>
      </div>
    </button>
  );
}

function ItemDetail({ item, jobs, busy, onClose, onSendToJob, onReturn, onArchive }) {
  const [jobId, setJobId] = useState('');
  const [qrOpen, setQrOpen] = useState(false);
  const qrUrl = `/api/admin/inventory/items/${encodeURIComponent(item.slug)}/qr.svg`;

  return (
    <Modal open onClose={onClose} title={item.name} subtitle={item.slug} icon={Boxes} size="md" footer={<button className="crm-btn-secondary" onClick={onClose}>Close</button>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100">
          {item.photoUrl ? <img src={item.photoUrl} alt={item.name} className="aspect-square w-full object-cover" /> : <div className="flex aspect-square items-center justify-center text-neutral-300"><Boxes className="h-10 w-10" /></div>}
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
              <img src={qrUrl} alt={`QR code for ${item.name}`} className="mx-auto h-40 w-40" />
              <p className="mt-2 text-2xs text-neutral-400">{item.slug}</p>
              <a href={qrUrl} download={`${item.slug}.svg`} className="crm-btn-secondary mt-2 w-full justify-center text-xs">Download QR (SVG)</a>
            </div>
          )}

          <button className="crm-btn-secondary justify-center text-red-600" disabled={busy} onClick={() => onArchive(item.id)}><Trash2 className="h-4 w-4" />Remove item</button>
        </div>
      </div>
    </Modal>
  );
}

function PrintLabels({ items, onClose }) {
  useEffect(() => {
    const timer = setTimeout(() => window.print(), 300);
    return () => clearTimeout(timer);
  }, []);
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-white p-6 print:p-0">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <p className="text-sm font-semibold">Print preview — {items.length} label{items.length === 1 ? '' : 's'}</p>
        <div className="flex gap-2">
          <button className="crm-btn-primary" onClick={() => window.print()}><Printer className="h-4 w-4" />Print</button>
          <button className="crm-btn-secondary" onClick={onClose}><X className="h-4 w-4" />Close</button>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4 print:grid-cols-3">
        {items.map((item) => (
          <div key={item.id} className="flex flex-col items-center gap-1 rounded-lg border border-neutral-300 p-3 text-center break-inside-avoid">
            <img src={`/api/admin/inventory/items/${encodeURIComponent(item.slug)}/qr.svg`} alt={item.name} className="h-28 w-28" />
            <p className="text-xs font-semibold leading-tight">{item.name}</p>
            <p className="text-2xs text-neutral-500">{item.slug}</p>
          </div>
        ))}
      </div>
    </div>
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
  const [printOpen, setPrintOpen] = useState(false);
  const [activeItem, setActiveItem] = useState(null);

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
          <button className="crm-btn-secondary" onClick={() => setPrintOpen(true)} disabled={!items.length}><Printer className="h-4 w-4" />Print labels</button>
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

      {printOpen && <PrintLabels items={items} onClose={() => setPrintOpen(false)} />}
    </PageShell>
  );
}
