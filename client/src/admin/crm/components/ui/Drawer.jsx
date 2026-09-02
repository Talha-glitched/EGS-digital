import { useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from './primitives.jsx';
import { useBodyScrollLock } from './useBodyScrollLock.js';
import { useOverlayTransition } from './useOverlayTransition.js';
import { useFocusTrap } from './useFocusTrap.js';

const WIDTHS = {
  sm: 'max-w-[440px]',
  md: 'max-w-[540px]',
  lg: 'max-w-[640px]',
  xl: 'max-w-[760px]',
  '2xl': 'max-w-[900px]',
};

export default function Drawer({
  open,
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  badge,
  headerActions,
  size = 'md',
  stackLevel = 0,
  className = '',
}) {
  const effectiveOpen = open !== undefined ? open : isOpen;
  const panelRef = useRef(null);
  const titleId = useId();
  const { mounted, visible, exiting } = useOverlayTransition(effectiveOpen);
  useBodyScrollLock(mounted);
  useFocusTrap(panelRef, { active: mounted && !exiting, onClose });

  if (!mounted) return null;

  const overlayZ = 40 + stackLevel * 20;
  const panelZ = overlayZ + 5;
  const stacked = stackLevel > 0;
  const show = visible && !exiting;

  return createPortal(
    <div className="crm-root">
      <div
        className={cn(
          'crm-drawer-overlay',
          show && 'is-visible',
          exiting && 'is-exiting',
          stacked && 'is-stacked',
        )}
        style={{ zIndex: overlayZ }}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        className={cn(
          'crm-drawer-panel crm-scroll',
          WIDTHS[size] || WIDTHS.md,
          show && 'is-visible',
          exiting && 'is-exiting',
          stacked && 'is-stacked',
          className,
        )}
        style={{ zIndex: panelZ }}
      >
        {(title || subtitle || badge || headerActions) && (
          <div className="crm-drawer-header">
            <div className="min-w-0 flex-1 pr-2">
              <div className="flex items-center gap-2 flex-wrap">
                {title && (
                  <h2 id={titleId} className="crm-drawer-title">
                    {title}
                  </h2>
                )}
                {badge}
              </div>
              {subtitle && <p className="crm-drawer-subtitle">{subtitle}</p>}
            </div>
            {headerActions && <div className="flex items-center gap-2 shrink-0">{headerActions}</div>}
            <button type="button" onClick={onClose} className="crm-drawer-close" aria-label="Close">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="crm-drawer-body">{children}</div>

        {footer && <div className="crm-drawer-footer">{footer}</div>}
      </aside>
    </div>,
    document.body,
  );
}

