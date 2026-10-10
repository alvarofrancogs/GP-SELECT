import type { Locale } from './types';

/** Every public page. The vehicle detail is the only one with a parameter (its slug). */
export type PageId = 'home' | 'vehicles' | 'vehicle' | 'import' | 'about' | 'contact' | 'aviso-legal' | 'privacidad' | 'cookies';
type FixedPage = Exclude<PageId, 'vehicle'>;

export const locales: Locale[] = ['es', 'en'];

/** The one table of public addresses. Spanish keeps the original URLs; English lives under /en.
    The router, links, language switcher, metadata, build, sitemap and preview all read it. */
export const pagePaths: Record<FixedPage, Record<Locale, string>> = {
  home: { es: '/', en: '/en' },
  vehicles: { es: '/vehiculos', en: '/en/vehicles' },
  import: { es: '/importacion', en: '/en/import' },
  about: { es: '/nosotros', en: '/en/about' },
  contact: { es: '/contacto', en: '/en/contact' },
  'aviso-legal': { es: '/aviso-legal', en: '/en/legal-notice' },
  privacidad: { es: '/privacidad', en: '/en/privacy' },
  cookies: { es: '/cookies', en: '/en/cookies' },
};

export interface PageMatch { page: PageId; locale: Locale; slug?: string }

/** Pages with an equivalent in both languages that search engines index (hreflang pairs). */
export const indexedPages: FixedPage[] = ['home', 'vehicles', 'import', 'about', 'contact'];

export function localeOf(pathname: string): Locale {
  return /^\/en(\/|$)/i.test(pathname) ? 'en' : 'es';
}

export function pagePath(page: PageId, locale: Locale, slug?: string): string {
  if (page === 'vehicle') return `${pagePaths.vehicles[locale]}/${encodeURIComponent(slug ?? '')}`;
  return pagePaths[page][locale];
}

/** Like the router before /en existed: page names ignore case and a trailing slash; a vehicle slug keeps its case. */
export function matchPage(pathname: string): PageMatch | null {
  const path = pathname.replace(/\/+$/, '') || '/';
  const lower = path.toLowerCase();
  for (const locale of locales) {
    for (const [page, paths] of Object.entries(pagePaths) as [FixedPage, Record<Locale, string>][]) {
      if (lower === paths[locale]) return { page, locale };
    }
    const prefix = `${pagePaths.vehicles[locale]}/`;
    const slug = path.slice(prefix.length);
    if (lower.startsWith(prefix) && slug && !slug.includes('/')) {
      try {
        return { page: 'vehicle', locale, slug: decodeURIComponent(slug) };
      } catch {
        return null;
      }
    }
  }
  return null;
}

/** Identifies the page whatever its language, so switching language keeps the page (and its scroll scenes) mounted. */
export function pageKey(pathname: string): string {
  const match = matchPage(pathname);
  return match ? `${match.page}:${match.slug ?? ''}` : `missing:${pathname.toLowerCase()}`;
}

/** The same page in another language; an unknown address goes to that language's home. */
export function alternatePath(pathname: string, locale: Locale): string {
  const match = matchPage(pathname);
  return match ? pagePath(match.page, locale, match.slug) : pagePaths.home[locale];
}

/** Internal links are written with the Spanish path (and any query or hash); this gives the address in `locale`. */
export function localizeHref(href: string, locale: Locale): string {
  if (locale === 'es' || !href.startsWith('/')) return href;
  const [, path, rest] = /^([^?#]*)(.*)$/.exec(href)!;
  const match = matchPage(path);
  return match && match.locale === 'es' ? pagePath(match.page, locale, match.slug) + rest : href;
}
