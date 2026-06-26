import { useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Info } from 'lucide-react';
import { cn } from './primitives.jsx';

export default function InfoTip({
  text,
  label = 'More information',
  className = '',
  size = 'sm',
  placement = 'bottom',
}) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null);
  const tooltipId = useId();
  const iconSize = size === 'md' ? 'h-4 w-4' : 'h-3 w-3';
  const buttonSize = size === 'md' ? 'h-7 w-7' : 'h-5 w-5';

  const updatePosition = () => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setCoords({
      top: rect.bottom + 6,
      left: placement === 'bottom-start' ? rect.left : rect.left + rect.width / 2,
    });
  };

  useLayoutEffect(() => {
    if (!open) return undefined;
    updatePosition();
    const handleReposition = () => updatePosition();
    window.addEventListener('scroll', handleReposition, true);
    window.addEventListener('resize', handleReposition);
    return () => {
      window.removeEventListener('scroll', handleReposition, true);
      window.removeEventListener('resize', handleReposition);
    };
  }, [open, placement]);

  if (!text) return null;

  const bubble = open
    ? createPortal(
        <span
          id={tooltipId}
          role="tooltip"
          className={cn(
            'crm-info-tip-bubble is-portal is-open',
            placement === 'bottom-start' ? 'is-bottom-start' : 'is-centered',
          )}
          style={{ top: coords.top, left: coords.left }}
        >
          {text}
        </span>,
        document.body,
      )
    : null;

  return (
    <>
      <span
        className={cn('crm-info-tip inline-flex', className)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      >
        <button
          ref={triggerRef}
          type="button"
          className={cn('crm-info-tip-trigger', buttonSize)}
          aria-label={label}
          aria-describedby={open ? tooltipId : undefined}
          onClick={(e) => {
            e.stopPropagation();
            setOpen((prev) => !prev);
          }}
        >
          <Info className={iconSize} strokeWidth={2} />
        </button>
      </span>
      {bubble}
    </>
  );
}

export function TableHeaderLabel({ label, hint, align = 'left' }) {
  const tip = hint ? <InfoTip text={hint} label={`About ${label}`} /> : null;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5',
        align === 'right' && 'justify-end w-full',
        align === 'center' && 'justify-center w-full',
      )}
      onClick={(e) => e.stopPropagation()}
    >
      {align === 'right' && tip}
      <span>{label}</span>
      {align !== 'right' && tip}
    </span>
  );
}
