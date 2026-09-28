import { Link } from 'react-router-dom';
import { useLanguage } from '../i18n/useLanguage';
import { footerCopy } from '../i18n/footerCopy';
import { qualificationUrl } from '../lib/qualification';
import { Button } from './Button';
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
        </div>
        <nav className="footer-nav" aria-label={text.navigation}>
          <Link to="/vehiculos">{copy.nav.vehicles}</Link>
          <Link to="/importacion">{copy.nav.import}</Link>
          <Link to="/servicios">{copy.nav.services}</Link>
          <Link to="/nosotros">{copy.nav.about}</Link>
        </nav>
        <Button variant="outline" to={qualificationUrl({ intent: 'information', source: 'home-footer' })}>
          {text.contact}
        </Button>
      </div>
      <div className="footer-bottom">
        <p>© {new Date().getFullYear()} {copy.brand}. {text.rights}</p>
        <p className="footer-promise">{text.promise}</p>
        <button type="button" onClick={backToTop}>{text.backToTop}<span aria-hidden="true">↑</span></button>
      </div>
    </footer>
  );
}
