import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Layers,
  Plus,
  Mail,
  Users,
  Clock,
  Play,
  Pencil,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react';
import DataTableShell from '../ui/DataTableShell.jsx';
import ClickableTableRow from '../ui/ClickableTableRow.jsx';
import { SortableTableHeader, TableSortIndicator } from '../ui/SortableTableHeader.jsx';
import { useTableSort } from '../../hooks/useTableSort.js';
import { sequenceSortAccessors } from '../../hooks/tableSortAccessors.js';
import { Badge, EmptyState, cn } from '../ui/primitives.jsx';

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-AE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function SequenceListPanel({ sequences = [], onCreate, onEdit, loading }) {
  const { sortKey, sortDir, sortLabel, toggleSort, clearSort, sortItems } = useTableSort({
    defaultKey: 'updatedAt',
    defaultDir: 'desc',
    accessors: sequenceSortAccessors,
  });

  const sortedSequences = useMemo(() => sortItems(sequences), [sequences, sortItems]);

  if (!loading && !sequences.length) {
    return (
      <EmptyState
        icon={Layers}
        title="No email sequences yet"
        description="Build multi-step outreach flows, target campaigns or individual contacts, and launch when ready."
        action={(
          <button type="button" onClick={onCreate} className="crm-btn-primary">
            <Plus className="h-4 w-4" />
            Create sequence
          </button>
        )}
      />
    );
  }

  return (
    <DataTableShell>
      <TableSortIndicator
        sortKey={sortKey}
        sortDir={sortDir}
        sortLabel={sortLabel}
        onToggle={() => toggleSort(sortKey)}
        onClear={clearSort}
      />
      <div className="overflow-x-auto">
        <table className="crm-table min-w-[920px]">
          <thead>
            <tr>
              <SortableTableHeader label="Sequence" sortKey="name" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
              <SortableTableHeader label="Campaign" sortKey="campaign" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
              <SortableTableHeader label="Steps" sortKey="steps" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
              <SortableTableHeader label="Status" sortKey="status" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
              <SortableTableHeader label="Enrolled" sortKey="enrolled" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
              <SortableTableHeader label="Queue" sortKey="queue" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
              <th className="text-left">Failed</th>
              <SortableTableHeader label="Updated" sortKey="updatedAt" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
              <th className="w-24" />
            </tr>
          </thead>
          <tbody>
            {sortedSequences.map((seq) => {
              const stats = seq.stats || {};
              const campaign = seq.campaign || {};
              return (
                <ClickableTableRow key={seq._id} onClick={() => onEdit(seq._id)}>
                  <td>
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
                        <Mail className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate crm-cell-primary">{seq.name}</p>
                        <p className="text-[11px] text-neutral-400">
                          {seq.isActive ? 'Live outreach' : 'Draft — not launched'}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td>
                    {seq.campaignId ? (
                      <Link
                        to={`/admin/crm/projects/${seq.campaignId}`}
                        onClick={(e) => e.stopPropagation()}
                        className="group inline-flex max-w-[200px] items-center gap-1 text-sm text-neutral-600 hover:text-brand"
                      >
                        <span className="truncate">{campaign.projectName || 'Campaign'}</span>
                        <ChevronRight className="h-3 w-3 opacity-0 transition group-hover:opacity-100" />
                      </Link>
                    ) : (
                      <span className="text-sm text-neutral-500">Standalone</span>
                    )}
                  </td>
                  <td>
                    <span className="text-sm font-medium tabular-nums">{seq.steps?.length || 0}</span>
                  </td>
                  <td>
                    <Badge tone={seq.isActive ? 'success' : 'neutral'}>
                      {seq.isActive ? 'Active' : 'Draft'}
                    </Badge>
                  </td>
                  <td>
                    <div className="flex items-center gap-1.5 text-sm tabular-nums">
                      <Users className="h-3.5 w-3.5 text-neutral-400" />
                      <span className="font-medium">{stats.enrolled || 0}</span>
                      {stats.active > 0 && (
                        <span className="text-[11px] text-emerald-600">({stats.active} active)</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-1.5 text-sm tabular-nums text-neutral-600">
                      <Clock className="h-3.5 w-3.5 text-neutral-400" />
                      {stats.queued || 0}
                    </div>
                  </td>
                  <td>
                    <div className={cn(
                      'flex items-center gap-1.5 text-sm tabular-nums',
                      stats.failed > 0 ? 'font-semibold text-red-600' : 'text-neutral-500',
                    )}
                    >
                      {stats.failed > 0 ? <AlertTriangle className="h-3.5 w-3.5" /> : null}
                      {stats.failed || 0}
                    </div>
                  </td>
                  <td className="text-sm text-neutral-500">{formatDate(seq.updatedAt)}</td>
                  <td>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onEdit(seq._id); }}
                      className="crm-btn-ghost py-1.5 text-xs"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </button>
                  </td>
                </ClickableTableRow>
              );
            })}
          </tbody>
        </table>
      </div>
    </DataTableShell>
  );
}
