import { useLanguage } from '../i18n/useLanguage';
import type { Locale } from '../i18n/types';

const locales: Locale[] = ['es', 'en'];

export function LanguageSwitcher() {
  const { locale, copy, setLocale } = useLanguage();
  return (
    <div className="language-switcher" role="group" aria-label={copy.languages.label}>
      {locales.map((language) => (
        <button key={language} type="button" lang={language} aria-label={copy.languages[language]}
          aria-pressed={locale === language} onClick={() => setLocale(language)}>
          {language.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
