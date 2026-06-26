import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Circle, Trash2 } from 'lucide-react';
import DataTableShell from '../ui/DataTableShell.jsx';
import DateTimePicker from '../ui/DateTimePicker.jsx';
import SearchableSelect from '../ui/SearchableSelect.jsx';
import { Badge, cn } from '../ui/primitives.jsx';
import {
  TASK_PRIORITIES,
  formatTaskDue,
  isDemoTask,
  normalizeTaskId,
} from './taskUtils.js';

const NONE_OPTION = { value: '', label: '—', hint: 'None' };

function TaskTitleCell({ task, onPatch, focus, editing }) {
  const inputRef = useRef(null);
  const [value, setValue] = useState(task.title || '');

  useEffect(() => {
    setValue(task.title || '');
  }, [task.title]);

  useEffect(() => {
    if (!focus || !inputRef.current) return;
    inputRef.current.focus();
    inputRef.current.select();
  }, [focus, task._id]);

  if (!editing) {
    return (
      <p className={`font-semibold ${task.status === 'Done' ? 'text-neutral-400 line-through' : 'text-[var(--color-ink)]'}`}>
        {task.title}
      </p>
    );
  }

  return (
    <input
      ref={inputRef}
      type="text"
      aria-label="Task title"
      className="crm-input crm-task-inline-input crm-task-title-input w-full font-semibold"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => {
        const trimmed = value.trim();
        if (!trimmed || trimmed === task.title) return;
        onPatch?.(task, { title: trimmed });
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur();
      }}
      onClick={(e) => e.stopPropagation()}
    />
  );
}

