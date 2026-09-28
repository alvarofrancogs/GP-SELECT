import { useEffect, useRef, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useLanguage } from '../i18n/useLanguage';
import { LanguageSwitcher } from './LanguageSwitcher';

export function Header() {
  const { copy } = useLanguage();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const links = [
    { to: '/vehiculos', label: copy.nav.vehicles },
    { to: '/importacion', label: copy.nav.import },
    { to: '/servicios', label: copy.nav.services },
    { to: '/nosotros', label: copy.nav.about },
    { to: '/contacto', label: copy.nav.contact },
  ];

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
    <header className={`site-header${menuOpen ? ' site-header--open' : ''}`}>
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
