import { useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from './primitives.jsx';
import { useBodyScrollLock } from './useBodyScrollLock.js';
import { useOverlayTransition } from './useOverlayTransition.js';
import { useFocusTrap } from './useFocusTrap.js';

export function Modal({ open, isOpen, onClose, title, subtitle, children, footer, size = 'lg', icon: Icon, accent = 'brand' }) {
  const panelRef = useRef(null);
  const titleId = useId();
  const effectiveOpen = open !== undefined ? Boolean(open) : Boolean(isOpen);
  const { mounted, visible, exiting } = useOverlayTransition(effectiveOpen);
  useBodyScrollLock(mounted);
  useFocusTrap(panelRef, { active: mounted && !exiting, onClose });

  if (!mounted) return null;

  const sizes = {
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-5xl',
    '2xl': 'max-w-6xl',
  };
  const show = visible && !exiting;

  return createPortal(
    <div
      className={cn('crm-modal-overlay crm-root', show && 'is-visible', exiting && 'is-exiting')}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        className={cn('crm-modal-panel', sizes[size] || sizes.lg, show && 'is-visible', exiting && 'is-exiting')}
      >
        <div className="crm-modal-header">
          <div className="flex min-w-0 flex-1 items-start gap-3.5 pr-2">
            {Icon ? (
              <div className={cn('crm-modal-icon', `crm-modal-icon--${accent}`)} aria-hidden="true">
                <Icon className="h-4 w-4" strokeWidth={2} />
              </div>
            ) : null}
            <div className="min-w-0 flex-1">
              <h2 id={titleId} className="crm-drawer-title">
                {title}
              </h2>
              {subtitle && <p className="crm-drawer-subtitle">{subtitle}</p>}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="crm-drawer-close"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="crm-modal-body crm-scroll flex-1 overflow-y-auto">{children}</div>

        {footer ? <div className="crm-modal-footer">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  );
}
