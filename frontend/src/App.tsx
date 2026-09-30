import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { SiteLayout } from './layouts/SiteLayout';
import { Home } from './pages/Home';
import { NotFound } from './pages/NotFound';
import { About } from './pages/About';
import { Import } from './pages/Import';
import { Contact } from './pages/Contact';
import { Vehicles } from './pages/Vehicles';
import { VehicleDetail } from './pages/VehicleDetail';

const AdminApp = lazy(() => import('./pages/admin/AdminApp'));

export function App() {
  return (
    <Routes>
      <Route element={<SiteLayout />}>
        <Route index element={<Home />} />
        <Route path="vehiculos" element={<Vehicles />} />
        <Route path="vehiculos/:slug" element={<VehicleDetail />} />
        <Route path="importacion" element={<Import />} />
        <Route path="servicios" element={<Navigate to="/importacion" replace />} />
        <Route path="nosotros" element={<About />} />
        <Route path="contacto" element={<Contact />} />
        <Route path="*" element={<NotFound />} />
      </Route>
      <Route path="admin/*" element={<Suspense fallback={null}><AdminApp /></Suspense>} />
    </Routes>
  );
}
