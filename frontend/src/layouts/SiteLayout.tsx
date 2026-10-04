import { useEffect, useLayoutEffect, useRef } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { CatalogueCta } from '../components/CatalogueCta';
import { Preloader } from '../components/Preloader';
import { useLanguage } from '../i18n/useLanguage';
import { siteUrl, usePageMeta } from '../lib/usePageMeta';
import { getStaticPageMeta, legalPageMeta, notFoundMeta, staticPageMeta } from '../lib/pageMeta';

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

export function SiteLayout() {
  const { pathname } = useLocation();
  const { copy, locale } = useLanguage();
  const navigate = useNavigate();
  const mainRef = useRef<HTMLElement>(null);
  const exitRef = useRef<Animation[]>([]);

  useLayoutEffect(() => () => {
    exitRef.current.forEach((animation) => animation.cancel());
    exitRef.current = [];
  }, [pathname]);

  async function openCatalogue(link: HTMLAnchorElement) {
    if (exitRef.current.length) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      void navigate('/vehiculos');
      return;
    }
    // Opacity never changes the containing block of the Home's fixed pins.
    const elements = [mainRef.current, link].filter((element): element is HTMLElement => element !== null);
    const animations = elements.map((element) => element.animate(
      [{ opacity: getComputedStyle(element).opacity }, { opacity: 0 }],
      { duration: 160, easing: 'ease-out', fill: 'forwards' },
    ));
    exitRef.current = animations;
    link.setAttribute('aria-disabled', 'true');
    try {
      await Promise.all(animations.map((animation) => animation.finished));
      void navigate('/vehiculos');
    } catch { /* Another navigation cancels the pending exit. */ }
    finally { link.removeAttribute('aria-disabled'); }
  }

  // Detail owns its metadata while loading, on error and once its public data arrives.
  const pageTitles: Record<string, string> = {
    '/nosotros': copy.nav.about, '/vehiculos': copy.nav.vehicles, '/importacion': copy.nav.import, '/contacto': copy.nav.contact,
  };
  // The router ignores case and a trailing slash (/NOSOTROS/ renders Nosotros), so the title lookup does too.
  const route = pathname.toLowerCase().replace(/\/+$/, '') || '/';
  const isDetail = /^\/vehiculos\/[^/]+$/.test(route);
  const meta = route in staticPageMeta ? getStaticPageMeta(route, siteUrl)
    : route in legalPageMeta ? { ...legalPageMeta[route], path: route } : notFoundMeta;
  const translatedTitle = route in pageTitles ? `${pageTitles[route]} · GP SELECT` : undefined;
  usePageMeta(isDetail || route === '/servicios' ? null : {
    ...meta,
    tabTitle: route in staticPageMeta || route in legalPageMeta
      ? (locale === 'en' ? translatedTitle : undefined)
      : `${copy.notFound.title} · GP SELECT`,
  });

  return (
    <div className="site-layout">
      <a className="skip-link" href="#main-content">{copy.common.skipContent}</a>
      <Preloader />
      <ScrollReset />
      <Header key={pathname} />
      <main ref={mainRef} key={`page:${pathname}`} id="main-content" tabIndex={-1}><Outlet /></main>
      <Footer />
      <CatalogueCta onNavigate={(link) => void openCatalogue(link)} />
    </div>
  );
}