export default function TaskTable({
  tasks,
  onToggle,
  onPatch,
  onConfirmTask,
  onEditTask,
  onDelete,
  editingTaskIds = [],
  opportunities = [],
  companies = [],
  ownerOptions = [],
  focusTaskId = '',
  showOpportunityColumn = true,
  showAccountColumn = true,
  embedded = false,
}) {
  const owners = ownerOptions.length ? ownerOptions : ['admin'];
  const editingSet = useMemo(() => new Set(editingTaskIds), [editingTaskIds]);

  const opportunityOptions = useMemo(
    () => [
      NONE_OPTION,
      ...opportunities.map((item) => ({
        value: item._id,
        label: item.name,
        hint: item.companyId?.companyName || item.eventName || undefined,
      })),
    ],
    [opportunities],
  );

  const companyOptions = useMemo(
    () => [
      NONE_OPTION,
      ...companies.map((item) => ({
        value: item._id,
        label: item.companyName,
        hint: item.industry || item.country || undefined,
      })),
    ],
    [companies],
  );

  return (
    <DataTableShell
      minWidth={embedded ? 560 : (showOpportunityColumn ? (showAccountColumn ? 1180 : 1020) : 960)}
      className={embedded ? 'crm-task-table-embedded' : ''}
    >
      <table className={cn('w-full text-left', embedded ? 'text-xs' : 'text-sm')}>
        <thead>
          <tr className="crm-table-head">
            <th className="w-10" aria-label="Complete" />
            <th>Task</th>
            <th>Due</th>
            {showOpportunityColumn && <th className="crm-task-col-link">Opportunity</th>}
            {showAccountColumn && <th className="crm-task-col-link">Company</th>}
            <th>Owner</th>
            <th>Priority</th>
            <th className="w-10" aria-label="Delete" />
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => {
            const done = task.status === 'Done';
            const demo = isDemoTask(task._id);
            const editing = !demo && editingSet.has(task._id);
            const locked = !demo && !editing;

            return (
              <tr
                key={task._id}
                className={cn('crm-table-row', locked && 'crm-task-row-locked', editing && 'crm-task-row-editing')}
                onClick={() => locked && onEditTask?.(task)}
              >
                <td onClick={(e) => e.stopPropagation()}>
                  {editing ? (
                    <button
                      type="button"
                      aria-label="Confirm task details"
                      onClick={() => onConfirmTask?.(task)}
                      className="crm-task-confirm-tick"
                    >
                      <Check className="h-4 w-4" strokeWidth={2.25} />
                    </button>
                  ) : (
                    <button
                      type="button"
                      aria-label={done ? 'Mark task open' : 'Mark task complete'}
                      disabled={demo}
                      onClick={() => onToggle?.(task)}
                      className={cn(
                        'crm-task-complete-btn',
                        done && 'is-done',
                        demo && 'is-disabled',
                      )}
                    >
                      {done ? <Check className="h-3.5 w-3.5" /> : <Circle className="h-3 w-3 text-neutral-300" />}
                    </button>
                  )}
                </td>
                <td>
                  <TaskTitleCell
                    task={task}
                    onPatch={onPatch}
                    focus={focusTaskId === task._id}
                    editing={editing}
                  />
                  {task.notes && !editing && (
                    <p className="mt-0.5 line-clamp-1 text-xs text-neutral-500">{task.notes}</p>
                  )}
                </td>
                <td onClick={(e) => editing && e.stopPropagation()}>
                  {locked || demo ? (
                    <span className="text-neutral-600">{formatTaskDue(task.dueAt)}</span>
                  ) : (
                    <DateTimePicker
                      value={task.dueAt}
                      onChange={(dueAt) => onPatch?.(task, { dueAt })}
                      compact
                      placeholder="Set due date"
                      ariaLabel={`Due date for ${task.title}`}
                      className="crm-task-due-picker"
                    />
                  )}
                </td>
                {showOpportunityColumn && (
                  <td className="crm-task-col-link" onClick={(e) => editing && e.stopPropagation()}>
                    {locked || demo ? (
                      <div>
                        <span className="text-neutral-700">{task.opportunityId?.name || '—'}</span>
                        {!showAccountColumn && task.companyId?.companyName && (
                          <p className="mt-0.5 text-[11px] text-neutral-500">{task.companyId.companyName}</p>
                        )}
                      </div>
                    ) : (
                      <SearchableSelect
                        className="crm-task-table-select"
                        menuMinWidth={300}
                        value={normalizeTaskId(task.opportunityId)}
                        onChange={(next) => onPatch?.(task, { opportunityId: next || null })}
                        options={opportunityOptions}
                        placeholder="Link opportunity…"
                        searchPlaceholder="Search opportunities…"
                        emptyLabel="No opportunities match."
                      />
                    )}
                  </td>
                )}
                {showAccountColumn && (
                  <td className="crm-task-col-link" onClick={(e) => editing && e.stopPropagation()}>
                    {locked || demo ? (
                      <span className="text-neutral-700">{task.companyId?.companyName || '—'}</span>
                    ) : (
                      <SearchableSelect
                        className="crm-task-table-select"
                        menuMinWidth={280}
                        value={normalizeTaskId(task.companyId)}
                        onChange={(next) => onPatch?.(task, { companyId: next || null })}
                        options={companyOptions}
                        placeholder="Link company…"
                        searchPlaceholder="Search companies…"
                        emptyLabel="No companies match."
                      />
                    )}
                  </td>
                )}
                <td onClick={(e) => editing && e.stopPropagation()}>
                  {locked || demo ? (
                    <span className="text-neutral-700">{task.owner || 'admin'}</span>
                  ) : (
                    <select
                      aria-label={`Owner for ${task.title}`}
                      className="crm-select crm-task-inline-select"
                      value={task.owner || 'admin'}
                      onChange={(e) => onPatch?.(task, { owner: e.target.value })}
                    >
                      {owners.map((owner) => (
                        <option key={owner} value={owner}>{owner}</option>
                      ))}
                    </select>
                  )}
                </td>
                <td onClick={(e) => editing && e.stopPropagation()}>
                  {locked || demo ? (
                    <Badge tone={task.priority === 'High' ? 'warning' : 'neutral'}>{task.priority}</Badge>
                  ) : (
                    <select
                      aria-label={`Priority for ${task.title}`}
                      className="crm-select crm-task-inline-select"
                      value={task.priority || 'Normal'}
                      onChange={(e) => onPatch?.(task, { priority: e.target.value })}
                    >
                      {TASK_PRIORITIES.map((priority) => (
                        <option key={priority} value={priority}>{priority}</option>
                      ))}
                    </select>
                  )}
                </td>
                <td onClick={(e) => e.stopPropagation()}>
                  {!demo && (
                    <button
                      type="button"
                      aria-label={`Delete ${task.title}`}
                      className="crm-task-delete-btn"
                      onClick={() => onDelete?.(task)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </DataTableShell>
  );
}
