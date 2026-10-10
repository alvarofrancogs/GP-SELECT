import { contactConfig } from '../config/contactChannels';
import { en } from '../i18n/en';
import { matchPage, pagePath, pagePaths } from '../i18n/routes';
import type { Locale } from '../i18n/types';
import type { VehicleDetail } from '../types/vehicle';
import { translateValue } from './vehicleFormat';

export interface PageMeta {
  title: string;
  description: string;
  path?: string;
  /** Language of the page; Spanish when absent. */
  locale?: Locale;
  /** The same page in each language (hreflang): only pages indexed in both. */
  alternates?: Record<Locale, string>;
  robots?: string;
  image?: string;
  imageAlt?: string;
  jsonLd?: Record<string, unknown>;
  /** A shorter tab title than the search title. */
  tabTitle?: string;
}

export const staticPageMeta: Record<string, PageMeta> = {
  '/': {
    title: 'GP SELECT · Selección e importación de coches en Murcia',
    description: 'Buscamos en Europa el coche que quieres, revisamos cada opción y coordinamos la compra y la importación. Desde Murcia, para clientes de España y Europa.',
  },
  '/vehiculos': {
    title: 'Coches europeos en venta · Catálogo de GP SELECT',
    description: 'Catálogo de coches europeos de GP SELECT, con fotos y datos de cada unidad. Si no está el que buscas, lo buscamos. Desde Murcia, para España y Europa.',
  },
  '/importacion': {
    title: 'Importar un coche de Alemania o de Europa · GP SELECT',
    description: 'Cómo te ayudamos a importar un coche europeo: definimos la búsqueda, comparamos unidades, revisamos su documentación y coordinamos la compra.',
  },
  '/nosotros': {
    title: 'Sobre GP SELECT · Selección de coches europeos en Murcia',
    description: 'Cómo elegimos los coches que te proponemos: primero escuchamos, después comparamos y te contamos lo que sabemos de cada uno y lo que no. Desde Murcia.',
  },
  '/contacto': {
    title: 'Contacto · Cuéntanos qué coche buscas · GP SELECT',
    description: 'Pregúntanos por un coche del catálogo o cuéntanos cuál quieres encontrar en Europa. GP SELECT trabaja desde Murcia con clientes de España y Europa.',
  },
  [pagePaths.home.en]: {
    title: 'GP SELECT · Premium car sourcing and import across Europe',
    description: 'Premium and performance cars from across the EU, sourced for you and delivered to your country. We manage purchase, paperwork and registration from Murcia, Spain.',
  },
  [pagePaths.vehicles.en]: {
    title: 'Premium cars sourced in Europe · GP SELECT',
    description: 'Premium and performance cars from across Europe, with photos and key details for each one. If yours isn’t here, we’ll source it for you.',
  },
  [pagePaths.import.en]: {
    title: 'Import a car from Germany or elsewhere in Europe · GP SELECT',
    description: 'We manage every step of importing a car from Germany or another EU country: search, selection, purchase, paperwork, transport, registration and delivery.',
  },
  [pagePaths.about.en]: {
    title: 'About GP SELECT · European car sourcing from Murcia, Spain',
    description: 'How we work: what we manage on every purchase, what we coordinate with third parties and how we choose the cars we put forward. Based in Murcia, Spain.',
  },
  [pagePaths.contact.en]: {
    title: 'Contact · Tell us which car you want · GP SELECT',
    description: 'Ask about a car in our catalogue or tell us which one you want us to find in Europe. GP SELECT works from Murcia, Spain, with clients across Europe.',
  },
};

/** Legal pages: reachable and followed, but kept out of search results and the sitemap. The English ones
    show the Spanish text, which is the binding version. */
