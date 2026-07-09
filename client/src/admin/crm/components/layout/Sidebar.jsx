import { useEffect, useMemo, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Inbox, FolderKanban, LogOut, Users, Building2, BarChart3, X, BriefcaseBusiness, ListTodo, PanelLeftClose, PanelLeft, Wallet, ChevronLeft, HeartHandshake, Mail, Shield, Activity, History, SendHorizontal, MailCheck } from 'lucide-react';
import { cn } from '../ui/primitives.jsx';
import { usePermissions } from '../../hooks/usePermissions.js';
import { crmApiFetch } from '../../crmApi.js';
import egsLogo from '../../../../assets/logo/New_Logo/Logo-01.png';

const BASE_NAV_GROUPS = [
  {
    items: [
      { to: '/admin/crm', label: 'Dashboard', icon: LayoutDashboard, end: true },
    ],
  },
  {
    heading: 'Leads',
    items: [
      { to: '/admin/crm/projects', label: 'Campaigns', icon: FolderKanban },
      { to: '/admin/crm/sequences', label: 'Email Sequences', icon: Mail },
      { to: '/admin/crm/companies', label: 'Companies', icon: Building2 },
      { to: '/admin/crm/people', label: 'Contacts', icon: Users },
      { to: '/admin/crm/relationships', label: 'Key Relationships', icon: HeartHandshake },
    ],
  },
  {
    heading: 'Project Management',
    items: [
      { to: '/admin/crm/pipeline', label: 'Sales Pipeline', icon: BriefcaseBusiness },
      { to: '/admin/crm/tasks', label: 'Tasks', icon: ListTodo },
    ],
  },
  {
    heading: 'Tracking',
    items: [
      { to: '/admin/crm/inbox', label: 'Inbox', icon: Inbox },
      { to: '/admin/crm/email', label: 'Email', icon: SendHorizontal },
      { to: '/admin/crm/finance', label: 'Finances', icon: Wallet },
      { to: '/admin/crm/analytics', label: 'Reports', icon: BarChart3 },
    ],
  },
];

function NavItem({ to, label, icon: Icon, end, collapsed, onClose }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClose}
      title={collapsed ? label : undefined}
      className={({ isActive }) =>
        cn(
          'flex items-center rounded-lg py-2 text-xs font-medium transition',
          collapsed ? 'justify-center px-2' : 'gap-3 px-3',
          isActive ? 'crm-nav-active' : 'crm-nav-idle'
        )
      }
    >
      <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} />
      {!collapsed && label}
    </NavLink>
  );
}

