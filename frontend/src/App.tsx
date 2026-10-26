import { Suspense } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { SiteLayout } from './layouts/SiteLayout';
import { Home } from './pages/Home';
import { publicPages } from './lib/publicPages';
import { AdminRoute } from './pages/AdminRoute';
import { LanguageProvider } from './i18n/LanguageProvider';
import { matchPage } from './i18n/routes';

const About = publicPages.about.Page;
const Import = publicPages.import.Page;
const Guide = publicPages.guide.Page;
const Contact = publicPages.contact.Page;
const Appointments = publicPages.appointments.Page;
const Vehicles = publicPages.vehicles.Page;
const VehicleDetail = publicPages.vehicle.Page;
const LegalPage = publicPages.legal.Page;
const NotFound = publicPages.notFound.Page;

/** One route for every public address (src/i18n/routes.ts). The same element renders a page in either
    language, so switching language re-renders the page instead of mounting it again. */
function PublicPage() {
  const match = matchPage(useLocation().pathname);
  switch (match?.page) {
    case 'home': return <Home />;
    case 'vehicles': return <Vehicles />;
    case 'vehicle': return <VehicleDetail slug={match.slug ?? ''} />;
    case 'import': return <Import />;
    case 'guide': return <Guide />;
    case 'about': return <About />;
    case 'contact': return <Contact />;
    case 'appointments': return <Appointments />;
    case 'aviso-legal': case 'privacidad': case 'cookies': return <LegalPage doc={match.page} />;
    default: return <NotFound />;
  }
}

export function App() {
  return (
    <LanguageProvider>
      <Routes>
        <Route element={<SiteLayout />}>
          <Route path="servicios" element={<Navigate to="/importacion" replace />} />
          <Route path="*" element={<Suspense fallback={null}><PublicPage /></Suspense>} />
        </Route>
        <Route path="admin/*" element={<AdminRoute />} />
      </Routes>
    </LanguageProvider>
  );
}
