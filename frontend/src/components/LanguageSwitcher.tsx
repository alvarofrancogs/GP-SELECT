import { flushSync } from 'react-dom';
import { useLanguage } from '../i18n/useLanguage';
import type { Locale } from '../i18n/types';

const locales: Locale[] = ['es', 'en'];

export function LanguageSwitcher() {
  const { locale, copy, setLocale } = useLanguage();

  // The copy crossfades instead of swapping in a single frame. Browsers without view transitions,
  // and reduced motion, change it directly.
  function change(language: Locale) {
    if (language === locale) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced || !document.startViewTransition) {
      setLocale(language);
      return;
    }
    document.startViewTransition(() => flushSync(() => setLocale(language)));
  }

  return (
    <div className="language-switcher" role="group" aria-label={copy.languages.label}>
      {locales.map((language) => (
        <button key={language} type="button" lang={language} aria-label={copy.languages[language]}
          aria-pressed={locale === language} onClick={() => change(language)}>
          {language.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
