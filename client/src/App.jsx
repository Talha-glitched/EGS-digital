import { Navigate, Route, Routes } from 'react-router-dom';
import {
  EventsPage,
  ExhibitionsPage,
  FitoutsPage,
  HctCaseStudyPage,
  HomePage,
  RetailPage,
} from './pages/index.js';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/exhibitions" element={<ExhibitionsPage />} />
      <Route path="/events" element={<EventsPage />} />
      <Route path="/fitouts" element={<FitoutsPage />} />
      <Route path="/retail" element={<RetailPage />} />
      <Route path="/hct-case-study" element={<HctCaseStudyPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
