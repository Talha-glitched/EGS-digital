import { Menu, Search } from 'lucide-react';
import InfoTip from '../ui/InfoTip.jsx';

import RoleBadge from '../settings/RoleBadge.jsx';
import { usePermissions } from '../../hooks/usePermissions.js';

function ShortcutHint() {
  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().includes('MAC');
  return (
    <kbd className="crm-spotlight-trigger-kbd">
      {isMac ? '⌘' : 'Ctrl'}K
    </kbd>
  );
}

export default function TopNavbar({ title, subtitle, pageInfo, onMenu, status, onOpenSearch }) {
  const infoText = pageInfo ?? subtitle;
  const { displayName, role, user } = usePermissions(status);
  const systemReady = (status?.postgresReady || status?.mongodbReady) && (status?.smtpReady || status?.emailDeliveryReady) && status?.imapReady;
  const healthLabel = systemReady ? 'System ready' : 'Setup needed';
  const healthTitle = [
    `Database: ${status?.postgresReady || status?.mongodbReady ? 'ready' : 'not connected'}`,
    `Sending: ${status?.smtpReady || status?.emailDeliveryReady ? 'ready' : 'not configured'}`,
    `Inbox sync: ${status?.imapReady ? 'ready' : 'not configured'}`,
  ].join(' · ');

  return (
    <header className="sticky top-0 z-20 border-b border-[var(--color-line)] bg-white/85 backdrop-blur-md">
      <div className="flex h-16 items-center gap-3 px-5 lg:px-8">
        <div className="flex min-w-0 items-center gap-3 lg:max-w-[240px]">
          <button
            type="button"
            onClick={onMenu}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-[var(--color-line)] bg-white text-neutral-600 lg:hidden"
            aria-label="Open navigation"
          >
            <Menu className="h-[18px] w-[18px]" />
          </button>
          <div className="flex min-w-0 items-center gap-1.5">
            <h2 className="truncate text-sm font-semibold tracking-tight text-[var(--color-ink)]">{title}</h2>
            {infoText && <InfoTip text={infoText} label={`About ${title}`} placement="bottom-start" />}
          </div>
        </div>

        <div className="flex min-w-0 flex-1 justify-center px-1">
          <button
            type="button"
            onClick={onOpenSearch}
            className="crm-spotlight-trigger group hidden w-full max-w-xl items-center gap-3 sm:flex"
            aria-label="Search workspace"
          >
            <Search className="h-4 w-4 shrink-0 text-neutral-400 transition group-hover:text-neutral-500" strokeWidth={2} />
            <span className="flex-1 truncate text-left text-xs text-neutral-400 group-hover:text-neutral-500">
              Search everything…
            </span>
            <ShortcutHint />
          </button>
          <button
            type="button"
            onClick={onOpenSearch}
            className="crm-spotlight-trigger-mobile flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-[var(--color-line)] bg-white text-neutral-500 sm:hidden"
            aria-label="Search workspace"
          >
            <Search className="h-[18px] w-[18px]" strokeWidth={2} />
          </button>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {user && (
            <div className="hidden items-center gap-2 rounded-full border border-[var(--color-line)] bg-white px-3 py-1 sm:flex">
              <span className="text-xs font-medium text-neutral-700">{displayName}</span>
              {role && <RoleBadge role={role} />}
            </div>
          )}
          <span
            title={healthTitle}
            className={`hidden shrink-0 items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold sm:inline-flex lg:max-w-[240px] ${systemReady ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'}`}
          >
            <span className={`h-2 w-2 rounded-full ${systemReady ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            {healthLabel}
          </span>
        </div>
      </div>
    </header>
  );
}
