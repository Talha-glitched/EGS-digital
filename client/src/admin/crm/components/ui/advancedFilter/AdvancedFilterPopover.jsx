import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { SlidersHorizontal, X, RotateCcw, Search, ChevronRight } from 'lucide-react';
import { cn } from '../primitives.jsx';
import SearchableSelect from '../SearchableSelect.jsx';
import SearchableMultiSelect from '../SearchableMultiSelect.jsx';
import SearchableCombobox from '../SearchableCombobox.jsx';
import { hasOpenNestedOverlay } from '../nestedOverlayGuard.js';
import { useOverlayTransition, OVERLAY_EXIT_MS } from '../useOverlayTransition.js';
import {
  countActiveFilters,
  countActiveFiltersByGroup,
  createEmptyFilters,
  summarizeActiveFilters,
} from './filterEngine.js';

const TRI_OPTIONS = [
  { value: 'any', label: 'Any value' },
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
];

function FilterTextRow({ label, value, onChange, placeholder }) {
  return (
    <div className="crm-filter-row">
      <span className="crm-filter-row-label">{label}</span>
      <div className="crm-filter-row-control crm-filter-text-wrap">
        <Search className="crm-filter-text-icon" strokeWidth={2} />
        <input
          type="text"
          className="crm-filter-text-input"
          value={value || ''}
          placeholder={placeholder || 'Contains…'}
          onChange={(e) => onChange(e.target.value)}
          aria-label={label}
        />
        {value ? (
          <button type="button" className="crm-filter-text-clear" onClick={() => onChange('')} aria-label={`Clear ${label}`}>
            <X className="h-3 w-3" />
          </button>
        ) : null}
      </div>
    </div>
  );
}

function FilterComboboxRow({ label, value, onChange, options, placeholder }) {
  return (
    <div className="crm-filter-row">
      <span className="crm-filter-row-label">{label}</span>
      <div className="crm-filter-row-control">
        <SearchableCombobox
          className="crm-filter-select-full"
          value={value || ''}
          onChange={onChange}
          options={options || []}
          placeholder={placeholder || `Search ${label.toLowerCase()}…`}
          searchPlaceholder={`Search ${label.toLowerCase()}…`}
          emptyLabel="Type to filter or pick a value"
        />
      </div>
    </div>
  );
}

function FilterTriRow({ label, value, onChange }) {
  return (
    <div className="crm-filter-row">
      <span className="crm-filter-row-label">{label}</span>
      <div className="crm-filter-row-control">
        <SearchableSelect
          className="crm-filter-select crm-filter-select-full"
          value={value || 'any'}
          onChange={onChange}
          options={TRI_OPTIONS}
          placeholder="Any value"
          searchPlaceholder="Search…"
          emptyLabel="No options"
        />
      </div>
    </div>
  );
}

function FilterSelectRow({ label, value, onChange, options }) {
  return (
    <div className="crm-filter-row">
      <span className="crm-filter-row-label">{label}</span>
      <div className="crm-filter-row-control">
        <SearchableSelect
          className="crm-filter-select crm-filter-select-full"
          value={value || 'any'}
          onChange={onChange}
          options={options}
          placeholder="Select…"
          searchPlaceholder={`Search ${label.toLowerCase()}…`}
        />
      </div>
    </div>
  );
}

function FilterMultiRow({ label, value, onChange, options }) {
  return (
    <div className="crm-filter-row">
      <span className="crm-filter-row-label">{label}</span>
      <div className="crm-filter-row-control">
        <SearchableMultiSelect
          className="crm-filter-select-full"
          values={value || []}
          onChange={onChange}
          options={options}
          placeholder={`Any ${label.toLowerCase()}`}
          searchPlaceholder={`Search ${label.toLowerCase()}…`}
        />
      </div>
    </div>
  );
}

function FilterRangeRow({ label, value = { min: '', max: '' }, onChange }) {
  return (
    <div className="crm-filter-row">
      <span className="crm-filter-row-label">{label}</span>
      <div className="crm-filter-row-control crm-filter-range-row">
        <input
          type="number"
          className="crm-input crm-filter-mini-input"
          placeholder="Min"
          value={value?.min ?? ''}
          onChange={(e) => onChange({ ...value, min: e.target.value })}
          aria-label={`${label} minimum`}
        />
        <span className="crm-filter-range-dash">–</span>
        <input
          type="number"
          className="crm-input crm-filter-mini-input"
          placeholder="Max"
          value={value?.max ?? ''}
          onChange={(e) => onChange({ ...value, max: e.target.value })}
          aria-label={`${label} maximum`}
        />
      </div>
    </div>
  );
}

