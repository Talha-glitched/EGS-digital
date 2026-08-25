import { Navigate, Route, Routes } from 'react-router-dom';
import { InquiryModalProvider } from './context/InquiryModalContext.jsx';
import {
  EventsPage,
  ExhibitionsPage,
  OffersPage,
  FitoutsPage,
  HomePage,
  RetailPage,
  CaseStudiesPage,
  GraduationPortfolioPage,
  PortfolioFablePage,
  OffersV2Page,
} from './pages/index.js';
import AdminCrmPage from './pages/AdminCrmPage.jsx';

export default function App() {
  return (
    <InquiryModalProvider>
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/exhibitions" element={<ExhibitionsPage />} />
      <Route path="/offers" element={<OffersPage />} />
      <Route path="/offers-v2" element={<OffersV2Page />} />
      <Route path="/exhibition-offers" element={<OffersPage />} />
      <Route path="/exhibition-offers-v2" element={<OffersV2Page />} />

      <Route path="/events" element={<EventsPage />} />
      <Route path="/graduation-portfolio" element={<GraduationPortfolioPage />} />
      <Route path="/portfolio-fable" element={<PortfolioFablePage />} />
      <Route path="/fitouts" element={<FitoutsPage />} />
      <Route path="/retail" element={<RetailPage />} />
      <Route path="/case-studies" element={<CaseStudiesPage />} />
      <Route path="/admin" element={<Navigate to="/admin/crm" replace />} />
      <Route path="/admin/crm/*" element={<AdminCrmPage />} />
      <Route path="/admin/email-campaigns" element={<Navigate to="/admin/crm" replace />} />
      <Route path="/hct-case-study" element={<Navigate to="/case-studies#hct-graduation-program" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </InquiryModalProvider>
  );
}
