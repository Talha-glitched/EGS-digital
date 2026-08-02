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
import FormattedEmailViewer from '../common/FormattedEmailViewer.jsx';

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

export default function ContactFollowUpTasksSection({
  leadId,
  companyId,
  contactName = '',
  ownerDefault = '',
  onTimelineRefresh,
}) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  // Form state for Add/Edit Task
  const [form, setForm] = useState({
    title: '',
    dueAt: '',
    priority: 'Normal',
    owner: ownerDefault || '',
    notes: '',
    channel: 'email',
  });
  const [saving, setSaving] = useState(false);

  // Form state for Quick Log Completed Action
  const [logForm, setLogForm] = useState({
    type: 'email_sent',
    title: 'Follow-up Email Sent',
    notes: '',
  });
  const [logging, setLogging] = useState(false);
  const [logSuccess, setLogSuccess] = useState(false);

  const fetchTasks = useCallback(async () => {
    if (!leadId && !companyId) {
      setTasks([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ status: 'All' });
      if (leadId) params.append('leadId', leadId);
      if (companyId) params.append('companyId', companyId);

      const res = await crmApiFetch(`/api/admin/sales/tasks?${params.toString()}`);
      setTasks(res.items || []);
    } catch (err) {
      setError(err.message || 'Failed to load follow-up tasks.');
    } finally {
      setLoading(false);
    }
  }, [leadId, companyId]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const openCreateModal = () => {
    setEditingTask(null);
    setForm({
      title: '',
      dueAt: '',
      priority: 'Normal',
      owner: ownerDefault || '',
      notes: '',
      channel: 'email',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (task) => {
    setEditingTask(task);
    setForm({
      title: task.title || '',
      dueAt: task.dueAt ? new Date(task.dueAt).toISOString().slice(0, 16) : '',
      priority: task.priority || 'Normal',
      owner: task.owner || ownerDefault || '',
      notes: task.notes || '',
      channel: task.channel || 'email',
    });
    setIsModalOpen(true);
  };

  const handleSaveTask = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setError('Task title is required.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const payload = {
        title: form.title.trim(),
        dueAt: form.dueAt ? new Date(form.dueAt).toISOString() : null,
        priority: form.priority,
        owner: form.owner,
        notes: form.notes,
        channel: form.channel,
        leadId: leadId || null,
        companyId: companyId || null,
        taskType: 'relationship_follow_up',
      };

      if (editingTask) {
        await crmApiFetch(`/api/admin/sales/tasks/${editingTask._id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      } else {
        await crmApiFetch('/api/admin/sales/tasks', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      setIsModalOpen(false);
      fetchTasks();
      onTimelineRefresh?.();
    } catch (err) {
      setError(err.message || 'Failed to save task.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleComplete = async (task) => {
    const isCompleted = task.status === 'Completed';
    const nextStatus = isCompleted ? 'Open' : 'Completed';

    try {
      await crmApiFetch(`/api/admin/sales/tasks/${task._id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: nextStatus,
          completedAt: nextStatus === 'Completed' ? new Date().toISOString() : null,
        }),
      });
      fetchTasks();
      onTimelineRefresh?.();
    } catch (err) {
      setError(err.message || 'Failed to update task status.');
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this follow-up task?')) return;

    try {
      await crmApiFetch(`/api/admin/sales/tasks/${taskId}`, {
        method: 'DELETE',
      });
      fetchTasks();
      onTimelineRefresh?.();
    } catch (err) {
      setError(err.message || 'Failed to delete task.');
    }
  };

  const handleLogInteraction = async (e) => {
    e.preventDefault();
    if (!logForm.title.trim()) return;

    setLogging(true);
    setError('');
    setLogSuccess(false);

    try {
      await crmApiFetch('/api/admin/interactions', {
        method: 'POST',
        body: JSON.stringify({
          leadId: leadId || null,
          companyId: companyId || null,
          type: logForm.type,
          title: logForm.title,
          notes: logForm.notes,
        }),
      });

      setLogSuccess(true);
      setLogForm({
        type: 'email_sent',
        title: 'Follow-up Email Sent',
        notes: '',
      });

      setTimeout(() => setLogSuccess(false), 3000);
      onTimelineRefresh?.();
    } catch (err) {
      setError(err.message || 'Failed to log interaction.');
    } finally {
      setLogging(false);
    }
  };

  const openTasks = tasks.filter((t) => t.status !== 'Completed');
  const completedTasks = tasks.filter((t) => t.status === 'Completed');

  if (loading) {
    return (
      <div className="p-4 text-center text-xs text-neutral-400">
        Loading follow-up tasks…
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-700 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Task List Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-neutral-700 uppercase tracking-wider">
            Follow-up Tasks ({openTasks.length} Open)
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
          <div className="space-y-3">
            {openTasks.map((task) => {
              const isEmailFollowUp = Boolean(task.replyId || task.taskType === 'relationship_follow_up' || task.taskType === 'reply_review' || (task.notes && task.notes.length > 15));

              if (isEmailFollowUp) {
                return (
                  <div key={task._id} className="rounded-xl border border-neutral-200 bg-white p-4 space-y-3 shadow-xs">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleToggleComplete(task)}
                            className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-semibold hover:bg-emerald-100 transition"
                          >
                            <Circle className="h-3 w-3" />
                            Mark Complete
                          </button>
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 text-slate-700 px-2 py-0.5 text-[10px] font-semibold">
                            {task.taskType === 'relationship_follow_up' ? 'Relationship Follow-up' : 'Follow-up Task'}
                          </span>
                          {task.campaignId?.projectName && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 px-2 py-0.5 text-[10px] font-semibold">
                              {task.campaignId.projectName}
                            </span>
                          )}
                        </div>
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mt-1">Subject Heading</span>
                          <p className="text-xs font-bold text-neutral-900">{task.title || '(No Subject)'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEditModal(task)}
                          className="p-1.5 text-neutral-400 hover:text-neutral-700 rounded-lg hover:bg-neutral-100 transition"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteTask(task._id)}
                          className="p-1.5 text-neutral-400 hover:text-red-600 rounded-lg hover:bg-neutral-100 transition"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1 pt-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">Email Content</span>
                      <FormattedEmailViewer
                        html={task.replyId?.html}
                        text={task.replyId?.text || task.notes}
                        maxHeight={350}
                      />
                    </div>
                  </div>
                );
              }

              return (
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
              );
            })}
          </div>
        )}
      </div>

      {/* Completed Tasks List Collapsible */}
      {completedTasks.length > 0 && (
        <details className="text-xs">
          <summary className="cursor-pointer text-neutral-500 hover:text-neutral-800 font-medium py-1">
            Completed Tasks ({completedTasks.length})
          </summary>
          <div className="mt-2 space-y-2 pl-2 border-l-2 border-neutral-100">
            {completedTasks.map((task) => (
              <div key={task._id} className="flex items-start gap-2.5 rounded-lg bg-neutral-50 p-2 text-neutral-500">
                <button
                  type="button"
                  onClick={() => handleToggleComplete(task)}
                  className="mt-0.5 text-emerald-600 hover:text-neutral-400"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                </button>
                <div className="min-w-0 flex-1">
                  <p className="line-through text-neutral-600">{task.title}</p>
                </div>
              </div>
            ))}
          </div>
        </details>
      )}

      {/* Add / Edit Task Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingTask ? 'Edit Follow-up Task' : 'Schedule Follow-up Task'}
      >
        <form onSubmit={handleSaveTask} className="space-y-4">
          <FormField label="Task Title" required>
            <input
              type="text"
              className="crm-input"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Follow up on quote proposal"
            />
          </FormField>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Due Date & Time">
              <input
                type="datetime-local"
                className="crm-input text-xs"
                value={form.dueAt}
                onChange={(e) => setForm({ ...form, dueAt: e.target.value })}
              />
            </FormField>

            <FormField label="Channel">
              <select
                className="crm-select text-xs"
                value={form.channel}
                onChange={(e) => setForm({ ...form, channel: e.target.value })}
              >
                <option value="email">Email</option>
                <option value="call">Phone Call</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="meeting">In-Person / Video Meeting</option>
                <option value="other">Other</option>
              </select>
            </FormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Priority">
              <select
                className="crm-select text-xs"
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
              >
                <option value="Low">Low</option>
                <option value="Normal">Normal</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </select>
            </FormField>

            <FormField label="Assignee Owner">
              <input
                type="text"
                className="crm-input text-xs"
                value={form.owner}
                onChange={(e) => setForm({ ...form, owner: e.target.value })}
                placeholder="Assignee name"
              />
            </FormField>
          </div>

          <FormField label="Internal Notes & Context">
            <textarea
              className="crm-input min-h-[4rem] text-xs resize-y"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Add key talking points, reminder notes, or context…"
            />
          </FormField>

          <div className="flex justify-end gap-2 pt-3 border-t border-neutral-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="crm-btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="crm-btn-primary"
            >
              {saving ? 'Saving…' : editingTask ? 'Update Task' : 'Create Task'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
