import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useLanguage } from '../i18n/useLanguage';
import { LanguageSwitcher } from './LanguageSwitcher';
import { scrollToTop } from '../lib/scrollToTop';
import { footerCopy } from '../i18n/footerCopy';
import { matchPage, pageKey } from '../i18n/routes';

// Matches the curtain's closing transition in global.css: the page stays locked until it has lifted.
const MENU_CLOSE_MS = 420;
// Everything behind the open menu: out of the tab order and the accessibility tree while it covers them.
const BEHIND_MENU = '#main-content, .site-footer, .catalogue-cta, .skip-link';
// The Home's scroll scenes keep the see-through header, always on screen.
const SCENES = '#hero, #criterio, #coches';
// Scroll needed in one direction before the header hides or comes back (ignores jitter).
const QUICK_RETURN_PX = 8;

/** Tone of the full-width surface under the header line, or null over a scene. */
function surfaceAt(y: number): 'light' | 'dark' | null {
  const width = window.innerWidth;
  const top = document.elementsFromPoint(width / 2, y)
    .find((element) => !element.closest('.site-header, .header-backdrop, .catalogue-cta, .preloader'));
  if (!top || top.closest(SCENES)) return null;
  // Cards and photographs are not surfaces: only a full-width block with a solid colour counts.
  for (let node: Element | null = top; node; node = node.parentElement) {
    if (node.getBoundingClientRect().width < width * 0.9) continue;
    const [r, g, b, a = 1] = (getComputedStyle(node).backgroundColor.match(/[\d.]+/g) ?? []).map(Number);
    if (a === 0 || r === undefined) continue;
    return 0.2126 * r + 0.7152 * g + 0.0722 * b > 128 ? 'light' : 'dark';
  }
  return 'light';
}

