import { describe, expect, it } from 'vitest';
import { alternatePath, localeOf, localizeHref, matchPage, pageKey, pagePath, pagePaths } from './routes';

describe('route table', () => {
  it('matches every page in both languages, ignoring case and a trailing slash', () => {
    for (const [page, paths] of Object.entries(pagePaths)) {
      expect(matchPage(paths.es)).toEqual({ page, locale: 'es' });
      expect(matchPage(paths.en)).toEqual({ page, locale: 'en' });
      expect(matchPage(`${paths.en.toUpperCase()}/`)).toEqual({ page, locale: 'en' });
    }
  });

  it('keeps the vehicle slug as written', () => {
    expect(matchPage('/vehiculos/BMW-m4')).toEqual({ page: 'vehicle', locale: 'es', slug: 'BMW-m4' });
    expect(matchPage('/en/vehicles/bmw-m4/')).toEqual({ page: 'vehicle', locale: 'en', slug: 'bmw-m4' });
    expect(matchPage('/vehiculos/a/b')).toBeNull();
    expect(matchPage('/en/vehiculos')).toBeNull();
    expect(matchPage('/enx')).toBeNull();
  });

  it('reads the language from the address only', () => {
    expect(localeOf('/en')).toBe('en');
    expect(localeOf('/en/import')).toBe('en');
    expect(localeOf('/EN/anything')).toBe('en');
    expect(localeOf('/')).toBe('es');
    expect(localeOf('/enlace')).toBe('es');
  });

  it('gives the same key to a page in either language', () => {
    expect(pageKey('/importacion')).toBe(pageKey('/en/import'));
    expect(pageKey('/vehiculos/bmw-m4')).toBe(pageKey('/en/vehicles/bmw-m4'));
    expect(pageKey('/vehiculos/bmw-m4')).not.toBe(pageKey('/vehiculos/audi-rs3'));
  });

  it('switches to the equivalent page, or to the home for an unknown address', () => {
    expect(alternatePath('/nosotros', 'en')).toBe('/en/about');
    expect(alternatePath('/en/about', 'es')).toBe('/nosotros');
    expect(alternatePath('/en/vehicles/bmw-m4', 'es')).toBe('/vehiculos/bmw-m4');
    expect(alternatePath('/no-existe', 'en')).toBe('/en');
    expect(alternatePath('/en/missing', 'es')).toBe('/');
  });

  it('localizes Spanish links with their query and hash', () => {
    expect(localizeHref('/contacto?intent=search&source=home', 'en')).toBe('/en/contact?intent=search&source=home');
    expect(localizeHref('/vehiculos/porsche-911#galeria', 'en')).toBe('/en/vehicles/porsche-911#galeria');
    expect(localizeHref('/', 'en')).toBe('/en');
    expect(localizeHref('/contacto?intent=search', 'es')).toBe('/contacto?intent=search');
    expect(localizeHref('https://wa.me/34', 'en')).toBe('https://wa.me/34');
    expect(localizeHref('/admin', 'en')).toBe('/admin');
    expect(pagePath('vehicle', 'en', 'a b')).toBe('/en/vehicles/a%20b');
  });
});
