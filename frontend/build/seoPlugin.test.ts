import { describe, expect, it } from 'vitest';
import { canonicalPagePath } from './seoPlugin';

const pages = ['vehiculos', 'importacion', 'nosotros', 'contacto', 'aviso-legal', 'privacidad', 'cookies'];

describe('canonicalPagePath', () => {
  it.each(pages)('canonicalizes all case and suffix combinations for /%s in one hop', (page) => {
    for (const name of [page, page.toUpperCase(), page[0].toUpperCase() + page.slice(1)]) {
      for (const suffix of ['', '/', '/index.html', '/index.html/', '/INDEX.HTML', '/INDEX.HTML/']) {
        const path = `/${name}${suffix}`;
        const target = `/${page}`;
        expect(canonicalPagePath(path)).toBe(path === target ? null : target);
        expect(canonicalPagePath(target)).toBeNull();
      }
    }
  });

  it.each(['/index.html', '/INDEX.HTML', '/index.html/', '/Index.Html/'])('redirects %s to home', (path) => {
    expect(canonicalPagePath(path)).toBe('/');
  });

  it.each(['vehiculos', 'VEHICULOS', 'Vehiculos'])('canonicalizes the %s prefix without changing slug case', (prefix) => {
    for (const slug of ['bmw-m4', 'BMW-M4', 'Bmw-m4']) {
      for (const suffix of ['', '/', '/index.html', '/index.html/', '/INDEX.HTML/']) {
        const path = `/${prefix}/${slug}${suffix}`;
        const target = `/vehiculos/${slug}`;
        expect(canonicalPagePath(path)).toBe(path === target ? null : target);
        expect(canonicalPagePath(target)).toBeNull();
      }
    }
  });

  it.each([
    '/', '/servicios', '/servicios/', '/servicios/index.html', '/SERVICIOS',
    '/api', '/api/', '/api/public/vehicles/', '/api/index.html',
    '/assets/', '/assets/logo.svg', '/assets/index.html',
    '/admin', '/admin/', '/admin/vehiculos/', '/admin/index.html',
    '/robots.txt', '/sitemap.xml', '/llms.txt', '/favicon.ico', '/favicon.svg',
    '/404.html', '/spa.html', '/other.css', '/other.pdf',
    '/unknown', '/unknown/', '/UNKNOWN', '/unknown/index.html',
    '/nosotros/unknown', '/vehiculos/bmw-m4/photos/', '/vehiculos/photo.jpg',
    '/vehiculos/photo.jpg/', '//', '/nosotros//',
  ])('leaves %s untouched', (path) => {
    expect(canonicalPagePath(path)).toBeNull();
  });
});
