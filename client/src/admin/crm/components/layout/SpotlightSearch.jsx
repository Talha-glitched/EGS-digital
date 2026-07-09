import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  ArrowRight,
  LayoutDashboard,
  BriefcaseBusiness,
  ListTodo,
  Building2,
  Users,
  Inbox,
  BarChart3,
  FolderKanban,
  UserRound,
  CircleDot,
  CheckSquare,
  Wallet,
  HeartHandshake,
  Mail,
  SendHorizontal,
  MailCheck,
} from 'lucide-react';
import { fetchWorkspaceSearch } from '../../crmApi.js';
import { cn } from '../ui/primitives.jsx';
import { useBodyScrollLock } from '../ui/useBodyScrollLock.js';

const QUICK_NAV = [
  { id: 'nav-dashboard', type: 'page', title: 'Dashboard', subtitle: 'Priority follow-ups and active campaigns', href: '/admin/crm', keywords: ['dashboard', 'home', 'today'], icon: LayoutDashboard },
  { id: 'nav-projects', type: 'page', title: 'Campaigns', subtitle: 'Exhibition outreach and target companies', href: '/admin/crm/projects', keywords: ['projects', 'campaigns', 'exhibition'], icon: FolderKanban },
  { id: 'nav-sequences', type: 'page', title: 'Email Sequences', subtitle: 'Multi-step outreach builder and launch center', href: '/admin/crm/sequences', keywords: ['sequences', 'email', 'outreach', 'drip', 'mailchimp'], icon: Mail },
  { id: 'nav-companies', type: 'page', title: 'Companies', subtitle: 'Target companies and relationship history', href: '/admin/crm/companies', keywords: ['companies', 'clients'], icon: Building2 },
  { id: 'nav-people', type: 'page', title: 'Contacts', subtitle: 'People and point-of-contact records', href: '/admin/crm/people', keywords: ['contacts', 'people', 'leads'], icon: Users },
  { id: 'nav-relationships', type: 'page', title: 'Key Relationships', subtitle: 'Confirmed right POCs and nurture follow-ups', href: '/admin/crm/relationships', keywords: ['relationships', 'poc', 'nurture', 'follow up', 'right contact'], icon: HeartHandshake },
  { id: 'nav-pipeline', type: 'page', title: 'Sales Pipeline', subtitle: 'Opportunities and deal stages', href: '/admin/crm/pipeline', keywords: ['sales', 'deals', 'pipeline', 'opportunities'], icon: BriefcaseBusiness },
  { id: 'nav-tasks', type: 'page', title: 'Tasks', subtitle: 'Calls, meetings, and next actions', href: '/admin/crm/tasks', keywords: ['tasks', 'follow', 'todo'], icon: ListTodo },
  { id: 'nav-inbox', type: 'page', title: 'Inbox', subtitle: 'Replies and sales follow-up', href: '/admin/crm/inbox', keywords: ['inbox', 'email', 'replies'], icon: Inbox },
  { id: 'nav-email', type: 'page', title: 'Email', subtitle: 'Outbox batches, sent messages, and failed sends', href: '/admin/crm/email', keywords: ['email', 'outbox', 'sent', 'queue', 'launch', 'batch'], icon: SendHorizontal },
  { id: 'nav-resend', type: 'page', title: 'Resend emails', subtitle: 'Delivery status, opens, and clicks for API-sent outreach', href: '/admin/crm/resend-emails', keywords: ['resend', 'api', 'delivery', 'opens', 'clicks', 'bounces'], icon: MailCheck },
  { id: 'nav-finance', type: 'page', title: 'Finances', subtitle: 'Campaign budgets, costs, and revenue', href: '/admin/crm/finance', keywords: ['finance', 'finances', 'budget', 'revenue', 'roi'], icon: Wallet },
  { id: 'nav-analytics', type: 'page', title: 'Reports', subtitle: 'Performance and ROI analytics', href: '/admin/crm/analytics', keywords: ['reports', 'analytics', 'roi'], icon: BarChart3 },
];

