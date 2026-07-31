import { useEffect, useMemo, useState, useCallback } from 'react';
import { crmApiFetch, fetchLeadById, deleteTaskWithUndo, deleteTasks, notifyWorkspaceChanged } from '../crmApi.js';
import { useConfirmDelete } from '../hooks/useConfirmDelete.js';
import { useBulkDelete } from '../hooks/useBulkDelete.js';
import { useSpotlightDeepLink } from '../hooks/useSpotlightDeepLink.js';
import { useRowSelection } from '../hooks/useRowSelection.js';
import TaskTable from '../components/tasks/TaskTable.jsx';
import OutreachDrawer from '../components/leads/OutreachDrawer.jsx';
import SearchableSelect from '../components/ui/SearchableSelect.jsx';
import DateTimePicker from '../components/ui/DateTimePicker.jsx';
import { BulkSelectionBar } from '../components/ui/BulkSelectTable.jsx';
import { buildOwnerOptions, campaignIdFromOpportunity, companyFromOpportunity, companyIdFromOpportunity, isDemoTask, loadOwnerOptions } from '../components/tasks/taskUtils.js';
import { Alert, Card, EmptyState, LoadingState, PageHeader, PageSection, PageShell, PageToolbar, ToolbarCount, cn } from '../components/ui/primitives.jsx';
import { Modal } from '../components/ui/Modal.jsx';
import { CalendarCheck2, Plus, UserCheck, BriefcaseBusiness, Users, StickyNote } from 'lucide-react';
import {
  AdvancedFilterPopover,
  AdvancedFilterChips,
  useTableFilters,
  buildTaskFilterSchema,
} from '../components/ui/advancedFilter/index.js';

function FormField({ label, required, children }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-neutral-600">
        {label} {required && <span className="text-red-500">*</span>}
      </span>
      {children}
    </label>
  );
}

