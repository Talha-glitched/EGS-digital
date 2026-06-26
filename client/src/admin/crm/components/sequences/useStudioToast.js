import { useCallback, useState } from 'react';

export function useStudioToast() {
  const [toast, setToast] = useState({ message: '', tone: 'success' });

  const showToast = useCallback((message, tone = 'success') => {
    if (!message) {
      setToast({ message: '', tone: 'success' });
      return;
    }
    setToast({ message, tone });
  }, []);

  const dismissToast = useCallback(() => {
    setToast({ message: '', tone: 'success' });
  }, []);

  return { toast, showToast, dismissToast };
}
