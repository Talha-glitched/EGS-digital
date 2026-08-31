import { useCallback, useEffect, useState } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store/store.js';
import './crm.css';
import { crmApiFetch } from './crmApi.js';
import Sidebar from './components/layout/Sidebar.jsx';
import TopNavbar from './components/layout/TopNavbar.jsx';
import SpotlightSearch, { useSpotlightShortcut } from './components/layout/SpotlightSearch.jsx';
import PreviewWorkspaceModal, { isPreviewNoticeDismissed } from './components/ui/PreviewWorkspaceModal.jsx';
import GlobalDashboard from './pages/GlobalDashboard.jsx';
import DesignerDashboard from './pages/DesignerDashboard.jsx';
import ProjectDetailWorkspace from './pages/ProjectDetailWorkspace.jsx';
import PeoplePage from './pages/PeoplePage.jsx';
import CompaniesPage from './pages/CompaniesPage.jsx';
import ProjectsPage from './pages/ProjectsPage.jsx';
import OngoingJobsPage from './pages/OngoingJobsPage.jsx';
import CompletedJobsPage from './pages/CompletedJobsPage.jsx';
import TasksPage from './pages/TasksPage.jsx';
import InventoryPage from './pages/InventoryPage.jsx';
import SequencesPage from './pages/SequencesPage.jsx';
import LiveSendMonitorPage from './pages/LiveSendMonitorPage.jsx';
import EmailHubPage from './pages/EmailHubPage.jsx';
import RelationshipsPage from './pages/RelationshipsPage.jsx';
import TeamSettingsPage from './pages/TeamSettingsPage.jsx';
import EmailSettingsPage from './pages/EmailSettingsPage.jsx';
import UserActivityPage from './pages/UserActivityPage.jsx';
import DataRecoveryPage from './pages/DataRecoveryPage.jsx';
import { UndoToastProvider } from './context/UndoToastContext.jsx';
import { ConfirmDeleteProvider } from './context/ConfirmDeleteContext.jsx';
import { SensitiveDataProvider } from './context/SensitiveDataContext.jsx';
import DeleteUndoToastStack from './components/ui/DeleteUndoToastStack.jsx';
import { Alert, Field, LoadingState } from './components/ui/primitives.jsx';
import { Lock } from 'lucide-react';
import egsLogo from '../../assets/logo/New_Logo/Logo-01.png';

function LegacyCommunicationsRedirect({ defaultTab = '' }) {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  if (defaultTab && !params.has('tab') && !params.has('view')) params.set('tab', defaultTab);
  const query = params.toString();
  return <Navigate to={`/admin/crm/communications${query ? `?${query}` : ''}`} replace />;
}

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
    <main className="crm-root crm-login-shell min-h-screen">
      <div className="grid min-h-screen lg:grid-cols-[minmax(460px,0.9fr)_minmax(560px,1.1fr)]">
        <section className="crm-login-brand-panel hidden flex-col justify-between overflow-hidden p-12 text-white lg:flex xl:p-16">
          <div className="relative z-10">
            <img src={egsLogo} alt="Exhibit Graphic Sign" className="h-auto w-72.5 max-w-full object-contain" />
          </div>
          <div className="relative z-10 max-w-xl crm-login-copy">
            <span className="crm-login-eyebrow">Commercial workspace</span>
            <h1 className="mt-5 max-w-lg text-[clamp(2.75rem,4vw,4.75rem)] font-bold leading-[0.98] tracking-[-0.055em]">Turn conversations into contracts.</h1>
            <p className="mt-6 max-w-lg text-base leading-7 text-white/60">One place for target companies, sales opportunities, follow-ups, controlled outreach, and commercial performance.</p>
            <div className="mt-10 grid max-w-lg grid-cols-3 gap-3">
              <LoginProof value="Companies" label="Relationship history" />
              <LoginProof value="Pipeline" label="Deal progression" />
              <LoginProof value="Actions" label="Nothing forgotten" />
            </div>
          </div>
          <div className="relative z-10 flex items-center justify-between text-xs text-white/35"><span>Internal operations console</span><span>Authorized staff only</span></div>
        </section>

        <section className="crm-login-form-panel flex items-center justify-center p-6 sm:p-10 lg:p-14">
          <form onSubmit={submit} className="crm-login-form w-full max-w-110">
            <div className="mb-8">
              <img src={egsLogo} alt="Exhibit Graphic Sign" className="mb-10 h-auto w-55 object-contain lg:hidden" />
              <span className="crm-login-eyebrow text-brand">EGS Commercial CRM</span>
              <h2 className="mt-3 text-[32px] font-bold tracking-[-0.04em] text-ink">Welcome back</h2>
              <p className="mt-2 text-sm leading-6 text-neutral-500">Sign in to continue to your commercial workspace.</p>
            </div>

            <div className="crm-login-card">
              {!status?.adminConfigured && (
                <Alert tone="warning">Admin credentials are not configured on the server.</Alert>
              )}
              {error && <Alert>{error}</Alert>}

              <Field label="Email">
                <input
                  className="crm-input crm-login-input"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  placeholder="you@company.com"
                />
              </Field>
              <Field label="Password">
                <input
                  type="password"
                  className="crm-input crm-login-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  placeholder="••••••••"
                />
              </Field>

              <div className="flex items-center justify-between text-xs text-neutral-400"><span className="flex items-center gap-1.5"><Lock className="h-3.5 w-3.5" />Secure staff access</span><span>8-hour session</span></div>
              <button type="submit" disabled={busy || !status?.adminConfigured} className="crm-btn-primary w-full py-3!">
                {busy ? 'Signing in…' : 'Sign in to CRM'}
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}

