import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { crmApiFetch } from '../crmApi.js';
import {
  PageShell,
  PageSection,
  Card,
  CardHeader,
  ListBody,
  ListRow,
  StatCard,
  MetricGrid,
  EmptyState,
  LoadingState,
  Badge,
} from '../components/ui/primitives.jsx';
import {
  BriefcaseBusiness,
  CalendarCheck2,
  AlertTriangle,
  Clock3,
  ArrowUpRight,
  CheckCircle2,
} from 'lucide-react';
import {
  formatTaskDue,
  formatDeadlineLabel,
  getDeadlineTone,
} from '../components/tasks/taskUtils.js';

const DEADLINE_TONE_STYLES = {
  overdue: 'bg-red-100 text-red-700 border border-red-200',
  today: 'bg-amber-100 text-amber-700 border border-amber-200',
  upcoming: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
};

function DeadlinePill({ dueAt, status }) {
  const tone = getDeadlineTone(dueAt, status);
  const label = formatDeadlineLabel(dueAt, status);
  if (!tone || !label) return null;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold leading-none ${DEADLINE_TONE_STYLES[tone]} ${tone === 'overdue' ? 'animate-pulse' : ''}`}
    >
      {label}
    </span>
  );
}

const PRIORITY_COLOURS = {
  High: 'bg-red-500',
  Normal: 'bg-sky-500',
  Low: 'bg-neutral-300',
};

const STAGE_TONE = {
  'Closed Won': 'success',
  'Closed Lost': 'neutral',
  Negotiation: 'warning',
  'Contract Sent': 'success',
  'New Lead': 'info',
};

export default function DesignerDashboard() {
  const [tasks, setTasks] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [taskData, oppData] = await Promise.all([
      crmApiFetch('/api/admin/sales/tasks?status=Open').catch(() => ({ items: [] })),
      crmApiFetch('/api/admin/sales/ongoing-jobs').catch(() => ({ items: [] })),
    ]);
    setTasks(taskData.items || []);
    setOpportunities(oppData.items || []);
  }, []);

  async function completeTask(taskId) {
    setTasks((prev) => prev.filter((t) => t._id !== taskId));
    try {
      await crmApiFetch(`/api/admin/sales/tasks/${taskId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'Done' }),
      });
    } catch {
      await load();
    }
  }

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  useEffect(() => {
    function handleChange() { load().catch(() => {}); }
    window.addEventListener('crm:workspace-changed', handleChange);
    return () => window.removeEventListener('crm:workspace-changed', handleChange);
  }, [load]);

  if (loading) {
    return <PageShell><LoadingState label="Loading your workspace…" /></PageShell>;
  }

  const overdueTasks = tasks.filter((t) => getDeadlineTone(t.dueAt, t.status) === 'overdue');
  const todayTasks = tasks.filter((t) => getDeadlineTone(t.dueAt, t.status) === 'today');
  const upcomingTasks = tasks.filter((t) => getDeadlineTone(t.dueAt, t.status) === 'upcoming');
  const noDateTasks = tasks.filter((t) => !t.dueAt);

  const activeOpps = opportunities.filter(
    (o) => !['Closed Won', 'Closed Lost'].includes(o.stage)
  );

  return (
    <PageShell>
      {overdueTasks.length > 0 && (
        <PageSection>
          <div className="crm-card flex flex-col gap-3 border-l-4 border-l-red-500 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--color-ink)]">
                  {overdueTasks.length} overdue task{overdueTasks.length > 1 ? 's' : ''} need your attention
                </p>
                <p className="mt-0.5 text-xs text-neutral-500">
                  These tasks are past their deadline. Review and complete or reschedule them.
                </p>
              </div>
            </div>
            <Link to="/admin/crm/tasks" className="crm-btn-secondary shrink-0">
              Review tasks <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </PageSection>
      )}

      <PageSection>
        <MetricGrid>
          <StatCard compact label="Overdue tasks" value={overdueTasks.length} helpText="Past their deadline" icon={AlertTriangle} tone={overdueTasks.length > 0 ? 'warning' : 'neutral'} />
          <StatCard compact label="Due today" value={todayTasks.length} helpText="Must be completed today" icon={Clock3} tone={todayTasks.length > 0 ? 'info' : 'neutral'} />
          <StatCard compact label="Upcoming tasks" value={upcomingTasks.length} helpText="Scheduled ahead" icon={CalendarCheck2} tone="success" />
          <StatCard compact label="Active projects" value={activeOpps.length} helpText="You are involved in" icon={BriefcaseBusiness} tone="brand" />
        </MetricGrid>
      </PageSection>

      <PageSection>
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader
              title="My tasks"
              subtitle="Your open follow-ups, sorted by urgency."
              action={<Link to="/admin/crm/tasks" className="text-xs font-semibold text-brand hover:underline">View all</Link>}
            />
            {tasks.length === 0 ? (
              <EmptyState icon={CheckCircle2} title="All clear!" description="You have no open tasks right now." />
            ) : (
              <ListBody>
                {[...overdueTasks, ...todayTasks, ...upcomingTasks, ...noDateTasks].slice(0, 8).map((task) => (
                  <ListRow key={task._id} className="items-center gap-3">
                    <button
                      type="button"
                      onClick={() => completeTask(task._id)}
                      title="Mark task completed"
                      aria-label={`Mark task completed: ${task.title}`}
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-neutral-300 bg-white text-transparent transition hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-600"
                    >
                      <CheckCircle2 className="h-4 w-4 fill-current" />
                    </button>
                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${PRIORITY_COLOURS[task.priority] || PRIORITY_COLOURS.Normal}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold text-[var(--color-ink)]">{task.title}</p>
                      {task.notes && (
                        <p className="mt-0.5 truncate text-xs text-neutral-400">{task.notes}</p>
                      )}
                      {task.dueAt && (
                        <p className="mt-0.5 text-[11px] text-neutral-400">{formatTaskDue(task.dueAt)}</p>
                      )}
                    </div>
                    <div className="shrink-0 flex items-center gap-2">
                      <DeadlinePill dueAt={task.dueAt} status={task.status} />
                      <button
                        type="button"
                        onClick={() => completeTask(task._id)}
                        className="crm-btn-secondary px-2 py-1 text-[11px]"
                      >
                        Mark Done
                      </button>
                    </div>
                  </ListRow>
                ))}
              </ListBody>
            )}
          </Card>

          <Card>
            <CardHeader
              title="My projects"
              subtitle="Ongoing Jobs you're involved in."
              action={<Link to="/admin/crm/ongoing-jobs" className="text-xs font-semibold text-brand hover:underline">Open Ongoing Jobs</Link>}
            />
            {activeOpps.length === 0 ? (
              <EmptyState icon={BriefcaseBusiness} title="No active projects" description="You aren't assigned to any live jobs yet." />
            ) : (
              <ListBody>
                {activeOpps.slice(0, 8).map((item) => (
                  <ListRow key={item._id} as={Link} to="/admin/crm/ongoing-jobs" className="group hover:bg-neutral-50/80">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
                      <BriefcaseBusiness className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold text-[var(--color-ink)] group-hover:text-brand">{item.name}</p>
                      <p className="mt-0.5 truncate text-xs text-neutral-500">{item.companyId?.companyName || 'Unknown company'}</p>
                    </div>
                    <Badge tone={STAGE_TONE[item.stage] || 'neutral'}>{item.stage}</Badge>
                  </ListRow>
                ))}
              </ListBody>
            )}
          </Card>
        </div>
      </PageSection>
    </PageShell>
  );
}
