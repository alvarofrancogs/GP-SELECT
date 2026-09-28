import { useEffect, useState, type ReactNode } from 'react';
import { es } from './es';
import { en } from './en';
import { LanguageContext } from './LanguageContext';
import type { Locale } from './types';

const storageKey = 'gp-select.locale.v1';

function readLocale(): Locale {
  try {
    return localStorage.getItem(storageKey) === 'en' ? 'en' : 'es';
  } catch {
    return 'es';
  }
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(readLocale);

  useEffect(() => {
    document.documentElement.lang = locale;
    try {
      localStorage.setItem(storageKey, locale);
    } catch {
      // The current session remains usable if the browser blocks storage.
    }
  }, [locale]);

  return (
    <LanguageContext.Provider value={{ locale, copy: locale === 'es' ? es : en, setLocale }}>
      {children}
    </LanguageContext.Provider>
  );
}
