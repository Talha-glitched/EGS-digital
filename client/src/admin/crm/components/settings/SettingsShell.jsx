import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Shield, Activity, History, Mail } from 'lucide-react';
import { crmApiFetch } from '../../crmApi.js';
import { usePermissions } from '../../hooks/usePermissions.js';

const TABS = [
  { to: '/admin/crm/settings/team', label: 'Team', icon: Shield, permission: 'users:manage' },
  { to: '/admin/crm/settings/email', label: 'Email settings', icon: Mail, permission: 'users:manage' },
  { to: '/admin/crm/settings/activity', label: 'Activity log', icon: Activity, permission: 'audit:read' },
  { to: '/admin/crm/settings/recovery', label: 'Data recovery', icon: History, permission: 'rollback:execute' },
];

export default function SettingsShell({ children }) {
  const [status, setStatus] = useState(null);
  const { can } = usePermissions(status);
  const visibleTabs = TABS.filter((tab) => can(tab.permission));

  useEffect(() => {
    crmApiFetch('/api/admin/status').then(setStatus).catch(() => {});
  }, []);

  return (
    <div className="crm-settings-shell">
      <nav className="crm-settings-subnav" aria-label="Settings sections">
        {visibleTabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) => `crm-settings-subnav-link${isActive ? ' is-active' : ''}`}
          >
            <tab.icon className="h-4 w-4" strokeWidth={2} />
            {tab.label}
          </NavLink>
        ))}
      </nav>
      <div className="crm-settings-shell-body">
        {children}
      </div>
    </div>
  );
}