function LoginProof({ value, label }) {
  return <div className="rounded-xl border border-white/10 bg-white/4.5 px-3.5 py-3 backdrop-blur-sm"><p className="text-sm font-semibold text-white">{value}</p><p className="mt-1 text-2xs leading-4 text-white/35">{label}</p></div>;
}

function DesignerShell({ onLogout, status }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [spotlightOpen, setSpotlightOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try { return localStorage.getItem('crm-sidebar-collapsed') === '1'; } catch { return false; }
  });

  function toggleSidebarCollapse() {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try { localStorage.setItem('crm-sidebar-collapsed', next ? '1' : '0'); } catch { /* ignore */ }
      return next;
    });
  }

  const toggleSpotlight = useCallback(() => setSpotlightOpen((prev) => !prev), []);
  const closeSpotlight = useCallback(() => setSpotlightOpen(false), []);
  useSpotlightShortcut(toggleSpotlight);

  return (
    <ConfirmDeleteProvider>
      <UndoToastProvider>
        <SensitiveDataProvider>
          <div className="crm-root flex h-screen overflow-hidden bg-canvas">
            <Sidebar
              activeProject={null}
              onLogout={onLogout}
              mobileOpen={mobileNavOpen}
              onClose={() => setMobileNavOpen(false)}
              collapsed={sidebarCollapsed}
              onToggleCollapse={toggleSidebarCollapse}
              status={status}
              designerMode
            />
            <div className="flex min-h-0 min-w-0 flex-1 flex-col">
              <TopNavbar
                title="Designer Workspace"
                pageInfo="Your assigned tasks and active project pipeline"
                onMenu={() => setMobileNavOpen(true)}
                onOpenSearch={toggleSpotlight}
                status={status}
              />
              <SpotlightSearch open={spotlightOpen} onClose={closeSpotlight} projects={[]} />
              <main className="crm-scroll min-h-0 flex-1 overflow-y-auto">
                <Routes>
                  <Route index element={<DesignerDashboard />} />
                  <Route path="ongoing-jobs" element={<OngoingJobsPage />} />
                  <Route path="completed-jobs" element={<CompletedJobsPage />} />
                  <Route path="pipeline" element={<Navigate to="/admin/crm/ongoing-jobs" replace />} />
                  <Route path="jobs" element={<Navigate to="/admin/crm/completed-jobs" replace />} />
                  <Route path="tasks" element={<TasksPage />} />
                  <Route path="inventory" element={<InventoryPage />} />
                  <Route path="inventory/i/:slug" element={<InventoryPage />} />
                  <Route path="*" element={<Navigate to="/admin/crm" replace />} />
                </Routes>
              </main>
            </div>
            <DeleteUndoToastStack />
          </div>
        </SensitiveDataProvider>
      </UndoToastProvider>
    </ConfirmDeleteProvider>
  );
}

