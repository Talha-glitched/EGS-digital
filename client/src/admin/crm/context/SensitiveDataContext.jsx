import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Lock } from 'lucide-react';
import { Modal } from '../components/ui/Modal.jsx';
import { SENSITIVE_DATA_PASSCODE, SENSITIVE_SESSION_KEY } from '../constants/sensitiveData.js';

const SensitiveDataContext = createContext(null);

function readSessionUnlock() {
  try {
    return sessionStorage.getItem(SENSITIVE_SESSION_KEY) === '1';
  } catch {
    return false;
  }
}

export function SensitiveDataProvider({ children }) {
  const [isUnlocked, setIsUnlocked] = useState(readSessionUnlock);
  const [modalOpen, setModalOpen] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    try {
      if (isUnlocked) sessionStorage.setItem(SENSITIVE_SESSION_KEY, '1');
      else sessionStorage.removeItem(SENSITIVE_SESSION_KEY);
    } catch {
      /* ignore */
    }
  }, [isUnlocked]);

  const requestUnlock = useCallback(() => {
    if (isUnlocked) return true;
    setPasscode('');
    setError('');
    setModalOpen(true);
    return false;
  }, [isUnlocked]);

  const verifyPasscode = useCallback(() => {
    if (passcode === SENSITIVE_DATA_PASSCODE) {
      setIsUnlocked(true);
      setModalOpen(false);
      setPasscode('');
      setError('');
      return true;
    }
    setError('Incorrect passcode. Try again.');
    return false;
  }, [passcode]);

  const lockSensitiveData = useCallback(() => {
    setIsUnlocked(false);
    setPasscode('');
    setError('');
  }, []);

  const value = useMemo(
    () => ({ isUnlocked, requestUnlock, lockSensitiveData }),
    [isUnlocked, requestUnlock, lockSensitiveData],
  );

  return (
    <SensitiveDataContext.Provider value={value}>
      {children}
      <Modal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setPasscode('');
          setError('');
        }}
        title="Unlock contact details"
        subtitle="Enter the admin passcode to view and edit emails and phone numbers."
        size="md"
        icon={Lock}
        footer={(
          <div className="flex justify-end gap-3">
            <button
              type="button"
              className="crm-btn-secondary"
              onClick={() => {
                setModalOpen(false);
                setPasscode('');
                setError('');
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              className="crm-btn-primary"
              onClick={verifyPasscode}
            >
              Unlock
            </button>
          </div>
        )}
      >
        <div className="space-y-3">
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-neutral-600">Admin passcode</span>
            <input
              type="password"
              className="crm-input text-sm"
              value={passcode}
              onChange={(event) => {
                setPasscode(event.target.value);
                if (error) setError('');
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  verifyPasscode();
                }
              }}
              autoComplete="off"
              placeholder="Enter passcode"
              autoFocus
            />
          </label>
          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
          <p className="text-xs leading-relaxed text-neutral-500">
            Sensitive contact data stays masked until unlocked. Access resets when you close or save a contact or company profile.
          </p>
        </div>
      </Modal>
    </SensitiveDataContext.Provider>
  );
}

export function useSensitiveData() {
  const context = useContext(SensitiveDataContext);
  if (!context) {
    throw new Error('useSensitiveData must be used within SensitiveDataProvider');
  }
  return context;
}
