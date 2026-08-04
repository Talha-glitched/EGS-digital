import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from './primitives.jsx';
import { useBodyScrollLock } from './useBodyScrollLock.js';
import { useOverlayTransition } from './useOverlayTransition.js';

export function Modal({ open, isOpen, onClose, title, subtitle, children, footer, size = 'lg', icon: Icon, accent = 'brand' }) {
  const panelRef = useRef(null);
  const onCloseRef = useRef(onClose);
  const effectiveOpen = open !== undefined ? Boolean(open) : Boolean(isOpen);
  const { mounted, visible, exiting } = useOverlayTransition(effectiveOpen);
  useBodyScrollLock(mounted);

  onCloseRef.current = onClose;

  useEffect(() => {
    if (!mounted || exiting) return undefined;

    const previousFocus = document.activeElement;
    const panel = panelRef.current;
    const focusableSelector = 'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])';
    const firstInput = panel?.querySelector('input:not([disabled]), textarea:not([disabled]), select:not([disabled])');
    const firstFocusable = panel?.querySelector(focusableSelector);
    (firstInput || firstFocusable || panel)?.focus();

    return () => {
      previousFocus?.focus?.();
    };
  }, [mounted, exiting]);

  useEffect(() => {
    if (!mounted || exiting) return undefined;

    const panel = panelRef.current;
    const focusableSelector = 'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])';

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current?.();
        return;
      }
      if (event.key !== 'Tab' || !panel) return;
      const focusable = [...panel.querySelectorAll(focusableSelector)];
      if (!focusable.length) {
        event.preventDefault();
        panel.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [mounted, exiting]);

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
      aria-labelledby="crm-modal-title"
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
              <h2 id="crm-modal-title" className="crm-drawer-title">
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
