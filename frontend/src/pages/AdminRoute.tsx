import { Component, lazy, Suspense, type ReactNode } from 'react';
import { Container } from '../components/Container';
import { usePageMeta } from '../lib/usePageMeta';
import { adminMeta } from '../lib/pageMeta';

const AdminApp = lazy(() => import('./admin/AdminApp'));

// Shown before or instead of the admin bundle, so only the site's own styles apply. Spanish, like the Admin.
function AdminLoading() {
  return <section className="planned-page"><Container><p className="eyebrow" role="status">Cargando el panel…</p></Container></section>;
}

function AdminUnavailable() {
  return <section className="planned-page" role="alert">
    <Container>
      <p className="eyebrow">GP SELECT · Admin</p>
      <h1>No se ha podido abrir el panel.</h1>
      <p>Puede deberse a un corte de la conexión o a una actualización de la web. Recarga la página para intentarlo de nuevo.</p>
      <div className="planned-page__actions">
        <button type="button" className="button button--dark" onClick={() => window.location.reload()}><span>Recargar</span></button>
        <a className="button button--outline" href="/"><span>Volver a la web</span></a>
      </div>
    </Container>
  </section>;
}

/** A failed download of the admin bundle (or an error inside it) offers a way back instead of the router's error page. */
class AdminBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <AdminUnavailable /> : this.props.children; }
}

export function AdminRoute() {
  usePageMeta(adminMeta);
  return <AdminBoundary><Suspense fallback={<AdminLoading />}><AdminApp /></Suspense></AdminBoundary>;
}
