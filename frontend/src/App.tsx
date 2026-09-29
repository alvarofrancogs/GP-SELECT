import { Navigate, Route, Routes } from 'react-router-dom';
import { SiteLayout } from './layouts/SiteLayout';
import { Home } from './pages/Home';
import { PlannedPage } from './pages/PlannedPage';
import { About } from './pages/About';
import { Import } from './pages/Import';
import { Contact } from './pages/Contact';

export function App() {
  return (
    <Routes>
      <Route element={<SiteLayout />}>
        <Route index element={<Home />} />
        <Route path="vehiculos" element={<PlannedPage page="vehicles" />} />
        <Route path="vehiculos/:slug" element={<PlannedPage page="vehicles" />} />
        <Route path="importacion" element={<Import />} />
        <Route path="servicios" element={<Navigate to="/importacion" replace />} />
        <Route path="nosotros" element={<About />} />
        <Route path="contacto" element={<Contact />} />
        <Route path="admin" element={<PlannedPage page="admin" />} />
        <Route path="*" element={<PlannedPage />} />
      </Route>
    </Routes>
  );
}