function CrmShell({ projects, onLogout, status }) {
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [spotlightOpen, setSpotlightOpen] = useState(false);
  const [previewNoticeOpen, setPreviewNoticeOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem('crm-sidebar-collapsed') === '1';
    } catch {
      return false;
    }
  });

  function toggleSidebarCollapse() {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('crm-sidebar-collapsed', next ? '1' : '0');
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  const titles = {
    '/admin/crm': ['Dashboard', 'Priority follow-ups, pipeline movement, and active campaigns'],
    '/admin/crm/projects': ['Campaigns', 'Exhibition outreach, target companies, and sequence performance'],
    '/admin/crm/sequences': ['Sequence Studio', 'Whiteboard builder for multi-step outreach flows'],
    '/admin/crm/ongoing-jobs': ['Ongoing Jobs', 'Work in progress from inquiry through execution'],
    '/admin/crm/completed-jobs': ['Jobs Done', 'Completed and past production jobs directory'],
    '/admin/crm/pipeline': ['Ongoing Jobs', 'Work in progress from inquiry through execution'],
    '/admin/crm/jobs': ['Jobs Done', 'Completed and past production jobs directory'],
    '/admin/crm/tasks': ['Tasks', 'Calls, meetings, proposals, and overdue next actions'],
    '/admin/crm/inventory': ['Inventory', 'Track items, quantities, notes, photos, and status across warehouse and job sites'],
    '/admin/crm/relationships': ['Key Relationships', 'Confirmed right POCs, last touchpoints, and follow-up timing'],
    '/admin/crm/people': ['Contacts', 'Search and manage every point of contact'],
    '/admin/crm/companies': ['Companies', 'Target companies, clients, and relationship history'],
    '/admin/crm/communications': ['Communications', 'Replies, outreach, delivery exceptions, search, and Job-linked evidence'],
    '/admin/crm/inbox': ['Communications', 'Replies, outreach, delivery exceptions, search, and Job-linked evidence'],
    '/admin/crm/email': ['Communications', 'Replies, outreach, delivery exceptions, search, and Job-linked evidence'],
    '/admin/crm/sent': ['Communications', 'Replies, outreach, delivery exceptions, search, and Job-linked evidence'],
    '/admin/crm/settings/team': ['Team', 'User accounts, roles, and CRM access'],
    '/admin/crm/settings/email': ['Email settings', 'Configure outbound email delivery'],
    '/admin/crm/settings/activity': ['Activity log', 'Who did what across the CRM'],
    '/admin/crm/settings/recovery': ['Data recovery', 'Roll back recent changes'],
  };
  const projectMatch = location.pathname.match(/^\/admin\/crm\/projects\/([^/]+)$/);
  const isSequenceStudio = location.pathname.startsWith('/admin/crm/sequences');
  const activeProject = projectMatch ? projects.find((p) => p._id === projectMatch[1]) : null;
  const match = titles[location.pathname] || (activeProject
    ? [activeProject.projectName, activeProject.milestone || 'Campaign workspace for target companies, contacts, sequences, and live outreach metrics.']
    : ['Project', 'Leads, sequences, and campaign analytics']);

  const toggleSpotlight = useCallback(() => setSpotlightOpen((prev) => !prev), []);
  const closeSpotlight = useCallback(() => setSpotlightOpen(false), []);
  useSpotlightShortcut(toggleSpotlight);

  useEffect(() => {
    if (isPreviewNoticeDismissed()) return;
    crmApiFetch('/api/admin/workspace/summary')
      .then((summary) => {
        const isPreview = !summary?.metrics?.activeOpportunities && !summary?.openTasks?.length;
        if (isPreview) setPreviewNoticeOpen(true);
      })
      .catch(() => {});
  }, []);

  // Without this, every CRM tab carries the public marketing site's title —
  // indistinguishable from the website in a staff member's tab strip.
  useEffect(() => {
    document.title = `${match[0]} · EGS Commercial CRM`;
  }, [match[0]]);

  return (
    <ConfirmDeleteProvider>
      <UndoToastProvider>
        <SensitiveDataProvider>
        <div className="crm-root flex h-screen overflow-hidden bg-canvas">
        <Sidebar
          activeProject={activeProject}
          onLogout={onLogout}
          mobileOpen={mobileNavOpen}
          onClose={() => setMobileNavOpen(false)}
          collapsed={sidebarCollapsed}
          onToggleCollapse={toggleSidebarCollapse}
          status={status}
        />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <TopNavbar
            title={match[0]}
            pageInfo={match[1]}
            onMenu={() => setMobileNavOpen(true)}
            onOpenSearch={toggleSpotlight}
            status={status}
          />
          <SpotlightSearch open={spotlightOpen} onClose={closeSpotlight} projects={projects} />
          <PreviewWorkspaceModal open={previewNoticeOpen} onClose={() => setPreviewNoticeOpen(false)} />
          <main className={`crm-scroll min-h-0 flex-1 ${isSequenceStudio ? 'overflow-hidden' : 'overflow-y-auto'}`}>
            <Routes>
              <Route index element={<GlobalDashboard />} />
              <Route path="ongoing-jobs" element={<OngoingJobsPage />} />
              <Route path="completed-jobs" element={<CompletedJobsPage />} />
              <Route path="pipeline" element={<Navigate to="/admin/crm/ongoing-jobs" replace />} />
              <Route path="jobs" element={<Navigate to="/admin/crm/completed-jobs" replace />} />
              <Route path="tasks" element={<TasksPage />} />
              <Route path="inventory" element={<InventoryPage />} />
              <Route path="inventory/i/:slug" element={<InventoryPage />} />
              <Route path="relationships" element={<RelationshipsPage />} />
              <Route path="projects" element={<ProjectsPage initialProjects={projects} />} />
              <Route path="projects/:id" element={<ProjectDetailWorkspace />} />
              <Route path="sequences" element={<SequencesPage />} />
              <Route path="sequence-live/:batchId" element={<LiveSendMonitorPage />} />
              <Route path="people" element={<PeoplePage />} />
              <Route path="companies" element={<CompaniesPage />} />
              <Route path="communications" element={<EmailHubPage />} />
              <Route path="inbox" element={<LegacyCommunicationsRedirect defaultTab="inbox" />} />
              <Route path="email" element={<LegacyCommunicationsRedirect />} />
              <Route path="sent" element={<LegacyCommunicationsRedirect defaultTab="sent" />} />
              <Route path="settings/team" element={<TeamSettingsPage />} />
              <Route path="settings/email" element={<EmailSettingsPage />} />
              <Route path="settings/activity" element={<UserActivityPage />} />
              <Route path="settings/recovery" element={<DataRecoveryPage />} />
              <Route path="flows" element={<Navigate to="/admin/crm/sequences" replace />} />
              <Route path="*" element={<Navigate to="/admin/crm" replace />} />
            </Routes>
          </main>
        </div>
        <DeleteUndoToastStack />
      </div>
        </SensitiveDataProvider>
      </UndoToastProvider>
    </ConfirmDeleteProvider>
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

  useEffect(() => {
    document.title = 'EGS Commercial CRM';
  }, []);

  useEffect(() => {
    const handleUnauthorized = () => {
      setAuthenticated(false);
      navigate('/admin/crm');
    };
    window.addEventListener('crm:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('crm:unauthorized', handleUnauthorized);
  }, [navigate]);

  async function logout() {
    await crmApiFetch('/api/admin/logout', { method: 'POST' });
    setAuthenticated(false);
    navigate('/admin/crm');
  }

  if (!status) {
    return (
      <div className="crm-root min-h-screen bg-canvas">
        <LoadingState label="Starting CRM…" />
      </div>
    );
  }

  if (!authenticated) {
    return <LoginPanel status={status} onLogin={checkAuth} />;
  }

  const isDesigner = status?.user?.role === 'designer';
  return (
    <Provider store={store}>
      {isDesigner ? (
        <DesignerShell onLogout={logout} status={status} />
      ) : (
        <CrmShell projects={projects} onLogout={logout} status={status} />
      )}
    </Provider>
  );
}
