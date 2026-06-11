import { Navigate, Route, Routes } from 'react-router-dom';
import { InquiryModalProvider } from './context/InquiryModalContext.jsx';
import {
  EventsPage,
  ExhibitionsPage,
  FitoutsPage,
  HomePage,
  RetailPage,
  CaseStudiesPage,
  GraduationPortfolioPage,
  PortfolioFablePage,
} from './pages/index.js';
import AdminEmailCampaignsPage from './pages/AdminEmailCampaignsPage.jsx';

export default function App() {
  return (
    <InquiryModalProvider>
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/exhibitions" element={<ExhibitionsPage />} />
      <Route path="/events" element={<EventsPage />} />
      <Route path="/graduation-portfolio" element={<GraduationPortfolioPage />} />
      <Route path="/portfolio-fable" element={<PortfolioFablePage />} />
      <Route path="/fitouts" element={<FitoutsPage />} />
      <Route path="/retail" element={<RetailPage />} />
      <Route path="/case-studies" element={<CaseStudiesPage />} />
      <Route path="/admin" element={<Navigate to="/admin/email-campaigns" replace />} />
      <Route path="/admin/email-campaigns" element={<AdminEmailCampaignsPage />} />
      <Route path="/hct-case-study" element={<Navigate to="/case-studies#hct-graduation-program" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </InquiryModalProvider>
  );
}
