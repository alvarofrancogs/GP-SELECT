import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { useLanguage } from '../i18n/useLanguage';

export function SiteLayout() {
  const { pathname } = useLocation();
  const { copy } = useLanguage();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);

  return (
    <div className="site-layout">
      <a className="skip-link" href="#main-content">{copy.common.skipContent}</a>
      <Header key={pathname} />
      <main id="main-content" tabIndex={-1}><Outlet /></main>
      {pathname === '/' ? <Footer /> : null}
    </div>
  );
}
