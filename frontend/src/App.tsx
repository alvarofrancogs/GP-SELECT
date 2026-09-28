import { Route, Routes } from 'react-router-dom';
import { SiteLayout } from './layouts/SiteLayout';
import { Home } from './pages/Home';
import { PlannedPage } from './pages/PlannedPage';

export function App() {
  return (
    <Routes>
      <Route element={<SiteLayout />}>
        <Route index element={<Home />} />
        <Route path="vehiculos" element={<PlannedPage page="vehicles" />} />
        <Route path="vehiculos/:slug" element={<PlannedPage page="vehicles" />} />
        <Route path="importacion" element={<PlannedPage page="import" />} />
        <Route path="servicios" element={<PlannedPage page="services" />} />
        <Route path="nosotros" element={<PlannedPage page="about" />} />
        <Route path="contacto" element={<PlannedPage page="contact" />} />
        <Route path="admin" element={<PlannedPage page="admin" />} />
        <Route path="*" element={<PlannedPage />} />
      </Route>
    </Routes>
  );
}
