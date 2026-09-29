import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useLanguage } from '../i18n/useLanguage';
import { LanguageSwitcher } from './LanguageSwitcher';

export function Header() {
  const { copy } = useLanguage();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const { pathname } = useLocation();
  const links = [
    { to: '/nosotros', label: copy.nav.about },
    { to: '/vehiculos', label: copy.nav.vehicles },
    { to: '/importacion', label: copy.nav.import },
    { to: '/servicios', label: copy.nav.services },
    { to: '/contacto', label: copy.nav.contact },
  ];

  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;
    const hero = document.getElementById('hero');
    const handoff = document.getElementById('coches');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;
    function updateContrast() {
      if (!header) return;
      const progress = Number(hero?.dataset.progress ?? 0);
      // A solid scrim avoids difference blending against the handoff's mid-grey.
      header.toggleAttribute('data-hero-handoff', progress >= 0.35 && progress < 1);
      // The car handoff darkens progressively and publishes the tone under the header.
      const tone = handoff?.dataset.headerTone;
      if (tone) header.dataset.tone = tone;
      else delete header.dataset.tone;
    }
    function onScroll() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(updateContrast);
    }
    updateContrast();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    reducedMotion.addEventListener('change', onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      reducedMotion.removeEventListener('change', onScroll);
      header.removeAttribute('data-hero-handoff');
      delete header.dataset.tone;
    };
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        menuButton.current?.focus();
      }
    }
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [menuOpen]);

  return (
    <header ref={headerRef} className={`site-header${menuOpen ? ' site-header--open' : ''}`}>
      <div className="header-inner">
        <nav className="header-nav" aria-label={copy.common.menu}>
          {links.map((link) => <NavLink key={link.to} className="nav-link" to={link.to}>{link.label}</NavLink>)}
        </nav>
        <Link to="/" className="header-brand" aria-label={`${copy.brand} · ${copy.nav.home}`} onClick={() => setMenuOpen(false)}>
          {copy.brand}
        </Link>
        <div className="header-actions">
          <LanguageSwitcher />
          <button className="menu-toggle" ref={menuButton} type="button" aria-expanded={menuOpen}
            aria-controls="mobile-navigation" aria-label={menuOpen ? copy.common.close : copy.common.menu}
            onClick={() => setMenuOpen((open) => !open)}>
            <span aria-hidden="true">{menuOpen ? '−' : '+'}</span>
          </button>
        </div>
      </div>
      {menuOpen ? (
        <nav id="mobile-navigation" className="mobile-nav" aria-label={copy.common.menu}>
          {links.map((link) => <NavLink key={link.to} to={link.to} onClick={() => setMenuOpen(false)}>{link.label}</NavLink>)}
        </nav>
      ) : null}
    </header>
  );
}
