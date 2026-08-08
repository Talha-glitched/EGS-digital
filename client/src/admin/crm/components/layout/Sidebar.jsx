import { useEffect, useMemo, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, MessageSquareText, FolderKanban, LogOut, Users, Building2, BarChart3, X, BriefcaseBusiness, ListTodo, PanelLeftClose, PanelLeft, Wallet, ChevronLeft, HeartHandshake, Mail, Shield, Activity, History, ClipboardList, CalendarDays, PackageSearch, HardHat, Boxes, UserRoundCheck, CalendarCheck2 } from 'lucide-react';
import { cn } from '../ui/primitives.jsx';
import { usePermissions } from '../../hooks/usePermissions.js';
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
      { to: '/admin/crm/ongoing-jobs', label: 'Ongoing Jobs', icon: BriefcaseBusiness },
      { to: '/admin/crm/completed-jobs', label: 'Jobs Done', icon: ClipboardList },
      { to: '/admin/crm/inventory', label: 'Inventory', icon: Boxes },
      { to: '/admin/crm/tasks', label: 'Tasks', icon: ListTodo },
    ],
  },
  {
    heading: 'Tracking',
    items: [
      { to: '/admin/crm/communications', label: 'Communications', icon: MessageSquareText },
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
      aria-label={collapsed ? label : undefined}
      className={({ isActive }) =>
        cn(
          'flex items-center rounded-lg py-2 text-xs font-medium transition',
          collapsed ? 'justify-center px-2' : 'gap-3 px-3',
          isActive ? 'crm-nav-active' : 'crm-nav-idle'
        )
      }
    >
      <Icon className="h-4.5 w-4.5 shrink-0" strokeWidth={1.75} />
      {!collapsed && label}
    </NavLink>
  );
}

export default function Sidebar({ activeProject, onLogout, mobileOpen = false, onClose, collapsed = false, onToggleCollapse, status, designerMode = false }) {
  const { can } = usePermissions(status);
  const onProjectDetail = Boolean(activeProject);
  const navGroups = useMemo(() => {
    if (designerMode) {
      return [
        {
          heading: 'My Workspace',
          items: [
            { to: '/admin/crm', label: 'Dashboard', icon: LayoutDashboard, end: true },
            { to: '/admin/crm/ongoing-jobs', label: 'Ongoing Jobs', icon: BriefcaseBusiness },
            { to: '/admin/crm/inventory', label: 'Inventory', icon: Boxes },
            { to: '/admin/crm/tasks', label: 'Tasks', icon: ListTodo },
          ],
        },
      ];
    }

    return BASE_NAV_GROUPS;
  }, [designerMode]);

  const settingsItems = designerMode ? [] : [
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
        'fixed inset-y-0 left-0 z-40 flex h-screen shrink-0 flex-col border-r border-white/6 bg-sidebar text-white transition-[width,transform] duration-200 lg:sticky lg:top-0 lg:z-auto lg:translate-x-0',
        collapsed ? 'w-17' : 'w-62',
        mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}
    >
      <div className={cn('flex items-center gap-2.5 py-5', collapsed ? 'justify-center px-2' : 'px-5')}>
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <img src={egsLogo} alt="Exhibit Graphic Sign" className="h-auto w-43.75 max-w-full object-contain" />
            <p className="mt-2 text-2xs font-semibold uppercase tracking-[0.19em] text-neutral-500">
              {designerMode ? 'Designer Portal' : 'Commercial CRM'}
            </p>
          </div>
        )}
        {collapsed && (
          <img src={egsLogo} alt="EGS" className="h-8 w-8 object-contain" title="Exhibit Graphic Sign" />
        )}
        <button type="button" onClick={onClose} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-neutral-400 hover:bg-white/10 hover:text-white lg:hidden" aria-label="Close navigation">
          <X className="h-4 w-4" />
        </button>
        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-lg text-neutral-400 hover:bg-white/10 hover:text-white lg:flex"
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
              <p className="px-3 pb-1.5 pt-3 text-2xs font-semibold uppercase tracking-[0.13em] text-neutral-500 first:pt-2">
                {group.heading}
              </p>
            )}
            {group.items.map((item) => (
              <NavItem key={item.to} {...item} collapsed={collapsed} onClose={onClose} />
            ))}
          </div>
        ))}

        {!designerMode && onProjectDetail && (
          <div className="pt-4">
            {!collapsed && (
              <p className="mb-1.5 px-3 text-2xs font-semibold uppercase tracking-[0.13em] text-neutral-500">
                Current campaign
              </p>
            )}
            <NavLink
              to="/admin/crm/projects"
              onClick={onClose}
              title={collapsed ? 'All campaigns' : undefined}
              aria-label={collapsed ? 'All campaigns' : undefined}
              className={cn(
                'flex items-center rounded-lg py-2 text-xs font-medium text-neutral-400 transition hover:bg-white/4 hover:text-neutral-200',
                collapsed ? 'justify-center px-2' : 'gap-2 px-3'
              )}
            >
              <ChevronLeft className="h-3.5 w-3.5 shrink-0" />
              {!collapsed && 'All campaigns'}
            </NavLink>
            <div
              className={cn(
                'mt-0.5 flex items-center rounded-lg py-2',
                collapsed ? 'justify-center px-2' : 'gap-2.5 px-3 text-sm',
                'bg-white/8 font-medium text-white'
              )}
              title={activeProject.projectName}
            >
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
              {!collapsed && <span className="truncate">{activeProject.projectName}</span>}
            </div>
          </div>
        )}
      </nav>

      <div className="border-t border-white/6 p-2">
        {designerMode && !collapsed && (
          <div className="mb-1 px-3 py-1.5">
            <p className="text-2xs text-neutral-500">Signed in as</p>
            <p className="truncate text-xs font-semibold text-white">{status?.user?.displayName || 'Designer'}</p>
            <span className="mt-1 inline-flex rounded-full bg-pink-500/20 px-2 py-0.5 text-2xs font-semibold text-pink-300">Designer</span>
          </div>
        )}
        <button
          type="button"
          onClick={onLogout}
          title={collapsed ? 'Sign out' : undefined}
          aria-label="Sign out"
          className={cn('crm-nav-idle flex w-full items-center rounded-lg py-2.5 text-sm font-medium', collapsed ? 'justify-center px-2' : 'gap-3 px-3')}
        >
          <LogOut className="h-4.5 w-4.5" strokeWidth={1.75} />
          {!collapsed && 'Sign out'}
        </button>
      </div>
    </aside>
    </>
  );
}