export function Header() {
  const { copy, locale, href } = useLanguage();
  const [menuOpen, setMenuOpen] = useState(false);
  // Stays true while the curtain lifts, so the header keeps its menu colours until it is gone.
  const [menuShown, setMenuShown] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const { pathname } = useLocation();
  // The page whatever its language: switching language is not a new page for the header.
  const page = pageKey(pathname);
  const links = [
    { to: href('/nosotros'), label: copy.nav.about },
    { to: href('/vehiculos'), label: copy.nav.vehicles },
    { to: href('/importacion'), label: copy.nav.import },
    { to: href('/contacto'), label: copy.nav.contact },
  ];

  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;
    // Scenes that change colour under the header publish the tone it needs.
    const scenes = ['hero', 'coches']
      .map((id) => document.getElementById(id))
      .filter((scene): scene is HTMLElement => scene !== null);
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;
    function updateContrast() {
      if (!header) return;
      const source = scenes.find((scene) => scene.dataset.headerTone);
      if (source) {
        header.dataset.tone = source.dataset.headerTone;
        header.dataset.toneScene = source.id;
      } else {
        delete header.dataset.tone;
        delete header.dataset.toneScene;
      }
    }
    // Never cancel a pending frame: while a scrubbed scene keeps publishing its tone, that would
    // starve the update and leave the previous contrast on screen.
    function onScroll() {
      if (frame) return;
      frame = requestAnimationFrame(() => { frame = 0; updateContrast(); });
    }
    updateContrast();
    // Scrubbed scenes keep moving after the scroll stops, so follow their tone directly.
    const observer = new MutationObserver(onScroll);
    scenes.forEach((scene) => observer.observe(scene, { attributeFilter: ['data-header-tone'] }));
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    reducedMotion.addEventListener('change', onScroll);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      reducedMotion.removeEventListener('change', onScroll);
      delete header.dataset.tone;
      delete header.dataset.toneScene;
    };
  }, [page]);

  // Quick return: reading down the page the header slides away, so text never runs under the logo and
  // links; any scroll up brings it back over glass. Over the Home's scenes and at the top it stays.
  useEffect(() => {
    const header = headerRef.current;
    const backdrop = backdropRef.current;
    if (!header || !backdrop) return;
    let frame = 0;
    let lastY = window.scrollY;
    let goingDown = false;
    function set(element: HTMLElement, key: 'hidden' | 'glass', value: string | null) {
      if (value === null) delete element.dataset[key];
      else if (element.dataset[key] !== value) element.dataset[key] = value;
    }
    function update() {
      frame = 0;
      if (!header || !backdrop) return;
      const y = window.scrollY;
      if (Math.abs(y - lastY) >= QUICK_RETURN_PX) {
        goingDown = y > lastY;
        lastY = y;
      }
      const surface = surfaceAt(header.offsetHeight / 2);
      const pastTop = y > header.offsetHeight;
      // Never hidden over a scene, at the top or while keyboard focus is in it.
      const hidden = surface !== null && pastTop && goingDown && !header.contains(document.activeElement);
      const glass = surface !== null && pastTop ? surface : null;
      [header, backdrop].forEach((element) => {
        set(element, 'hidden', hidden ? '' : null);
        set(element, 'glass', glass);
      });
    }
    function schedule() {
      if (!frame) frame = requestAnimationFrame(update);
    }
    update();
    // Fonts, images and pins move the page under a still scroll position while it settles.
    const settle = window.setTimeout(schedule, 600);
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    header.addEventListener('focusin', schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(settle);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      header.removeEventListener('focusin', schedule);
      [header, backdrop].forEach((element) => {
        delete element.dataset.hidden;
        delete element.dataset.glass;
      });
    };
  }, [page]);

  useEffect(() => {
    if (menuOpen) {
      setMenuShown(true);
      return;
    }
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const timer = window.setTimeout(() => setMenuShown(false), reduced ? 0 : MENU_CLOSE_MS);
    return () => window.clearTimeout(timer);
  }, [menuOpen]);

  // While the menu covers the page: no scrolling behind it and nothing behind it reachable by keyboard.
  useEffect(() => {
    if (!menuShown) return;
    const behind = Array.from(document.querySelectorAll<HTMLElement>(BEHIND_MENU));
    document.documentElement.classList.add('menu-open');
    behind.forEach((element) => { element.inert = true; });
    return () => {
      document.documentElement.classList.remove('menu-open');
      behind.forEach((element) => { element.inert = false; });
    };
  }, [menuShown]);

  useEffect(() => {
    if (!menuOpen) return;
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        menuButton.current?.focus();
      }
    }
    // The menu only exists below 1200 px: crossing to the desktop nav closes it.
    const desktop = window.matchMedia('(min-width: 1200px)');
    function handleDesktop() { if (desktop.matches) setMenuOpen(false); }
    window.addEventListener('keydown', handleEscape);
    desktop.addEventListener('change', handleDesktop);
    return () => {
      window.removeEventListener('keydown', handleEscape);
      desktop.removeEventListener('change', handleDesktop);
    };
  }, [menuOpen]);

  return (
    <>
      {/* The header's glass, outside it: inside, it would be blended too. */}
      <div ref={backdropRef} className="header-backdrop" aria-hidden="true" />
      <header ref={headerRef} className={`site-header${menuShown ? ' site-header--menu' : ''}${menuOpen ? ' site-header--open' : ''}`}>
        <div className="header-inner">
          <nav className="header-nav" aria-label={copy.nav.label}>
            {links.map((link) => <NavLink key={link.to} className="nav-link" to={link.to}>{link.label}</NavLink>)}
          </nav>
          <Link to={href('/')} className="header-brand" aria-label={`${copy.brand} · ${copy.nav.home}`} onClick={(event) => {
            setMenuOpen(false);
            // Already on the Home: rewind to the top instead of reloading the same route.
            if (matchPage(pathname)?.page === 'home') { event.preventDefault(); scrollToTop(); }
          }}>
            {/* The logo's own lettering, painted in the header's colour so it keeps the blend over every scene. */}
            <span className="brand-logo" aria-hidden="true" />
          </Link>
          <div className="header-actions">
            <LanguageSwitcher />
            <button className="menu-toggle" ref={menuButton} type="button" aria-expanded={menuOpen}
              aria-controls="mobile-navigation" aria-label={menuOpen ? copy.common.close : copy.common.menu}
              onClick={() => setMenuOpen((open) => !open)}>
              <span className="menu-toggle__icon" aria-hidden="true"><span /><span /></span>
            </button>
          </div>
        </div>
        {/* Always rendered so it can open and close as a curtain; hidden (and unfocusable) while closed. */}
        <nav id="mobile-navigation" className="mobile-nav" aria-label={copy.nav.label}>
          <ul className="mobile-nav__list">
            {links.map((link, index) => (
              <li key={link.to} className="mobile-nav__item" style={{ '--i': index } as CSSProperties}>
                <NavLink className="mobile-nav__link" to={link.to} onClick={() => setMenuOpen(false)}>
                  <span className="mobile-nav__mask"><span className="mobile-nav__label">{link.label}</span></span>
                  <span className="mobile-nav__mask" aria-hidden="true">
                    <svg className="mobile-nav__arrow" viewBox="0 0 16 19" xmlns="http://www.w3.org/2000/svg">
                      <path d="M7 18C7 18.5523 7.44772 19 8 19C8.55228 19 9 18.5523 9 18H7ZM8.70711 0.292893C8.31658 -0.0976311 7.68342 -0.0976311 7.29289 0.292893L0.928932 6.65685C0.538408 7.04738 0.538408 7.68054 0.928932 8.07107C1.31946 8.46159 1.95262 8.46159 2.34315 8.07107L8 2.41421L13.6569 8.07107C14.0474 8.46159 14.6805 8.46159 15.0711 8.07107C15.4616 7.68054 15.4616 7.04738 15.0711 6.65685L8.70711 0.292893ZM9 18L9 1H7L7 18H9Z" />
                    </svg>
                  </span>
                </NavLink>
              </li>
            ))}
          </ul>
          <p className="mobile-nav__meta">{footerCopy[locale].location}</p>
        </nav>
      </header>
    </>
  );
}
