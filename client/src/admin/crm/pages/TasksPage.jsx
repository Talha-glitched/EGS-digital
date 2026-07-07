import { useEffect, useMemo, useState, useCallback } from 'react';
import { crmApiFetch, deleteTaskWithUndo, deleteTasks, notifyWorkspaceChanged } from '../crmApi.js';
import { useConfirmDelete } from '../hooks/useConfirmDelete.js';
import { useBulkDelete } from '../hooks/useBulkDelete.js';
import { useSpotlightDeepLink } from '../hooks/useSpotlightDeepLink.js';
import { useRowSelection } from '../hooks/useRowSelection.js';
import TaskTable from '../components/tasks/TaskTable.jsx';
import { BulkSelectionBar } from '../components/ui/BulkSelectTable.jsx';
import { buildOwnerOptions, campaignIdFromOpportunity, companyFromOpportunity, companyIdFromOpportunity, isDemoTask, loadOwnerOptions } from '../components/tasks/taskUtils.js';
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
  const [campaigns, setCampaigns] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [status, setStatus] = useState('Open');
  const [loading, setLoading] = useState(true);
  const [focusTaskId, setFocusTaskId] = useState('');
  const [editingTaskIds, setEditingTaskIds] = useState([]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [ownerOptions, setOwnerOptions] = useState([]);

  useEffect(() => {
    loadOwnerOptions(tasks, opportunities.map((item) => item.owner))
      .then(setOwnerOptions)
      .catch(() => setOwnerOptions(buildOwnerOptions(tasks, opportunities.map((item) => item.owner))));
  }, [tasks, opportunities]);

  const taskFilterSchema = useMemo(() => buildTaskFilterSchema(ownerOptions), [ownerOptions]);

  const {
    filtered: filteredTasks,
    filters: advancedFilters,
    setFilters: setAdvancedFilters,
    matchMode: advancedMatchMode,
  } = useTableFilters(tasks, taskFilterSchema);

  const visibleTasks = filteredTasks;

  const deletableTasks = useMemo(
    () => visibleTasks.filter((task) => !isDemoTask(task._id)),
    [visibleTasks],
  );
  const selection = useRowSelection(deletableTasks);

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

  const runBulkDeleteTasks = useBulkDelete({
    resourceType: 'task',
    bulkDeleteFn: deleteTasks,
    getLabelForId: (id) => {
      const task = tasks.find((item) => item._id === id);
      return `Deleted task: ${task?.title || 'Untitled'}`;
    },
    defaultConfirm: 'Delete these tasks? You can undo each within 30 seconds.',
    onRemoved: (removedIds) => {
      setTasks((items) => items.filter((item) => !removedIds.includes(item._id)));
      setEditingTaskIds((itemIds) => itemIds.filter((itemId) => !removedIds.includes(itemId)));
      if (focusTaskId && removedIds.includes(focusTaskId)) setFocusTaskId('');
      selection.clearSelection();
    },
    onRestored: () => load().catch(() => {}),
  });

  async function handleBulkDelete() {
    setBulkDeleting(true);
    try {
      await runBulkDeleteTasks(selection.selectedArray, { noun: 'task' });
    } catch (err) {
      setError(err.message);
    } finally {
      setBulkDeleting(false);
    }
  }

  async function load() {
    const [taskData, opportunityData, campaignData] = await Promise.all([
      crmApiFetch(`/api/admin/sales/tasks?status=${encodeURIComponent(status)}`),
      crmApiFetch('/api/admin/sales/opportunities'),
      crmApiFetch('/api/admin/projects'),
    ]);
    setTasks(taskData.items || []);
    setOpportunities(opportunityData.items || []);
    setCampaigns(campaignData || []);
  }

  useEffect(() => {
    setLoading(true);
    load().catch((err) => setError(err.message)).finally(() => setLoading(false));
  }, [status]);

  useSpotlightDeepLink({
    recordType: 'task',
    onOpen: useCallback((task) => {
      if (task?.status && task.status !== status) setStatus(task.status);
      setFocusTaskId(task._id);
    }, [status]),
    findRecord: useCallback((id) => tasks.find((task) => String(task._id) === String(id)), [tasks]),
    resolveRecord: useCallback((id) => crmApiFetch(`/api/admin/sales/tasks/${encodeURIComponent(id)}`), []),
    ready: !loading,
  });

  async function patchTask(task, updates) {
    if (isDemoTask(task._id)) return;
    let payload = updates;
    if (Object.prototype.hasOwnProperty.call(updates, 'opportunityId')) {
      const opportunityId = updates.opportunityId || null;
      payload = {
        ...updates,
        opportunityId,
        campaignId: opportunityId ? campaignIdFromOpportunity(opportunityId, opportunities) : null,
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
      notifyWorkspaceChanged({ entity: 'task', action: 'update', id: task._id });
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
      notifyWorkspaceChanged({ entity: 'task', action: 'create', id: created._id });
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
            <BulkSelectionBar
              count={selection.selectionCount}
              noun="task"
              onDelete={handleBulkDelete}
              onClear={selection.clearSelection}
              deleting={bulkDeleting}
            />
            <TaskTable
              tasks={visibleTasks}
              campaigns={campaigns}
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
              selection={selection}
            />
          </Card>
        )}
      </PageSection>
    </PageShell>
  );
}
