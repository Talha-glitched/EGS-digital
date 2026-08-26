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
  ExhibitionStandContractorDubaiPage,
  ExhibitionStandBuilderDubaiPage,
  ExhibitionStandDesignDubaiPage,
  CustomExhibitionStandsDubaiPage,
  PosDisplayStandsDubaiPage,
  SignageManufacturerDubaiPage,
  GraduationStageSetupUaePage,
  ExhibitionStandContractorAbuDhabiPage,
  ExhibitionStandContractorRiyadhPage,
  GitexExhibitionStandsPage,
  ArabHealthExhibitionStandsPage,
  GulfoodExhibitionStandsPage,
  ExhibitionStandCostDubaiGuidePage,
  DwtcStandGuidelinesPage,
} from './pages/index.js';
import AdminCrmPage from './pages/AdminCrmPage.jsx';

export default function App() {
  return (
    <InquiryModalProvider>
      <Routes>
        {/* Core Hub Pages */}
        <Route path="/" element={<HomePage />} />
        <Route path="/exhibitions" element={<ExhibitionsPage />} />
        <Route path="/events" element={<EventsPage />} />
        <Route path="/fitouts" element={<FitoutsPage />} />
        <Route path="/retail" element={<RetailPage />} />
        <Route path="/case-studies" element={<CaseStudiesPage />} />
        <Route path="/graduation-portfolio" element={<GraduationPortfolioPage />} />
        <Route path="/portfolio-fable" element={<PortfolioFablePage />} />

        {/* Offers */}
        <Route path="/offers" element={<OffersPage />} />
        <Route path="/offers-v2" element={<OffersV2Page />} />
        <Route path="/exhibition-offers" element={<OffersPage />} />
        <Route path="/exhibition-offers-v2" element={<OffersV2Page />} />

        {/* Tier 1: Commercial Exhibition Money Pages */}
        <Route path="/exhibition-stand-contractor-dubai" element={<ExhibitionStandContractorDubaiPage />} />
        <Route path="/exhibition-stand-builder-dubai" element={<ExhibitionStandBuilderDubaiPage />} />
        <Route path="/exhibition-stand-design-dubai" element={<ExhibitionStandDesignDubaiPage />} />
        <Route path="/custom-exhibition-stands-dubai" element={<CustomExhibitionStandsDubaiPage />} />

        {/* Tier 2: Sub-Service Silos */}
        <Route path="/pos-display-stands-dubai" element={<PosDisplayStandsDubaiPage />} />
        <Route path="/signage-manufacturer-dubai" element={<SignageManufacturerDubaiPage />} />
        <Route path="/graduation-stage-setup-uae" element={<GraduationStageSetupUaePage />} />

        {/* Tier 3: Location Hubs */}
        <Route path="/exhibition-stand-contractor-abu-dhabi" element={<ExhibitionStandContractorAbuDhabiPage />} />
        <Route path="/exhibition-stand-contractor-riyadh" element={<ExhibitionStandContractorRiyadhPage />} />

        {/* Tier 4: Major Event Hubs */}
        <Route path="/events/gitex-exhibition-stands" element={<GitexExhibitionStandsPage />} />
        <Route path="/events/arab-health-exhibition-stands" element={<ArabHealthExhibitionStandsPage />} />
        <Route path="/events/gulfood-exhibition-stands" element={<GulfoodExhibitionStandsPage />} />

        {/* Tier 5: High-Intent Buyer Guides */}
        <Route path="/guides/exhibition-stand-cost-dubai" element={<ExhibitionStandCostDubaiGuidePage />} />
        <Route path="/guides/dwtc-stand-guidelines" element={<DwtcStandGuidelinesPage />} />

        {/* Admin & Legacy Redirects */}
        <Route path="/admin" element={<Navigate to="/admin/crm" replace />} />
        <Route path="/admin/crm/*" element={<AdminCrmPage />} />
        <Route path="/admin/email-campaigns" element={<Navigate to="/admin/crm" replace />} />
        <Route path="/hct-case-study" element={<Navigate to="/case-studies#hct-graduation-program" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </InquiryModalProvider>
  );
}