const TYPE_ICONS = {
  page: ArrowRight,
  project: FolderKanban,
  contact: UserRound,
  account: Building2,
  company: Building2,
  opportunity: BriefcaseBusiness,
  task: CheckSquare,
};

function normalize(value) {
  return String(value || '').trim().toLowerCase();
}

function matchesQuery(item, query) {
  const q = normalize(query);
  if (!q) return true;
  const haystack = [item.title, item.subtitle, item.meta, ...(item.keywords || [])]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return haystack.includes(q);
}

function filterNav(query) {
  return QUICK_NAV.filter((item) => matchesQuery(item, query));
}

function filterProjects(projects, query) {
  const q = normalize(query);
  const list = (projects || []).slice(0, q ? 20 : 8);
  if (!q) {
    return list.map((project) => ({
      id: `project-${project._id}`,
      type: 'project',
      recordId: project._id,
      title: project.projectName || 'Untitled project',
      subtitle: [project.milestone, project.status].filter(Boolean).join(' · '),
      href: `/admin/crm/projects/${project._id}`,
      meta: project.status || '',
    }));
  }
  return list
    .filter((project) => {
      const haystack = [project.projectName, project.milestone, project.status].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(q);
    })
    .slice(0, 5)
    .map((project) => ({
      id: `project-${project._id}`,
      type: 'project',
      recordId: project._id,
      title: project.projectName || 'Untitled project',
      subtitle: [project.milestone, project.status].filter(Boolean).join(' · '),
      href: `/admin/crm/projects/${project._id}`,
      meta: project.status || '',
    }));
}

function mergeGroups(...groupLists) {
  return groupLists.filter((group) => group?.items?.length);
}

