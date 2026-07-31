import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from './primitives.jsx';
import { useBodyScrollLock } from './useBodyScrollLock.js';
import { useOverlayTransition } from './useOverlayTransition.js';

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
  size = 'md',
  stackLevel = 0,
  className = '',
}) {
  const effectiveOpen = open !== undefined ? open : isOpen;
  const panelRef = useRef(null);
  const onCloseRef = useRef(onClose);
  const { mounted, visible, exiting } = useOverlayTransition(effectiveOpen);
  useBodyScrollLock(mounted);

  onCloseRef.current = onClose;

  useEffect(() => {
    if (!mounted || exiting) return undefined;
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current?.();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [mounted, exiting]);

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
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'crm-drawer-title' : undefined}
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
        {(title || subtitle) && (
          <div className="crm-drawer-header">
            <div className="min-w-0 flex-1 pr-2">
              {title && (
                <h2 id="crm-drawer-title" className="crm-drawer-title">
                  {title}
                </h2>
              )}
              {subtitle && <p className="crm-drawer-subtitle">{subtitle}</p>}
            </div>
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
