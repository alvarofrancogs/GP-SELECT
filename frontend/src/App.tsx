import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { SiteLayout } from './layouts/SiteLayout';
import { Home } from './pages/Home';
import { NotFound } from './pages/NotFound';
import { About } from './pages/About';
import { Import } from './pages/Import';
import { Guide } from './pages/Guide';
import { Contact } from './pages/Contact';
import { Vehicles } from './pages/Vehicles';
import { VehicleDetail } from './pages/VehicleDetail';
import { LegalPage } from './pages/Legal';
import { AdminRoute } from './pages/AdminRoute';
import { LanguageProvider } from './i18n/LanguageProvider';
import { matchPage } from './i18n/routes';

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
          <Route path="*" element={<PublicPage />} />
        </Route>
        <Route path="admin/*" element={<AdminRoute />} />
      </Routes>
    </LanguageProvider>
  );
}
