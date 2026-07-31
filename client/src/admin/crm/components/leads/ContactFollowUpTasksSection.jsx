import { useEffect, useState, useCallback } from 'react';
import {
  CalendarDays,
  CheckCircle2,
  Circle,
  Clock,
  Plus,
  Trash2,
  Pencil,
  Phone,
  Mail,
  MessageSquare,
  Users,
  Globe,
  StickyNote,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { crmApiFetch } from '../../crmApi.js';
import { Modal } from '../ui/Modal.jsx';
import DateTimePicker from '../ui/DateTimePicker.jsx';
import { cn } from '../ui/primitives.jsx';

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

const CHANNEL_OPTIONS = [
  { key: 'phone', label: 'Phone call', icon: Phone, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  { key: 'email', label: 'Email', icon: Mail, color: 'text-blue-600 bg-blue-50 border-blue-200' },
  { key: 'whatsapp', label: 'WhatsApp', icon: MessageSquare, color: 'text-teal-600 bg-teal-50 border-teal-200' },
  { key: 'meeting', label: 'Meeting', icon: Users, color: 'text-purple-600 bg-purple-50 border-purple-200' },
  { key: 'linkedin', label: 'LinkedIn', icon: Globe, color: 'text-sky-600 bg-sky-50 border-sky-200' },
  { key: 'other', label: 'Other / Note', icon: StickyNote, color: 'text-neutral-600 bg-neutral-100 border-neutral-200' },
];

export default function ContactFollowUpTasksSection({
  leadId,
  companyId,
  contactName,
  ownerDefault = 'admin',
  onTimelineRefresh,
}) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Task form modal
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [form, setForm] = useState({
    title: '',
    dueAt: null,
    priority: 'Normal',
    owner: ownerDefault,
    notes: '',
    channel: '',
  });
  const [busy, setBusy] = useState(false);

  // Channel completion modal
  const [completingTask, setCompletingTask] = useState(null);
  const [selectedChannel, setSelectedChannel] = useState('');

  // Quick next follow-up prompt state
  const [showNextPrompt, setShowNextPrompt] = useState(false);
  const [showCompletedList, setShowCompletedList] = useState(false);

  const loadTasks = useCallback(async () => {
    if (!leadId) return;
    setLoading(true);
    setError('');
    try {
      const res = await crmApiFetch(`/api/admin/sales/tasks?leadId=${leadId}&status=All`);
      setTasks(res.items || []);
    } catch (err) {
      console.error(err);
      setError('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const openCreateModal = () => {
    setEditingTask(null);
    setForm({
      title: contactName ? `Follow up with ${contactName}` : 'Follow up with contact',
      dueAt: null,
      priority: 'Normal',
      owner: ownerDefault || 'admin',
      notes: '',
      channel: '',
    });
    setTaskModalOpen(true);
  };

  const openEditModal = (task) => {
    setEditingTask(task);
    setForm({
      title: task.title || '',
      dueAt: task.dueAt || null,
      priority: task.priority || 'Normal',
      owner: task.owner ?? '',
      notes: task.notes || '',
      channel: task.channel || '',
    });
    setTaskModalOpen(true);
  };

  const handleSaveTask = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setBusy(true);
    setError('');
    try {
      if (editingTask) {
        await crmApiFetch(`/api/admin/sales/tasks/${editingTask._id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            title: form.title.trim(),
            dueAt: form.dueAt || null,
            priority: form.priority,
            owner: form.owner,
            notes: form.notes,
            channel: form.channel,
          }),
        });
      } else {
        await crmApiFetch('/api/admin/sales/tasks', {
          method: 'POST',
          body: JSON.stringify({
            title: form.title.trim(),
            leadId,
            companyId,
            taskType: 'relationship_follow_up',
            dueAt: form.dueAt || null,
            priority: form.priority,
            owner: form.owner,
            notes: form.notes,
            channel: form.channel,
          }),
        });
      }
      setTaskModalOpen(false);
      await loadTasks();
      onTimelineRefresh?.();
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to save task');
    } finally {
      setBusy(false);
    }
  };

  const handleToggleComplete = async (task) => {
    if (task.status === 'Done') {
      // Reopen task
      try {
        await crmApiFetch(`/api/admin/sales/tasks/${task._id}`, {
          method: 'PATCH',
          body: JSON.stringify({ status: 'Open' }),
        });
        await loadTasks();
        onTimelineRefresh?.();
      } catch (err) {
        console.error(err);
      }
      return;
    }

    // Completing an open task
    if (!task.channel) {
      setCompletingTask(task);
      setSelectedChannel('');
      return;
    }

    await executeCompleteTask(task, task.channel);
  };

  const executeCompleteTask = async (task, channel) => {
    setBusy(true);
    setError('');
    try {
      await crmApiFetch(`/api/admin/sales/tasks/${task._id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'Done',
          channel,
        }),
      });
      setCompletingTask(null);
      await loadTasks();
      setShowNextPrompt(true);
      onTimelineRefresh?.();
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to complete task');
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteTask = async (taskId) => {
    try {
      await crmApiFetch(`/api/admin/sales/tasks/${taskId}`, {
        method: 'DELETE',
      });
      await loadTasks();
      onTimelineRefresh?.();
    } catch (err) {
      console.error(err);
    }
  };

  const relTasks = tasks.filter((t) => t.taskType === 'relationship_follow_up' || t.isRelationshipFollowUp);
  const openTasks = relTasks.filter((t) => t.status === 'Open');
  const completedTasks = relTasks.filter((t) => t.status === 'Done');

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-xs text-red-700">
          {error}
        </div>
      )}

      {/* Quick Prompt Banner after completion */}
      {showNextPrompt && (
        <div className="flex items-center justify-between rounded-xl bg-emerald-50 border border-emerald-200 p-3.5 text-xs text-emerald-900 transition-all animate-fadeIn">
          <div>
            <p className="font-semibold text-emerald-950">Follow-up logged to timeline!</p>
            <p className="mt-0.5 text-emerald-700">Would you like to schedule the next follow-up now?</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setShowNextPrompt(false);
                openCreateModal();
              }}
              className="rounded-lg bg-emerald-600 px-3 py-1.5 font-semibold text-white hover:bg-emerald-700 transition"
            >
              Schedule Next
            </button>
            <button
              type="button"
              onClick={() => setShowNextPrompt(false)}
              className="rounded-lg px-2 py-1 text-emerald-700 hover:text-emerald-900"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Open Tasks List */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-neutral-700 uppercase tracking-wider">
            Open Follow-ups ({openTasks.length})
          </span>
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:text-brand-dark transition"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Follow-up
          </button>
        </div>

        {openTasks.length === 0 ? (
          <div className="rounded-xl border border-dashed border-neutral-300 p-4 text-center">
            <p className="text-xs font-semibold text-neutral-600">No follow-up scheduled</p>
            <p className="mt-1 text-[11px] text-neutral-500">Keep the relationship warm by scheduling your next interaction.</p>
            <button
              type="button"
              onClick={openCreateModal}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-dark transition"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Follow-up Task
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {openTasks.map((task) => (
              <div
                key={task._id}
                className="group flex items-start gap-3 rounded-xl border border-neutral-200 bg-white p-3 hover:border-neutral-300 transition"
              >
                <button
                  type="button"
                  onClick={() => handleToggleComplete(task)}
                  className="mt-0.5 shrink-0 text-neutral-400 hover:text-emerald-600 transition"
                  title="Mark complete"
                >
                  <Circle className="h-4 w-4" />
                </button>

                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-neutral-900 leading-snug">{task.title}</p>
                  {task.notes && (
                    <p className="mt-1 text-[11px] text-neutral-600 line-clamp-2 leading-relaxed">{task.notes}</p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-neutral-500">
                    {task.dueAt ? (
                      <span className={cn(
                        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium',
                        new Date(task.dueAt) < new Date() ? 'bg-red-50 text-red-700 font-semibold' : 'bg-neutral-100 text-neutral-700'
                      )}>
                        <CalendarDays className="h-3 w-3" />
                        {new Date(task.dueAt).toLocaleString('en-AE', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}
                      </span>
                    ) : (
                      <span className="text-neutral-400">No due date</span>
                    )}

                    {task.owner && (
                      <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-neutral-600 font-medium">
                        Owner: {task.owner}
                      </span>
                    )}

                    {task.channel && (
                      <span className="rounded bg-sky-50 px-1.5 py-0.5 text-sky-700 font-medium capitalize">
                        {task.channel}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                  <button
                    type="button"
                    onClick={() => openEditModal(task)}
                    className="p-1 text-neutral-400 hover:text-neutral-700"
                    title="Edit task"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteTask(task._id)}
                    className="p-1 text-neutral-400 hover:text-red-600"
                    title="Delete task"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Completed Tasks List Collapsible */}
      {completedTasks.length > 0 && (
        <div className="border-t border-neutral-200 pt-3">
          <button
            type="button"
            onClick={() => setShowCompletedList((prev) => !prev)}
            className="flex items-center justify-between w-full text-xs font-semibold text-neutral-500 hover:text-neutral-800 transition"
          >
            <span>Completed Follow-ups ({completedTasks.length})</span>
            {showCompletedList ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>

          {showCompletedList && (
            <div className="mt-2 space-y-2">
              {completedTasks.map((task) => (
                <div
                  key={task._id}
                  className="flex items-start gap-3 rounded-xl border border-neutral-100 bg-neutral-50/60 p-2.5 opacity-75"
                >
                  <button
                    type="button"
                    onClick={() => handleToggleComplete(task)}
                    className="mt-0.5 shrink-0 text-emerald-600 hover:text-neutral-400 transition"
                    title="Reopen task"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-neutral-600 line-through">{task.title}</p>
                    <p className="mt-0.5 text-[10px] text-neutral-400">
                      Completed {task.completedAt ? new Date(task.completedAt).toLocaleDateString('en-AE') : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Channel Selection Modal on Completion */}
      {completingTask && (
        <Modal
          open={Boolean(completingTask)}
          onClose={() => setCompletingTask(null)}
          title="Select follow-up method"
          subtitle={`How did you follow up on "${completingTask.title}"?`}
          size="sm"
        >
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-2">
              {CHANNEL_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const selected = selectedChannel === opt.key;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setSelectedChannel(opt.key)}
                    className={cn(
                      'flex items-center gap-2.5 rounded-xl border p-3 text-left transition',
                      selected
                        ? 'border-brand bg-brand-soft/40 ring-2 ring-brand/20 font-semibold text-brand'
                        : 'border-neutral-200 hover:border-neutral-300 text-neutral-700'
                    )}
                  >
                    <div className={cn('flex h-7 w-7 items-center justify-center rounded-lg border', opt.color)}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-xs">{opt.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex justify-end gap-2 border-t border-neutral-200 pt-3">
              <button
                type="button"
                className="crm-btn-secondary text-xs"
                onClick={() => setCompletingTask(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!selectedChannel || busy}
                onClick={() => executeCompleteTask(completingTask, selectedChannel)}
                className="crm-btn-primary text-xs"
              >
                {busy ? 'Saving…' : 'Complete & Log Interaction'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Create / Edit Task Modal */}
      {taskModalOpen && (
        <Modal
          open={taskModalOpen}
          onClose={() => setTaskModalOpen(false)}
          title={editingTask ? 'Edit follow-up task' : 'Schedule follow-up task'}
          subtitle={`Contact: ${contactName}`}
          size="md"
        >
          <form onSubmit={handleSaveTask} className="space-y-4 pt-2">
            <FormField label="Task Outcome / Title" required>
              <input
                className="crm-input"
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Follow up on exhibition stand proposal"
                required
              />
            </FormField>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="Due Date">
                <DateTimePicker
                  value={form.dueAt}
                  onChange={(dueAt) => setForm((prev) => ({ ...prev, dueAt }))}
                  placeholder="Set due date"
                />
              </FormField>

              <FormField label="Priority">
                <select
                  className="crm-select text-xs"
                  value={form.priority}
                  onChange={(e) => setForm((prev) => ({ ...prev, priority: e.target.value }))}
                >
                  <option value="Low">Low</option>
                  <option value="Normal">Normal</option>
                  <option value="High">High</option>
                </select>
              </FormField>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="Follow-up Channel (Optional)">
                <select
                  className="crm-select text-xs"
                  value={form.channel}
                  onChange={(e) => setForm((prev) => ({ ...prev, channel: e.target.value }))}
                >
                  <option value="">Select channel (or prompt on completion)</option>
                  {CHANNEL_OPTIONS.map((c) => (
                    <option key={c.key} value={c.key}>{c.label}</option>
                  ))}
                </select>
              </FormField>

              <FormField label="Owner">
                <input
                  type="text"
                  className="crm-input text-xs"
                  value={form.owner}
                  onChange={(e) => setForm((prev) => ({ ...prev, owner: e.target.value }))}
                  placeholder="Relationship owner"
                />
              </FormField>
            </div>

            <FormField label="Notes / Interaction Summary">
              <textarea
                rows={3}
                className="crm-input text-xs resize-y"
                value={form.notes}
                onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Key context, talking points, or reference notes for this follow-up..."
              />
            </FormField>

            <div className="flex justify-end gap-2 border-t border-neutral-200 pt-3">
              <button
                type="button"
                className="crm-btn-secondary text-xs"
                onClick={() => setTaskModalOpen(false)}
                disabled={busy}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy || !form.title.trim()}
                className="crm-btn-primary text-xs"
              >
                {busy ? 'Saving…' : editingTask ? 'Save Changes' : 'Schedule Task'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