function FilterDateRow({ label, value = { from: '', to: '' }, onChange }) {
  return (
    <div className="crm-filter-row">
      <span className="crm-filter-row-label">{label}</span>
      <div className="crm-filter-row-control crm-filter-range-row">
        <input
          type="date"
          className="crm-input crm-filter-mini-input"
          value={value?.from ?? ''}
          onChange={(e) => onChange({ ...value, from: e.target.value })}
          aria-label={`${label} from`}
        />
        <span className="crm-filter-range-dash">–</span>
        <input
          type="date"
          className="crm-input crm-filter-mini-input"
          value={value?.to ?? ''}
          onChange={(e) => onChange({ ...value, to: e.target.value })}
          aria-label={`${label} to`}
        />
      </div>
    </div>
  );
}

function FilterField({ field, value, onChange }) {
  if (field.type === 'section') {
    return <p className="crm-filter-section-label">{field.label}</p>;
  }

  switch (field.type) {
    case 'tri':
      return <FilterTriRow label={field.label} value={value} onChange={onChange} />;
    case 'select':
      return <FilterSelectRow label={field.label} value={value} onChange={onChange} options={field.options} />;
    case 'multi':
    case 'arrayIncludes':
      return <FilterMultiRow label={field.label} value={value} onChange={onChange} options={field.options} />;
    case 'multiContains':
      if (field.options?.length) {
        return <FilterMultiRow label={field.label} value={value} onChange={onChange} options={field.options} />;
      }
      return <FilterTextRow label={field.label} value={(value || []).join(', ')} onChange={(v) => onChange(v.split(',').map((s) => s.trim()).filter(Boolean))} placeholder="Comma-separated…" />;
    case 'range':
      return <FilterRangeRow label={field.label} value={value} onChange={onChange} />;
    case 'dateRange':
      return <FilterDateRow label={field.label} value={value} onChange={onChange} />;
    case 'combobox':
      return (
        <FilterComboboxRow
          label={field.label}
          value={value}
          onChange={onChange}
          options={field.options}
          placeholder={field.placeholder}
        />
      );
    default:
      return <FilterTextRow label={field.label} value={value} onChange={onChange} placeholder={field.placeholder} />;
  }
}

function FilterCategoryNav({ groups, activeId, onSelect, groupCounts }) {
  return (
    <nav className="crm-filter-nav" aria-label="Filter categories">
      {groups.map((group) => {
        const count = groupCounts[group.id] || 0;
        const active = group.id === activeId;
        return (
          <button
            key={group.id}
            type="button"
            className={cn('crm-filter-nav-item', active && 'is-active')}
            onClick={() => onSelect(group.id)}
          >
            <span className="min-w-0 flex-1 text-left">
              <span className="block truncate text-[13px] font-semibold">{group.label}</span>
              {group.description ? (
                <span className="block truncate text-[10px] font-medium text-neutral-400">{group.description}</span>
              ) : null}
            </span>
            {count > 0 ? <span className="crm-filter-nav-badge">{count}</span> : null}
            <ChevronRight className={cn('crm-filter-nav-chevron', active && 'is-active')} />
          </button>
        );
      })}
    </nav>
  );
}

