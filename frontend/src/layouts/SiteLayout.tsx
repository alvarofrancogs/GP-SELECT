import { useEffect, useLayoutEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { CatalogueCta } from '../components/CatalogueCta';
import { Preloader } from '../components/Preloader';
import { useLanguage } from '../i18n/useLanguage';
import { useDocumentTitle } from '../lib/useDocumentTitle';

/** Resets the scroll before the page below creates its pins. Layout effects run in tree order, so this
    must sit before <main>: otherwise the Home would be built (and painted) at the previous page's scroll. */
function ScrollReset() {
  const { pathname } = useLocation();
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    ScrollTrigger.clearScrollMemory();
  }, [pathname]);
  // After a client-side navigation keyboard focus would be lost to <body>: move it to the new page.
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    document.getElementById('main-content')?.focus({ preventScroll: true });
  }, [pathname]);
  return null;
}

const BRAND = 'GP SELECT';

export function SiteLayout() {
  const { pathname } = useLocation();
  const { copy } = useLanguage();

  // One title per route. A vehicle detail sets its own (the vehicle's name), so it is left alone here.
  const pageTitles: Record<string, string> = {
    '/nosotros': copy.nav.about, '/vehiculos': copy.nav.vehicles, '/importacion': copy.nav.import, '/contacto': copy.nav.contact,
  };
  // The router ignores case and a trailing slash (/NOSOTROS/ renders Nosotros), so the title lookup does too.
  const route = pathname.toLowerCase().replace(/\/+$/, '') || '/';
  const known = route === '/' || route === '/servicios' || route in pageTitles || route.startsWith('/vehiculos/');
  const pageTitle = route in pageTitles ? pageTitles[route] : known ? null : copy.notFound.title;
  useDocumentTitle(pageTitle ? `${pageTitle} · ${BRAND}` : null);

  return (
    <div className="site-layout">
      <a className="skip-link" href="#main-content">{copy.common.skipContent}</a>
      <Preloader />
      <ScrollReset />
      <Header key={pathname} />
      <main key={`page:${pathname}`} id="main-content" tabIndex={-1}><Outlet /></main>
      <Footer />
      <CatalogueCta />
    </div>
  );
}
