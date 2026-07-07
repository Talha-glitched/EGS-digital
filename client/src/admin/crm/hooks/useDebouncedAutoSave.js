import { useCallback, useEffect, useRef, useState } from 'react';

const CLOSE_WAIT_MS = 30000;

export function useDebouncedAutoSave({
  snapshot,
  onSave,
  enabled = true,
  delayMs = 450,
  resetKey,
}) {
  const [status, setStatus] = useState('idle');
  const [closingNotice, setClosingNotice] = useState(false);
  const readyRef = useRef(false);
  const versionRef = useRef(0);
  const timerRef = useRef(null);
  const onSaveRef = useRef(onSave);
  const snapshotRef = useRef(snapshot);
  const statusRef = useRef('idle');
  const inFlightRef = useRef(null);

  onSaveRef.current = onSave;
  snapshotRef.current = snapshot;

  const setStatusSafe = useCallback((next) => {
    statusRef.current = next;
    setStatus(next);
  }, []);

  const runSave = useCallback(async (data, version) => {
    setStatusSafe('saving');
    const promise = onSaveRef.current(data);
    inFlightRef.current = promise;
    try {
      await promise;
      if (versionRef.current === version) {
        setStatusSafe('saved');
      }
    } catch (err) {
      if (versionRef.current === version) {
        setStatusSafe('error');
      }
      throw err;
    } finally {
      if (inFlightRef.current === promise) {
        inFlightRef.current = null;
      }
    }
  }, [setStatusSafe]);

  useEffect(() => {
    readyRef.current = false;
    setStatusSafe('idle');
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, [resetKey, setStatusSafe]);

  useEffect(() => {
    if (!enabled) {
      readyRef.current = false;
      setStatusSafe('idle');
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return undefined;
    }

    if (!readyRef.current) {
      readyRef.current = true;
      return undefined;
    }

    setStatusSafe('pending');
    const version = versionRef.current + 1;
    versionRef.current = version;

    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      runSave(snapshotRef.current, version).catch(() => {});
    }, delayMs);

    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [snapshot, enabled, delayMs, runSave, setStatusSafe]);

  const flush = useCallback(async () => {
    if (!enabled) return;
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const version = versionRef.current + 1;
    versionRef.current = version;
    await runSave(snapshotRef.current, version);
  }, [enabled, runSave]);

  const requestClose = useCallback(async (onClose) => {
    const needsSave = statusRef.current === 'pending' || statusRef.current === 'saving';

    if (!needsSave) {
      onClose?.();
      return;
    }

    setClosingNotice(true);
    const startedAt = Date.now();

    try {
      if (statusRef.current === 'pending' || statusRef.current === 'saving') {
        await flush();
      }

      while (
        (statusRef.current === 'pending' || statusRef.current === 'saving')
        && Date.now() - startedAt < CLOSE_WAIT_MS
      ) {
        await new Promise((resolve) => window.setTimeout(resolve, 60));
        if (statusRef.current === 'pending') {
          await flush();
        } else if (inFlightRef.current) {
          await inFlightRef.current.catch(() => {});
        }
      }

      onClose?.();
    } catch {
      // Stay open if save failed so the user can retry.
    } finally {
      setClosingNotice(false);
    }
  }, [flush]);

  const isUnsaved = status === 'pending' || status === 'saving';

  return {
    status,
    closingNotice,
    requestClose,
    flush,
    isUnsaved,
  };
}