export const legalPageMeta: Record<string, PageMeta> = {
  '/aviso-legal': {
    title: 'Aviso legal · GP SELECT',
    description: 'Datos del titular de GP SELECT, con base en Murcia, y condiciones de uso de la web.',
    robots: 'noindex,follow',
  },
  '/privacidad': {
    title: 'Política de privacidad · GP SELECT',
    description: 'Qué datos trata GP SELECT cuando le escribes, para qué, durante cuánto tiempo y cómo ejercer tus derechos.',
    robots: 'noindex,follow',
  },
  '/cookies': {
    title: 'Política de cookies · GP SELECT',
    description: 'GP SELECT no usa cookies de análisis ni de publicidad: solo almacenamiento técnico en el navegador.',
    robots: 'noindex,follow',
  },
  [pagePaths['aviso-legal'].en]: {
    title: 'Legal notice · GP SELECT',
    description: 'Details of the owner of GP SELECT, based in Murcia, Spain, and the terms of use of this website. Published in Spanish, the binding version.',
    robots: 'noindex,follow', locale: 'en',
  },
  [pagePaths.privacidad.en]: {
    title: 'Privacy policy · GP SELECT',
    description: 'What data GP SELECT processes when you write to us, why, for how long and how to exercise your rights. Published in Spanish, the binding version.',
    robots: 'noindex,follow', locale: 'en',
  },
  [pagePaths.cookies.en]: {
    title: 'Cookie policy · GP SELECT',
    description: 'GP SELECT uses no analytics or advertising cookies, only technical storage in your browser. Published in Spanish, the binding version.',
    robots: 'noindex,follow', locale: 'en',
  },
};

export const notFoundMeta: Record<Locale, PageMeta> = {
  es: {
    title: 'Página no encontrada · GP SELECT',
    description: 'Esta página no está disponible. Consulta el catálogo de GP SELECT o vuelve al inicio para conocer nuestra selección de vehículos europeos.',
    robots: 'noindex',
  },
  en: {
    title: 'Page not found · GP SELECT',
    description: 'This page is not available. Browse the GP SELECT catalogue or go back to the home page to see our selection of European cars.',
    robots: 'noindex', locale: 'en',
  },
};

export const adminMeta: PageMeta = {
  title: 'Administración · GP SELECT',
  description: 'Área privada de administración de GP SELECT.',
  robots: 'noindex,nofollow',
};

// A deployment URL is an origin, never a guessed production domain or a browser URL.
export function parseSiteUrl(value?: string): string | undefined {
  if (!value?.trim()) return undefined;
  try {
    const url = new URL(value.trim());
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password ||
      url.pathname !== '/' || url.search || url.hash) return undefined;
    return url.origin;
  } catch { return undefined; }
}

export function assetUrl(path: string, siteUrl?: string): string {
  return siteUrl ? new URL(path, `${siteUrl}/`).href : path;
}

const places: Record<Locale, { country: string; region: string; continent: string }> = {
  es: { country: 'España', region: 'Región de Murcia', continent: 'Europa' },
  en: { country: 'Spain', region: 'Region of Murcia', continent: 'Europe' },
};

/** Metadata of a page listed in staticPageMeta, with its other-language address for hreflang. */
export function getStaticPageMeta(path: string, siteUrl?: string): PageMeta {
  const match = matchPage(path);
  if (!match || match.page === 'vehicle' || !(path in staticPageMeta)) throw new Error(`Not a static page: ${path}`);
  const { page, locale } = match;
  const meta: PageMeta = { ...staticPageMeta[path], path, locale, alternates: { ...pagePaths[page] } };
  if (page === 'import') return { ...meta, jsonLd: importServiceJsonLd(meta, siteUrl) };
  if (page !== 'home') return meta;
  const place = places[locale];
  return {
    ...meta,
    jsonLd: {
      '@context': 'https://schema.org',
      '@graph': [{
        '@type': 'AutomotiveBusiness', name: 'GP SELECT',
        description: meta.description,
        ...(siteUrl ? { '@id': `${siteUrl}/#organization`, url: `${siteUrl}/` } : {}),
        logo: assetUrl('/assets/seo/logo.png', siteUrl),
        areaServed: [
          { '@type': 'Country', name: place.country },
          { '@type': 'AdministrativeArea', name: place.region },
          { '@type': 'Continent', name: place.continent },
        ],
        address: {
          '@type': 'PostalAddress', addressLocality: 'Murcia',
          addressRegion: 'Región de Murcia', addressCountry: 'ES',
        },
        // The verified WhatsApp number is the business phone until a separate one exists.
        ...(contactConfig.phone || contactConfig.whatsapp ? {
          telephone: contactConfig.phone || `+${contactConfig.whatsapp}`,
        } : {}),
        ...(contactConfig.email ? { email: contactConfig.email } : {}),
        ...(contactConfig.sameAs.length ? { sameAs: contactConfig.sameAs } : {}),
      }, {
        // One website in two languages: the same entity on both homes.
        '@type': 'WebSite', name: 'GP SELECT', inLanguage: ['es', 'en'],
        ...(siteUrl ? {
          '@id': `${siteUrl}/#website`, url: `${siteUrl}/`, publisher: { '@id': `${siteUrl}/#organization` },
        } : {}),
      }],
    },
  };
}

