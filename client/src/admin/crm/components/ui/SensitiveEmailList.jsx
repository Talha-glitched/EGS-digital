import { Plus, X, Lock } from 'lucide-react';
import { useSensitiveData } from '../../context/SensitiveDataContext.jsx';
import { maskEmail } from '../../constants/sensitiveData.js';

export default function SensitiveEmailList({
  emails = [],
  onChange,
  inputValue = '',
  onInputChange,
  onAdd,
}) {
  const { isUnlocked, requestUnlock } = useSensitiveData();

  if (!isUnlocked) {
    return (
      <div className="space-y-2">
        {emails.length > 0 ? (
          <ul className="space-y-2">
            {emails.map((email) => (
              <li key={email} className="crm-sensitive-field !py-2.5">
                <span className="crm-sensitive-field-value">{maskEmail(email)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-neutral-400">No generic emails yet.</p>
        )}
        <button type="button" className="crm-sensitive-unlock-btn" onClick={requestUnlock}>
          <Lock className="h-3.5 w-3.5" />
          Unlock to view & edit emails
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {emails.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {emails.map((email) => (
            <li
              key={email}
              className="inline-flex items-center gap-1 rounded-full border border-[var(--color-line)] bg-white px-2.5 py-1 text-xs font-medium text-neutral-700"
            >
              <span>{email}</span>
              <button
                type="button"
                className="rounded p-0.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
                onClick={() => onChange(emails.filter((item) => item !== email))}
                aria-label={`Remove ${email}`}
              >
                <X className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-neutral-400">No generic emails yet.</p>
      )}
      <div className="flex gap-2">
        <input
          type="email"
          className="crm-input text-sm"
          value={inputValue}
          onChange={(event) => onInputChange(event.target.value)}
          placeholder="info@company.com"
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              onAdd();
            }
          }}
        />
        <button type="button" className="crm-btn-secondary shrink-0 text-xs" onClick={onAdd}>
          <Plus className="h-3.5 w-3.5" />
          Add
        </button>
      </div>
    </div>
  );
}
