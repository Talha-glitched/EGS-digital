import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Inbox, FolderKanban, LogOut } from 'lucide-react';
import { cn } from '../ui/primitives.jsx';

const NAV = [
  { to: '/admin/crm', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/crm/inbox', label: 'Inbox', icon: Inbox },
];

export default function Sidebar({ projects = [], onLogout }) {
  const location = useLocation();

  return (
    <aside className="sticky top-0 flex h-screen w-[248px] shrink-0 flex-col border-r border-white/[0.06] bg-[var(--color-sidebar)] text-white">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand text-base font-extrabold text-white">
          E
        </div>
        <div className="leading-tight">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-brand">EGS</p>
          <h1 className="text-sm font-semibold text-white">Lead Engine</h1>
        </div>
      </div>

      <nav className="crm-scroll flex-1 space-y-0.5 overflow-y-auto px-3 py-2">
        <p className="px-3 pb-1.5 pt-2 text-[10px] font-semibold uppercase tracking-[0.13em] text-neutral-500">
          Workspace
        </p>
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition',
                isActive ? 'crm-nav-active' : 'crm-nav-idle'
              )
            }
          >
            <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} />
            {label}
          </NavLink>
        ))}

        {projects.length > 0 && (
          <div className="pt-4">
            <p className="mb-1.5 flex items-center gap-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.13em] text-neutral-500">
              <FolderKanban className="h-3 w-3" />
              Projects
            </p>
            <div className="space-y-0.5">
              {projects.slice(0, 12).map((p) => {
                const path = `/admin/crm/projects/${p._id}`;
                const active = location.pathname === path;
                return (
                  <NavLink
                    key={p._id}
                    to={path}
                    className={cn(
                      'flex items-center gap-2.5 truncate rounded-lg px-3 py-2 text-[13px] transition',
                      active ? 'bg-white/[0.08] font-medium text-white' : 'text-neutral-400 hover:bg-white/[0.04] hover:text-neutral-200'
                    )}
                  >
                    <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', active ? 'bg-brand' : 'bg-neutral-600')} />
                    <span className="truncate">{p.projectName}</span>
                  </NavLink>
                );
              })}
            </div>
          </div>
        )}
      </nav>

      <div className="border-t border-white/[0.06] p-3">
        <button
          type="button"
          onClick={onLogout}
          className="crm-nav-idle flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium"
        >
          <LogOut className="h-[18px] w-[18px]" strokeWidth={1.75} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
