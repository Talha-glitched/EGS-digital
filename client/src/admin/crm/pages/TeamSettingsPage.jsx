import { useEffect, useMemo, useState } from 'react';
import {
  createUser,
  fetchEmailDeliveryStatus,
  fetchUsers,
  fetchUserRoles,
  setUserPassword,
  updateUser,
} from '../crmApi.js';
import {
  Alert,
  EmptyState,
  LoadingState,
  MetricGrid,
  PageSection,
  PageShell,
  StatCard,
} from '../components/ui/primitives.jsx';
import { Mail, UserPlus, Users, UserCheck, UserX } from 'lucide-react';
import CreateUserModal from '../components/settings/CreateUserModal.jsx';
import RoleBadge from '../components/settings/RoleBadge.jsx';
import SettingsPageHeader from '../components/settings/SettingsPageHeader.jsx';
import SettingsShell from '../components/settings/SettingsShell.jsx';
import UserAdminDrawer from '../components/settings/UserAdminDrawer.jsx';
import CredentialResultModal from '../components/settings/CredentialResultModal.jsx';
import { formatSettingsWhen, userInitials } from '../components/settings/settingsUtils.js';
import DataTableShell from '../components/ui/DataTableShell.jsx';
import ClickableTableRow from '../components/ui/ClickableTableRow.jsx';
import { SortableTableHeader, TableSortIndicator } from '../components/ui/SortableTableHeader.jsx';
import { useTableSort } from '../hooks/useTableSort.js';
import { userSortAccessors } from '../hooks/tableSortAccessors.js';

export default function TeamSettingsPage() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [credentialResult, setCredentialResult] = useState(null);
  const [emailReady, setEmailReady] = useState(false);

  async function load() {
    const [userRows, roleRows, emailStatus] = await Promise.all([
      fetchUsers(),
      fetchUserRoles(),
      fetchEmailDeliveryStatus().catch(() => ({ smtpReady: false })),
    ]);
    setUsers(userRows);
    setRoles(roleRows);
    setEmailReady(Boolean(emailStatus?.smtpReady));
  }

  useEffect(() => {
    setLoading(true);
    load().catch((err) => setError(err.message)).finally(() => setLoading(false));
  }, []);

  const stats = useMemo(() => {
    const active = users.filter((user) => user.isActive).length;
    const mustChange = users.filter((user) => user.mustChangePassword).length;
    return { active, inactive: users.length - active, mustChange };
  }, [users]);

  const { sortKey, sortDir, sortLabel, toggleSort, clearSort, sortItems } = useTableSort({
    defaultKey: 'displayName',
    defaultDir: 'asc',
    accessors: userSortAccessors,
  });

  const sortedUsers = useMemo(() => sortItems(users), [users, sortItems]);

  async function handleSave(payload) {
    if (editingUser) {
      const { sendWelcomeEmail, password, ...body } = payload;
      await updateUser(editingUser.id, {
        displayName: body.displayName,
        role: body.role,
      });
      if (password) {
        await setUserPassword(editingUser.id, password);
      }
    } else {
      const created = await createUser(payload);
      if (created.emailed) {
        setCredentialResult({
          emailed: true,
          temporaryPassword: payload.password,
          user: created,
          loginUrl: `${window.location.origin}/admin/crm`,
        });
      } else if (payload.password) {
        setCredentialResult({
          emailed: false,
          temporaryPassword: payload.password,
          user: created,
          loginUrl: `${window.location.origin}/admin/crm`,
        });
      }
    }
    setModalOpen(false);
    setEditingUser(null);
    await load();
  }

  return (
    <PageShell>
      <SettingsShell>
        <div className="crm-settings-page">
          <SettingsPageHeader
            title="Team access"
            subtitle="Manage CRM accounts, roles, and secure credential delivery."
            action={(
              <button type="button" className="crm-btn-primary" onClick={() => { setEditingUser(null); setModalOpen(true); }}>
                <UserPlus className="h-4 w-4" />
                Add user
              </button>
            )}
          />

          {!emailReady && !loading && (
            <Alert tone="warning" className="mb-0">
              Email delivery is off. Configure EMAIL_SMTP_* on the server to send login details automatically.
            </Alert>
          )}

          <PageSection>
            <MetricGrid cols={3}>
              <StatCard compact label="Team members" value={users.length} icon={Users} tone="brand" />
              <StatCard compact label="Active" value={stats.active} icon={UserCheck} tone="success" />
              <StatCard compact label="Pending password change" value={stats.mustChange} icon={Mail} tone="warning" helpText={`${stats.inactive} inactive`} />
            </MetricGrid>
          </PageSection>

          <PageSection>
            {error && <Alert className="mb-3">{error}</Alert>}

            {loading ? (
              <LoadingState label="Loading team…" />
            ) : users.length === 0 ? (
              <EmptyState title="No users yet" description="Add your first team member to get started." />
            ) : (
              <div className="crm-settings-panel">
                <TableSortIndicator
                  sortKey={sortKey}
                  sortDir={sortDir}
                  sortLabel={sortLabel}
                  onToggle={() => toggleSort(sortKey)}
                  onClear={clearSort}
                />
                <DataTableShell minWidth={920}>
                  <table className="crm-table">
                    <thead>
                      <tr className="crm-table-head">
                        <SortableTableHeader label="Team member" sortKey="displayName" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                        <SortableTableHeader label="Email" sortKey="email" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                        <SortableTableHeader label="Role" sortKey="role" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                        <SortableTableHeader label="Status" sortKey="isActive" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                        <SortableTableHeader label="Last login" sortKey="lastLoginAt" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                      </tr>
                    </thead>
                    <tbody>
                      {sortedUsers.map((user) => (
                        <ClickableTableRow key={user.id} onClick={() => setSelectedUser(user)}>
                          <td>
                            <div className="flex items-center gap-3">
                              <div className="crm-settings-avatar">{userInitials(user.displayName)}</div>
                              <div className="min-w-0">
                                <p className="truncate font-semibold text-[var(--color-ink)]">{user.displayName}</p>
                                {user.mustChangePassword ? (
                                  <p className="text-xs font-medium text-amber-700">Must change password</p>
                                ) : null}
                              </div>
                            </div>
                          </td>
                          <td className="text-neutral-600">{user.email}</td>
                          <td><RoleBadge role={user.role} /></td>
                          <td>
                            <span className={`crm-settings-status ${user.isActive ? 'is-active' : 'is-inactive'}`}>
                              {user.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="text-neutral-500">{user.lastLoginAt ? formatSettingsWhen(user.lastLoginAt) : 'Never'}</td>
                        </ClickableTableRow>
                      ))}
                    </tbody>
                  </table>
                </DataTableShell>
              </div>
            )}
          </PageSection>
        </div>
      </SettingsShell>

      <CreateUserModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingUser(null); }}
        roles={roles}
        user={editingUser}
        onSave={handleSave}
        emailReady={emailReady}
      />

      <UserAdminDrawer
        user={selectedUser}
        emailReady={emailReady}
        onClose={() => setSelectedUser(null)}
        onEdit={(user) => { setSelectedUser(null); setEditingUser(user); setModalOpen(true); }}
        onUpdated={load}
        onCredentialsIssued={(result) => {
          setCredentialResult(result);
          setSelectedUser(null);
        }}
      />

      <CredentialResultModal
        open={Boolean(credentialResult)}
        onClose={() => setCredentialResult(null)}
        result={credentialResult}
      />
    </PageShell>
  );
}
