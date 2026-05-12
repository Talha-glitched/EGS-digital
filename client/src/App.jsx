import { Navigate, Route, Routes } from 'react-router-dom';
import {
  EventsPage,
  ExhibitionsPage,
  FitoutsPage,
  HomePage,
  RetailPage,
  CaseStudiesPage,
  ContactPage,
} from './pages/index.js';
<<<<<<< HEAD
import AdminEmailCampaignsPage from './pages/AdminEmailCampaignsPage.jsx';
=======
>>>>>>> 67f76e82f1c21460e724886377eab7e0a3251f53

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/exhibitions" element={<ExhibitionsPage />} />
      <Route path="/events" element={<EventsPage />} />
      <Route path="/fitouts" element={<FitoutsPage />} />
      <Route path="/retail" element={<RetailPage />} />
      <Route path="/case-studies" element={<CaseStudiesPage />} />
      <Route path="/contact" element={<ContactPage />} />
<<<<<<< HEAD
      <Route path="/admin" element={<Navigate to="/admin/email-campaigns" replace />} />
      <Route path="/admin/email-campaigns" element={<AdminEmailCampaignsPage />} />
=======
>>>>>>> 67f76e82f1c21460e724886377eab7e0a3251f53
      <Route path="/hct-case-study" element={<Navigate to="/case-studies#hct-graduation-program" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
