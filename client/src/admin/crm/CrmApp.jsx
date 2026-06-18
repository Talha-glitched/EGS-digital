import { useCallback, useEffect, useState } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import './crm.css';
import { crmApiFetch } from './crmApi.js';
import Sidebar from './components/layout/Sidebar.jsx';
import TopNavbar from './components/layout/TopNavbar.jsx';
import GlobalDashboard from './pages/GlobalDashboard.jsx';
import ProjectDetailWorkspace from './pages/ProjectDetailWorkspace.jsx';
import InboxPage from './pages/InboxPage.jsx';
import { Alert, Field, LoadingState } from './components/ui/primitives.jsx';
import { Lock } from 'lucide-react';

function LoginPanel({ onLogin, status }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await crmApiFetch('/api/admin/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
      onLogin();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="crm-root min-h-screen bg-[var(--color-canvas)]">
      <div className="mx-auto grid min-h-screen max-w-6xl lg:grid-cols-2">
        <section className="hidden flex-col justify-between border-r border-[var(--color-line)] bg-[var(--color-sidebar)] p-10 text-white lg:flex">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand">Exhibit Graphic Sign</p>
            <h1 className="mt-6 max-w-sm text-4xl font-bold leading-[1.1] tracking-tight">
              Lead Engine & ROI CRM
            </h1>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-neutral-400">
              Manage exhibition outreach, multi-source lead ingestion, drip sequences, and closed-deal ROI — built for UAE campaign ops.
            </p>
          </div>
          <p className="text-xs text-neutral-500">Internal operations console · Authorized staff only</p>
        </section>

        <section className="flex items-center justify-center p-6 sm:p-10">
          <form onSubmit={submit} className="crm-animate-in w-full max-w-md space-y-6">
            <div className="lg:hidden">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand">EGS Lead Engine</p>
              <h2 className="mt-2 text-2xl font-bold text-[var(--color-ink)]">Sign in</h2>
            </div>

            <div className="crm-card space-y-5 p-8">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-soft text-brand">
                <Lock className="h-5 w-5" strokeWidth={1.75} />
              </div>

              {!status?.adminConfigured && (
                <Alert tone="warning">Admin credentials are not configured on the server.</Alert>
              )}
              {error && <Alert>{error}</Alert>}

              <Field label="Username">
                <input
                  className="crm-input"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  placeholder="admin"
                />
              </Field>
              <Field label="Password">
                <input
                  type="password"
                  className="crm-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  placeholder="••••••••"
                />
              </Field>

              <button type="submit" disabled={busy || !status?.adminConfigured} className="crm-btn-primary w-full">
                {busy ? 'Signing in…' : 'Sign in to CRM'}
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}

function CrmShell({ projects, onLogout }) {
  const location = useLocation();
  const titles = {
    '/admin/crm': ['Dashboard', 'Portfolio performance and active campaigns'],
    '/admin/crm/inbox': ['Inbox', 'Replies and sales follow-up workspace'],
  };
  const match = titles[location.pathname] || ['Project', 'Leads, sequences, and campaign analytics'];

  return (
    <div className="crm-root flex min-h-screen bg-[var(--color-canvas)]">
      <Sidebar projects={projects} onLogout={onLogout} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopNavbar title={match[0]} subtitle={match[1]} />
        <main className="crm-scroll flex-1 overflow-auto">
          <Routes>
            <Route index element={<GlobalDashboard />} />
            <Route path="projects/:id" element={<ProjectDetailWorkspace />} />
            <Route path="inbox" element={<InboxPage />} />
            <Route path="*" element={<Navigate to="/admin/crm" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default function CrmApp() {
  const [authenticated, setAuthenticated] = useState(false);
  const [status, setStatus] = useState(null);
  const [projects, setProjects] = useState([]);
  const navigate = useNavigate();

  const checkAuth = useCallback(async () => {
    const s = await crmApiFetch('/api/admin/status');
    setStatus(s);
    setAuthenticated(Boolean(s.authenticated));
    if (s.authenticated) {
      const list = await crmApiFetch('/api/admin/projects').catch(() => []);
      setProjects(list);
    }
  }, []);

  useEffect(() => {
    checkAuth().catch(() => setStatus({ adminConfigured: false }));
  }, [checkAuth]);

  async function logout() {
    await crmApiFetch('/api/admin/logout', { method: 'POST' });
    setAuthenticated(false);
    navigate('/admin/crm');
  }

  if (!status) {
    return (
      <div className="crm-root min-h-screen bg-[var(--color-canvas)]">
        <LoadingState label="Starting CRM…" />
      </div>
    );
  }

  if (!authenticated) {
    return <LoginPanel status={status} onLogin={checkAuth} />;
  }

  return <CrmShell projects={projects} onLogout={logout} />;
}
