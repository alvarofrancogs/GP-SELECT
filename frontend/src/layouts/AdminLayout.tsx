import { useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../components/admin/adminAuth';
import { adminCopy } from '../i18n/adminCopy';

export function AdminLayout() {
  const { state } = useAdminAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, [pathname]);

  return <div className="admin">
    <a className="skip-link" href="#admin-main">Saltar al contenido</a>
    <header className="admin-header">
      <Link to="/admin" className="admin-brand">{adminCopy.brand}<span aria-hidden="true">/</span><span className="admin-brand__area">{adminCopy.area}</span></Link>
      <nav className="admin-header__actions" aria-label={adminCopy.area}>
        <Link to="/" className="admin-link">{adminCopy.backToSite}<span aria-hidden="true">→</span></Link>
        {/* Leaving through the router lets an editor with unsaved changes ask first. */}
        {state.status === 'authenticated' ? <button type="button" className="admin-link" onClick={() => navigate('/admin/login', { state: { signOut: true } })}>{adminCopy.logout}</button> : null}
      </nav>
    </header>
    <main id="admin-main" className="admin-main" tabIndex={-1}><Outlet /></main>
  </div>;
}