export default function TasksPage() {
  const [tasks, setTasks] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [leads, setLeads] = useState([]);
  const [status, setStatus] = useState('Open');
  const [categoryTab, setCategoryTab] = useState('all'); // 'all' | 'lead' | 'relationship' | 'ongoing_job'
  const [loading, setLoading] = useState(true);
  const [focusTaskId, setFocusTaskId] = useState('');
  const [editingTaskIds, setEditingTaskIds] = useState([]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [ownerOptions, setOwnerOptions] = useState([]);
  const [selectedLead, setSelectedLead] = useState(null);

  // Category Task Creation Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createTaskForm, setCreateTaskForm] = useState({
    taskType: 'lead_follow_up',
    title: '',
    leadId: '',
    opportunityId: '',
    dueAt: '',
    priority: 'Normal',
    owner: 'admin',
    notes: '',
  });

  useEffect(() => {
    loadOwnerOptions(tasks, opportunities.map((item) => item.owner))
      .then(setOwnerOptions)
      .catch(() => setOwnerOptions(buildOwnerOptions(tasks, opportunities.map((item) => item.owner))));
  }, [tasks, opportunities]);

  // Filter tasks by selected category pill tab
  const categoryFilteredTasks = useMemo(() => {
    if (categoryTab === 'all') return tasks;
    if (categoryTab === 'lead') {
      return tasks.filter((t) => t.taskType === 'lead_follow_up' || t.taskType === 'reply_review');
    }
    if (categoryTab === 'relationship') {
      return tasks.filter((t) => t.taskType === 'relationship_follow_up' || t.isRelationshipFollowUp);
    }
    if (categoryTab === 'ongoing_job') {
      return tasks.filter((t) => t.taskType === 'ongoing_job' || Boolean(t.opportunityId));
    }
    return tasks;
  }, [tasks, categoryTab]);

  const categoryCounts = useMemo(() => ({
    all: tasks.length,
    lead: tasks.filter((t) => t.taskType === 'lead_follow_up' || t.taskType === 'reply_review').length,
    relationship: tasks.filter((t) => t.taskType === 'relationship_follow_up' || t.isRelationshipFollowUp).length,
    ongoing_job: tasks.filter((t) => t.taskType === 'ongoing_job' || Boolean(t.opportunityId)).length,
  }), [tasks]);

  const taskFilterSchema = useMemo(() => buildTaskFilterSchema(ownerOptions), [ownerOptions]);

  const {
    filtered: filteredTasks,
    filters: advancedFilters,
    setFilters: setAdvancedFilters,
    matchMode: advancedMatchMode,
  } = useTableFilters(categoryFilteredTasks, taskFilterSchema);

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
      crmApiFetch('/api/admin/sales/opportunities').catch(() => ({ items: [] })),
      crmApiFetch('/api/admin/projects').catch(() => []),
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
    const isRel = task.taskType === 'relationship_follow_up' || task.isRelationshipFollowUp;
    if (task.status === 'Open' && isRel && !task.channel) {
      setError('Relationship tasks require selecting a follow-up method.');
      return;
    }
    await patchTask(task, {
      status: task.status === 'Done' ? 'Open' : 'Done',
    });
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

  const openCreateModal = () => {
    const initialType = categoryTab === 'relationship'
      ? 'relationship_follow_up'
      : categoryTab === 'ongoing_job'
        ? 'ongoing_job'
        : 'lead_follow_up';

    setCreateTaskForm({
      taskType: initialType,
      title: '',
      leadId: '',
      opportunityId: '',
      dueAt: new Date(Date.now() + 86400000 * 2).toISOString(),
      priority: 'Normal',
      owner: 'admin',
      notes: '',
    });
    setCreateModalOpen(true);
  };

  const handleCreateTaskSubmit = async (e) => {
    e.preventDefault();
    if (!createTaskForm.title.trim()) return;

    if ((createTaskForm.taskType === 'lead_follow_up' || createTaskForm.taskType === 'relationship_follow_up') && !createTaskForm.leadId) {
      setError('Please select a contact for this task.');
      return;
    }
    if (createTaskForm.taskType === 'ongoing_job' && !createTaskForm.opportunityId) {
      setError('Please select an ongoing job for this task.');
      return;
    }

    setCreating(true);
    setError('');
    try {
      const created = await crmApiFetch('/api/admin/sales/tasks', {
        method: 'POST',
        body: JSON.stringify({
          title: createTaskForm.title.trim(),
          taskType: createTaskForm.taskType,
          leadId: createTaskForm.leadId || null,
          opportunityId: createTaskForm.opportunityId || null,
          dueAt: createTaskForm.dueAt || null,
          priority: createTaskForm.priority,
          owner: createTaskForm.owner,
          notes: createTaskForm.notes,
        }),
      });

      setCreateModalOpen(false);
      setFocusTaskId(created._id);
      if (status === 'Open') {
        setTasks((items) => [created, ...items]);
      } else {
        setStatus('Open');
      }
      notifyWorkspaceChanged({ entity: 'task', action: 'create', id: created._id });
    } catch (err) {
      setError(err.message || 'Failed to create task.');
    } finally {
      setCreating(false);
    }
  };

  const handleOpenContact = async (leadId) => {
    if (!leadId) return;
    const id = typeof leadId === 'object' ? leadId._id : leadId;
    try {
      const fullLead = await fetchLeadById(id);
      setSelectedLead(fullLead);
    } catch (err) {
      console.warn('Failed to fetch lead profile:', err);
      setError('Could not open contact profile.');
    }
  };

  function confirmTask(task) {
    setEditingTaskIds((ids) => ids.filter((id) => id !== task._id));
    setFocusTaskId('');
  }

  async function editTask(task) {
    const rawLead = task.leadId;
    const targetLeadId = typeof rawLead === 'object' ? rawLead?._id : rawLead;
    if (targetLeadId) {
      await handleOpenContact(targetLeadId);
      return;
    }
    setEditingTaskIds((ids) => (ids.includes(task._id) ? ids : [task._id, ...ids]));
  }

  const leadOptions = useMemo(() => leads.map((l) => ({
    value: l._id,
    label: `${l.name || 'Unnamed'} ${l.email ? `(${l.email})` : ''} ${l.companyName ? `· ${l.companyName}` : ''}`,
  })), [leads]);

  const opportunityOptions = useMemo(() => opportunities.map((o) => ({
    value: o._id,
    label: `${o.name} (${o.stage || 'Pipeline'}) ${o.companyId?.companyName ? `· ${o.companyId.companyName}` : ''}`,
  })), [opportunities]);

  if (loading) return <PageShell><LoadingState label="Loading tasks…" /></PageShell>;

  return (
    <PageShell>
      <PageHeader />
      {error && <Alert>{error}</Alert>}

      <PageSection>
        {/* Category Pill Selector Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-neutral-200 pb-3 mb-3">
          {[
            { id: 'all', label: 'All Tasks', icon: CalendarCheck2, count: categoryCounts.all },
            { id: 'lead', label: 'Lead Tasks', icon: UserCheck, count: categoryCounts.lead, activeColor: 'bg-indigo-600 text-white' },
            { id: 'relationship', label: 'Relationship Tasks', icon: Users, count: categoryCounts.relationship, activeColor: 'bg-amber-600 text-white' },
            { id: 'ongoing_job', label: 'Ongoing Jobs', icon: BriefcaseBusiness, count: categoryCounts.ongoing_job, activeColor: 'bg-emerald-600 text-white' },
          ].map((pill) => {
            const active = categoryTab === pill.id;
            const Icon = pill.icon;
            return (
              <button
                key={pill.id}
                type="button"
                onClick={() => setCategoryTab(pill.id)}
                className={cn(
                  'flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold transition border',
                  active
                    ? (pill.activeColor || 'bg-neutral-900 text-white border-neutral-900 shadow-sm')
                    : 'bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50 hover:text-neutral-900'
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{pill.label}</span>
                {pill.count > 0 && (
                  <span className={cn(
                    'rounded-full px-1.5 py-0.2 text-[10px] font-bold',
                    active ? 'bg-white/20 text-white' : 'bg-neutral-100 text-neutral-700'
                  )}>
                    {pill.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

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
                <button type="button" className="crm-btn-primary" onClick={openCreateModal} disabled={creating}>
                  <Plus className="h-3.5 w-3.5" />
                  {creating ? 'Adding…' : 'New Task'}
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
              description="Create tasks tailored to Leads, Relationships, or Ongoing Jobs."
            />
          </Card>
        ) : visibleTasks.length === 0 ? (
          <Card>
            <EmptyState
              icon={CalendarCheck2}
              title="No tasks match"
              description="Try adjusting your category pill tab or advanced filters."
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
              onOpenContact={handleOpenContact}
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

      {/* Category-Tailored Create Task Modal */}
      {createModalOpen && (
        <Modal
          open={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          title="Create New Task"
          size="md"
        >
          <form onSubmit={handleCreateTaskSubmit} className="space-y-4 pt-2">
            {/* Category Selector Tabs inside Modal */}
            <FormField label="Task Category" required>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  { key: 'lead_follow_up', label: 'Lead', icon: UserCheck, color: 'bg-indigo-50 text-indigo-700 border-indigo-300' },
                  { key: 'relationship_follow_up', label: 'Relationship', icon: Users, color: 'bg-amber-50 text-amber-700 border-amber-300' },
                  { key: 'ongoing_job', label: 'Ongoing Job', icon: BriefcaseBusiness, color: 'bg-emerald-50 text-emerald-700 border-emerald-300' },
                  { key: 'general', label: 'General', icon: StickyNote, color: 'bg-neutral-100 text-neutral-700 border-neutral-300' },
                ].map((cat) => {
                  const selected = createTaskForm.taskType === cat.key;
                  const Icon = cat.icon;
                  return (
                    <button
                      key={cat.key}
                      type="button"
                      onClick={() => setCreateTaskForm((prev) => ({ ...prev, taskType: cat.key }))}
                      className={cn(
                        'flex items-center justify-center gap-1.5 rounded-xl border p-2.5 text-xs font-semibold transition',
                        cat.color,
                        selected ? 'ring-2 ring-brand shadow-sm font-bold border-brand' : 'opacity-70'
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span>{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </FormField>

            {/* Category Specific Link Selector */}
            {(createTaskForm.taskType === 'lead_follow_up' || createTaskForm.taskType === 'relationship_follow_up') && (
              <FormField label="Select Contact" required>
                <SearchableSelect
                  value={createTaskForm.leadId}
                  onChange={(val) => setCreateTaskForm((prev) => ({ ...prev, leadId: val }))}
                  options={leadOptions}
                  placeholder="Select contact…"
                  searchPlaceholder="Search contacts by name or email…"
                  emptyLabel="No contacts found."
                />
              </FormField>
            )}

            {createTaskForm.taskType === 'ongoing_job' && (
              <FormField label="Select Ongoing Job" required>
                <SearchableSelect
                  value={createTaskForm.opportunityId}
                  onChange={(val) => setCreateTaskForm((prev) => ({ ...prev, opportunityId: val }))}
                  options={opportunityOptions}
                  placeholder="Select ongoing job project…"
                  searchPlaceholder="Search projects by name…"
                  emptyLabel="No ongoing jobs found."
                />
              </FormField>
            )}

            <FormField label="Task Title" required>
              <input
                className="crm-input text-xs"
                value={createTaskForm.title}
                onChange={(e) => setCreateTaskForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder={
                  createTaskForm.taskType === 'lead_follow_up' ? 'e.g. Call lead to review quotation' :
                  createTaskForm.taskType === 'relationship_follow_up' ? 'e.g. Key relationship quarterly check-in' :
                  createTaskForm.taskType === 'ongoing_job' ? 'e.g. Approve booth graphics layout' :
                  'e.g. Review monthly budget'
                }
                required
              />
            </FormField>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FormField label="Due Date">
                <DateTimePicker
                  value={createTaskForm.dueAt}
                  onChange={(dueAt) => setCreateTaskForm((prev) => ({ ...prev, dueAt }))}
                />
              </FormField>

              <FormField label="Priority">
                <select
                  className="crm-select text-xs"
                  value={createTaskForm.priority}
                  onChange={(e) => setCreateTaskForm((prev) => ({ ...prev, priority: e.target.value }))}
                >
                  <option value="Low">Low</option>
                  <option value="Normal">Normal</option>
                  <option value="High">High</option>
                </select>
              </FormField>
            </div>

            <FormField label="Owner">
              <input
                className="crm-input text-xs"
                value={createTaskForm.owner}
                onChange={(e) => setCreateTaskForm((prev) => ({ ...prev, owner: e.target.value }))}
                placeholder="Assign owner"
              />
            </FormField>

            <FormField label="Notes">
              <textarea
                rows={3}
                className="crm-input text-xs resize-y"
                value={createTaskForm.notes}
                onChange={(e) => setCreateTaskForm((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Context or talking points..."
              />
            </FormField>

            <div className="flex justify-end gap-2 border-t border-neutral-200 pt-3">
              <button type="button" className="crm-btn-secondary text-xs" onClick={() => setCreateModalOpen(false)}>
                Cancel
              </button>
              <button type="submit" disabled={creating || !createTaskForm.title.trim()} className="crm-btn-primary text-xs">
                {creating ? 'Creating…' : 'Create Task'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Drawer Pop-up for selected lead */}
      <OutreachDrawer
        lead={selectedLead}
        onClose={() => setSelectedLead(null)}
        onLeadUpdated={() => load().catch(() => {})}
      />
    </PageShell>
  );
}
