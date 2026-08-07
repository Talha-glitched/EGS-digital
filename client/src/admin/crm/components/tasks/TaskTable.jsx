import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Circle, Trash2, UserCheck } from 'lucide-react';
import DataTableShell from '../ui/DataTableShell.jsx';
import DateTimePicker from '../ui/DateTimePicker.jsx';
import SearchableCombobox from '../ui/SearchableCombobox.jsx';
import SearchableSelect from '../ui/SearchableSelect.jsx';
import { BulkSelectHeaderCell, BulkSelectRowCell } from '../ui/BulkSelectTable.jsx';
import { SortableTableHeader, TableSortIndicator } from '../ui/SortableTableHeader.jsx';
import { useTableSort } from '../../hooks/useTableSort.js';
import { taskSortAccessors } from '../../hooks/tableSortAccessors.js';
import { Badge, cn } from '../ui/primitives.jsx';
import {
  TASK_PRIORITIES,
  formatTaskDue,
  formatDeadlineLabel,
  getDeadlineTone,
  isDemoTask,
  normalizeTaskId,
} from './taskUtils.js';

const NONE_OPTION = { value: '', label: '—', hint: 'None' };

const DEADLINE_TONE_STYLES = {
  overdue: 'bg-red-100 text-red-700 border border-red-200',
  today: 'bg-amber-100 text-amber-700 border border-amber-200',
  upcoming: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
};

