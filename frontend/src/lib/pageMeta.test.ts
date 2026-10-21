import { afterEach, describe, expect, it } from 'vitest';
import fixtures from '../../../tests/fixtures/vehicle-seo.json';
import englishValues from '../../../tests/fixtures/vehicle-values-en.json';
import { en } from '../i18n/en';
import { entityCopy } from '../i18n/entityCopy';
import { contactConfig } from '../config/contactChannels';
import { fromPublicDetail } from '../services/vehicles';
import type { Locale } from '../i18n/types';
import type { VehiclePublicDto } from '../types/vehicle';
import { getStaticPageMeta, getVehiclePageMeta, renderPageHead, staticPageMeta } from './pageMeta';

describe('shared vehicle SEO fixtures', () => {
  for (const fixture of fixtures) {
    it(fixture.name, () => {
      const siteUrl = fixture.siteUrl ?? undefined;
      const meta = getVehiclePageMeta(fromPublicDetail(fixture.vehicle as VehiclePublicDto), siteUrl, fixture.locale as Locale);
      expect({ title: meta.title, description: meta.description, robots: meta.robots, jsonLd: meta.jsonLd }).toEqual(fixture.expected);
      expect(meta.imageAlt).toBe(`${fixture.vehicle.make} ${fixture.vehicle.model} (${fixture.vehicle.year})`);
      const head = renderPageHead(meta, siteUrl);
      const json = head.match(/<script data-page-meta type="application\/ld\+json">(.*?)<\/script>/s)![1];
      expect(json).not.toContain('<');
      expect(JSON.parse(json)).toEqual(fixture.expected.jsonLd);
    });
  }
});

describe('static structured data', () => {
  const original = { ...contactConfig };
  afterEach(() => Object.assign(contactConfig, original));

  it('connects the business, website and service provider with absolute IDs', () => {
    const siteUrl = 'https://gp-select.example';
    const graph = getStaticPageMeta('/', siteUrl).jsonLd!['@graph'] as Record<string, unknown>[];
    expect(graph[0]).toMatchObject({ '@type': 'AutomotiveBusiness', '@id': `${siteUrl}/#organization`, telephone: '+34675746041' });
    expect(graph[1]).toMatchObject({ '@id': `${siteUrl}/#website`, publisher: { '@id': `${siteUrl}/#organization` } });
    expect(getStaticPageMeta('/importacion', siteUrl).jsonLd!.provider).toMatchObject({ '@type': 'AutomotiveBusiness', '@id': `${siteUrl}/#organization` });
  });

  it('names the business with one @id on every page that mentions it', () => {
    const siteUrl = 'https://gp-select.example';
    const ids = (value: unknown): string[] => !value || typeof value !== 'object' ? []
      : Object.entries(value).flatMap(([key, item]) => key === '@id' && typeof item === 'string' ? [item] : ids(item));
    const business = Object.keys(staticPageMeta).flatMap((path) => ids(getStaticPageMeta(path, siteUrl).jsonLd))
      .filter((id) => id.includes('#organization'));
    expect(business.length).toBeGreaterThanOrEqual(6);
    expect(new Set(business)).toEqual(new Set([`${siteUrl}/#organization`]));
    expect((getStaticPageMeta('/en', siteUrl).jsonLd!['@graph'] as Record<string, unknown>[])[0].knowsLanguage).toEqual(['es', 'en']);
  });

  it.each([['/', 'es'], ['/en', 'en']] as const)('uses the entity copy for the %s business node', (path, locale) => {
    const meta = getStaticPageMeta(path);
    const graph = meta.jsonLd!['@graph'] as Record<string, unknown>[];
    expect(graph[0].description).toBe(entityCopy[locale]);
    expect(graph[0].description).not.toBe(meta.description);
    expect(graph[0]).not.toHaveProperty('foundingDate');
    expect(graph[0].description).toContain(locale === 'es' ? 'negocio familiar' : 'family business');
    expect(graph[0].description).toContain(locale === 'es' ? 'más de 25 años' : 'more than 25 years');
    expect(graph[0].description).toContain(locale === 'es' ? 'de nuestro stock' : 'from our own stock');
  });

  it('omits IDs and publisher without siteUrl, but keeps the telephone', () => {
    const graph = getStaticPageMeta('/').jsonLd!['@graph'] as Record<string, unknown>[];
    expect(graph[0]).toHaveProperty('telephone', '+34675746041');
    for (const entry of graph) {
      expect(entry).not.toHaveProperty('@id');
      expect(entry).not.toHaveProperty('url');
      expect(entry).not.toHaveProperty('publisher');
    }
    const provider = getStaticPageMeta('/importacion').jsonLd!.provider;
    expect(provider).not.toHaveProperty('@id');
    expect(provider).not.toHaveProperty('url');
  });

  it('prefers phone and omits telephone when neither verified number is configured', () => {
    const dealer = () => (getStaticPageMeta('/', 'https://gp-select.example').jsonLd!['@graph'] as Record<string, unknown>[])[0];
    contactConfig.phone = '+34900111222';
    expect(dealer().telephone).toBe('+34900111222');
    contactConfig.phone = null;
    contactConfig.whatsapp = null;
    expect(dealer()).not.toHaveProperty('telephone');
  });
});

