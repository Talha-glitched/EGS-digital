import { useCallback, useEffect } from 'react';
import { useSensitiveData } from '../context/SensitiveDataContext.jsx';

export function useLockSensitiveDataOnClose(isOpen) {
  const { lockSensitiveData } = useSensitiveData();

  useEffect(() => {
    if (!isOpen) {
      lockSensitiveData();
    }
  }, [isOpen, lockSensitiveData]);

  const closeAndLock = useCallback(
    (onClose) => {
      lockSensitiveData();
      onClose?.();
    },
    [lockSensitiveData],
  );

  return { lockSensitiveData, closeAndLock };
}
