import { Navigate, Route, Routes } from 'react-router-dom';
import { AdminAuthProvider, RequireAdmin } from '../../components/admin/AdminAuthProvider';
import { AdminLayout } from '../../layouts/AdminLayout';
import { AdminLogin } from './AdminLogin';
import { AdminVehicles } from './AdminVehicles';
import { AdminNewVehicle } from './AdminNewVehicle';
import { AdminVehicleEditor } from './AdminVehicleEditor';
import { AdminPreview } from './AdminPreview';
import '../../styles/interiors.css';
import '../../styles/vehicles.css';
import '../../styles/admin.css';

/** Lazy-loaded admin area: the public bundle never carries it. */
export default function AdminApp() {
  return <AdminAuthProvider>
    <Routes>
      <Route element={<AdminLayout />}>
        <Route path="login" element={<AdminLogin />} />
        <Route element={<RequireAdmin />}>
          <Route index element={<AdminVehicles />} />
          <Route path="nuevo" element={<AdminNewVehicle />} />
          <Route path="vehiculos/:id" element={<AdminVehicleEditor />} />
          <Route path="vehiculos/:id/vista-previa" element={<AdminPreview />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Route>
      </Route>
    </Routes>
  </AdminAuthProvider>;
}
