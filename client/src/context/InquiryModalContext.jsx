import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import InquiryModal from '../components/inquiry/InquiryModal.jsx';

const InquiryModalContext = createContext(null);

export function InquiryModalProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [defaultType, setDefaultType] = useState('general');

  const openInquiry = useCallback((type = 'general') => {
    setDefaultType(type);
    setIsOpen(true);
  }, []);

  const closeInquiry = useCallback(() => {
    setIsOpen(false);
  }, []);

  const value = useMemo(
    () => ({ openInquiry, closeInquiry, isOpen }),
    [openInquiry, closeInquiry, isOpen],
  );

  return (
    <InquiryModalContext.Provider value={value}>
      {children}
      <InquiryModal isOpen={isOpen} defaultType={defaultType} onClose={closeInquiry} />
    </InquiryModalContext.Provider>
  );
}

export function useInquiryModal() {
  const context = useContext(InquiryModalContext);
  if (!context) {
    throw new Error('useInquiryModal must be used within InquiryModalProvider');
  }
  return context;
}
