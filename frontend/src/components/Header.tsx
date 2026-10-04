import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useLanguage } from '../i18n/useLanguage';
import { LanguageSwitcher } from './LanguageSwitcher';
import { scrollToTop } from '../lib/scrollToTop';
import { footerCopy } from '../i18n/footerCopy';

// Matches the curtain's closing transition in global.css: the page stays locked until it has lifted.
const MENU_CLOSE_MS = 420;
// Everything behind the open menu: out of the tab order and the accessibility tree while it covers them.
const BEHIND_MENU = '#main-content, .site-footer, .catalogue-cta, .skip-link';

export function Header() {
  const { copy, locale } = useLanguage();
  const [menuOpen, setMenuOpen] = useState(false);
  // Stays true while the curtain lifts, so the header keeps its menu colours until it is gone.
  const [menuShown, setMenuShown] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const { pathname } = useLocation();
  const links = [
    { to: '/nosotros', label: copy.nav.about },
    { to: '/vehiculos', label: copy.nav.vehicles },
    { to: '/importacion', label: copy.nav.import },
    { to: '/contacto', label: copy.nav.contact },
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
  }, [pathname]);

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
    <header ref={headerRef} className={`site-header${menuShown ? ' site-header--menu' : ''}${menuOpen ? ' site-header--open' : ''}`}>
      <div className="header-inner">
        <nav className="header-nav" aria-label={copy.nav.label}>
          {links.map((link) => <NavLink key={link.to} className="nav-link" to={link.to}>{link.label}</NavLink>)}
        </nav>
        <Link to="/" className="header-brand" aria-label={`${copy.brand} · ${copy.nav.home}`} onClick={(event) => {
          setMenuOpen(false);
          // Already on the Home: rewind to the top instead of reloading the same route.
          if (pathname === '/') { event.preventDefault(); scrollToTop(); }
        }}>
          {copy.brand}
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
  );
}
