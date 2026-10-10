import { useCallback, useLayoutEffect, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { es } from './es';
import { en } from './en';
import { LanguageContext } from './LanguageContext';
import { localeOf, localizeHref } from './routes';

/** The language is the address: /en/… is English, everything else Spanish. Nothing is stored in the browser. */
export function LanguageProvider({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const locale = localeOf(pathname);
  const href = useCallback((path: string) => localizeHref(path, locale), [locale]);

  useLayoutEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return (
    <LanguageContext.Provider value={{ locale, copy: locale === 'es' ? es : en, href }}>
      {children}
    </LanguageContext.Provider>
  );
}
