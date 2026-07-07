import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Plus, Search } from 'lucide-react';
import { cn } from './primitives.jsx';
import { registerNestedOverlay } from './nestedOverlayGuard.js';

export default function SearchableSelect({
  value,
  onChange,
  options = [],
  placeholder = 'Select…',
  searchPlaceholder = 'Type to search…',
  emptyLabel = 'No matches found',
  disabled = false,
  required = false,
  className = '',
  menuMinWidth = 0,
  onCreateNew,
  createLabel = 'Create new',
  onSearch,
  searching = false,
  minQueryLength = 0,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [asyncOptions, setAsyncOptions] = useState([]);
  const [internalSearching, setInternalSearching] = useState(false);
  const [menuCoords, setMenuCoords] = useState({ top: 0, left: 0, width: 0 });
  const rootRef = useRef(null);
  const inputRef = useRef(null);
  const listId = useId();
  const overlayId = useId();
  const isAsync = Boolean(onSearch);
  const isSearching = searching || internalSearching;

  const optionPool = isAsync ? asyncOptions : options;

  const selected = useMemo(
    () => options.find((option) => String(option.value) === String(value))
      || asyncOptions.find((option) => String(option.value) === String(value)),
    [options, asyncOptions, value],
  );

  const filtered = useMemo(() => {
    if (isAsync) return optionPool;
    const term = query.trim().toLowerCase();
    if (!term) return options;
    return options.filter((option) => {
      const haystack = `${option.label || ''} ${option.hint || ''}`.toLowerCase();
      return haystack.includes(term);
    });
  }, [isAsync, optionPool, options, query]);

  const updateMenuPosition = () => {
    const el = rootRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const width = Math.max(rect.width, menuMinWidth || 0);
    const left = Math.min(rect.left, window.innerWidth - width - 12);
    setMenuCoords({
      top: rect.bottom + 6,
      left: Math.max(12, left),
      width,
    });
  };

  useLayoutEffect(() => {
    if (!open) return undefined;
    updateMenuPosition();
    const handleReposition = () => updateMenuPosition();
    window.addEventListener('scroll', handleReposition, true);
    window.addEventListener('resize', handleReposition);
    return () => {
      window.removeEventListener('scroll', handleReposition, true);
      window.removeEventListener('resize', handleReposition);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const unregister = registerNestedOverlay(overlayId);
    function handlePointerDown(event) {
      const root = rootRef.current;
      const menu = document.getElementById(listId);
      if (root?.contains(event.target) || menu?.contains(event.target)) return;
      setOpen(false);
    }
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        event.stopPropagation();
        event.preventDefault();
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown, true);
      unregister();
    };
  }, [open, listId, overlayId]);

  useEffect(() => {
    if (open) {
      setQuery('');
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => {
    if (!open || !onSearch) return undefined;
    const term = query.trim();
    if (term.length < minQueryLength) {
      setAsyncOptions([]);
      return undefined;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      setInternalSearching(true);
      try {
        const result = await onSearch(term);
        if (!cancelled) setAsyncOptions(Array.isArray(result) ? result : []);
      } catch {
        if (!cancelled) setAsyncOptions([]);
      } finally {
        if (!cancelled) setInternalSearching(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [open, query, onSearch, minQueryLength]);

  function selectOption(option) {
    onChange?.(option.value, option);
    setOpen(false);
    setQuery('');
  }

  const menu = open
    ? createPortal(
        <div
          id={listId}
          role="listbox"
          className="crm-searchable-select-menu is-portal"
          style={{ top: menuCoords.top, left: menuCoords.left, width: menuCoords.width }}
        >
          <div className="crm-searchable-select-search">
            <Search className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
            <input
              ref={inputRef}
              type="text"
              className="crm-searchable-select-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  e.stopPropagation();
                  e.preventDefault();
                  setOpen(false);
                }
              }}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              required={required && !value}
            />
          </div>

          <div className="crm-searchable-select-options crm-scroll">
            {onCreateNew && (
              <button
                type="button"
                className="crm-searchable-select-option is-create"
                onClick={() => {
                  setOpen(false);
                  onCreateNew();
                }}
              >
                <Plus className="h-3.5 w-3.5" />
                <span>{createLabel}</span>
              </button>
            )}

            {isSearching ? (
              <p className="px-3 py-4 text-center text-xs text-neutral-500">Searching…</p>
            ) : filtered.length ? filtered.map((option) => {
              const active = String(option.value) === String(value);
              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={active}
                  className={cn('crm-searchable-select-option', active && 'is-active')}
                  onClick={() => selectOption(option)}
                >
                  <span className="min-w-0 flex-1 text-left">
                    <span className="block truncate text-sm font-medium text-[var(--color-ink)]">{option.label}</span>
                    {option.hint && <span className="block truncate text-[11px] text-neutral-500">{option.hint}</span>}
                  </span>
                  {active && <Check className="h-3.5 w-3.5 shrink-0 text-brand" />}
                </button>
              );
            }) : (
              <p className="px-3 py-4 text-center text-xs text-neutral-500">{emptyLabel}</p>
            )}
          </div>
        </div>,
        document.body,
      )
    : null;

  return (
    <>
      <div ref={rootRef} className={cn('crm-searchable-select', open && 'is-open', className)}>
        <button
          type="button"
          className="crm-searchable-select-trigger"
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={open ? listId : undefined}
          onClick={() => setOpen((prev) => !prev)}
        >
          <span className={cn('crm-searchable-select-value', !selected && 'is-placeholder')}>
            {selected?.label || placeholder}
          </span>
          <ChevronDown className="crm-searchable-select-chevron" />
        </button>
      </div>
      {menu}
    </>
  );
}
