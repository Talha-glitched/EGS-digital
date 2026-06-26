import { useEffect } from 'react';

let lockCount = 0;

export function useBodyScrollLock(active) {
  useEffect(() => {
    if (!active) return undefined;
    lockCount += 1;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      lockCount = Math.max(0, lockCount - 1);
      if (lockCount === 0) document.body.style.overflow = prev;
    };
  }, [active]);
}
