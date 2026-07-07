import { Lock } from 'lucide-react';
import { useSensitiveData } from '../../context/SensitiveDataContext.jsx';
import { maskSensitiveValue } from '../../constants/sensitiveData.js';

export default function SensitiveDataField({
  label,
  value = '',
  onChange,
  type = 'text',
  kind = 'text',
  placeholder,
  className = '',
}) {
  const { isUnlocked, requestUnlock } = useSensitiveData();
  const hasValue = Boolean(String(value || '').trim());

  if (isUnlocked) {
    return (
      <label className={`block space-y-1.5 ${className}`}>
        <span className="text-xs font-medium text-neutral-600">{label}</span>
        <input
          type={type}
          className="crm-input text-sm"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
        />
      </label>
    );
  }

  return (
    <div className={`block space-y-1.5 ${className}`}>
      <span className="text-xs font-medium text-neutral-600">{label}</span>
      <button
        type="button"
        className="crm-sensitive-field"
        onClick={requestUnlock}
      >
        <span className="crm-sensitive-field-value">
          {hasValue ? maskSensitiveValue(value, kind) : 'No value saved'}
        </span>
        <span className="crm-sensitive-field-action">
          <Lock className="h-3.5 w-3.5" />
          <span>{hasValue ? 'Unlock to view & edit' : 'Unlock to add'}</span>
        </span>
      </button>
    </div>
  );
}
