import { contactConfig } from '../config/contactChannels';
import type { VehicleDetail } from '../types/vehicle';

export interface PageMeta {
  title: string;
  description: string;
  path?: string;
  robots?: string;
  image?: string;
  imageAlt?: string;
  jsonLd?: Record<string, unknown>;
  /** The tab can follow the selected language; search/social copy stays Spanish. */
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
};

/** Legal pages: reachable and followed, but kept out of search results and the sitemap. */
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
};

export const notFoundMeta: PageMeta = {
  title: 'Página no encontrada · GP SELECT',
  description: 'Esta página no está disponible. Consulta el catálogo de GP SELECT o vuelve al inicio para conocer nuestra selección de vehículos europeos.',
  robots: 'noindex',
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

export function getStaticPageMeta(path: string, siteUrl?: string): PageMeta {
  const meta = { ...staticPageMeta[path], path };
  if (path === '/importacion') return { ...meta, jsonLd: importServiceJsonLd(siteUrl) };
  if (path !== '/') return meta;
  return {
    ...meta,
    jsonLd: {
      '@context': 'https://schema.org',
      '@graph': [{
        '@type': 'AutoDealer', name: 'GP SELECT',
        description: meta.description,
        ...(siteUrl ? { '@id': `${siteUrl}/#organization`, url: `${siteUrl}/` } : {}),
        logo: assetUrl('/assets/seo/logo.png', siteUrl),
        areaServed: [
          { '@type': 'Country', name: 'España' },
          { '@type': 'AdministrativeArea', name: 'Región de Murcia' },
          { '@type': 'Continent', name: 'Europa' },
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
        '@type': 'WebSite', name: 'GP SELECT', inLanguage: 'es-ES',
        ...(siteUrl ? {
          '@id': `${siteUrl}/#website`, url: `${siteUrl}/`, publisher: { '@id': `${siteUrl}/#organization` },
        } : {}),
      }],
    },
  };
}

// Describes only what the Import page itself states; no prices, durations or guarantees.
function importServiceJsonLd(siteUrl?: string): Record<string, unknown> {
  return {
    '@context': 'https://schema.org', '@type': 'Service',
    name: 'Búsqueda e importación de coches europeos',
    serviceType: 'Importación de vehículos',
    description: staticPageMeta['/importacion'].description,
    ...(siteUrl ? { url: `${siteUrl}/importacion` } : {}),
    provider: {
      '@type': 'AutoDealer', name: 'GP SELECT',
      ...(siteUrl ? { '@id': `${siteUrl}/#organization`, url: `${siteUrl}/` } : {}),
      address: { '@type': 'PostalAddress', addressLocality: 'Murcia', addressRegion: 'Región de Murcia', addressCountry: 'ES' },
    },
    areaServed: [{ '@type': 'Country', name: 'España' }, { '@type': 'Continent', name: 'Europa' }],
  };
}

export function getVehiclePageMeta(vehicle: VehicleDetail, siteUrl?: string): PageMeta {
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
  const path = `/vehiculos/${encodeURIComponent(vehicle.slug)}`;
  const image = vehicle.images?.[0]?.src;
  const publicPrice = ['available', 'coming-soon'].includes(vehicle.availability ?? '') && vehicle.priceEur !== null && vehicle.priceEur > 0;
  const driveWheelConfiguration = new Map([
    ['Integral', 'https://schema.org/AllWheelDriveConfiguration'],
    ['Trasera', 'https://schema.org/RearWheelDriveConfiguration'],
    ['Delantera', 'https://schema.org/FrontWheelDriveConfiguration'],
  ]).get(vehicle.drivetrain ?? '');
  return {
    title, description,
    path, image, imageAlt: identity,
    jsonLd: {
      '@context': 'https://schema.org', '@graph': [{ '@type': 'Car', name: identity,
        brand: { '@type': 'Brand', name: vehicle.make }, model: vehicle.model,
        // The DTO year is first registration, not a manufacturing/model year.
        ...(year ? { dateVehicleFirstRegistration: String(year) } : {}),
        ...(siteUrl ? { url: `${siteUrl}${path}` } : {}),
        ...(image ? { image: assetUrl(image, siteUrl) } : {}),
        ...(vehicle.description ? { description: vehicle.description } : {}),
        ...(vehicle.mileageKm !== null ? { mileageFromOdometer: {
          '@type': 'QuantitativeValue', value: vehicle.mileageKm, unitCode: 'KMT',
        } } : {}),
        ...(vehicle.fuelType ? { fuelType: vehicle.fuelType } : {}),
        ...(vehicle.transmission ? { vehicleTransmission: vehicle.transmission } : {}),
        ...(vehicle.exteriorColour ? { color: vehicle.exteriorColour } : {}),
        ...(vehicle.bodyType ? { bodyType: vehicle.bodyType } : {}),
        ...(driveWheelConfiguration ? { driveWheelConfiguration } : {}),
        ...(vehicle.powerHp != null ? { vehicleEngine: {
          '@type': 'EngineSpecification',
          enginePower: { '@type': 'QuantitativeValue', value: vehicle.powerHp, unitText: 'CV' },
        } } : {}),
        ...(publicPrice ? { offers: {
          '@type': 'Offer', price: vehicle.priceEur, priceCurrency: 'EUR',
          availability: `https://schema.org/${vehicle.availability === 'available' ? 'InStock' : 'PreOrder'}`,
          seller: { '@type': 'AutoDealer', name: 'GP SELECT', ...(siteUrl ? { '@id': `${siteUrl}/#organization` } : {}) },
          ...(siteUrl ? { url: `${siteUrl}${path}` } : {}),
        } } : {}),
      }, ...(siteUrl ? [{
        '@type': 'BreadcrumbList', itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Inicio', item: `${siteUrl}/` },
          { '@type': 'ListItem', position: 2, name: 'Vehículos', item: `${siteUrl}/vehiculos` },
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
  const imageAlt = meta.image ? meta.imageAlt || meta.title : 'GP SELECT · Murcia · Clientes en España y Europa';
  const tags: string[] = [];
  const addMeta = (attribute: 'name' | 'property', key: string, value: string) => {
    tags.push(`<meta data-page-meta ${attribute}="${key}" content="${escapeHtml(value)}">`);
  };
  tags.push(`<title data-page-meta>${escapeHtml(meta.tabTitle || meta.title)}</title>`);
  addMeta('name', 'description', meta.description);
  addMeta('name', 'robots', meta.robots || 'index,follow');
  if (canonical) tags.push(`<link data-page-meta rel="canonical" href="${escapeHtml(canonical)}">`);
  addMeta('property', 'og:type', 'website');
  addMeta('property', 'og:title', meta.title);
  addMeta('property', 'og:description', meta.description);
  addMeta('property', 'og:locale', 'es_ES');
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
