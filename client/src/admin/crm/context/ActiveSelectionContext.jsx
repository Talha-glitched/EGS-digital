import { createContext, useContext, useMemo, useState } from 'react';

export const ActiveSelectionContext = createContext(null);

export function ActiveSelectionProvider({ children, initialSelection = {} }) {
  const [selection, setSelection] = useState({
    jobId: initialSelection.jobId || null,
    customerOrgId: initialSelection.customerOrgId || null,
    leadId: initialSelection.leadId || null,
    assignedUserId: initialSelection.assignedUserId || null,
    quoteId: initialSelection.quoteId || null,
    poId: initialSelection.poId || null,
    // Optional display metadata
    jobTitle: initialSelection.jobTitle || '',
    customerOrgName: initialSelection.customerOrgName || '',
    leadName: initialSelection.leadName || '',
    assignedUserName: initialSelection.assignedUserName || '',
    ...initialSelection,
  });

  const [activeAction, setActiveAction] = useState(null); // 'TASK' | 'NOTE' | 'REVISION' | 'ADD_PO' | 'ASSIGN_CREW' | null

  const updateSelection = (patch) => {
    setSelection((prev) => ({
      ...prev,
      ...patch,
    }));
  };

  const closeAction = () => {
    setActiveAction(null);
  };

  const value = useMemo(
    () => ({
      selection,
      setSelection,
      updateSelection,
      activeAction,
      setActiveAction,
      closeAction,
    }),
    [selection, activeAction]
  );

  return (
    <ActiveSelectionContext.Provider value={value}>
      {children}
    </ActiveSelectionContext.Provider>
  );
}

export function useActiveSelection() {
  const context = useContext(ActiveSelectionContext);
  if (!context) {
    throw new Error('useActiveSelection must be used within an ActiveSelectionProvider');
  }
  return context;
}
