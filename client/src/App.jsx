import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { InquiryModalProvider } from './context/InquiryModalContext.jsx';
import HomePage from './pages/HomePage.jsx';

// Route-level code-splitting: secondary pages loaded on-demand
const ExhibitionsPage = lazy(() => import('./pages/ExhibitionsPage.jsx'));
const EventsPage = lazy(() => import('./pages/EventsPage.jsx'));
const FitoutsPage = lazy(() => import('./pages/FitoutsPage.jsx'));
const RetailPage = lazy(() => import('./pages/RetailPage.jsx'));
const CaseStudiesPage = lazy(() => import('./pages/CaseStudiesPage.jsx'));
const CaseStudyDetailPage = lazy(() => import('./pages/CaseStudyDetailPage.jsx'));
const GraduationPortfolioPage = lazy(() => import('./pages/GraduationPortfolioPage.jsx'));
const PortfolioFablePage = lazy(() => import('./pages/PortfolioFablePage.jsx'));
const OffersPage = lazy(() => import('./pages/OffersPage.jsx'));
const OffersV2Page = lazy(() => import('./pages/OffersV2Page.jsx'));

// Tier 1: Commercial Exhibition Money Pages
const ExhibitionStandContractorDubaiPage = lazy(() => import('./pages/ExhibitionStandContractorDubaiPage.jsx'));
const ExhibitionStandBuilderDubaiPage = lazy(() => import('./pages/ExhibitionStandBuilderDubaiPage.jsx'));
const ExhibitionStandDesignDubaiPage = lazy(() => import('./pages/ExhibitionStandDesignDubaiPage.jsx'));
const CustomExhibitionStandsDubaiPage = lazy(() => import('./pages/CustomExhibitionStandsDubaiPage.jsx'));

// Tier 2: Sub-Service Silos
const PosDisplayStandsDubaiPage = lazy(() => import('./pages/PosDisplayStandsDubaiPage.jsx'));
const SignageManufacturerDubaiPage = lazy(() => import('./pages/SignageManufacturerDubaiPage.jsx'));
const GraduationStageSetupUaePage = lazy(() => import('./pages/GraduationStageSetupUaePage.jsx'));

// Tier 3: Location Hubs
const ExhibitionStandContractorAbuDhabiPage = lazy(() => import('./pages/ExhibitionStandContractorAbuDhabiPage.jsx'));
const ExhibitionStandContractorRiyadhPage = lazy(() => import('./pages/ExhibitionStandContractorRiyadhPage.jsx'));

// Venue Hubs
const DwtcStandBuilderPage = lazy(() => import('./pages/venues/DwtcStandBuilderPage.jsx'));
const AdnecStandBuilderPage = lazy(() => import('./pages/venues/AdnecStandBuilderPage.jsx'));
const DecStandBuilderPage = lazy(() => import('./pages/venues/DecStandBuilderPage.jsx'));

// Tier 4: Major Event Hubs
const GitexExhibitionStandsPage = lazy(() => import('./pages/GitexExhibitionStandsPage.jsx'));
const ArabHealthExhibitionStandsPage = lazy(() => import('./pages/ArabHealthExhibitionStandsPage.jsx'));
const GulfoodExhibitionStandsPage = lazy(() => import('./pages/GulfoodExhibitionStandsPage.jsx'));
const AdipecStandContractorPage = lazy(() => import('./pages/events/AdipecStandContractorPage.jsx'));
const Big5ExhibitionStandsPage = lazy(() => import('./pages/events/Big5ExhibitionStandsPage.jsx'));

// Tier 5: High-Intent Guides & Yearly Archives
const ExhibitionStandCostDubaiGuidePage = lazy(() => import('./pages/ExhibitionStandCostDubaiGuidePage.jsx'));
const DwtcStandGuidelinesPage = lazy(() => import('./pages/DwtcStandGuidelinesPage.jsx'));
const GraduationYearPage = lazy(() => import('./pages/GraduationYearPage.jsx'));
const BlogHubPage = lazy(() => import('./pages/BlogHubPage.jsx'));
const BlogDetailPage = lazy(() => import('./pages/BlogDetailPage.jsx'));

// Admin CRM (isolated: keeps SheetJS / xlsx out of the public marketing bundle)
const AdminCrmPage = lazy(() => import('./pages/AdminCrmPage.jsx'));

export default function App() {
  return (
    <InquiryModalProvider>
      <Suspense fallback={null}>
        <Routes>
        {/* Core Hub Pages */}
        <Route path="/" element={<HomePage />} />
        <Route path="/exhibitions" element={<ExhibitionsPage />} />
        <Route path="/events" element={<EventsPage />} />
        <Route path="/fitouts" element={<FitoutsPage />} />
        <Route path="/retail" element={<RetailPage />} />
        <Route path="/case-studies" element={<CaseStudiesPage />} />
        <Route path="/case-studies/:slug" element={<CaseStudyDetailPage />} />
        <Route path="/graduation-portfolio" element={<GraduationPortfolioPage />} />
        <Route path="/portfolio-fable" element={<PortfolioFablePage />} />

        {/* Graduation Yearly Archives */}
        <Route path="/graduation-ceremonies-2025" element={<GraduationYearPage />} />
        <Route path="/graduation-ceremonies-2024" element={<GraduationYearPage />} />
        <Route path="/graduation-ceremonies-2023" element={<GraduationYearPage />} />
        <Route path="/graduation-ceremonies/:year" element={<GraduationYearPage />} />

        {/* Blog Knowledge Hub & Articles */}
        <Route path="/blog" element={<BlogHubPage />} />
        <Route path="/blog/:slug" element={<BlogDetailPage />} />

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

        {/* Venue Authority Hubs */}
        <Route path="/venues/dwtc-exhibition-stand-builder" element={<DwtcStandBuilderPage />} />
        <Route path="/venues/adnec-exhibition-stand-builder" element={<AdnecStandBuilderPage />} />
        <Route path="/venues/dubai-exhibition-centre-stand-builder" element={<DecStandBuilderPage />} />

        {/* Tier 4: Major Event Hubs */}
        <Route path="/events/gitex-exhibition-stands" element={<GitexExhibitionStandsPage />} />
        <Route path="/events/arab-health-exhibition-stands" element={<ArabHealthExhibitionStandsPage />} />
        <Route path="/events/gulfood-exhibition-stands" element={<GulfoodExhibitionStandsPage />} />
        <Route path="/events/adipec-stand-contractor" element={<AdipecStandContractorPage />} />
        <Route path="/events/big-5-exhibition-stands" element={<Big5ExhibitionStandsPage />} />

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
      </Suspense>
    </InquiryModalProvider>
  );
}
