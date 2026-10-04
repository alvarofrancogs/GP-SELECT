import { Link } from 'react-router-dom';
import { useLanguage } from '../i18n/useLanguage';
import { footerCopy } from '../i18n/footerCopy';
import { qualificationUrl } from '../lib/qualification';
import { LanguageSwitcher } from './LanguageSwitcher';
import '../styles/footer.css';

export function Footer() {
  const { locale, copy } = useLanguage();
  const text = footerCopy[locale];

  function backToTop() {
    // Native immediate scrolling keeps the existing scroll timelines in control.
    window.scrollTo({ top: 0, behavior: 'instant' });
    document.querySelector<HTMLElement>('.header-brand')?.focus({ preventScroll: true });
  }

  return (
    <footer className="site-footer">
      <div className="footer-main">
        <div className="footer-identity">
          <Link className="footer-brand" to="/" onClick={backToTop}>{copy.brand}</Link>
          <p>{text.description}</p>
          <p className="footer-location">{text.location}</p>
        </div>
        <nav className="footer-nav" aria-label={text.navigation}>
          <Link to="/nosotros">{copy.nav.about}</Link>
          <Link to="/vehiculos">{copy.nav.vehicles}</Link>
          <Link to="/importacion">{copy.nav.import}</Link>
          <Link to={qualificationUrl({ intent: 'information', source: 'home-footer' })}>{copy.nav.contact}</Link>
        </nav>
      </div>
      <div className="footer-bottom">
        <p>© {new Date().getFullYear()} {copy.brand}</p>
        <LanguageSwitcher />
      </div>
    </footer>
  );
}