// Describes only what the Import page itself states; no prices, durations or guarantees.
function importServiceJsonLd(meta: PageMeta, siteUrl?: string): Record<string, unknown> {
  const english = meta.locale === 'en';
  const place = places[meta.locale ?? 'es'];
  return {
    '@context': 'https://schema.org', '@type': 'Service',
    name: english ? 'European car sourcing and import' : 'Búsqueda e importación de coches europeos',
    serviceType: english ? 'Vehicle import' : 'Importación de vehículos',
    description: meta.description,
    ...(siteUrl ? { url: `${siteUrl}${meta.path}` } : {}),
    provider: {
      '@type': 'AutomotiveBusiness', name: 'GP SELECT',
      ...(siteUrl ? { '@id': `${siteUrl}/#organization`, url: `${siteUrl}/` } : {}),
      address: { '@type': 'PostalAddress', addressLocality: 'Murcia', addressRegion: 'Región de Murcia', addressCountry: 'ES' },
    },
    areaServed: [{ '@type': 'Country', name: place.country }, { '@type': 'Continent', name: place.continent }],
  };
}

/** English title and description of a vehicle page; the rest of its metadata is shared with Spanish. */
function englishVehicleText(vehicle: VehicleDetail): Pick<PageMeta, 'title' | 'description'> {
  const name = [vehicle.make, vehicle.model, vehicle.variant].filter(Boolean).join(' ');
  const year = vehicle.firstRegistrationYear;
  const titleIdentity = `${name}${year ? ` (${year})` : ''}`;
  const number = (value: number) => value.toLocaleString('en-GB', { useGrouping: true });
  const km = vehicle.mileageKm != null ? `${number(vehicle.mileageKm)} km` : undefined;
  const transmission = translateValue(en.vehicles.values, vehicle.transmission);
  const facts = [km, vehicle.powerHp != null ? `${number(vehicle.powerHp)} hp` : undefined,
    transmission ? `${transmission.toLocaleLowerCase('en-GB')} gearbox` : undefined].filter(Boolean);
  const factList = facts.length > 1 ? `${facts.slice(0, -1).join(', ')} and ${facts.at(-1)}` : facts.join('');
  const fullTitle = `${titleIdentity} · ${km} · GP SELECT`;
  return {
    title: km && fullTitle.length <= 65 ? fullTitle : `${titleIdentity} · GP SELECT`,
    description: `${vehicle.availability === 'sold' ? 'Sold: ' : ''}${name}${year ? ` from ${year}` : ''}${factList ? ` with ${factList}` : ''}.${vehicle.provenance ? ` Origin: ${translateValue(en.vehicles.values, vehicle.provenance)}.` : ''} Photos, specifications and direct enquiries with GP SELECT from Murcia, Spain.`,
  };
}

