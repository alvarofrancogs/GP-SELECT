import { afterEach, describe, expect, it } from 'vitest';
import fixtures from '../../../tests/fixtures/vehicle-seo.json';
import { contactConfig } from '../config/contactChannels';
import { fromPublicDetail } from '../services/vehicles';
import type { VehiclePublicDto } from '../types/vehicle';
import { getStaticPageMeta, getVehiclePageMeta, renderPageHead } from './pageMeta';

describe('shared vehicle SEO fixtures', () => {
  for (const fixture of fixtures) {
    it(fixture.name, () => {
      const siteUrl = fixture.siteUrl ?? undefined;
      const meta = getVehiclePageMeta(fromPublicDetail(fixture.vehicle as VehiclePublicDto), siteUrl);
      expect({ title: meta.title, description: meta.description, jsonLd: meta.jsonLd }).toEqual(fixture.expected);
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

  it('connects the dealer, website and import provider with absolute IDs', () => {
    const siteUrl = 'https://gp-select.example';
    const graph = getStaticPageMeta('/', siteUrl).jsonLd!['@graph'] as Record<string, unknown>[];
    expect(graph[0]).toMatchObject({ '@id': `${siteUrl}/#organization`, telephone: '+34661631555' });
    expect(graph[1]).toMatchObject({ '@id': `${siteUrl}/#website`, publisher: { '@id': `${siteUrl}/#organization` } });
    expect(getStaticPageMeta('/importacion', siteUrl).jsonLd!.provider).toMatchObject({ '@id': `${siteUrl}/#organization` });
  });

  it('omits IDs and publisher without siteUrl, but keeps the telephone', () => {
    const graph = getStaticPageMeta('/').jsonLd!['@graph'] as Record<string, unknown>[];
    expect(graph[0]).toHaveProperty('telephone', '+34661631555');
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

describe('language versions', () => {
  const siteUrl = 'https://gpselect.com';
  const pairs = [['/', '/en'], ['/vehiculos', '/en/vehicles'], ['/importacion', '/en/import'], ['/nosotros', '/en/about'], ['/contacto', '/en/contact']];
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

  it('declares no language versions without a site URL, nor on pages that exist in one language only', () => {
    expect(renderPageHead(getStaticPageMeta('/en'))).not.toContain('hreflang');
    const vehicle = fromPublicDetail(fixtures[0].vehicle as VehiclePublicDto);
    expect(renderPageHead(getVehiclePageMeta(vehicle, siteUrl), siteUrl)).not.toContain('hreflang');
    const english = getVehiclePageMeta(vehicle, siteUrl, 'en');
    expect(english).toMatchObject({ robots: 'noindex,follow', locale: 'en', path: `/en/vehicles/${vehicle.slug}` });
    expect(english.jsonLd).toBeUndefined();
    expect(renderPageHead(english, siteUrl)).not.toContain('hreflang');
  });
});
