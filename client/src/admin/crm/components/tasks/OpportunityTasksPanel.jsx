import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarCheck2, ExternalLink, Plus } from 'lucide-react';
import { crmApiFetch, deleteTaskWithUndo, deleteTasks, notifyWorkspaceChanged } from '../../crmApi.js';
import { useConfirmDelete } from '../../hooks/useConfirmDelete.js';
import { useBulkDelete } from '../../hooks/useBulkDelete.js';
import { useRowSelection } from '../../hooks/useRowSelection.js';
import { Alert, Badge, Card, EmptyState, LoadingState } from '../ui/primitives.jsx';
import { BulkSelectionBar } from '../ui/BulkSelectTable.jsx';
import TaskTable from './TaskTable.jsx';
import { buildOwnerOptions, isDemoTask, loadOwnerOptions } from './taskUtils.js';

const DEMO_OPPORTUNITY_TASKS = [
  { _id: 'demo-opp-task-1', title: 'Send revised proposal deck', dueAt: '2026-06-24T14:00:00', status: 'Open', priority: 'High', owner: 'Masuood' },
  { _id: 'demo-opp-task-2', title: 'Confirm procurement sign-off call', dueAt: '2026-06-25T10:30:00', status: 'Open', priority: 'Normal', owner: 'Talha' },
  { _id: 'demo-opp-task-3', title: 'Share production timeline draft', dueAt: '2026-06-26T16:00:00', status: 'Open', priority: 'Normal', owner: 'Joy' },
];