export function getVehiclePageMeta(vehicle: VehicleDetail, siteUrl?: string, locale: Locale = 'es'): PageMeta {
  const english = locale === 'en';
  const translate = (value: string | null) => english ? translateValue(en.vehicles.values, value) : value;
  const name = [vehicle.make, vehicle.model, vehicle.variant].filter(Boolean).join(' ');
  const year = vehicle.firstRegistrationYear;
  const identity = `${vehicle.make} ${vehicle.model}${year ? ` (${year})` : ''}`;
  const titleIdentity = `${name}${year ? ` (${year})` : ''}`;
  // Explicit grouping includes four-digit values, unlike Intl's es-ES default.
  const number = (value: number) => value.toLocaleString('es-ES', { useGrouping: true });
  const km = vehicle.mileageKm != null ? `${number(vehicle.mileageKm)} km` : undefined;
  const facts = [km, vehicle.powerHp != null ? `${number(vehicle.powerHp)} CV` : undefined,
    vehicle.transmission ? `cambio ${vehicle.transmission.toLocaleLowerCase('es-ES')}` : undefined].filter(Boolean);
  const factList = facts.length > 1 ? `${facts.slice(0, -1).join(', ')} y ${facts.at(-1)}` : facts.join('');
  const fullTitle = `${titleIdentity} · ${km} · GP SELECT`;
  const title = km && fullTitle.length <= 65 ? fullTitle : `${titleIdentity} · GP SELECT`;
  const description = `${vehicle.availability === 'sold' ? 'Vendido: ' : ''}${name}${year ? ` de ${year}` : ''}${factList ? ` con ${factList}` : ''}.${vehicle.provenance ? ` Procedencia: ${vehicle.provenance}.` : ''} Fotos, especificaciones y consulta directa con GP SELECT desde Murcia.`;
  const path = pagePath('vehicle', locale, vehicle.slug);
  const image = vehicle.images?.[0]?.src;
  const publicPrice = ['available', 'coming-soon'].includes(vehicle.availability ?? '') && vehicle.priceEur !== null && vehicle.priceEur > 0;
  const driveWheelConfiguration = new Map([
    ['Integral', 'https://schema.org/AllWheelDriveConfiguration'],
    ['Trasera', 'https://schema.org/RearWheelDriveConfiguration'],
    ['Delantera', 'https://schema.org/FrontWheelDriveConfiguration'],
  ]).get(vehicle.drivetrain ?? '');
  return {
    ...(english ? englishVehicleText(vehicle) : { title, description }),
    path, locale, image, imageAlt: identity,
    ...(siteUrl ? { alternates: { es: pagePath('vehicle', 'es', vehicle.slug), en: pagePath('vehicle', 'en', vehicle.slug) } } : {}),
    jsonLd: {
      '@context': 'https://schema.org', '@graph': [{ '@type': 'Car', name: identity,
        brand: { '@type': 'Brand', name: vehicle.make }, model: vehicle.model,
        // The DTO year is first registration, not a manufacturing/model year.
        ...(year ? { dateVehicleFirstRegistration: String(year) } : {}),
        ...(siteUrl ? { url: `${siteUrl}${path}` } : {}),
        ...(image ? { image: assetUrl(image, siteUrl) } : {}),
        ...(!english && vehicle.description ? { description: vehicle.description } : {}),
        ...(vehicle.mileageKm !== null ? { mileageFromOdometer: {
          '@type': 'QuantitativeValue', value: vehicle.mileageKm, unitCode: 'KMT',
        } } : {}),
        ...(vehicle.fuelType ? { fuelType: translate(vehicle.fuelType) } : {}),
        ...(vehicle.transmission ? { vehicleTransmission: translate(vehicle.transmission) } : {}),
        ...(vehicle.exteriorColour ? { color: translate(vehicle.exteriorColour) } : {}),
        ...(vehicle.bodyType ? { bodyType: translate(vehicle.bodyType) } : {}),
        ...(driveWheelConfiguration ? { driveWheelConfiguration } : {}),
        ...(vehicle.powerHp != null ? { vehicleEngine: {
          '@type': 'EngineSpecification',
          enginePower: { '@type': 'QuantitativeValue', value: vehicle.powerHp, unitText: english ? 'hp' : 'CV' },
        } } : {}),
        ...(publicPrice ? { offers: {
          '@type': 'Offer', price: vehicle.priceEur, priceCurrency: 'EUR',
          availability: `https://schema.org/${vehicle.availability === 'available' ? 'InStock' : 'PreOrder'}`,
          ...(siteUrl ? { url: `${siteUrl}${path}` } : {}),
        } } : {}),
      }, ...(siteUrl ? [{
        '@type': 'BreadcrumbList', itemListElement: [
          { '@type': 'ListItem', position: 1, name: english ? 'Home' : 'Inicio', item: `${siteUrl}${pagePath('home', locale)}` },
          { '@type': 'ListItem', position: 2, name: english ? 'Vehicles' : 'Vehículos', item: `${siteUrl}${pagePath('vehicles', locale)}` },
          { '@type': 'ListItem', position: 3, name: identity, item: `${siteUrl}${path}` },
        ],
      }] : [])],
    },
  };
}