export default function SpotlightSearch({ open, onClose, projects = [] }) {
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const itemRefs = useRef([]);
  const [query, setQuery] = useState('');
  const [remoteGroups, setRemoteGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const requestId = useRef(0);

  useBodyScrollLock(open);

  const groups = useMemo(() => {
    const trimmed = query.trim();
    const navItems = filterNav(trimmed);
    const projectItems = filterProjects(projects, trimmed);

    const localGroups = mergeGroups(
      navItems.length ? { id: 'pages', label: trimmed ? 'Pages' : 'Go to', items: navItems } : null,
      projectItems.length ? { id: 'projects', label: 'Campaigns', items: projectItems } : null,
    );

    if (trimmed.length < 2) return localGroups;

    const remoteFiltered = remoteGroups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => !localGroups.some((local) => local.items.some((l) => l.id === item.id))),
      }))
      .filter((group) => group.items.length);

    return [...localGroups, ...remoteFiltered];
  }, [query, projects, remoteGroups]);

  const flatItems = useMemo(() => groups.flatMap((group) => group.items), [groups]);

  const selectItem = useCallback(
    (item) => {
      if (!item?.href) return;
      const navState = item.recordId
        ? { fromSpotlight: true, recordId: String(item.recordId), recordType: item.type }
        : undefined;
      navigate(item.href, navState ? { state: navState } : undefined);
      onClose();
    },
    [navigate, onClose],
  );

  useEffect(() => {
    if (!open) {
      setQuery('');
      setRemoteGroups([]);
      setLoading(false);
      setActiveIndex(0);
      return undefined;
    }
    const timer = window.setTimeout(() => inputRef.current?.focus(), 40);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, groups.length]);

  useEffect(() => {
    const trimmed = query.trim();
    if (!open || trimmed.length < 2) {
      setRemoteGroups([]);
      setLoading(false);
      return undefined;
    }

    const id = ++requestId.current;
    setLoading(true);
    const timer = window.setTimeout(async () => {
      try {
        const result = await fetchWorkspaceSearch(trimmed, { limit: 5 });
        if (requestId.current !== id) return;
        setRemoteGroups(result.groups || []);
      } catch {
        if (requestId.current === id) setRemoteGroups([]);
      } finally {
        if (requestId.current === id) setLoading(false);
      }
    }, 220);

    return () => window.clearTimeout(timer);
  }, [open, query]);

  useEffect(() => {
    const node = itemRefs.current[activeIndex];
    if (node && listRef.current) {
      node.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex, flatItems.length]);

  useEffect(() => {
    if (!open) return undefined;

    function onKeyDown(event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setActiveIndex((prev) => (flatItems.length ? (prev + 1) % flatItems.length : 0));
        return;
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActiveIndex((prev) => (flatItems.length ? (prev - 1 + flatItems.length) % flatItems.length : 0));
        return;
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        const item = flatItems[activeIndex];
        if (item) selectItem(item);
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, flatItems, activeIndex, onClose, selectItem]);

  if (!open) return null;

  let runningIndex = -1;

  return createPortal(
    <div
      className="crm-spotlight-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      role="presentation"
    >
      <div
        className="crm-spotlight-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Search workspace"
      >
        <div className="crm-spotlight-input-wrap">
          <Search className="crm-spotlight-input-icon" strokeWidth={2} />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search contacts, companies, projects, deals…"
            className="crm-spotlight-input"
            autoComplete="off"
            spellCheck={false}
            aria-autocomplete="list"
            aria-controls="crm-spotlight-results"
          />
          {loading && <span className="crm-spotlight-spinner" aria-hidden="true" />}
        </div>

        <div ref={listRef} id="crm-spotlight-results" className="crm-spotlight-results" role="listbox">
          {flatItems.length === 0 && !loading && (
            <div className="crm-spotlight-empty">
              <CircleDot className="h-5 w-5 text-neutral-300" />
              <p className="text-sm font-medium text-neutral-600">
                {query.trim().length >= 2 ? 'No matches found' : 'Start typing to search everything'}
              </p>
              <p className="mt-1 text-xs text-neutral-400">Contacts, companies, projects, opportunities, and tasks</p>
            </div>
          )}

          {groups.map((group) => (
            <section key={group.id} className="crm-spotlight-group">
              <p className="crm-spotlight-group-label">{group.label}</p>
              <ul>
                {group.items.map((item) => {
                  runningIndex += 1;
                  const index = runningIndex;
                  const Icon = item.icon || TYPE_ICONS[item.type] || ArrowRight;
                  const isActive = index === activeIndex;
                  return (
                    <li key={item.id}>
                      <button
                        ref={(node) => {
                          itemRefs.current[index] = node;
                        }}
                        type="button"
                        role="option"
                        aria-selected={isActive}
                        className={cn('crm-spotlight-item', isActive && 'crm-spotlight-item-active')}
                        onMouseEnter={() => setActiveIndex(index)}
                        onMouseDown={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          selectItem(item);
                        }}
                      >
                        <span className="crm-spotlight-item-icon">
                          <Icon className="h-4 w-4" strokeWidth={1.75} />
                        </span>
                        <span className="min-w-0 flex-1 text-left">
                          <span className="block truncate text-[13.5px] font-medium text-[var(--color-ink)]">{item.title}</span>
                          {item.subtitle && (
                            <span className="mt-0.5 block truncate text-[12px] text-[var(--color-ink-muted)]">{item.subtitle}</span>
                          )}
                        </span>
                        {item.meta && (
                          <span className="crm-spotlight-item-meta">{item.meta}</span>
                        )}
                        <ArrowRight className={cn('h-3.5 w-3.5 shrink-0 text-neutral-300 transition', isActive && 'text-brand translate-x-0.5')} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>

        <footer className="crm-spotlight-footer">
          <span><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
          <span><kbd>↵</kbd> open</span>
          <span><kbd>esc</kbd> close</span>
        </footer>
      </div>
    </div>,
    document.body,
  );
}

export function useSpotlightShortcut(onOpen) {
  useEffect(() => {
    function onKeyDown(event) {
      const isMac = navigator.platform.toUpperCase().includes('MAC');
      const mod = isMac ? event.metaKey : event.ctrlKey;
      if (mod && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        onOpen();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onOpen]);
}
