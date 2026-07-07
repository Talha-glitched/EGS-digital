import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export function useSpotlightDeepLink({
  recordType,
  onOpen,
  findRecord,
  resolveRecord,
  ready = true,
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const onOpenRef = useRef(onOpen);
  const findRecordRef = useRef(findRecord);
  const resolveRecordRef = useRef(resolveRecord);
  const handledKeyRef = useRef('');

  onOpenRef.current = onOpen;
  findRecordRef.current = findRecord;
  resolveRecordRef.current = resolveRecord;

  useEffect(() => {
    const state = location.state;
    if (!ready || !state?.fromSpotlight || state.recordType !== recordType || !state.recordId) return;

    const recordId = String(state.recordId);
    const key = `${location.key}:${recordType}:${recordId}`;
    if (handledKeyRef.current === key) return;

    let cancelled = false;

    (async () => {
      let record = findRecordRef.current?.(recordId) || null;
      if (!record && resolveRecordRef.current) {
        try {
          record = await resolveRecordRef.current(recordId);
        } catch {
          record = null;
        }
      }
      if (cancelled) return;

      handledKeyRef.current = key;
      if (record) onOpenRef.current(record);
      navigate(`${location.pathname}${location.search}`, { replace: true, state: null });
    })();

    return () => {
      cancelled = true;
    };
  }, [location.state, location.pathname, location.search, location.key, recordType, navigate, ready]);
}
