import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, X } from 'lucide-react';
import { isDateOnlyDue } from '../tasks/taskUtils.js';
import { cn } from './primitives.jsx';

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const MINUTE_OPTIONS = [0, 15, 30, 45];

function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function sameDay(a, b) {
  if (!a || !b) return false;
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

function toIso(date) {
  return date ? date.toISOString() : null;
}

function startOfDay(date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function withTime(base, hours, minutes) {
  const next = new Date(base);
  next.setHours(hours, minutes, 0, 0);
  return next;
}

function formatTrigger(value) {
  const date = parseDate(value);
  if (!date) return '';
  if (isDateOnlyDue(value)) {
    return date.toLocaleDateString('en-AE', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }
  return date.toLocaleString('en-AE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function buildCalendarDays(viewYear, viewMonth) {
  const first = new Date(viewYear, viewMonth, 1);
  const startOffset = (first.getDay() + 6) % 7;
  const days = [];
  const start = new Date(viewYear, viewMonth, 1 - startOffset);
  for (let i = 0; i < 42; i += 1) {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    days.push(day);
  }
  return days;
}

export default function DateTimePicker({
  value,
  onChange,
  disabled = false,
  compact = false,
  placeholder = 'Set due date',
  ariaLabel = 'Due date',
  className = '',
}) {
  const rootRef = useRef(null);
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const [menuCoords, setMenuCoords] = useState({ top: 0, left: 0, width: 0, placement: 'bottom' });

  const selected = parseDate(value);
  const initialView = selected || new Date();
  const [viewYear, setViewYear] = useState(initialView.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialView.getMonth());
  const [draft, setDraft] = useState(selected);
  const [includeTime, setIncludeTime] = useState(false);

  const hours24 = draft?.getHours() ?? 9;
  const hour12 = ((hours24 + 11) % 12) + 1;
  const minute = draft?.getMinutes() ?? 0;
  const meridiem = hours24 >= 12 ? 'PM' : 'AM';
  const nearestMinute = MINUTE_OPTIONS.includes(minute) ? minute : MINUTE_OPTIONS.reduce((best, item) => (
    Math.abs(item - minute) < Math.abs(best - minute) ? item : best
  ), 0);

  const days = useMemo(() => buildCalendarDays(viewYear, viewMonth), [viewYear, viewMonth]);
  const today = new Date();

  useEffect(() => {
    if (!open) return;
    const base = selected || new Date();
    setViewYear(base.getFullYear());
    setViewMonth(base.getMonth());
    setDraft(selected ? new Date(selected) : null);
    setIncludeTime(Boolean(selected) && !isDateOnlyDue(value));
  }, [open, value]);

  const updateMenuPosition = () => {
    const el = rootRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const panelHeight = compact ? (includeTime ? 290 : 248) : (includeTime ? 390 : 320);
    const panelWidth = compact ? 252 : 320;
    const spaceBelow = window.innerHeight - rect.bottom;
    const placement = spaceBelow < panelHeight && rect.top > panelHeight ? 'top' : 'bottom';
    const left = Math.min(Math.max(12, rect.left), window.innerWidth - panelWidth - 12);
    setMenuCoords({
      top: placement === 'bottom' ? rect.bottom + 6 : rect.top - panelHeight - 6,
      left,
      width: Math.max(rect.width, panelWidth),
      placement,
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
  }, [open, includeTime]);

  useEffect(() => {
    if (!open) return undefined;
    function handlePointerDown(event) {
      const root = rootRef.current;
      const panel = document.getElementById(panelId);
      if (root?.contains(event.target) || panel?.contains(event.target)) return;
      setOpen(false);
    }
    function handleKeyDown(event) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, panelId]);

  function commit(next, timeEnabled = includeTime) {
    setDraft(next);
    if (!next) {
      onChange?.(null);
      return;
    }
    onChange?.(toIso(timeEnabled ? next : startOfDay(next)));
  }

  function selectDay(day) {
    if (includeTime) {
      const base = draft || withTime(day, 9, 0);
      commit(withTime(day, base.getHours(), base.getMinutes()), true);
      return;
    }
    commit(startOfDay(day), false);
  }

  function updateTime(nextHour12, nextMinute, nextMeridiem) {
    const base = draft || startOfDay(new Date());
    let hours = nextHour12 % 12;
    if (nextMeridiem === 'PM') hours += 12;
    commit(withTime(base, hours, nextMinute), true);
  }

  function toggleIncludeTime() {
    if (includeTime) {
      setIncludeTime(false);
      if (draft) commit(startOfDay(draft), false);
      return;
    }
    setIncludeTime(true);
    const base = draft || startOfDay(new Date());
    const next = withTime(base, 9, 0);
    setDraft(next);
    if (draft) onChange?.(toIso(next));
  }

  function goMonth(delta) {
    const next = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  }

  function handleClear(event) {
    event.preventDefault();
    event.stopPropagation();
    onChange?.(null);
    setDraft(null);
    setIncludeTime(false);
    setOpen(false);
  }

  function handleToday() {
    if (includeTime) {
      const base = draft || withTime(today, 9, 0);
      const next = withTime(today, base.getHours(), base.getMinutes());
      setViewYear(today.getFullYear());
      setViewMonth(today.getMonth());
      commit(next, true);
      return;
    }
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
    commit(startOfDay(today), false);
  }

  const display = formatTrigger(value);

  const panel = open ? createPortal(
    <div
      id={panelId}
      role="dialog"
      aria-label="Choose due date and time"
      className={cn('crm-datetime-picker-panel', compact && 'is-compact', menuCoords.placement === 'top' && 'is-above')}
      style={{ top: menuCoords.top, left: menuCoords.left, width: menuCoords.width }}
    >
      <div className="crm-datetime-picker-header">
        <button type="button" className="crm-datetime-picker-nav" onClick={() => goMonth(-1)} aria-label="Previous month">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <p className="crm-datetime-picker-month">{MONTHS[viewMonth]} {viewYear}</p>
        <button type="button" className="crm-datetime-picker-nav" onClick={() => goMonth(1)} aria-label="Next month">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="crm-datetime-picker-weekdays">
        {WEEKDAYS.map((day) => <span key={day}>{day}</span>)}
      </div>

      <div className="crm-datetime-picker-grid">
        {days.map((day) => {
          const inMonth = day.getMonth() === viewMonth;
          const isSelected = sameDay(day, draft);
          const isToday = sameDay(day, today);
          return (
            <button
              key={day.toISOString()}
              type="button"
              className={cn(
                'crm-datetime-picker-day',
                !inMonth && 'is-outside',
                isSelected && 'is-selected',
                isToday && 'is-today',
              )}
              onClick={() => selectDay(day)}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>

      <div className="crm-datetime-picker-time">
        <div className="crm-datetime-picker-time-header">
          <span className="crm-datetime-picker-time-label">
            <Clock3 className="h-3.5 w-3.5" />
            Time
          </span>
          <button
            type="button"
            className={cn('crm-datetime-toggle', includeTime && 'is-active')}
            onClick={toggleIncludeTime}
            aria-pressed={includeTime}
          >
            {includeTime ? 'With time' : 'No time'}
          </button>
        </div>
        {includeTime && (
          <div className="crm-datetime-picker-time-fields">
            <label className="crm-datetime-picker-time-field">
              <span>Hour</span>
              <select
                className="crm-select crm-datetime-picker-select"
                value={hour12}
                onChange={(e) => updateTime(Number(e.target.value), nearestMinute, meridiem)}
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((hour) => (
                  <option key={hour} value={hour}>{hour}</option>
                ))}
              </select>
            </label>
            <span className="crm-datetime-picker-colon">:</span>
            <label className="crm-datetime-picker-time-field">
              <span>Min</span>
              <select
                className="crm-select crm-datetime-picker-select"
                value={nearestMinute}
                onChange={(e) => updateTime(hour12, Number(e.target.value), meridiem)}
              >
                {MINUTE_OPTIONS.map((item) => (
                  <option key={item} value={item}>{String(item).padStart(2, '0')}</option>
                ))}
              </select>
            </label>
            <label className="crm-datetime-picker-time-field">
              <span>Period</span>
              <select
                className="crm-select crm-datetime-picker-select"
                value={meridiem}
                onChange={(e) => updateTime(hour12, nearestMinute, e.target.value)}
              >
                <option value="AM">AM</option>
                <option value="PM">PM</option>
              </select>
            </label>
          </div>
        )}
      </div>

      <div className="crm-datetime-picker-footer">
        <button type="button" className="crm-datetime-picker-link" onClick={handleClear}>Clear</button>
        <div className="flex items-center gap-2">
          <button type="button" className="crm-datetime-picker-link" onClick={handleToday}>Today</button>
          <button type="button" className="crm-btn-primary crm-datetime-picker-done" onClick={() => setOpen(false)}>
            Done
          </button>
        </div>
      </div>
    </div>,
    document.body,
  ) : null;

  return (
    <>
      <div ref={rootRef} className={cn('crm-datetime-picker', open && 'is-open', className)}>
        <div className="crm-datetime-picker-trigger-wrap">
          <button
            type="button"
            className={cn('crm-datetime-picker-trigger', compact && 'is-compact')}
            disabled={disabled}
            aria-label={ariaLabel}
            aria-haspopup="dialog"
            aria-expanded={open}
            aria-controls={open ? panelId : undefined}
            onClick={() => setOpen((prev) => !prev)}
          >
            <CalendarDays className="crm-datetime-picker-icon" />
            <span className={cn('crm-datetime-picker-value', !display && 'is-placeholder')}>
              {display || placeholder}
            </span>
          </button>
          {display && !disabled && (
            <button
              type="button"
              className="crm-datetime-picker-clear"
              aria-label="Clear due date"
              onClick={handleClear}
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>
      {panel}
    </>
  );
}