export default function Sidebar({ activeProject, onLogout, mobileOpen = false, onClose, collapsed = false, onToggleCollapse, status }) {
  const { can } = usePermissions(status);
  const onProjectDetail = Boolean(activeProject);
  const [useResend, setUseResend] = useState(false);

  useEffect(() => {
    function loadResendSetting() {
      crmApiFetch('/api/admin/system-settings')
        .then((data) => setUseResend(Boolean(data?.useResend)))
        .catch(() => setUseResend(false));
    }

    loadResendSetting();
    window.addEventListener('crm:settings-changed', loadResendSetting);
    return () => window.removeEventListener('crm:settings-changed', loadResendSetting);
  }, []);

  const navGroups = useMemo(() => {
    const trackingItems = [
      { to: '/admin/crm/inbox', label: 'Inbox', icon: Inbox },
      { to: '/admin/crm/email', label: 'Email', icon: SendHorizontal },
      ...(useResend ? [{ to: '/admin/crm/resend-emails', label: 'Resend emails', icon: MailCheck }] : []),
      { to: '/admin/crm/finance', label: 'Finances', icon: Wallet },
      { to: '/admin/crm/analytics', label: 'Reports', icon: BarChart3 },
    ];

    const groups = BASE_NAV_GROUPS.map((group) => {
      if (group.heading !== 'Tracking') return group;
      return { ...group, items: trackingItems };
    });

    return groups;
  }, [useResend]);

  const settingsItems = [
    can('users:manage') && { to: '/admin/crm/settings/team', label: 'Team', icon: Shield },
    can('audit:read') && { to: '/admin/crm/settings/activity', label: 'Activity log', icon: Activity },
    can('rollback:execute') && { to: '/admin/crm/settings/recovery', label: 'Data recovery', icon: History },
  ].filter(Boolean);

  const allNavGroups = [
    ...navGroups,
    ...(settingsItems.length
      ? [{ heading: 'Settings', items: settingsItems }]
      : []),
  ];

  return (
    <>
    {mobileOpen && <button type="button" aria-label="Close navigation" onClick={onClose} className="fixed inset-0 z-30 bg-neutral-950/45 lg:hidden" />}
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-40 flex h-screen shrink-0 flex-col border-r border-white/[0.06] bg-[var(--color-sidebar)] text-white transition-[width,transform] duration-200 lg:sticky lg:top-0 lg:z-auto lg:translate-x-0',
        collapsed ? 'w-[68px]' : 'w-[248px]',
        mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}
    >
      <div className={cn('flex items-center gap-2.5 py-5', collapsed ? 'justify-center px-2' : 'px-5')}>
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <img src={egsLogo} alt="Exhibit Graphic Sign" className="h-auto w-[175px] max-w-full object-contain" />
            <p className="mt-2 text-[9px] font-semibold uppercase tracking-[0.19em] text-neutral-500">Commercial CRM</p>
          </div>
        )}
        {collapsed && (
          <img src={egsLogo} alt="EGS" className="h-8 w-8 object-contain" title="Exhibit Graphic Sign" />
        )}
        <button type="button" onClick={onClose} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-neutral-400 hover:bg-white/10 hover:text-white lg:hidden" aria-label="Close navigation">
          <X className="h-4 w-4" />
        </button>
        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg text-neutral-400 hover:bg-white/10 hover:text-white lg:flex"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        )}
      </div>

      <nav className="crm-scroll min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2 py-2">
        {allNavGroups.map((group, groupIndex) => (
          <div key={group.heading || 'dashboard'} className={groupIndex > 0 ? (collapsed ? 'pt-2' : '') : ''}>
            {group.heading && !collapsed && (
              <p className="px-3 pb-1.5 pt-3 text-[10px] font-semibold uppercase tracking-[0.13em] text-neutral-500 first:pt-2">
                {group.heading}
              </p>
            )}
            {group.items.map((item) => (
              <NavItem key={item.to} {...item} collapsed={collapsed} onClose={onClose} />
            ))}
          </div>
        ))}

        {onProjectDetail && (
          <div className="pt-4">
            {!collapsed && (
              <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.13em] text-neutral-500">
                Current campaign
              </p>
            )}
            <NavLink
              to="/admin/crm/projects"
              onClick={onClose}
              title={collapsed ? 'All campaigns' : undefined}
              className={cn(
                'flex items-center rounded-lg py-2 text-xs font-medium text-neutral-400 transition hover:bg-white/[0.04] hover:text-neutral-200',
                collapsed ? 'justify-center px-2' : 'gap-2 px-3'
              )}
            >
              <ChevronLeft className="h-3.5 w-3.5 shrink-0" />
              {!collapsed && 'All campaigns'}
            </NavLink>
            <div
              className={cn(
                'mt-0.5 flex items-center rounded-lg py-2',
                collapsed ? 'justify-center px-2' : 'gap-2.5 px-3 text-[13px]',
                'bg-white/[0.08] font-medium text-white'
              )}
              title={activeProject.projectName}
            >
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
              {!collapsed && <span className="truncate">{activeProject.projectName}</span>}
            </div>
          </div>
        )}
      </nav>

      <div className="border-t border-white/[0.06] p-2">
        <button
          type="button"
          onClick={onLogout}
          title={collapsed ? 'Sign out' : undefined}
          className={cn('crm-nav-idle flex w-full items-center rounded-lg py-2.5 text-sm font-medium', collapsed ? 'justify-center px-2' : 'gap-3 px-3')}
        >
          <LogOut className="h-[18px] w-[18px]" strokeWidth={1.75} />
          {!collapsed && 'Sign out'}
        </button>
      </div>
    </aside>
    </>
  );
}