/** Shared serialization keeps build HTML and client navigation identical. */
export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]!);
}

export function renderPageHead(meta: PageMeta, siteUrl?: string): string {
  const canonical = siteUrl && meta.path ? `${siteUrl}${meta.path}` : undefined;
  const image = assetUrl(meta.image || '/assets/seo/og-default.jpg', siteUrl);
  const english = meta.locale === 'en';
  const imageAlt = meta.image ? meta.imageAlt || meta.title
    : english ? 'GP SELECT · Murcia · Clients in Spain and Europe' : 'GP SELECT · Murcia · Clientes en España y Europa';
  const tags: string[] = [];
  const addMeta = (attribute: 'name' | 'property', key: string, value: string) => {
    tags.push(`<meta data-page-meta ${attribute}="${key}" content="${escapeHtml(value)}">`);
  };
  tags.push(`<title data-page-meta>${escapeHtml(meta.tabTitle || meta.title)}</title>`);
  addMeta('name', 'description', meta.description);
  addMeta('name', 'robots', meta.robots || 'index,follow');
  if (canonical) tags.push(`<link data-page-meta rel="canonical" href="${escapeHtml(canonical)}">`);
  // Each language version lists both, itself included; x-default is the English page (approved architecture).
  if (siteUrl && meta.alternates) {
    const alternates = [['es', meta.alternates.es], ['en', meta.alternates.en], ['x-default', meta.alternates.en]];
    for (const [language, path] of alternates) {
      tags.push(`<link data-page-meta rel="alternate" hreflang="${language}" href="${escapeHtml(`${siteUrl}${path}`)}">`);
    }
  }
  addMeta('property', 'og:type', 'website');
  addMeta('property', 'og:title', meta.title);
  addMeta('property', 'og:description', meta.description);
  addMeta('property', 'og:locale', english ? 'en_GB' : 'es_ES');
  if (meta.alternates) addMeta('property', 'og:locale:alternate', english ? 'es_ES' : 'en_GB');
  addMeta('property', 'og:site_name', 'GP SELECT');
  if (canonical) addMeta('property', 'og:url', canonical);
  addMeta('property', 'og:image', image);
  addMeta('property', 'og:image:alt', imageAlt);
  if (!meta.image) {
    addMeta('property', 'og:image:type', 'image/jpeg');
    addMeta('property', 'og:image:width', '1200');
    addMeta('property', 'og:image:height', '630');
  }
  addMeta('name', 'twitter:card', 'summary_large_image');
  addMeta('name', 'twitter:title', meta.title);
  addMeta('name', 'twitter:description', meta.description);
  addMeta('name', 'twitter:image', image);
  addMeta('name', 'twitter:image:alt', imageAlt);
  if (meta.jsonLd) {
    // Escaping '<' prevents DTO text from closing a script in static HTML.
    const json = JSON.stringify(meta.jsonLd).replace(/</g, '\\u003c');
    tags.push(`<script data-page-meta type="application/ld+json">${json}</script>`);
  }
  return tags.join('\n    ');
}
