import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ADMIN_EMAIL_NAV,
  DEFAULT_BODY,
  DEFAULT_SUBJECT,
  MERGE_FIELDS,
  NAV_STORAGE_KEY,
} from './config.js';
import {
  adminApiFetch,
  extractContacts,
  formatInboxDate,
  loadPresets,
  renderPreviewHtml,
  savePresets,
} from './emailAdminLib.js';
import '../../styles/pages/admin-email.css';

function useToasts() {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((message, tone = 'info') => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setToasts((prev) => [...prev, { id, message, tone }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5200);
  }, []);
  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);
  return { toasts, push, dismiss };
}

function LoginPanel({ onLogin, status }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await adminApiFetch('/api/admin/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
      onLogin();
    } catch (loginError) {
      setError(loginError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="admin-login">
      <form className="admin-login-panel" onSubmit={submit}>
        <span className="admin-kicker">EGS internal</span>
        <h1>Operations console</h1>
        <p>Sign in to manage campaigns, inbox, suppressions, and templates.</p>
        {!status?.adminConfigured && (
          <div className="admin-alert">Admin credentials are not configured in the server environment.</div>
        )}
        {error && <div className="admin-alert">{error}</div>}
        <label>
          Username
          <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </label>
        <button type="submit" disabled={busy || !status?.adminConfigured}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </main>
  );
}

function StatGrid({ stats = {} }) {
  const items = ['queued', 'sending', 'sent', 'failed', 'replied', 'unsubscribed', 'skipped', 'total'];
  return (
    <div className="campaign-stats">
      {items.map((item) => (
        <div key={item}>
          <span>{item}</span>
          <strong>{stats[item] || 0}</strong>
        </div>
      ))}
    </div>
  );
}

function statusTone(status) {
  if (status === 'running') return 'admin-pill--live';
  if (status === 'completed') return 'admin-pill--ok';
  if (status === 'paused' || status === 'draft') return 'admin-pill--muted';
  if (status === 'cancelled') return 'admin-pill--warn';
  return '';
}

function readInitialNav() {
  try {
    const v = localStorage.getItem(NAV_STORAGE_KEY);
    if (v && ADMIN_EMAIL_NAV.some((n) => n.id === v)) return v;
  } catch {
    /* ignore */
  }
  return 'overview';
}

async function downloadRecipientsCsv(campaignId) {
  const res = await fetch(`/api/admin/campaigns/${campaignId}/recipients-export`, { credentials: 'include' });
  if (!res.ok) {
    let msg = 'Export failed.';
    try {
      const j = await res.json();
      msg = j.message || msg;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `campaign-${campaignId}-recipients.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminEmailApp() {
  const { toasts, push, dismiss } = useToasts();
  const [status, setStatus] = useState(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [activeNav, setActiveNav] = useState(readInitialNav);

  const [overview, setOverview] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);

  const [contacts, setContacts] = useState([]);
  const [invalidRows, setInvalidRows] = useState([]);
  const [duplicates, setDuplicates] = useState([]);
  const [campaignName, setCampaignName] = useState(`EGS outreach ${new Date().toLocaleDateString()}`);
  const [subject, setSubject] = useState(DEFAULT_SUBJECT);
  const [body, setBody] = useState(DEFAULT_BODY);

  const [inboxRawRows, setInboxRawRows] = useState([]);
  const [inboxRawMeta, setInboxRawMeta] = useState(null);
  const [inboxLoading, setInboxLoading] = useState(false);
  const [inboxMatchedOnly, setInboxMatchedOnly] = useState(false);
  const [inboxFilterCampaignId, setInboxFilterCampaignId] = useState('');
  const [inboxDetail, setInboxDetail] = useState(null);

  const [suppressions, setSuppressions] = useState([]);
  const [suppressionsLoading, setSuppressionsLoading] = useState(false);

  const [presets, setPresets] = useState(() => loadPresets());
  const [presetName, setPresetName] = useState('');
  const [testTo, setTestTo] = useState('');

  const sampleContact = contacts[0] || { email: 'name@company.com', name: 'there', company: 'your team' };
  const previewHtml = useMemo(() => renderPreviewHtml({ subject, body }, sampleContact), [subject, body, sampleContact]);

  const selectedEditable = selected?.campaign && ['draft', 'paused'].includes(selected.campaign.status);

  const refreshStatus = useCallback(async () => {
    const next = await adminApiFetch('/api/admin/status');
    setStatus(next);
    setAuthenticated(next.authenticated);
  }, []);

  const refreshOverview = useCallback(async () => {
    if (!authenticated) return;
    try {
      setOverview(await adminApiFetch('/api/admin/overview'));
    } catch (e) {
      push(e.message, 'error');
    }
  }, [authenticated, push]);

  const refreshCampaigns = useCallback(async () => {
    if (!authenticated) return;
    const list = await adminApiFetch('/api/admin/campaigns');
    setCampaigns(list);
    setSelectedId((prev) => {
      if (prev && list.some((c) => c._id === prev)) return prev;
      return list[0]?._id || '';
    });
  }, [authenticated]);

  const refreshSelected = useCallback(
    async (id = selectedId) => {
      if (!id || !authenticated) return;
      setSelected(await adminApiFetch(`/api/admin/campaigns/${id}`));
    },
    [selectedId, authenticated]
  );

  const inboxDisplayRows = useMemo(() => {
    let list = inboxRawRows;
    if (inboxMatchedOnly) list = list.filter((m) => m.crmReply);
    if (inboxFilterCampaignId) {
      list = list.filter(
        (m) => !m.crmReply || String(m.crmReply.campaignId) === inboxFilterCampaignId
      );
    }
    return list;
  }, [inboxRawRows, inboxMatchedOnly, inboxFilterCampaignId]);

  const refreshInbox = useCallback(async () => {
    if (!authenticated) return;
    setInboxLoading(true);
    try {
      const data = await adminApiFetch('/api/admin/inbox/raw?limit=220');
      setInboxRawMeta({ syncDays: data.syncDays, imapUidCount: data.imapUidCount });
      setInboxRawRows(Array.isArray(data.messages) ? data.messages : []);
    } catch (e) {
      push(e.message, 'error');
      setInboxRawRows([]);
      setInboxRawMeta(null);
    } finally {
      setInboxLoading(false);
    }
  }, [authenticated, push]);

  const refreshSuppressions = useCallback(async () => {
    if (!authenticated) return;
    setSuppressionsLoading(true);
    try {
      const rows = await adminApiFetch('/api/admin/suppressions?limit=300');
      setSuppressions(Array.isArray(rows) ? rows : []);
    } catch (e) {
      push(e.message, 'error');
    } finally {
      setSuppressionsLoading(false);
    }
  }, [authenticated, push]);

  useEffect(() => {
    refreshStatus().catch(() => setStatus({ authenticated: false, adminConfigured: false }));
  }, [refreshStatus]);

  useEffect(() => {
    if (!authenticated) return;
    refreshCampaigns().catch((e) => push(e.message, 'error'));
    refreshOverview().catch(() => {});
  }, [authenticated, refreshCampaigns, refreshOverview, push]);

  useEffect(() => {
    refreshSelected().catch((e) => push(e.message, 'error'));
  }, [refreshSelected, push]);

  useEffect(() => {
    if (!authenticated) return undefined;
    const t = setInterval(() => {
      refreshCampaigns().catch(() => {});
      refreshSelected().catch(() => {});
      refreshOverview().catch(() => {});
      if (activeNav === 'inbox') refreshInbox().catch(() => {});
    }, 12000);
    return () => clearInterval(t);
  }, [authenticated, selectedId, activeNav, refreshCampaigns, refreshSelected, refreshOverview, refreshInbox]);

  useEffect(() => {
    try {
      localStorage.setItem(NAV_STORAGE_KEY, activeNav);
    } catch {
      /* ignore */
    }
  }, [activeNav]);

  useEffect(() => {
    if (authenticated && activeNav === 'inbox') refreshInbox().catch(() => {});
  }, [authenticated, activeNav, refreshInbox]);

  useEffect(() => {
    if (authenticated && activeNav === 'suppressions') refreshSuppressions().catch(() => {});
  }, [authenticated, activeNav, refreshSuppressions]);

  async function handleFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const XLSX = await import('xlsx');
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const result = extractContacts(workbook, XLSX);
    setContacts(result.contacts);
    setInvalidRows(result.invalidRows);
    setDuplicates(result.duplicates);
    push(`Imported ${result.contacts.length} unique contacts.`, 'success');
  }

  async function saveNewCampaign() {
    setBusy(true);
    try {
      const campaign = await adminApiFetch('/api/admin/campaigns', {
        method: 'POST',
        body: JSON.stringify({ name: campaignName, subject, body, contacts }),
      });
      setSelectedId(campaign._id);
      push('Draft saved.', 'success');
      await refreshCampaigns();
      await refreshSelected(campaign._id);
      setActiveNav('campaigns');
    } catch (e) {
      push(e.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  async function applyDraftToServer() {
    if (!selectedId || !selectedEditable) return;
    setBusy(true);
    try {
      await adminApiFetch(`/api/admin/campaigns/${selectedId}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: campaignName, subject, body }),
      });
      push('Campaign updated.', 'success');
      await refreshCampaigns();
      await refreshSelected();
    } catch (e) {
      push(e.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  async function loadFromSelectedCampaign() {
    if (!selected?.campaign) return;
    setSubject(selected.campaign.subject || '');
    setBody(selected.campaign.body || '');
    setCampaignName(selected.campaign.name || campaignName);
    push('Loaded template from selected campaign.', 'success');
    setActiveNav('template');
  }

  async function duplicateSelected() {
    if (!selectedId) return;
    setBusy(true);
    try {
      const campaign = await adminApiFetch(`/api/admin/campaigns/${selectedId}/duplicate`, {
        method: 'POST',
        body: '{}',
      });
      setSelectedId(campaign._id);
      push('Duplicate draft created.', 'success');
      await refreshCampaigns();
      await refreshSelected(campaign._id);
    } catch (e) {
      push(e.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  async function campaignAction(action) {
    if (!selectedId) return;
    setBusy(true);
    try {
      await adminApiFetch(`/api/admin/campaigns/${selectedId}/${action}`, { method: 'POST', body: '{}' });
      push(`Campaign ${action} requested.`, 'success');
      await refreshCampaigns();
      await refreshSelected();
      await refreshOverview();
    } catch (e) {
      push(e.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  async function syncReplies() {
    setBusy(true);
    try {
      const stats = await adminApiFetch('/api/admin/replies/sync', { method: 'POST', body: '{}' });
      const bits = [];
      if (stats.error) {
        bits.push(`Sync error: ${stats.error}`);
      } else {
        bits.push(`${stats.stored ?? 0} new replies saved`);
        bits.push(`${stats.scanned ?? 0} messages scanned`);
        if (typeof stats.imapMessages === 'number') bits.push(`${stats.imapMessages} in INBOX (last ${stats.syncDays ?? '?'}d)`);
        if (stats.skippedNoRecipient) bits.push(`${stats.skippedNoRecipient} skipped — no matching recipient`);
        if (stats.skippedDuplicate) bits.push(`${stats.skippedDuplicate} already in database`);
        if (stats.searchCapped) bits.push(`processed newest ${stats.processingUids} of ${stats.imapMessages}`);
        if (stats.note) bits.push(stats.note);
      }
      push(bits.join(' · '), stats.error ? 'error' : 'success');
      await refreshSelected();
      await refreshInbox();
      await refreshOverview();
    } catch (e) {
      push(e.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  async function sendTest() {
    setBusy(true);
    try {
      await adminApiFetch('/api/admin/send-test', {
        method: 'POST',
        body: JSON.stringify({ to: testTo, subject, body }),
      });
      push('Test email sent.', 'success');
    } catch (e) {
      push(e.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    try {
      await adminApiFetch('/api/admin/logout', { method: 'POST', body: '{}' });
    } catch {
      /* ignore */
    }
    setAuthenticated(false);
    setStatus((prev) => (prev ? { ...prev, authenticated: false } : prev));
  }

  function insertMerge(token) {
    setBody((prev) => `${prev}${prev && !prev.endsWith('\n') ? ' ' : ''}${token}`);
  }

  function savePresetLocal() {
    const name = presetName.trim();
    if (!name) {
      push('Enter a preset name.', 'error');
      return;
    }
    const next = [...presets.filter((p) => p.name !== name), { name, subject, body }];
    setPresets(next);
    savePresets(next);
    setPresetName('');
    push(`Preset "${name}" saved in this browser.`, 'success');
  }

  function applyPreset(name) {
    const p = presets.find((x) => x.name === name);
    if (!p) return;
    setSubject(p.subject);
    setBody(p.body);
    push(`Applied preset "${p.name}".`, 'success');
  }

  if (!status || !authenticated) {
    return <LoginPanel status={status} onLogin={refreshStatus} />;
  }

  const configWarnings = [
    !status.mongodbReady && 'MongoDB is required before campaigns can be saved or sent.',
    !status.smtpReady && 'SMTP settings are missing, so sending is disabled.',
    !status.imapReady && 'IMAP settings are missing, so reply sync is disabled.',
    status.imapReady &&
      status.imapTlsVerify === false &&
      'IMAP TLS verification is off. Prefer NODE_EXTRA_CA_CERTS in production.',
  ].filter(Boolean);

  return (
    <div className="admin-app-shell">
      <aside className="admin-sidebar" aria-label="Admin navigation">
        <div className="admin-sidebar-brand">
          <span className="admin-kicker">EGS</span>
          <strong>Mail ops</strong>
        </div>
        <nav className="admin-sidebar-nav">
          {ADMIN_EMAIL_NAV.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`admin-sidebar-link${activeNav === item.id ? ' admin-sidebar-link--active' : ''}`}
              onClick={() => setActiveNav(item.id)}
            >
              <span className="admin-sidebar-link-label">{item.label}</span>
              <span className="admin-sidebar-link-blurb">{item.blurb}</span>
            </button>
          ))}
        </nav>
        <div className="admin-sidebar-footer">
          <button type="button" className="admin-btn-secondary admin-sidebar-logout" onClick={logout}>
            Sign out
          </button>
        </div>
      </aside>

      <div className="admin-main">
        <header className="admin-main-header">
          <div>
            <h1 className="admin-main-title">{ADMIN_EMAIL_NAV.find((n) => n.id === activeNav)?.label || 'Admin'}</h1>
            <p className="admin-main-sub">{ADMIN_EMAIL_NAV.find((n) => n.id === activeNav)?.blurb}</p>
          </div>
          <div className="admin-health-row">
            <span className={`admin-pill${status.mongodbReady ? ' admin-pill--ok' : ' admin-pill--bad'}`}>Mongo</span>
            <span className={`admin-pill${status.smtpReady ? ' admin-pill--ok' : ' admin-pill--bad'}`}>SMTP</span>
            <span className={`admin-pill${status.imapReady ? ' admin-pill--ok' : ' admin-pill--bad'}`}>IMAP</span>
            <span className="admin-pill admin-pill--muted">≤{status.throttlePerHour || 200}/h</span>
            <button type="button" className="admin-toolbar-btn" onClick={() => { refreshStatus(); refreshOverview(); push('Refreshed.', 'success'); }}>
              Refresh status
            </button>
            <button type="button" className="inbox-sync-primary" onClick={syncReplies} disabled={busy || !status.imapReady}>
              Sync mailbox
            </button>
          </div>
        </header>

        <div className="admin-main-scroll">
          {configWarnings.map((w) => (
            <div className="admin-alert" key={w}>{w}</div>
          ))}

          {activeNav === 'overview' && (
            <section className="admin-section">
              <div className="admin-card-grid">
                <article className="admin-card">
                  <h3>Campaigns</h3>
                  <p className="admin-card-metric">{overview?.totalCampaigns ?? '—'}</p>
                  <p className="admin-card-note">Total records in MongoDB</p>
                </article>
                <article className="admin-card">
                  <h3>Inbox rows</h3>
                  <p className="admin-card-metric">{overview?.inboxTotal ?? '—'}</p>
                  <p className="admin-card-note">Stored replies (after IMAP sync)</p>
                </article>
                <article className="admin-card">
                  <h3>Suppressions</h3>
                  <p className="admin-card-metric">{overview?.suppressionsTotal ?? '—'}</p>
                  <p className="admin-card-note">Unsubscribes and hard-fails</p>
                </article>
                <article className="admin-card">
                  <h3>Active send</h3>
                  <p className="admin-card-metric">{overview?.runningCampaign?.name || 'None'}</p>
                  <p className="admin-card-note">
                    {overview?.runningCampaign?.updatedAt
                      ? `Updated ${formatInboxDate(overview.runningCampaign.updatedAt)}`
                      : 'No campaign in running state'}
                  </p>
                </article>
              </div>
              <div className="admin-panel flat admin-panel--stretch">
                <h3>Status mix</h3>
                <div className="admin-chip-row">
                  {['draft', 'running', 'paused', 'completed', 'cancelled'].map((s) => (
                    <span key={s} className="admin-chip">
                      {s}: <strong>{overview?.byStatus?.[s] ?? 0}</strong>
                    </span>
                  ))}
                </div>
              </div>
            </section>
          )}

          {activeNav === 'inbox' && (
            <section className="admin-section">
              <p className="admin-inbox-explainer">
                This list loads <strong>all messages</strong> from IMAP INBOX (newest first, within your configured lookback).
                <strong> In CRM</strong> means the message was saved as a campaign reply (after sync).
                <strong> Can link</strong> means sync could attach it to a sent recipient (headers or sender match); use{' '}
                <strong>Sync mailbox</strong> to import those into CRM.
                {inboxRawMeta && (
                  <> Showing <strong>{inboxDisplayRows.length}</strong> of <strong>{inboxRawRows.length}</strong> loaded
                  {typeof inboxRawMeta.syncDays === 'number' && (
                    <> · lookback ~<strong>{inboxRawMeta.syncDays}</strong>d</>
                  )}.</>
                )}
              </p>
              <div className="admin-toolbar-row admin-inbox-toolbar">
                <label className="admin-inline-label">
                  <span>Campaign (CRM rows)</span>
                  <select
                    value={inboxFilterCampaignId}
                    onChange={(e) => setInboxFilterCampaignId(e.target.value)}
                    className="admin-select-compact"
                  >
                    <option value="">All + unmatched mail</option>
                    {campaigns.map((c) => (
                      <option key={c._id} value={c._id}>{c.name}</option>
                    ))}
                  </select>
                </label>
                <label className="admin-check">
                  <input
                    type="checkbox"
                    checked={inboxMatchedOnly}
                    onChange={(e) => setInboxMatchedOnly(e.target.checked)}
                  />
                  <span>Only messages in CRM (matched replies)</span>
                </label>
                <button type="button" className="admin-toolbar-btn" onClick={() => refreshInbox()} disabled={inboxLoading}>
                  {inboxLoading ? 'Loading…' : 'Reload from mailbox'}
                </button>
              </div>
              <div className="admin-panel flat admin-panel--full">
                <div className="contact-table inbox-table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>From</th>
                        <th>To</th>
                        <th>Subject</th>
                        <th>Preview</th>
                        <th>In CRM</th>
                        <th>Can link</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inboxDisplayRows.length === 0 && !inboxLoading ? (
                        <tr>
                          <td colSpan={7} className="admin-table-empty">
                            No messages in this view. Reload from mailbox or widen filters (
                            <code>EMAIL_IMAP_SYNC_DAYS</code> on the server).
                          </td>
                        </tr>
                      ) : (
                        inboxDisplayRows.map((row) => (
                          <tr
                            key={`${row.uid}-${row.messageId}`}
                            className="admin-click-row"
                            onClick={() => setInboxDetail(row)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                setInboxDetail(row);
                              }
                            }}
                            tabIndex={0}
                            role="button"
                          >
                            <td>{formatInboxDate(row.date)}</td>
                            <td className="inbox-cell-clip">{row.from || '—'}</td>
                            <td className="inbox-cell-clip">{row.to || '—'}</td>
                            <td className="inbox-cell-clip">{row.subject || '—'}</td>
                            <td className="inbox-cell-preview">{row.snippet?.slice(0, 140) || '—'}</td>
                            <td>
                              {row.crmReply ? (
                                <span className="admin-pill admin-pill--sm admin-pill--ok" title={row.crmReply.campaignName}>
                                  Yes
                                </span>
                              ) : (
                                <span className="admin-pill admin-pill--sm admin-pill--muted">No</span>
                              )}
                            </td>
                            <td>
                              {row.crmReply ? (
                                <span className="admin-pill admin-pill--sm admin-pill--muted">—</span>
                              ) : row.canImport ? (
                                <span className="admin-pill admin-pill--sm admin-pill--live">Yes</span>
                              ) : row.canImportSkipped ? (
                                <span className="admin-pill admin-pill--sm admin-pill--warn" title="Not checked (list cap)">?</span>
                              ) : (
                                <span className="admin-pill admin-pill--sm admin-pill--muted">No</span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}

          {activeNav === 'campaigns' && (
            <section className="admin-section admin-split-layout">
              <div className="admin-master">
                <div className="admin-panel flat">
                  <h3>All campaigns</h3>
                  <div className="contact-table admin-master-table">
                    <table>
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Status</th>
                          <th>Updated</th>
                        </tr>
                      </thead>
                      <tbody>
                        {campaigns.map((c) => (
                          <tr
                            key={c._id}
                            className={selectedId === c._id ? 'admin-row-selected' : ''}
                            onClick={() => setSelectedId(c._id)}
                          >
                            <td>{c.name}</td>
                            <td>
                              <span className={`admin-pill admin-pill--sm ${statusTone(c.status)}`}>{c.status}</span>
                            </td>
                            <td className="admin-muted-td">{formatInboxDate(c.updatedAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
              <div className="admin-detail">
                {selected?.campaign ? (
                  <>
                    <div className="admin-panel">
                      <div className="admin-detail-head">
                        <div>
                          <h3>{selected.campaign.name}</h3>
                          <span className={`admin-pill ${statusTone(selected.campaign.status)}`}>
                            {selected.campaign.status}
                          </span>
                        </div>
                        <div className="admin-actions admin-actions--wrap">
                          <button type="button" onClick={() => campaignAction('start')} disabled={busy || !status.smtpReady}>Start</button>
                          <button type="button" onClick={() => campaignAction('pause')} disabled={busy}>Pause</button>
                          <button type="button" onClick={() => campaignAction('resume')} disabled={busy || !status.smtpReady}>Resume</button>
                          <button type="button" onClick={() => campaignAction('cancel')} disabled={busy}>Cancel</button>
                          <button type="button" className="admin-toolbar-btn" onClick={() => duplicateSelected()} disabled={busy}>
                            Duplicate
                          </button>
                          <button
                            type="button"
                            className="admin-toolbar-btn"
                            onClick={() => downloadRecipientsCsv(selectedId).catch((e) => push(e.message, 'error'))}
                          >
                            Export CSV
                          </button>
                          <button type="button" className="admin-toolbar-btn" onClick={() => loadFromSelectedCampaign()} disabled={busy}>
                            Load to template
                          </button>
                        </div>
                      </div>
                      <StatGrid stats={selected.campaign.stats} />
                    </div>
                    <div className="admin-panel flat">
                      <h4>Recipients</h4>
                      <div className="contact-table">
                        <table>
                          <thead><tr><th>Email</th><th>Status</th><th>Issue</th></tr></thead>
                          <tbody>
                            {selected.recipients?.slice(0, 50).map((r) => (
                              <tr key={r._id}>
                                <td>{r.email}</td>
                                <td>{r.status}</td>
                                <td>{r.failureReason || '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    <div className="admin-panel">
                      <h4>New draft from list</h4>
                      <p className="admin-small admin-small--tight">Import a spreadsheet, tune copy on Template, then save here.</p>
                      <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} />
                      <div className="import-summary">
                        <span>{contacts.length} contacts</span>
                        <span>{duplicates.length} dupes</span>
                        <span>{invalidRows.length} invalid</span>
                      </div>
                      <label>
                        Campaign name
                        <input value={campaignName} onChange={(e) => setCampaignName(e.target.value)} />
                      </label>
                      <div className="admin-actions">
                        <button type="button" onClick={saveNewCampaign} disabled={busy || contacts.length === 0 || !status.mongodbReady}>
                          Save new draft
                        </button>
                        <button type="button" onClick={applyDraftToServer} disabled={busy || !selectedEditable || !status.mongodbReady}>
                          Apply template to this draft
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="admin-empty">Select a campaign or create one from the Template tab.</div>
                )}
              </div>
            </section>
          )}

          {activeNav === 'template' && (
            <section className="admin-section">
              <div className="admin-template-toolbar">
                <div className="admin-merge-row">
                  {MERGE_FIELDS.map((f) => (
                    <button key={f.token} type="button" className="admin-chip-btn" onClick={() => insertMerge(f.token)}>
                      {f.label}
                    </button>
                  ))}
                </div>
                <div className="admin-preset-row">
                  <select onChange={(e) => e.target.value && applyPreset(e.target.value)} defaultValue="">
                    <option value="">Load preset…</option>
                    {presets.map((p) => (
                      <option key={p.name} value={p.name}>{p.name}</option>
                    ))}
                  </select>
                  <input
                    placeholder="Preset name"
                    value={presetName}
                    onChange={(e) => setPresetName(e.target.value)}
                  />
                  <button type="button" className="admin-toolbar-btn" onClick={savePresetLocal}>Save preset</button>
                </div>
                <div className="admin-test-row">
                  <input
                    placeholder="Test recipient email"
                    value={testTo}
                    onChange={(e) => setTestTo(e.target.value)}
                  />
                  <button type="button" className="inbox-sync-primary" onClick={sendTest} disabled={busy || !status.smtpReady}>
                    Send test
                  </button>
                </div>
              </div>
              <div className="admin-grid">
                <div className="admin-panel">
                  <label>
                    Subject
                    <input value={subject} onChange={(e) => setSubject(e.target.value)} />
                  </label>
                  <label>
                    Body
                    <textarea value={body} rows={16} onChange={(e) => setBody(e.target.value)} />
                  </label>
                  <p className="admin-small">Preview uses first imported row or sample data.</p>
                </div>
                <div className="admin-panel preview-panel">
                  <h3>Preview</h3>
                  <iframe title="Email preview" srcDoc={previewHtml} />
                </div>
              </div>
            </section>
          )}

          {activeNav === 'suppressions' && (
            <section className="admin-section">
              <div className="admin-toolbar-row">
                <button type="button" className="admin-toolbar-btn" onClick={() => refreshSuppressions()} disabled={suppressionsLoading}>
                  {suppressionsLoading ? 'Loading…' : 'Reload'}
                </button>
              </div>
              <div className="admin-panel flat admin-panel--full">
                <div className="contact-table inbox-table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Email</th>
                        <th>Reason</th>
                        <th>Updated</th>
                      </tr>
                    </thead>
                    <tbody>
                      {suppressions.length === 0 && !suppressionsLoading ? (
                        <tr>
                          <td colSpan={3} className="admin-table-empty">No suppressions recorded.</td>
                        </tr>
                      ) : (
                        suppressions.map((row) => (
                          <tr key={row._id}>
                            <td>{row.email}</td>
                            <td>{row.reason}</td>
                            <td>{formatInboxDate(row.updatedAt)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>

      {inboxDetail && (
        <div
          className="admin-modal-backdrop"
          role="presentation"
          onClick={() => setInboxDetail(null)}
        >
          <div
            className="admin-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="inbox-detail-title"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="admin-modal-head">
              <h2 id="inbox-detail-title">{inboxDetail.snippet !== undefined ? 'Mailbox message' : 'Reply in CRM'}</h2>
              <button type="button" className="admin-modal-close" onClick={() => setInboxDetail(null)} aria-label="Close">
                ×
              </button>
            </header>
            {inboxDetail.snippet !== undefined ? (
              <>
                <dl className="admin-dl">
                  <dt>IMAP UID</dt><dd>{inboxDetail.uid}</dd>
                  <dt>Message-ID</dt><dd className="admin-mono">{inboxDetail.messageId || '—'}</dd>
                  <dt>From</dt><dd>{inboxDetail.from || '—'}</dd>
                  <dt>To</dt><dd>{inboxDetail.to || '—'}</dd>
                  <dt>Subject</dt><dd>{inboxDetail.subject || '—'}</dd>
                  <dt>Date</dt><dd>{formatInboxDate(inboxDetail.date)}</dd>
                  <dt>In CRM</dt>
                  <dd>
                    {inboxDetail.crmReply
                      ? `Yes — ${inboxDetail.crmReply.campaignName} (${inboxDetail.crmReply.recipientEmail || ''})`
                      : 'No'}
                  </dd>
                  <dt>Can link on sync</dt>
                  <dd>
                    {inboxDetail.crmReply
                      ? 'Already stored'
                      : inboxDetail.canImportSkipped
                        ? 'Not evaluated (list too long)'
                        : inboxDetail.canImport
                          ? 'Yes — run Sync mailbox to save'
                          : 'No matching sent recipient'}
                  </dd>
                </dl>
                <h4 className="admin-modal-body-title">Snippet</h4>
                <pre className="admin-pre">{inboxDetail.snippet || '—'}</pre>
              </>
            ) : (
              <>
                <dl className="admin-dl">
                  <dt>Campaign</dt><dd>{inboxDetail.campaignName}</dd>
                  <dt>Recipient</dt><dd>{inboxDetail.email}</dd>
                  <dt>From</dt><dd>{inboxDetail.from}</dd>
                  <dt>Subject</dt><dd>{inboxDetail.subject || '—'}</dd>
                  <dt>Received</dt><dd>{formatInboxDate(inboxDetail.receivedAt)}</dd>
                </dl>
                <h4 className="admin-modal-body-title">Body (stored snippet)</h4>
                <pre className="admin-pre">{inboxDetail.text || '—'}</pre>
              </>
            )}
          </div>
        </div>
      )}

      <div className="admin-toast-stack" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`admin-toast admin-toast--${t.tone}`}>
            <span>{t.message}</span>
            <button type="button" className="admin-toast-dismiss" onClick={() => dismiss(t.id)} aria-label="Dismiss">
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
