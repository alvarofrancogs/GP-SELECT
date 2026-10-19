import { useLayoutEffect, type MouseEvent } from 'react';
import { Link, useLocation, useNavigate, type NavigateFunction } from 'react-router-dom';
import { useLanguage } from '../i18n/useLanguage';
import { Flag } from './Flag';
import { alternatePath, localeOf, locales } from '../i18n/routes';
import type { Locale } from '../i18n/types';

// Must match the language fade in global.css.
const FADE_OUT_MS = 160;
const FADE_IN_MS = 280;
// Never leave the lettering hidden if the new language does not render.
const SAFETY_MS = 1000;

/** One language change at a time, shared by the header's and the footer's switchers, with a single timer:
    a timer left over from an earlier change used to cut the fade of the next one. Taps are never lost: during
    the fade-out the latest one picks the language; during the fade-in it waits for the fade to end. */
const fade = {
  phase: 'idle' as 'idle' | 'out' | 'in',
  to: '',
  queued: '',
  locale: 'es' as Locale,
  from: '',
  timer: 0,
  navigate: null as NavigateFunction | null,
};

const targetLocale = (to: string) => localeOf(new URL(to, window.location.origin).pathname);
const classes = () => document.documentElement.classList;

function reset() {
  window.clearTimeout(fade.timer);
  classes().remove('lang-out', 'lang-in');
  fade.phase = 'idle';
  fade.queued = '';
}

function fadeIn() {
  window.clearTimeout(fade.timer);
  classes().remove('lang-out');
  classes().add('lang-in');
  fade.phase = 'in';
  fade.timer = window.setTimeout(() => {
    const next = fade.queued;
    reset();
    if (next && targetLocale(next) !== fade.locale) fadeOut(next);
  }, FADE_IN_MS);
}

function fadeOut(to: string) {
  window.clearTimeout(fade.timer);
  classes().remove('lang-in');
  classes().add('lang-out');
  fade.phase = 'out';
  fade.to = to;
  fade.from = window.location.href;
  fade.timer = window.setTimeout(() => {
    // The visitor went elsewhere during the fade (a link, Back): drop the switch instead of overriding it.
    if (window.location.href !== fade.from) { reset(); return; }
    // Tapped back to the language on screen: nothing to swap, the lettering just comes back.
    if (targetLocale(fade.to) === fade.locale) { fadeIn(); return; }
    void fade.navigate?.(fade.to);
    fade.timer = window.setTimeout(fadeIn, SAFETY_MS);
  }, FADE_OUT_MS);
}

/** Links to the same page in each language (real addresses, so they can be shared, opened in a tab and crawled). */
export function LanguageSwitcher() {
  const { locale, copy } = useLanguage();
  const { pathname, search, hash } = useLocation();
  const navigate = useNavigate();
  fade.locale = locale;

  // The new language has rendered: the lettering fades back in. The header and the footer both hold a
  // switcher; the first one to run does it.
  useLayoutEffect(() => {
    if (fade.phase === 'out' && targetLocale(fade.to) === locale) fadeIn();
  }, [locale]);

  // Only the lettering fades: out, swapped while hidden, back in. A crossfade of the whole page
  // (view transitions) showed both languages on top of each other halfway through.
  // Reduced motion changes it directly. The page stays mounted and keeps its scroll (SiteLayout).
  function change(event: MouseEvent<HTMLAnchorElement>, language: Locale, to: string) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    fade.navigate = navigate;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      reset();
      if (language !== locale) void navigate(to);
      return;
    }
    if (fade.phase === 'out') fade.to = to;
    else if (fade.phase === 'in') fade.queued = to;
    else if (language !== locale) fadeOut(to);
  }

  return (
    <div className="language-switcher" role="group" aria-label={copy.languages.label}>
      {locales.map((language) => {
        const to = `${alternatePath(pathname, language)}${search}${hash}`;
        return (
          <Link key={language} to={to} lang={language} hrefLang={language} aria-label={copy.languages[language]}
            aria-current={locale === language ? 'true' : undefined} onClick={(event) => change(event, language, to)}>
            <Flag language={language} />
            <span className="language-switcher__active" aria-hidden="true" />
          </Link>
        );
      })}
    </div>
  );
}
