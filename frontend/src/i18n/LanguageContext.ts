import { createContext } from 'react';
import type { Dictionary, Locale } from './types';

interface LanguageContextValue {
  locale: Locale;
  copy: Dictionary;
  /** A Spanish site path (with any query or hash) as the address in the current language. */
  href: (path: string) => string;
}

export const LanguageContext = createContext<LanguageContextValue | null>(null);