function DeadlineBadge({ dueAt, status }) {
  if (!dueAt) return <span className="text-neutral-400">—</span>;
  const tone = getDeadlineTone(dueAt, status);
  const label = formatDeadlineLabel(dueAt, status);
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-neutral-600">{formatTaskDue(dueAt)}</span>
      {tone && label && (
        <span className={`inline-flex w-fit items-center rounded-full px-1.5 py-0.5 text-2xs font-semibold leading-none ${DEADLINE_TONE_STYLES[tone]} ${tone === 'overdue' ? 'animate-pulse' : ''}`}>
          {label}
        </span>
      )}
    </div>
  );
}

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

  const typeBadges = {
    reply_review: { label: 'Reply Review', color: 'bg-sky-50 text-sky-700 border-sky-200' },
    lead_follow_up: { label: 'Lead Follow-up', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
    relationship_follow_up: { label: 'Relationship', color: 'bg-amber-50 text-amber-700 border-amber-200' },
    ongoing_job: { label: 'Ongoing Job', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    general: { label: 'General', color: 'bg-neutral-100 text-neutral-600 border-neutral-200' },
  };

  const badge = typeBadges[task.taskType] || (task.isRelationshipFollowUp ? typeBadges.relationship_follow_up : typeBadges.general);

  if (!editing) {
    const stateTone = task.status === 'Blocked'
      ? 'bg-red-50 text-red-700 border-red-200'
      : task.status === 'Waiting'
        ? 'bg-violet-50 text-violet-700 border-violet-200'
        : task.isBlockedByDependency
          ? 'bg-orange-50 text-orange-700 border-orange-200'
          : '';
    return (
      <div>
        <div className="flex items-center gap-2">
          <p className={`font-semibold ${task.status === 'Done' ? 'text-neutral-400 line-through' : 'text-[var(--color-ink)]'}`}>
            {task.title}
          </p>
          <span className={`inline-flex rounded-full border px-2 py-0.5 text-2xs font-medium ${badge.color}`}>
            {badge.label}
          </span>
          {stateTone && <span className={`inline-flex rounded-full border px-2 py-0.5 text-2xs font-semibold ${stateTone}`}>{task.isBlockedByDependency && task.status !== 'Blocked' ? 'Dependency blocked' : task.status}</span>}
        </div>
        {(task.jobTitle || task.workPackageTitle || task.phaseName || task.locationName || task.activityTitle) && (
          <p className="mt-1 line-clamp-1 text-2xs text-neutral-500">
            {[task.jobNumber && task.jobTitle ? `${task.jobNumber} · ${task.jobTitle}` : task.jobTitle, task.workPackageTitle, task.phaseName, task.locationName, task.activityTitle].filter(Boolean).join(' › ')}
          </p>
        )}
        {task.status === 'Blocked' && task.blockedReason && <p className="mt-1 line-clamp-1 text-2xs font-medium text-red-600">Blocked: {task.blockedReason}</p>}
        {task.status === 'Waiting' && task.waitingOn && <p className="mt-1 line-clamp-1 text-2xs font-medium text-violet-600">Waiting on: {task.waitingOn}</p>}
      </div>
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
  onOpenContact,
  onDelete,
  editingTaskIds = [],
  campaigns = [],
  opportunities = [],
  companies = [],
  ownerOptions = [],
  focusTaskId = '',
  showCampaignColumn = true,
  showOpportunityColumn = true,
  showAccountColumn = true,
  embedded = false,
  selection = null,
}) {
  const owners = ownerOptions.length ? ownerOptions : [{ value: 'admin', label: 'admin' }];
  const editingSet = useMemo(() => new Set(editingTaskIds), [editingTaskIds]);

  const { sortKey, sortDir, sortLabel, toggleSort, clearSort, sortItems } = useTableSort({
    defaultKey: 'dueAt',
    defaultDir: 'asc',
    accessors: taskSortAccessors,
  });

  const sortedTasks = useMemo(() => sortItems(tasks), [tasks, sortItems]);

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

  const campaignOptions = useMemo(
    () => [
      NONE_OPTION,
      ...campaigns.map((item) => ({
        value: item._id,
        label: item.projectName,
        hint: item.milestone || item.status || undefined,
      })),
    ],
    [campaigns],
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
    <>
      <TableSortIndicator
        sortKey={sortKey}
        sortDir={sortDir}
        sortLabel={sortLabel}
        onToggle={() => toggleSort(sortKey)}
        onClear={clearSort}
      />
    <DataTableShell
      minWidth={embedded ? 560 : (showCampaignColumn ? (showOpportunityColumn ? (showAccountColumn ? 1340 : 1180) : 1120) : (showOpportunityColumn ? (showAccountColumn ? 1180 : 1020) : 960))}
      className={embedded ? 'crm-task-table-embedded' : ''}
    >
      <table className={cn('w-full text-left', embedded ? 'text-xs' : 'text-sm')}>
        <thead>
          <tr className="crm-table-head">
            {selection ? <BulkSelectHeaderCell selection={selection} ariaLabel="Select all tasks" /> : null}
            <th className="w-10" aria-label="Complete" />
            <SortableTableHeader label="Task" sortKey="title" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
            <th className="font-semibold text-neutral-600">Contact</th>
            <SortableTableHeader label="Due" sortKey="dueAt" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
            {showCampaignColumn && (
              <SortableTableHeader label="Project" sortKey="campaign" activeKey={sortKey} direction={sortDir} onSort={toggleSort} className="crm-task-col-link" />
            )}
            {showOpportunityColumn && (
              <SortableTableHeader label="Ongoing Job" sortKey="opportunity" activeKey={sortKey} direction={sortDir} onSort={toggleSort} className="crm-task-col-link" />
            )}
            {showAccountColumn && (
              <SortableTableHeader label="Company" sortKey="company" activeKey={sortKey} direction={sortDir} onSort={toggleSort} className="crm-task-col-link" />
            )}
            <SortableTableHeader label="Owner" sortKey="owner" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
            <SortableTableHeader label="Priority" sortKey="priority" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
            <th className="w-10" aria-label="Delete" />
          </tr>
        </thead>
        <tbody>
          {sortedTasks.map((task) => {
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
                {selection && !demo ? (
                  <BulkSelectRowCell
                    id={task._id}
                    selection={selection}
                    ariaLabel={`Select ${task.title || 'task'}`}
                  />
                ) : selection ? <td className="crm-bulk-select-col" /> : null}
                <td onClick={(e) => e.stopPropagation()}>
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
                    {done ? <Check className="h-3.5 w-3.5" /> : <Circle className="h-4 w-4 text-neutral-400 hover:text-emerald-600" />}
                  </button>
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
                <td onClick={(e) => e.stopPropagation()}>
                  {task.leadId ? (
                    <button
                      type="button"
                      onClick={() => onOpenContact?.(task.leadId?._id || task.leadId)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700 hover:bg-sky-100 hover:text-sky-800 transition border border-sky-200 shrink-0"
                      title="Open contact profile"
                    >
                      <UserCheck className="h-3.5 w-3.5 text-sky-600 shrink-0" />
                      <span className="truncate max-w-[130px]">
                        {typeof task.leadId === 'object' ? (task.leadId?.name || task.leadId?.email) : 'View Contact'}
                      </span>
                    </button>
                  ) : (
                    <span className="text-neutral-400">—</span>
                  )}
                </td>
                <td onClick={(e) => editing && e.stopPropagation()}>
                  {locked || demo ? (
                    <DeadlineBadge dueAt={task.dueAt} status={task.status} />
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
                {showCampaignColumn && (
                  <td className="crm-task-col-link" onClick={(e) => editing && e.stopPropagation()}>
                    {locked || demo ? (
                      <span className="text-neutral-700">{task.campaignId?.projectName || '—'}</span>
                    ) : (
                      <SearchableSelect
                        className="crm-task-table-select"
                        menuMinWidth={300}
                        value={normalizeTaskId(task.campaignId)}
                        onChange={(next) => onPatch?.(task, { campaignId: next || null })}
                        options={campaignOptions}
                        placeholder="Link project…"
                        searchPlaceholder="Search projects…"
                        emptyLabel="No projects match."
                      />
                    )}
                  </td>
                )}
                {showOpportunityColumn && (
                  <td className="crm-task-col-link" onClick={(e) => editing && e.stopPropagation()}>
                    {locked || demo ? (
                      <div>
                        <span className="text-neutral-700">{task.ongoingJobId?.name || task.opportunityId?.name || '—'}</span>
                        {!showAccountColumn && task.companyId?.companyName && (
                          <p className="mt-0.5 text-xs text-neutral-500">{task.companyId.companyName}</p>
                        )}
                      </div>
                    ) : (
                      <SearchableSelect
                        className="crm-task-table-select"
                        menuMinWidth={300}
                        value={normalizeTaskId(task.ongoingJobId || task.opportunityId)}
                        onChange={(next) => onPatch?.(task, { ongoingJobId: next || null, opportunityId: next || null })}
                        options={opportunityOptions}
                        placeholder="Link Ongoing Job…"
                        searchPlaceholder="Search Ongoing Jobs…"
                        emptyLabel="No Ongoing Jobs match."
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
                    <SearchableCombobox
                      className="crm-task-table-select"
                      menuMinWidth={260}
                      value={task.owner || ''}
                      onChange={(next) => onPatch?.(task, { owner: next || null })}
                      options={owners}
                      placeholder="Assign owner…"
                      searchPlaceholder="Search or type owner…"
                      emptyLabel="No owners match."
                      allowCustom
                    />
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
                  <div className="flex items-center justify-end gap-1">
                    {task.leadId && (
                      <button
                        type="button"
                        aria-label="Open contact profile"
                        className="crm-task-delete-btn text-sky-600 hover:text-sky-800 hover:bg-sky-50 transition"
                        onClick={() => onOpenContact?.(task.leadId?._id || task.leadId)}
                        title="Open contact profile"
                      >
                        <UserCheck className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {editing && (
                      <button
                        type="button"
                        aria-label="Confirm task details"
                        onClick={() => onConfirmTask?.(task)}
                        className="crm-task-confirm-tick"
                        title="Done editing"
                      >
                        <Check className="h-4 w-4" strokeWidth={2.25} />
                      </button>
                    )}
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
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </DataTableShell>
    </>
  );
}
