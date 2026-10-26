import { useEffect, useLayoutEffect, useRef } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { CatalogueCta } from '../components/CatalogueCta';
import { ConsentBanner } from '../components/ConsentBanner';
import { GlassScrollbar } from '../components/GlassScrollbar';
import { Preloader } from '../components/Preloader';
import { useLanguage } from '../i18n/useLanguage';
import { siteUrl, usePageMeta } from '../lib/usePageMeta';
import { getStaticPageMeta, legalPageMeta, notFoundMeta, staticPageMeta } from '../lib/pageMeta';
import { localeOf, localizeHref, matchPage, pageKey, pagePath } from '../i18n/routes';
import { preloadPublicPage } from '../lib/publicPages';

/** Resets the scroll before the page below creates its pins. Layout effects run in tree order, so this
    must sit before <main>: otherwise the Home would be built (and painted) at the previous page's scroll. */
function ScrollReset() {
  // The page, not its address: switching language keeps the scroll where it was.
  const page = pageKey(useLocation().pathname);
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    ScrollTrigger.clearScrollMemory();
  }, [page]);
  // After a client-side navigation keyboard focus would be lost to <body>: move it to the new page.
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    document.getElementById('main-content')?.focus({ preventScroll: true });
  }, [page]);
  return null;
}

export function SiteLayout() {
  const { pathname } = useLocation();
  const { copy, locale, href } = useLanguage();
  const page = pageKey(pathname);
  const navigate = useNavigate();
  const mainRef = useRef<HTMLElement>(null);
  const exitRef = useRef<Animation[]>([]);

  useEffect(() => {
    // Delegation covers the header, footer and in-page links, including keyboard and touch intent.
    const preload = (event: Event) => {
      const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[href]') : null;
      if (!link || link.origin !== window.location.origin || link.hasAttribute('download')) return;
      void preloadPublicPage(link.pathname)?.catch(() => { /* Navigation can retry a failed preload. */ });
    };
    document.addEventListener('pointerover', preload, { passive: true });
    document.addEventListener('focusin', preload);
    document.addEventListener('touchstart', preload, { passive: true });
    return () => {
      document.removeEventListener('pointerover', preload);
      document.removeEventListener('focusin', preload);
      document.removeEventListener('touchstart', preload);
    };
  }, []);

  useLayoutEffect(() => () => {
    exitRef.current.forEach((animation) => animation.cancel());
    exitRef.current = [];
  }, [page]);

  async function openCatalogue(link: HTMLAnchorElement) {
    if (exitRef.current.length) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      void navigate(href('/vehiculos'));
      return;
    }
    // A cold tap can precede pointer intent. Keep the current page visible until the destination is ready,
    // then play exactly the existing exit; never leave a faded Home waiting for a network response.
    const from = pageKey(window.location.pathname);
    try { await preloadPublicPage(href('/vehiculos')); }
    catch { void navigate(href('/vehiculos')); return; }
    if (from !== pageKey(window.location.pathname) || exitRef.current.length) return;
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
      // The language may have switched during the fade: open the catalogue in the current one.
      void navigate(localizeHref('/vehiculos', localeOf(window.location.pathname)));
    } catch { /* Another navigation cancels the pending exit. */ }
    finally { link.removeAttribute('aria-disabled'); }
  }

  // Detail owns its metadata while loading, on error and once its public data arrives.
  // The router ignores case and a trailing slash (/NOSOTROS/ renders Nosotros), so the lookup does too.
  const match = matchPage(pathname);
  const route = match && match.page !== 'vehicle' ? pagePath(match.page, match.locale) : null;
  const meta = route && route in staticPageMeta ? getStaticPageMeta(route, siteUrl)
    : route && route in legalPageMeta ? { ...legalPageMeta[route], path: route }
      : { ...notFoundMeta[locale], tabTitle: `${copy.notFound.title} · GP SELECT` };
  usePageMeta(match?.page === 'vehicle' || /^\/servicios\/?$/i.test(pathname) ? null : meta);

  return (
    <div className="site-layout">
      <div className="safari-edge-guard safari-edge-guard--top" aria-hidden="true" />
      <div className="safari-edge-guard safari-edge-guard--bottom" aria-hidden="true" />
      <a className="skip-link" href="#main-content">{copy.common.skipContent}</a>
      <Preloader />
      <ScrollReset />
      <Header key={page} />
      <main ref={mainRef} key={`page:${page}`} id="main-content" tabIndex={-1}><Outlet /></main>
      <Footer />
      <CatalogueCta onNavigate={(link) => void openCatalogue(link)} />
      <GlassScrollbar />
      <ConsentBanner />
    </div>
  );
}
