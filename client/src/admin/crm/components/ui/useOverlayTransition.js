import { useEffect, useRef, useState } from 'react';

export const OVERLAY_ENTER_MS = 300;
export const OVERLAY_EXIT_MS = 260;

export function useOverlayTransition(open, { enterMs = OVERLAY_ENTER_MS, exitMs = OVERLAY_EXIT_MS } = {}) {
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);
  const openRef = useRef(open);

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  useEffect(() => {
    if (open) {
      setMounted(true);
      setExiting(false);
      setVisible(false);
      const enterTimer = window.setTimeout(() => setVisible(true), 16);
      return () => clearTimeout(enterTimer);
    }

    if (!mounted) return undefined;

    setVisible(false);
    setExiting(true);
    const exitTimer = window.setTimeout(() => {
      if (!openRef.current) {
        setMounted(false);
        setExiting(false);
      }
    }, exitMs);

    return () => clearTimeout(exitTimer);
  }, [open, mounted, exitMs]);

  return { mounted, visible, exiting, enterMs, exitMs };
}