function FilterPanelBody({ schema, draft, setDraft, matchMode, setMatchMode, activeGroupId }) {
  const activeGroup = schema.groups.find((g) => g.id === activeGroupId) || schema.groups[0];

  return (
    <div className="crm-filter-body">
      <div className="crm-filter-match-bar">
        <span className="text-[11px] font-semibold text-neutral-500">Match records where</span>
        <SearchableSelect
          className="crm-filter-select crm-filter-match-select"
          value={matchMode}
          onChange={setMatchMode}
          options={[
            { value: 'all', label: 'All filters match' },
            { value: 'any', label: 'Any filter matches' },
          ]}
          placeholder="Match mode"
          searchPlaceholder="Search…"
        />
      </div>

      <div key={activeGroup.id} className="crm-filter-fields crm-filter-fields-enter">
        <header className="crm-filter-fields-head">
          <h3 className="text-sm font-bold text-[var(--color-ink)]">{activeGroup.label}</h3>
          {activeGroup.description ? (
            <p className="text-[11px] text-neutral-500">{activeGroup.description}</p>
          ) : null}
        </header>
        <div className="crm-filter-fields-list">
          {activeGroup.fields.map((field) => (
            <FilterField
              key={field.key}
              field={field}
              value={draft[field.key]}
              onChange={(next) => setDraft((prev) => ({ ...prev, [field.key]: next }))}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function AdvancedFilterPopover({
  schema,
  filters,
  onChange,
  matchMode = 'all',
  className = '',
  label = 'Filters',
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(filters);
  const [draftMatch, setDraftMatch] = useState(matchMode);
  const [activeGroupId, setActiveGroupId] = useState(schema.groups[0]?.id || '');
  const panelId = useId();
  const { mounted, visible, exiting } = useOverlayTransition(open);

  const activeCount = useMemo(() => countActiveFilters(filters, schema), [filters, schema]);
  const draftCount = useMemo(() => countActiveFilters(draft, schema), [draft, schema]);
  const draftGroupCounts = useMemo(() => countActiveFiltersByGroup(draft, schema), [draft, schema]);

  useEffect(() => {
    if (!open) return undefined;
    setDraft(filters);
    setDraftMatch(matchMode);
    setActiveGroupId(schema.groups[0]?.id || '');
    const onKey = (event) => {
      if (event.key === 'Escape' && !hasOpenNestedOverlay()) setOpen(false);
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [open, filters, matchMode, schema.groups]);

  function applyDraft() {
    onChange(draft, draftMatch);
    setOpen(false);
  }

  function resetDraft() {
    const empty = createEmptyFilters(schema);
    setDraft(empty);
    setDraftMatch('all');
    onChange(empty, 'all');
    setOpen(false);
  }

  const showNav = schema.groups.length > 1;

  return (
    <>
      <button
        type="button"
        className={cn('crm-advanced-filter-trigger', activeCount > 0 && 'has-active', className)}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(true)}
      >
        <SlidersHorizontal className="h-3.5 w-3.5" strokeWidth={2} />
        <span>{label}</span>
        {activeCount > 0 ? <span className="crm-advanced-filter-count">{activeCount}</span> : null}
      </button>

      {mounted && createPortal(
        <div
          className={cn(
            'crm-filter-overlay',
            visible && !exiting && 'is-visible',
            exiting && 'is-exiting',
          )}
          role="presentation"
          onMouseDown={(e) => {
            if (e.target !== e.currentTarget) return;
            if (hasOpenNestedOverlay()) return;
            setOpen(false);
          }}
        >
          <div
            id={panelId}
            className={cn(
              'crm-filter-dialog',
              visible && !exiting && 'is-visible',
              exiting && 'is-exiting',
            )}
            role="dialog"
            aria-modal="true"
            aria-label={`${schema.label} filters`}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <header className="crm-filter-dialog-header">
              <div>
                <p className="text-base font-bold text-[var(--color-ink)]">{schema.label}</p>
                <p className="text-xs text-neutral-500">Browse categories, then set filters for each facet.</p>
              </div>
              <button type="button" className="crm-icon-btn" onClick={() => setOpen(false)} aria-label="Close filters">
                <X className="h-4 w-4" />
              </button>
            </header>

            <div className={cn('crm-filter-dialog-body', !showNav && 'is-single')}>
              {showNav ? (
                <FilterCategoryNav
                  groups={schema.groups}
                  activeId={activeGroupId}
                  onSelect={setActiveGroupId}
                  groupCounts={draftGroupCounts}
                />
              ) : null}
              <FilterPanelBody
                schema={schema}
                draft={draft}
                setDraft={setDraft}
                matchMode={draftMatch}
                setMatchMode={setDraftMatch}
                activeGroupId={activeGroupId}
              />
            </div>

            <footer className="crm-filter-dialog-footer">
              <button type="button" className="crm-btn-ghost text-xs" onClick={resetDraft}>
                <RotateCcw className="h-3.5 w-3.5" />
                Clear all
              </button>
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-medium text-neutral-400">
                  {draftCount ? `${draftCount} filter${draftCount === 1 ? '' : 's'} ready` : 'No filters set'}
                </span>
                <button type="button" className="crm-btn-secondary text-xs" onClick={() => setOpen(false)}>
                  Cancel
                </button>
                <button type="button" className="crm-btn-primary text-xs" onClick={applyDraft}>
                  Apply{draftCount ? ` (${draftCount})` : ''}
                </button>
              </div>
            </footer>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}

export function AdvancedFilterChips({ schema, filters, onChange, className = '' }) {
  const summaries = useMemo(
    () => summarizeActiveFilters(filters, schema),
    [filters, schema],
  );
  if (!summaries.length) return null;

  const clearOne = (key) => {
    const empty = createEmptyFilters(schema);
    onChange({ ...filters, [key]: empty[key] });
  };

  return (
    <div className={cn('crm-advanced-filter-chip-row', className)}>
      {summaries.map((item) => (
        <button
          key={item.key}
          type="button"
          className="crm-advanced-filter-active-chip"
          onClick={() => clearOne(item.key)}
          title="Remove filter"
        >
          <span>{item.label}</span>
          <X className="h-3 w-3" />
        </button>
      ))}
    </div>
  );
}

export default AdvancedFilterPopover;
