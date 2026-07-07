import { Lock } from 'lucide-react';
import { useSensitiveData } from '../../context/SensitiveDataContext.jsx';
import { maskSensitiveValue } from '../../constants/sensitiveData.js';

export default function SensitiveDataDisplay({
  value = '',
  kind = 'text',
  className = '',
  emptyLabel = 'Not set',
}) {
  const { isUnlocked, requestUnlock } = useSensitiveData();
  const text = String(value || '').trim();

  if (isUnlocked) {
    return (
      <span className={className}>{text || emptyLabel}</span>
    );
  }

  return (
    <button
      type="button"
      className={`crm-sensitive-inline ${className}`}
      onClick={requestUnlock}
      title="Unlock to view"
    >
      <span>{text ? maskSensitiveValue(text, kind) : emptyLabel}</span>
      <Lock className="h-3 w-3 shrink-0 opacity-60" />
    </button>
  );
}