describe('stock and import positioning', () => {
  it.each([
    ['/', 'Stock propio', 'por encargo'],
    ['/en', 'Our own stock', 'to order'],
    ['/vehiculos', 'nuestro stock', 'por encargo'],
    ['/en/vehicles', 'our stock', 'source it in Europe'],
    ['/nosotros', 'nuestro stock', 'por encargo'],
    ['/en/about', 'our own stock', 'to order'],
  ])('describes both ways to buy in the metadata for %s', (path, stock, sourcing) => {
    const meta = getStaticPageMeta(path);
    expect(meta.description).toContain(stock);
    expect(meta.description).toContain(sourcing);
    const head = renderPageHead(meta);
    expect(head).toContain(`name="description" content="${meta.description}"`);
    expect(head).toContain(`property="og:description" content="${meta.description}"`);
  });
});

describe('language versions', () => {
  const siteUrl = 'https://gpselect.com';
  const pairs = [['/', '/en'], ['/vehiculos', '/en/vehicles'], ['/importacion', '/en/import'], ['/guias/importar-un-coche-de-europa', '/en/guides/importing-a-car-from-europe'], ['/nosotros', '/en/about'], ['/contacto', '/en/contact']];
  const links = (head: string) => [...head.matchAll(/<link data-page-meta rel="(canonical|alternate)"(?: hreflang="([^"]+)")? href="([^"]+)">/g)]
    .map(([, rel, language, href]) => `${rel}${language ? `:${language}` : ''} ${href}`);

  it.each(pairs)('%s and %s point at each other, themselves and the English x-default', (es, en) => {
    const esHead = renderPageHead(getStaticPageMeta(es, siteUrl), siteUrl);
    const enHead = renderPageHead(getStaticPageMeta(en, siteUrl), siteUrl);
    const alternates = [`alternate:es ${siteUrl}${es}`, `alternate:en ${siteUrl}${en}`, `alternate:x-default ${siteUrl}${en}`];
    expect(links(esHead)).toEqual([`canonical ${siteUrl}${es}`, ...alternates]);
    expect(links(enHead)).toEqual([`canonical ${siteUrl}${en}`, ...alternates]);
    expect(esHead).toContain('property="og:locale" content="es_ES"');
    expect(esHead).toContain('property="og:locale:alternate" content="en_GB"');
    expect(enHead).toContain('property="og:locale" content="en_GB"');
    expect(enHead).toContain('property="og:locale:alternate" content="es_ES"');
  });

  it('keeps both vehicle languages indexable with reciprocal alternates and their own canonical', () => {
    const vehicle = fromPublicDetail(fixtures[0].vehicle as VehiclePublicDto);
    const es = `/vehiculos/${vehicle.slug}`;
    const en = `/en/vehicles/${vehicle.slug}`;
    for (const locale of ['es', 'en'] as const) {
      const meta = getVehiclePageMeta(vehicle, siteUrl, locale);
      const head = renderPageHead(meta, siteUrl);
      expect(head).toContain('name="robots" content="index,follow"');
      expect(links(head)).toEqual([
        `canonical ${siteUrl}${locale === 'es' ? es : en}`,
        `alternate:es ${siteUrl}${es}`, `alternate:en ${siteUrl}${en}`, `alternate:x-default ${siteUrl}${en}`,
      ]);
      expect(JSON.stringify(meta.jsonLd)).not.toMatch(/"seller"|AutoDealer/);
      expect(renderPageHead(getVehiclePageMeta(vehicle, undefined, locale))).not.toContain('hreflang');
    }
  });
});

describe('English vehicle values', () => {
  it('match the table the API uses (tests/fixtures/vehicle-values-en.json)', () => {
    expect(en.vehicles.values).toEqual(englishValues);
  });
});

describe('import guide', () => {
  const siteUrl = 'https://gpselect.com';

  it.each([
    ['/guias/importar-un-coche-de-europa', 'es', 'Importación', '/importacion'],
    ['/en/guides/importing-a-car-from-europe', 'en', 'Import', '/en/import'],
  ])('describes %s as an Article by the business, under Import', (path, locale, parent, parentPath) => {
    const graph = getStaticPageMeta(path, siteUrl).jsonLd!['@graph'] as Record<string, unknown>[];
    expect(graph[0]).toMatchObject({
      '@type': 'Article', inLanguage: locale, dateModified: '2026-10-13', url: `${siteUrl}${path}`,
      publisher: { '@type': 'AutomotiveBusiness', '@id': `${siteUrl}/#organization` },
    });
    expect(graph[0].headline).not.toContain('GP SELECT');
    expect((graph[1].itemListElement as Record<string, unknown>[])[1]).toMatchObject({ name: parent, item: `${siteUrl}${parentPath}` });
  });
});

