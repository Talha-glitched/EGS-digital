import { useEffect, useState, useCallback } from 'react';
import {
  CalendarDays,
  CheckCircle2,
  Circle,
  Clock,
  Plus,
  Pencil,
  Trash2,
  MessageSquareReply,
  Sparkles,
  Phone,
  Mail,
  Users,
  Globe,
  StickyNote,
  AlertCircle,
  UserCheck,
  Building2,
  BriefcaseBusiness,
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

const HUMAN_OUTCOMES = [
  { key: 'Interested', label: 'Interested', color: 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100', activeBadge: 'Qualified Lead' },
  { key: 'Ambiguous', label: 'Ambiguous / Neutral', color: 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100' },
  { key: 'Referral', label: 'Referral', color: 'bg-purple-50 text-purple-700 border-purple-300 hover:bg-purple-100' },
  { key: 'Out of Office', label: 'Out of Office', color: 'bg-sky-50 text-sky-700 border-sky-300 hover:bg-sky-100' },
  { key: 'Wrong POC', label: 'Wrong POC', color: 'bg-rose-100 text-rose-800 border-rose-300 hover:bg-rose-200' },
  { key: 'Not Interested', label: 'Not Interested Now', color: 'bg-neutral-100 text-neutral-700 border-neutral-300 hover:bg-neutral-200' },
  { key: 'Unsubscribe', label: 'Unsubscribe / Opt-Out', color: 'bg-red-50 text-red-700 border-red-300 hover:bg-red-100' },
  { key: 'Bounce', label: 'Bounced', color: 'bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100' },
  { key: 'Automated', label: 'Automated / System', color: 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200' },
  { key: 'Other', label: 'Other', color: 'bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100' },
];

const CHANNEL_OPTIONS = [
  { key: 'phone', label: 'Phone call', icon: Phone },
  { key: 'email', label: 'Email', icon: Mail },
  { key: 'whatsapp', label: 'WhatsApp', icon: MessageSquareReply },
  { key: 'meeting', label: 'Meeting', icon: Users },
  { key: 'linkedin', label: 'LinkedIn', icon: Globe },
  { key: 'other', label: 'Other / Note', icon: StickyNote },
];

export default function ContactLeadTasksSection({
  leadId,
  companyId,
  contactName,
  leadStage = 'contact',
  ownerDefault = '',
  onTimelineRefresh,
}) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Review Classification Modal state
  const [reviewTaskTarget, setReviewTaskTarget] = useState(null);
  const [activeModalTask, setActiveModalTask] = useState(null);
  const [selectedOutcome, setSelectedOutcome] = useState('');
  const [followUpForm, setFollowUpForm] = useState({
    title: '',
    dueAt: '',
    priority: 'Normal',
    owner: ownerDefault,
    notes: '',
  });

  // Lead Follow-Up Modal state
  const [followUpModalOpen, setFollowUpModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [leadFollowUpForm, setLeadFollowUpForm] = useState({
    title: '',
    dueAt: '',
    priority: 'Normal',
    owner: ownerDefault,
    notes: '',
  });

  // Channel completion modal state for lead follow-up task
  const [channelModalTask, setChannelModalTask] = useState(null);
  const [selectedChannel, setSelectedChannel] = useState('');

  const loadTasks = useCallback(async () => {
    if (!leadId) return;
    setLoading(true);
    setError('');
    try {
      const res = await crmApiFetch(`/api/admin/sales/tasks?leadId=${leadId}&status=All`);
      setTasks(res?.items || []);
    } catch (err) {
      setError(err.message || 'Failed to load lead tasks.');
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const openReviewModal = (task) => {
    setReviewTaskTarget(task);
    setActiveModalTask(task);
    setSelectedOutcome('');
    setFollowUpForm({
      title: `Follow up with ${contactName || 'Contact'}`,
      dueAt: new Date(Date.now() + 86400000 * 2).toISOString(),
      priority: 'Normal',
      owner: ownerDefault || '',
      notes: '',
    });
  };

  const handleSelectOutcome = (outcomeKey) => {
    setSelectedOutcome(outcomeKey);
    if (!followUpForm.title) {
      setFollowUpForm((prev) => ({
        ...prev,
        title: `Follow up with ${contactName || 'Contact'} (${outcomeKey})`,
      }));
    }
  };

  const closeReviewModal = () => {
    setReviewTaskTarget(null);
    setSelectedOutcome('');
    setError('');
  };

  const handleCompleteReview = async (e) => {
    e.preventDefault();
    if (!reviewTaskTarget || !selectedOutcome) return;
    const requiresFollowUp = ['Interested', 'Ambiguous', 'Referral', 'Out of Office'].includes(selectedOutcome);
    if (requiresFollowUp && !followUpForm.title.trim()) {
      setError('Follow-up task title is required.');
      return;
    }

    const taskToComplete = reviewTaskTarget;
    const outcomeToComplete = selectedOutcome;
    const followUpToComplete = (requiresFollowUp || (selectedOutcome === 'Other' && followUpForm.title.trim())) ? followUpForm : null;

    // Immediately close modal after validation passes
    closeReviewModal();
    setBusy(true);

    try {
      await crmApiFetch(`/api/admin/sales/tasks/${taskToComplete._id}/complete-reply-review`, {
        method: 'POST',
        body: JSON.stringify({
          outcome: outcomeToComplete,
          followUpTask: followUpToComplete,
        }),
      });
      await loadTasks();
      onTimelineRefresh?.();
    } catch (err) {
      console.error('Failed to complete reply review:', err);
    } finally {
      setBusy(false);
    }
  };

  const handleCreateOrUpdateLeadFollowUp = async (e) => {
    e.preventDefault();
    if (!leadFollowUpForm.title.trim()) return;

    setBusy(true);
    setError('');
    try {
      if (editingTask) {
        await crmApiFetch(`/api/admin/sales/tasks/${editingTask._id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            title: leadFollowUpForm.title.trim(),
            dueAt: leadFollowUpForm.dueAt || null,
            priority: leadFollowUpForm.priority,
            owner: leadFollowUpForm.owner,
            notes: leadFollowUpForm.notes,
          }),
        });
      } else {
        await crmApiFetch('/api/admin/sales/tasks', {
          method: 'POST',
          body: JSON.stringify({
            title: leadFollowUpForm.title.trim(),
            taskType: 'lead_follow_up',
            leadId,
            companyId,
            dueAt: leadFollowUpForm.dueAt || null,
            priority: leadFollowUpForm.priority,
            owner: leadFollowUpForm.owner,
            notes: leadFollowUpForm.notes,
          }),
        });
      }
      setFollowUpModalOpen(false);
      setEditingTask(null);
      await loadTasks();
    } catch (err) {
      setError(err.message || 'Failed to save lead follow-up task.');
    } finally {
      setBusy(false);
    }
  };

  const handleToggleLeadTaskComplete = async (task) => {
    if (task.status === 'Done') {
      // Reopen task
      setBusy(true);
      try {
        await crmApiFetch(`/api/admin/sales/tasks/${task._id}`, {
          method: 'PATCH',
          body: JSON.stringify({ status: 'Open', completedAt: null }),
        });
        await loadTasks();
      } catch (err) {
        setError(err.message || 'Failed to reopen task.');
      } finally {
        setBusy(false);
      }
      return;
    }

    // Completing task
    setBusy(true);
    try {
      await crmApiFetch(`/api/admin/sales/tasks/${task._id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'Done' }),
      });
      await loadTasks();
      onTimelineRefresh?.();
    } catch (err) {
      setError(err.message || 'Failed to complete task.');
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteTask = async (taskId) => {
    setBusy(true);
    try {
      await crmApiFetch(`/api/admin/sales/tasks/${taskId}`, { method: 'DELETE' });
      await loadTasks();
    } catch (err) {
      setError(err.message || 'Failed to delete task.');
    } finally {
      setBusy(false);
    }
  };

  const replyReviewTasks = tasks.filter((t) => t.taskType === 'reply_review');
  const leadFollowUpTasks = tasks.filter((t) => t.taskType === 'lead_follow_up');

  const openReviewTasks = replyReviewTasks.filter((t) => t.status === 'Open');
  const completedReviewTasks = replyReviewTasks.filter((t) => t.status === 'Done');

  const openFollowUpTasks = leadFollowUpTasks.filter((t) => t.status === 'Open');
  const completedFollowUpTasks = leadFollowUpTasks.filter((t) => t.status === 'Done');

  const stageBadgeInfo = {
    contact: { label: 'Contact', color: 'bg-neutral-100 text-neutral-600 border-neutral-200' },
    lead: { label: 'Lead (Replied)', color: 'bg-blue-50 text-blue-700 border-blue-200 font-semibold' },
    qualified_lead: { label: 'Qualified Lead', color: 'bg-emerald-50 text-emerald-700 border-emerald-300 font-bold' },
  }[leadStage] || { label: 'Contact', color: 'bg-neutral-100 text-neutral-600' };

  return (
    <div className="space-y-4">
      {/* Header Stage Badge Bar */}
      <div className="flex items-center justify-between gap-2 rounded-xl border border-neutral-200 bg-neutral-50/70 p-3">
        <div className="flex items-center gap-2">
          <UserCheck className="h-4 w-4 text-neutral-500" />
          <span className="text-xs font-semibold text-neutral-700">Lead Stage:</span>
          <span className={cn('inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium', stageBadgeInfo.color)}>
            {stageBadgeInfo.label}
          </span>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditingTask(null);
            setLeadFollowUpForm({
              title: `Follow up with ${contactName || 'Contact'}`,
              dueAt: new Date(Date.now() + 86400000 * 2).toISOString(),
              priority: 'Normal',
              owner: ownerDefault || '',
              notes: '',
            });
            setFollowUpModalOpen(true);
          }}
          className="inline-flex items-center gap-1 rounded-lg bg-neutral-900 px-2.5 py-1 text-xs font-semibold text-white hover:bg-neutral-800 transition"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Follow-up Task
        </button>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-700 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Reply Review Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
            <MessageSquareReply className="h-3.5 w-3.5 text-sky-600" />
            Inbound Reply Reviews ({openReviewTasks.length} Pending)
          </h4>
        </div>

        {openReviewTasks.length === 0 ? (
          <div className="rounded-xl border border-dashed border-neutral-200 p-3 text-center text-xs text-neutral-400">
            No pending reply review tasks.
          </div>
        ) : (
          openReviewTasks.map((task) => (
            <div key={task._id} className="rounded-xl border border-sky-200 bg-sky-50/50 p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 text-sky-800 px-2 py-0.5 text-[10px] font-semibold">
                      <Clock className="h-3 w-3" />
                      Review Required
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
                <button
                  type="button"
                  onClick={() => openReviewModal(task)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-sky-700 transition shrink-0 shadow-sm"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Classify Reply
                </button>
              </div>
              <div className="space-y-1 pt-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">Email Content</span>
                <FormattedEmailViewer
                  html={task.replyId?.html}
                  text={task.notes}
                  maxHeight={350}
                />
              </div>
            </div>
          ))
        )}
      </div>

      {/* Lead Follow-Up Tasks Section */}
      <div className="space-y-3 pt-2">
        <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
          <CalendarDays className="h-3.5 w-3.5 text-neutral-600" />
          Follow-up Tasks ({openFollowUpTasks.length} Open)
        </h4>

        {openFollowUpTasks.length === 0 && completedFollowUpTasks.length === 0 ? (
          <div className="rounded-xl border border-dashed border-neutral-200 p-4 text-center">
            <p className="text-xs font-semibold text-neutral-600">No lead follow-up tasks</p>
            <p className="mt-1 text-[11px] text-neutral-500">Add tasks to schedule next actions for this lead.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {openFollowUpTasks.map((task) => {
              const isEmailFollowUp = Boolean(task.replyId || task.taskType === 'relationship_follow_up' || task.taskType === 'reply_review' || (task.notes && task.notes.length > 20));

              if (isEmailFollowUp) {
                return (
                  <div key={task._id} className="rounded-xl border border-neutral-200 bg-white p-4 space-y-3 shadow-xs">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleToggleLeadTaskComplete(task)}
                            className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 text-[10px] font-semibold hover:bg-emerald-100 transition"
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
                          onClick={() => {
                            setEditingTask(task);
                            setLeadFollowUpForm({
                              title: task.title,
                              dueAt: task.dueAt ? new Date(task.dueAt).toISOString() : '',
                              priority: task.priority || 'Normal',
                              owner: task.owner || '',
                              notes: task.notes || '',
                            });
                            setFollowUpModalOpen(true);
                          }}
                          className="p-1.5 text-neutral-400 hover:text-neutral-700 rounded-lg hover:bg-neutral-100 transition"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button type="button" onClick={() => handleDeleteTask(task._id)} className="p-1.5 text-neutral-400 hover:text-red-600 rounded-lg hover:bg-neutral-100 transition">
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
                <div key={task._id} className="group flex items-start gap-3 rounded-xl border border-neutral-200 bg-white p-3 hover:border-neutral-300 transition">
                  <button
                    type="button"
                    onClick={() => handleToggleLeadTaskComplete(task)}
                    className="mt-0.5 shrink-0 text-neutral-400 hover:text-emerald-600 transition"
                    title="Mark complete"
                  >
                    <Circle className="h-4 w-4" />
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-neutral-900 leading-snug">{task.title}</p>
                    {task.notes && <p className="mt-1 text-[11px] text-neutral-600 leading-relaxed">{task.notes}</p>}
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-neutral-500">
                      {task.dueAt && (
                        <span className="rounded-full bg-neutral-100 px-2 py-0.5 font-medium text-neutral-700">
                          Due: {new Date(task.dueAt).toLocaleDateString('en-AE')}
                        </span>
                      )}
                      {task.owner && <span className="rounded bg-neutral-100 px-1.5 py-0.5 font-medium">Owner: {task.owner}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingTask(task);
                        setLeadFollowUpForm({
                          title: task.title,
                          dueAt: task.dueAt ? new Date(task.dueAt).toISOString() : '',
                          priority: task.priority || 'Normal',
                          owner: task.owner || '',
                          notes: task.notes || '',
                        });
                        setFollowUpModalOpen(true);
                      }}
                      className="p-1 text-neutral-400 hover:text-neutral-700"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button type="button" onClick={() => handleDeleteTask(task._id)} className="p-1 text-neutral-400 hover:text-red-600">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}

            {completedFollowUpTasks.length > 0 && (
              <details className="mt-2 text-xs">
                <summary className="cursor-pointer text-neutral-500 hover:text-neutral-800 font-medium py-1">
                  Completed lead tasks ({completedFollowUpTasks.length})
                </summary>
                <div className="mt-2 space-y-2 pl-2 border-l-2 border-neutral-100">
                  {completedFollowUpTasks.map((task) => (
                    <div key={task._id} className="flex items-start gap-2.5 rounded-lg bg-neutral-50 p-2 text-neutral-500">
                      <button type="button" onClick={() => handleToggleLeadTaskComplete(task)} className="mt-0.5 text-emerald-600 hover:text-neutral-400">
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
          </div>
        )}
      </div>

      {/* Human Reply Classification Modal */}
      <Modal
        open={Boolean(reviewTaskTarget)}
        onClose={closeReviewModal}
        title="Classify Human Reply Outcome"
        size="md"
      >
        {activeModalTask && (
          <form onSubmit={handleCompleteReview} className="space-y-4 pt-2">
            <div className="rounded-xl border border-sky-200 bg-sky-50/60 p-3 space-y-1.5">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">Subject Heading</span>
                <p className="text-xs font-bold text-neutral-900">{activeModalTask.title || '(No Subject)'}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mt-1 mb-1">Email Content</span>
                <FormattedEmailViewer
                  html={activeModalTask.replyId?.html}
                  text={activeModalTask.notes}
                  maxHeight={260}
                />
              </div>
            </div>

            <p className="text-xs text-neutral-600 font-medium">
              Select the outcome of this reply. Active outcomes will automatically prompt for the next lead follow-up action.
            </p>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {HUMAN_OUTCOMES.map((out) => {
                const selected = selectedOutcome === out.key;
                return (
                  <button
                    key={out.key}
                    type="button"
                    onClick={() => handleSelectOutcome(out.key)}
                    className={cn(
                      'flex items-center justify-between rounded-xl border p-3 text-left transition text-xs font-semibold',
                      out.color,
                      selected ? 'ring-2 ring-brand shadow-sm font-bold border-brand' : 'opacity-85'
                    )}
                  >
                    <span>{out.label}</span>
                    {out.activeBadge && (
                      <span className="rounded bg-emerald-100 text-emerald-800 text-[10px] px-1.5 py-0.5">
                        {out.activeBadge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {selectedOutcome && ['Interested', 'Ambiguous', 'Referral', 'Out of Office', 'Other'].includes(selectedOutcome) && (
              <div className="space-y-3 rounded-xl border border-neutral-200 bg-neutral-50 p-3 mt-3">
                <p className="text-xs font-bold text-neutral-800">Required Next Lead Action</p>
                <FormField label="Follow-up Task Title" required>
                  <input
                    className="crm-input text-xs"
                    value={followUpForm.title}
                    onChange={(e) => setFollowUpForm((prev) => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g. Call to discuss booth proposal"
                    required
                  />
                </FormField>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <FormField label="Due Date">
                    <DateTimePicker
                      value={followUpForm.dueAt}
                      onChange={(dueAt) => setFollowUpForm((prev) => ({ ...prev, dueAt }))}
                    />
                  </FormField>
                  <FormField label="Owner">
                    <input
                      className="crm-input text-xs"
                      value={followUpForm.owner}
                      onChange={(e) => setFollowUpForm((prev) => ({ ...prev, owner: e.target.value }))}
                      placeholder="Task owner"
                    />
                  </FormField>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 border-t border-neutral-200 pt-3">
              <button type="button" className="crm-btn-secondary text-xs" onClick={closeReviewModal}>
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy || !selectedOutcome}
                className="crm-btn-primary text-xs"
              >
                Complete Review
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Lead Follow-Up Create/Edit Modal */}
      <Modal
        open={followUpModalOpen}
        onClose={() => setFollowUpModalOpen(false)}
        title={editingTask ? 'Edit Lead Follow-up Task' : 'Add Lead Follow-up Task'}
        size="md"
      >
          <form onSubmit={handleCreateOrUpdateLeadFollowUp} className="space-y-4 pt-2">
            <FormField label="Task Title" required>
              <input
                className="crm-input text-xs"
                value={leadFollowUpForm.title}
                onChange={(e) => setLeadFollowUpForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Follow up on pricing"
                required
              />
            </FormField>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FormField label="Due Date">
                <DateTimePicker
                  value={leadFollowUpForm.dueAt}
                  onChange={(dueAt) => setLeadFollowUpForm((prev) => ({ ...prev, dueAt }))}
                />
              </FormField>

              <FormField label="Priority">
                <select
                  className="crm-select text-xs"
                  value={leadFollowUpForm.priority}
                  onChange={(e) => setLeadFollowUpForm((prev) => ({ ...prev, priority: e.target.value }))}
                >
                  <option value="Low">Low</option>
                  <option value="Normal">Normal</option>
                  <option value="High">High</option>
                </select>
              </FormField>
            </div>

            <FormField label="Notes">
              <textarea
                rows={3}
                className="crm-input text-xs resize-y"
                value={leadFollowUpForm.notes}
                onChange={(e) => setLeadFollowUpForm((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Context or talking points..."
              />
            </FormField>

            <div className="flex justify-end gap-2 border-t border-neutral-200 pt-3">
              <button type="button" className="crm-btn-secondary text-xs" onClick={() => setFollowUpModalOpen(false)}>
                Cancel
              </button>
              <button type="submit" disabled={busy || !leadFollowUpForm.title.trim()} className="crm-btn-primary text-xs">
                Save Task
              </button>
            </div>
          </form>
        </Modal>
    </div>
  );
}
