import { useEffect, useMemo, useState } from 'react';
import { crmApiFetch, deleteTaskWithUndo } from '../crmApi.js';
import { useConfirmDelete } from '../hooks/useConfirmDelete.js';
import TaskTable from '../components/tasks/TaskTable.jsx';
import { buildOwnerOptions, companyFromOpportunity, companyIdFromOpportunity, isDemoTask } from '../components/tasks/taskUtils.js';
import { Alert, Card, EmptyState, LoadingState, PageHeader, PageSection, PageShell, PageToolbar, ToolbarCount } from '../components/ui/primitives.jsx';
import { CalendarCheck2, Plus } from 'lucide-react';
import {
  AdvancedFilterPopover,
  AdvancedFilterChips,
  useTableFilters,
  buildTaskFilterSchema,
} from '../components/ui/advancedFilter/index.js';

export default function TasksPage() {
  const [tasks, setTasks] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [status, setStatus] = useState('Open');
  const [loading, setLoading] = useState(true);
  const [focusTaskId, setFocusTaskId] = useState('');
  const [editingTaskIds, setEditingTaskIds] = useState([]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const ownerOptions = useMemo(
    () => buildOwnerOptions(tasks, opportunities.map((item) => item.owner)),
    [tasks, opportunities],
  );

  const taskFilterSchema = useMemo(() => buildTaskFilterSchema(ownerOptions), [ownerOptions]);

  const confirmDeleteTask = useConfirmDelete({
    resourceType: 'task',
    deleteFn: deleteTaskWithUndo,
    onRemoved: (id) => {
      setTasks((items) => items.filter((item) => item._id !== id));
      setEditingTaskIds((ids) => ids.filter((itemId) => itemId !== id));
      if (focusTaskId === id) setFocusTaskId('');
    },
    onRestored: () => load().catch(() => {}),
    defaultConfirm: 'Delete this task? You can undo within 30 seconds.',
  });
  const {
    filtered: filteredTasks,
    filters: advancedFilters,
    setFilters: setAdvancedFilters,
    matchMode: advancedMatchMode,
  } = useTableFilters(tasks, taskFilterSchema);

  const visibleTasks = filteredTasks;

  async function load() {
    const [taskData, opportunityData] = await Promise.all([
      crmApiFetch(`/api/admin/sales/tasks?status=${encodeURIComponent(status)}`),
      crmApiFetch('/api/admin/sales/opportunities'),
    ]);
    setTasks(taskData.items || []);
    setOpportunities(opportunityData.items || []);
  }

  useEffect(() => {
    setLoading(true);
    load().catch((err) => setError(err.message)).finally(() => setLoading(false));
  }, [status]);

  async function patchTask(task, updates) {
    if (isDemoTask(task._id)) return;
    let payload = updates;
    if (Object.prototype.hasOwnProperty.call(updates, 'opportunityId')) {
      const opportunityId = updates.opportunityId || null;
      payload = {
        ...updates,
        opportunityId,
        companyId: opportunityId ? companyIdFromOpportunity(opportunityId, opportunities) : null,
      };
    }
    const optimisticCompany = Object.prototype.hasOwnProperty.call(payload, 'opportunityId')
      ? (payload.opportunityId ? companyFromOpportunity(payload.opportunityId, opportunities) : null)
      : undefined;
    setTasks((items) => items.map((item) => (
      item._id === task._id
        ? {
          ...item,
          ...payload,
          ...(optimisticCompany !== undefined ? { companyId: optimisticCompany } : {}),
        }
        : item
    )));
    try {
      const updated = await crmApiFetch(`/api/admin/sales/tasks/${task._id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      setTasks((items) => items.map((item) => (item._id === task._id ? updated : item)));
      if (updates.status === 'Done' && status === 'Open') {
        setTasks((items) => items.filter((item) => item._id !== task._id));
      }
      if (updates.status === 'Open' && status === 'Done') {
        setTasks((items) => items.filter((item) => item._id !== task._id));
      }
    } catch (err) {
      setError(err.message);
      await load();
    }
  }

  async function toggleTask(task) {
    const next = task.status === 'Done' ? 'Open' : 'Done';
    await patchTask(task, { status: next });
  }

  async function deleteTask(task) {
    if (isDemoTask(task._id)) return;
    try {
      await confirmDeleteTask(task._id, `Deleted task: ${task.title || 'Untitled'}`);
    } catch (err) {
      setError(err.message);
      await load();
    }
  }

  async function addNewTask() {
    setCreating(true);
    setError('');
    try {
      const created = await crmApiFetch('/api/admin/sales/tasks', {
        method: 'POST',
        body: JSON.stringify({
          title: 'New task',
          priority: 'Normal',
          owner: 'admin',
        }),
      });
      setFocusTaskId(created._id);
      setEditingTaskIds((ids) => [created._id, ...ids]);
      if (status === 'Open') {
        setTasks((items) => [created, ...items]);
      } else {
        setStatus('Open');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  function confirmTask(task) {
    setEditingTaskIds((ids) => ids.filter((id) => id !== task._id));
    setFocusTaskId('');
  }

  function editTask(task) {
    setEditingTaskIds((ids) => (ids.includes(task._id) ? ids : [task._id, ...ids]));
  }

  if (loading) return <PageShell><LoadingState label="Loading tasks…" /></PageShell>;

  return (
    <PageShell>
      <PageHeader />
      {error && <Alert>{error}</Alert>}

      <PageSection>
        <PageToolbar
          start={(
            <div className="inline-flex rounded-lg bg-neutral-100 p-0.5">
              <button type="button" className={status === 'Open' ? 'crm-tab-active rounded-md px-3 py-1.5 text-xs font-semibold' : 'crm-tab-idle rounded-md px-3 py-1.5 text-xs font-semibold'} onClick={() => setStatus('Open')}>Open</button>
              <button type="button" className={status === 'Done' ? 'crm-tab-active rounded-md px-3 py-1.5 text-xs font-semibold' : 'crm-tab-idle rounded-md px-3 py-1.5 text-xs font-semibold'} onClick={() => setStatus('Done')}>Completed</button>
            </div>
          )}
          actions={(
            <>
              <AdvancedFilterPopover
                schema={taskFilterSchema}
                filters={advancedFilters}
                matchMode={advancedMatchMode}
                onChange={setAdvancedFilters}
              />
              <ToolbarCount>{visibleTasks.length} task{visibleTasks.length === 1 ? '' : 's'}</ToolbarCount>
              {status === 'Open' && (
                <button type="button" className="crm-btn-primary" onClick={addNewTask} disabled={creating}>
                  <Plus className="h-3.5 w-3.5" />
                  {creating ? 'Adding…' : 'New task'}
                </button>
              )}
            </>
          )}
        />
        <AdvancedFilterChips
          schema={taskFilterSchema}
          filters={advancedFilters}
          onChange={setAdvancedFilters}
          className="mb-3"
        />

        {!tasks.length ? (
          <Card>
            <EmptyState
              icon={CalendarCheck2}
              title={status === 'Done' ? 'No completed tasks' : 'Your task list is clear'}
              description="Add a task and edit it directly in the table — title, due date, opportunity, owner, and priority."
            />
          </Card>
        ) : visibleTasks.length === 0 ? (
          <Card>
            <EmptyState
              icon={CalendarCheck2}
              title="No tasks match"
              description="Try adjusting your search or advanced filters."
            />
          </Card>
        ) : (
          <Card className="overflow-hidden p-0">
            <TaskTable
              tasks={visibleTasks}
              onToggle={toggleTask}
              onPatch={patchTask}
              onConfirmTask={confirmTask}
              onEditTask={editTask}
              onDelete={deleteTask}
              editingTaskIds={editingTaskIds}
              opportunities={opportunities}
              ownerOptions={ownerOptions}
              focusTaskId={focusTaskId}
              showAccountColumn={false}
            />
          </Card>
        )}
      </PageSection>
    </PageShell>
  );
}
