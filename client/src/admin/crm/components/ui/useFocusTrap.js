import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])';

/**
 * Traps focus inside `panelRef` while `active`, restores focus to the
 * previously focused element on close, and calls `onClose` on Escape.
 * Shared by Modal and Drawer so every overlay in the stack behaves the same way.
 */
export function useFocusTrap(panelRef, { active, onClose }) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!active) return undefined;

    const previousFocus = document.activeElement;
    const panel = panelRef.current;
    const firstInput = panel?.querySelector('input:not([disabled]), textarea:not([disabled]), select:not([disabled])');
    const firstFocusable = panel?.querySelector(FOCUSABLE_SELECTOR);
    (firstInput || firstFocusable || panel)?.focus();

    return () => {
      previousFocus?.focus?.();
    };
  }, [active, panelRef]);

  useEffect(() => {
    if (!active) return undefined;
    const panel = panelRef.current;

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current?.();
        return;
      }
      if (event.key !== 'Tab' || !panel) return;
      const focusable = [...panel.querySelectorAll(FOCUSABLE_SELECTOR)];
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
  }, [active, panelRef]);
}
