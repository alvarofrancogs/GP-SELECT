import { flushSync } from 'react-dom';
import { useLanguage } from '../i18n/useLanguage';
import type { Locale } from '../i18n/types';

const locales: Locale[] = ['es', 'en'];
// Must match the language fade in global.css.
const FADE_OUT_MS = 160;
const FADE_IN_MS = 280;
let switching = false;

export function LanguageSwitcher() {
  const { locale, copy, setLocale } = useLanguage();

  // Only the lettering fades: out, swapped while hidden, back in. A crossfade of the whole page
  // (view transitions) showed both languages on top of each other halfway through.
  // Reduced motion changes it directly.
  function change(language: Locale) {
    if (language === locale || switching) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setLocale(language);
      return;
    }
    const root = document.documentElement;
    switching = true;
    root.classList.add('lang-out');
    window.setTimeout(() => {
      flushSync(() => setLocale(language));
      root.classList.replace('lang-out', 'lang-in');
      window.setTimeout(() => {
        root.classList.remove('lang-in');
        switching = false;
      }, FADE_IN_MS);
    }, FADE_OUT_MS);
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