export default function OpportunityTasksPanel({
  opportunityId,
  companyId,
  opportunityOwner,
  preview = false,
  active = true,
}) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [focusTaskId, setFocusTaskId] = useState('');
  const [editingTaskIds, setEditingTaskIds] = useState([]);
  const [statusFilter, setStatusFilter] = useState('Open');
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [ownerOptions, setOwnerOptions] = useState([]);

  const load = useCallback(async () => {
    if (!opportunityId || preview) {
      setTasks([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const data = await crmApiFetch(
        `/api/admin/sales/tasks?status=${encodeURIComponent(statusFilter)}&opportunityId=${encodeURIComponent(opportunityId)}`,
      );
      setTasks(data.items || []);
    } catch (err) {
      setError(err.message || 'Failed to load tasks.');
    } finally {
      setLoading(false);
    }
  }, [opportunityId, preview, statusFilter]);

  useEffect(() => {
    if (!active) return;
    load();
  }, [load, active]);

  const visibleTasks = preview ? DEMO_OPPORTUNITY_TASKS : tasks;
  const deletableTasks = useMemo(
    () => visibleTasks.filter((task) => !isDemoTask(task._id)),
    [visibleTasks],
  );
  const selection = useRowSelection(deletableTasks);
  useEffect(() => {
    loadOwnerOptions(visibleTasks, [opportunityOwner])
      .then(setOwnerOptions)
      .catch(() => setOwnerOptions(buildOwnerOptions(visibleTasks, [opportunityOwner])));
  }, [visibleTasks, opportunityOwner]);

  async function patchTask(task, updates) {
    if (isDemoTask(task._id)) return;
    setTasks((items) => items.map((item) => (item._id === task._id ? { ...item, ...updates } : item)));
    try {
      const updated = await crmApiFetch(`/api/admin/sales/tasks/${task._id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });
      setTasks((items) => items.map((item) => (item._id === task._id ? updated : item)));
      notifyWorkspaceChanged({ entity: 'task', action: 'update', id: task._id });
      if (updates.status === 'Done' && statusFilter === 'Open') {
        setTasks((items) => items.filter((item) => item._id !== task._id));
      }
      if (updates.status === 'Open' && statusFilter === 'Done') {
        setTasks((items) => items.filter((item) => item._id !== task._id));
      }
    } catch (err) {
      setError(err.message || 'Failed to update task.');
      await load();
    }
  }

  async function toggleTask(task) {
    const next = task.status === 'Done' ? 'Open' : 'Done';
    await patchTask(task, { status: next });
  }

  async function addNewTask() {
    if (preview) return;
    setCreating(true);
    setError('');
    try {
      const created = await crmApiFetch('/api/admin/sales/tasks', {
        method: 'POST',
        body: JSON.stringify({
          title: 'New task',
          priority: 'Normal',
          owner: opportunityOwner || 'admin',
          opportunityId,
          companyId: companyId || null,
        }),
      });
      setFocusTaskId(created._id);
      setEditingTaskIds((ids) => [created._id, ...ids]);
      if (statusFilter === 'Open') {
        setTasks((items) => [created, ...items]);
      } else {
        setStatusFilter('Open');
      }
      notifyWorkspaceChanged({ entity: 'task', action: 'create', id: created._id });
    } catch (err) {
      setError(err.message || 'Failed to create task.');
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

  const confirmDeleteTask = useConfirmDelete({
    resourceType: 'task',
    deleteFn: deleteTaskWithUndo,
    onRemoved: (id) => {
      setTasks((items) => items.filter((item) => item._id !== id));
      setEditingTaskIds((ids) => ids.filter((itemId) => itemId !== id));
      if (focusTaskId === id) setFocusTaskId('');
    },
    onRestored: () => load(),
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
    onRestored: () => load(),
  });

  async function handleBulkDelete() {
    if (preview) return;
    setBulkDeleting(true);
    try {
      await runBulkDeleteTasks(selection.selectedArray, { noun: 'task' });
    } catch (err) {
      setError(err.message || 'Failed to delete tasks.');
    } finally {
      setBulkDeleting(false);
    }
  }

  async function deleteTask(task) {
    if (isDemoTask(task._id)) return;
    try {
      await confirmDeleteTask(task._id, `Deleted task: ${task.title || 'Untitled'}`);
    } catch (err) {
      setError(err.message || 'Failed to delete task.');
      await load();
    }
  }

  if (loading) return <div className="crm-opp-tasks-loading"><LoadingState label="Loading tasks…" /></div>;

  return (
    <div className="crm-opp-tasks-panel">
      {error && <Alert>{error}</Alert>}

      <div className="crm-opp-tasks-toolbar">
        <div className="inline-flex rounded-lg bg-neutral-100 p-0.5">
          <button
            type="button"
            className={statusFilter === 'Open' ? 'crm-tab-active rounded-md px-3 py-1.5 text-xs font-semibold' : 'crm-tab-idle rounded-md px-3 py-1.5 text-xs font-semibold'}
            onClick={() => setStatusFilter('Open')}
          >
            Open
          </button>
          <button
            type="button"
            className={statusFilter === 'Done' ? 'crm-tab-active rounded-md px-3 py-1.5 text-xs font-semibold' : 'crm-tab-idle rounded-md px-3 py-1.5 text-xs font-semibold'}
            onClick={() => setStatusFilter('Done')}
          >
            Completed
          </button>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone="neutral">{tasks.length} task{tasks.length === 1 ? '' : 's'}</Badge>
          {!preview && (
            <>
              <Link to="/admin/crm/tasks" className="crm-opp-tasks-link">
                <ExternalLink className="h-3 w-3" />
                All tasks
              </Link>
              <button
                type="button"
                className="crm-btn-primary crm-opp-tasks-add-btn"
                onClick={addNewTask}
                disabled={creating}
              >
                <Plus className="h-3.5 w-3.5" />
                {creating ? 'Adding…' : 'New task'}
              </button>
            </>
          )}
        </div>
      </div>

      {!visibleTasks.length ? (
        <EmptyState
          icon={CalendarCheck2}
          title={statusFilter === 'Done' ? 'No completed tasks' : 'No tasks for this opportunity'}
          description={preview ? 'Sample tasks appear in preview mode.' : 'Tasks sync with the central Tasks page across your team.'}
          action={!preview && statusFilter === 'Open' ? (
            <button type="button" className="crm-btn-primary crm-opp-tasks-add-btn" onClick={addNewTask} disabled={creating}>
              <Plus className="h-3.5 w-3.5" />
              {creating ? 'Adding…' : 'New task'}
            </button>
          ) : null}
        />
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
            onToggle={toggleTask}
            onPatch={patchTask}
            onConfirmTask={confirmTask}
            onEditTask={editTask}
            onDelete={deleteTask}
            editingTaskIds={editingTaskIds}
            ownerOptions={ownerOptions}
            focusTaskId={focusTaskId}
              showCampaignColumn={false}
            showOpportunityColumn={false}
            showAccountColumn={false}
            embedded
            selection={preview ? null : selection}
          />
        </Card>
      )}
    </div>
  );
}
