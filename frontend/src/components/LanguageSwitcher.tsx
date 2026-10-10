import { useLayoutEffect, type MouseEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useLanguage } from '../i18n/useLanguage';
import { alternatePath, locales } from '../i18n/routes';
import type { Locale } from '../i18n/types';

// Must match the language fade in global.css.
const FADE_OUT_MS = 160;
const FADE_IN_MS = 280;
let switching = false;

/** Links to the same page in each language (real addresses, so they can be shared, opened in a tab and crawled). */
export function LanguageSwitcher() {
  const { locale, copy } = useLanguage();
  const { pathname, search, hash } = useLocation();
  const navigate = useNavigate();

  // The new language has rendered: the lettering fades back in. The header and the footer both hold a
  // switcher; the first one to run takes the class.
  useLayoutEffect(() => {
    const root = document.documentElement;
    if (!root.classList.contains('lang-out')) return;
    root.classList.replace('lang-out', 'lang-in');
    window.setTimeout(() => {
      root.classList.remove('lang-in');
      switching = false;
    }, FADE_IN_MS);
  }, [locale]);

  // Only the lettering fades: out, swapped while hidden, back in. A crossfade of the whole page
  // (view transitions) showed both languages on top of each other halfway through.
  // Reduced motion changes it directly. The page stays mounted and keeps its scroll (SiteLayout).
  function change(event: MouseEvent<HTMLAnchorElement>, language: Locale, to: string) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (language === locale || switching) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      void navigate(to);
      return;
    }
    switching = true;
    document.documentElement.classList.add('lang-out');
    const from = window.location.href;
    window.setTimeout(() => {
      // The visitor went elsewhere during the fade (a link, Back): drop the switch instead of overriding it.
      if (window.location.href !== from) {
        document.documentElement.classList.remove('lang-out');
        switching = false;
        return;
      }
      void navigate(to);
    }, FADE_OUT_MS);
    // Never leave the lettering hidden if the navigation does not complete.
    window.setTimeout(() => {
      if (!document.documentElement.classList.contains('lang-out')) return;
      document.documentElement.classList.remove('lang-out');
      switching = false;
    }, FADE_OUT_MS + 1000);
  }

  return (
    <div className="language-switcher" role="group" aria-label={copy.languages.label}>
      {locales.map((language) => {
        const to = `${alternatePath(pathname, language)}${search}${hash}`;
        return (
          <Link key={language} to={to} lang={language} hrefLang={language} aria-label={copy.languages[language]}
            aria-current={locale === language ? 'true' : undefined} onClick={(event) => change(event, language, to)}>
            {language.toUpperCase()}
          </Link>
        );
      })}
    </div>
  );
}
