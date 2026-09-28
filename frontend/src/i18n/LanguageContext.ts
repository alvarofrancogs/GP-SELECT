import { createContext } from 'react';
import type { Dictionary, Locale } from './types';

interface LanguageContextValue {
  locale: Locale;
  copy: Dictionary;
  setLocale: (locale: Locale) => void;
}

export const LanguageContext = createContext<LanguageContextValue | null>(null);
