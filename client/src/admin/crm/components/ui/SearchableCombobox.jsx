import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import { cn } from './primitives.jsx';
import { registerNestedOverlay } from './nestedOverlayGuard.js';

export default function SearchableCombobox({
  value = '',
  onChange,
  options = [],
  placeholder = 'Select or type…',
  searchPlaceholder = 'Search…',
  emptyLabel = 'No matches',
  allowCustom = true,
  disabled = false,
  className = '',
  menuMinWidth = 260,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [menuCoords, setMenuCoords] = useState({ top: 0, left: 0, width: 0 });
  const rootRef = useRef(null);
  const inputRef = useRef(null);
  const listId = useId();
  const overlayId = useId();

  const selected = useMemo(
    () => options.find((option) => String(option.value) === String(value)),
    [options, value],
  );

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return options;
    return options.filter((option) =>
      `${option.label || ''} ${option.hint || ''}`.toLowerCase().includes(term),
    );
  }, [options, query]);

  const customTerm = query.trim();
  const showCustomOption = allowCustom && customTerm && !filtered.some(
    (option) => String(option.label).toLowerCase() === customTerm.toLowerCase(),
  );

  const updateMenuPosition = () => {
    const el = rootRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const width = Math.max(rect.width, menuMinWidth);
    const left = Math.min(rect.left, window.innerWidth - width - 12);
    const spaceBelow = window.innerHeight - rect.bottom - 12;
    const openUp = spaceBelow < 220 && rect.top > spaceBelow;
    setMenuCoords({
      top: openUp ? rect.top - 8 : rect.bottom + 6,
      left: Math.max(12, left),
      width,
      openUp,
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
      setQuery(value || '');
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open, value]);

  function applyValue(next) {
    onChange?.(next);
    setOpen(false);
    setQuery('');
  }

  const menu = open
    ? createPortal(
        <div
          id={listId}
          role="listbox"
          className={cn('crm-searchable-select-menu is-portal', menuCoords.openUp && 'is-above')}
          style={{
            top: menuCoords.openUp ? undefined : menuCoords.top,
            bottom: menuCoords.openUp ? `${window.innerHeight - menuCoords.top}px` : undefined,
            left: menuCoords.left,
            width: menuCoords.width,
          }}
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
                if (e.key === 'Enter' && allowCustom && customTerm) {
                  e.preventDefault();
                  applyValue(customTerm);
                }
                if (e.key === 'Escape') {
                  e.stopPropagation();
                  e.preventDefault();
                  setOpen(false);
                }
              }}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
            />
          </div>

          <div className="crm-searchable-select-options crm-scroll">
            {showCustomOption && (
              <button
                type="button"
                className="crm-searchable-select-option is-create"
                onClick={() => applyValue(customTerm)}
              >
                <span className="text-sm font-medium text-[var(--color-ink)]">
                  Contains “{customTerm}”
                </span>
              </button>
            )}

            {filtered.length ? filtered.map((option) => {
              const active = String(option.value) === String(value);
              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={active}
                  className={cn('crm-searchable-select-option', active && 'is-active')}
                  onClick={() => applyValue(option.value)}
                >
                  <span className="min-w-0 flex-1 text-left">
                    <span className="block truncate text-sm font-medium text-[var(--color-ink)]">{option.label}</span>
                    {option.hint && <span className="block truncate text-[11px] text-neutral-500">{option.hint}</span>}
                  </span>
                  {active && <Check className="h-3.5 w-3.5 shrink-0 text-brand" />}
                </button>
              );
            }) : !showCustomOption ? (
              <p className="px-3 py-4 text-center text-xs text-neutral-500">{emptyLabel}</p>
            ) : null}
          </div>
        </div>,
        document.body,
      )
    : null;

  return (
    <>
      <div ref={rootRef} className={cn('crm-searchable-select', open && 'is-open', className)}>
        <div className="crm-searchable-select-trigger-wrap">
          <button
            type="button"
            className="crm-searchable-select-trigger"
            disabled={disabled}
            aria-haspopup="listbox"
            aria-expanded={open}
            aria-controls={open ? listId : undefined}
            onClick={() => setOpen((prev) => !prev)}
          >
            <span className={cn('crm-searchable-select-value', !value && 'is-placeholder')}>
              {selected?.label || value || placeholder}
            </span>
            <ChevronDown className="crm-searchable-select-chevron" />
          </button>
          {value ? (
            <button
              type="button"
              className="crm-multi-trigger-clear is-outer"
              onClick={(e) => {
                e.stopPropagation();
                onChange?.('');
              }}
              aria-label="Clear value"
            >
              <X className="h-3 w-3" />
            </button>
          ) : null}
        </div>
      </div>
      {menu}
    </>
  );
}
