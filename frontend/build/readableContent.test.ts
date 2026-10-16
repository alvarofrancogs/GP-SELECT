import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { readableHead, renderLlmsText, renderReadableContent } from './readableContent';
import { entityCopy } from '../src/i18n/entityCopy';
import { es } from '../src/i18n/es';
import { en } from '../src/i18n/en';
import { escapeHtml, legalPageMeta, staticPageMeta } from '../src/lib/pageMeta';

it('leaves one empty vehicle-list marker pair inside the catalogue main', () => {
  const html = renderReadableContent('/vehiculos');
  const markers = '<!--vehicle-list--><!--/vehicle-list-->';
  expect(html.split(markers)).toHaveLength(2);
  expect(html).toMatch(/<main>[\s\S]*<\/h1><!--vehicle-list--><!--\/vehicle-list--><section>[\s\S]*<\/main>/);
});

it.each([
  ['/importacion', es.interiors.import],
  ['/nosotros', es.interiors.about],
  ['/vehiculos', es.vehicles],
  ['/contacto', es.interiors.contact],
  ['/en/import', en.interiors.import],
  ['/en/about', en.interiors.about],
  ['/en/vehicles', en.vehicles],
  ['/en/contact', en.interiors.contact],
])('includes the visible title and lede in the readable H1 on %s', (path, { title, lede }) => {
  const html = renderReadableContent(path);
  expect(html).toContain(`<h1>${escapeHtml(title)} <span class="static-content__lede">${escapeHtml(lede)}</span></h1>`);
});

it('renders the English pages from the English dictionaries, with English links', () => {
  const home = renderReadableContent('/en');
  expect(home).toContain('<h1>Sourced in Europe</h1>');
  expect(home).toContain('href="/en/vehicles"');
  expect(home).not.toMatch(/href="\/(vehiculos|importacion|nosotros|contacto)/);
  expect(renderReadableContent('/en/vehicles').split('<!--vehicle-list--><!--/vehicle-list-->')).toHaveLength(2);
  expect(renderReadableContent('/en/import')).toContain('href="/en/contact?intent=search&amp;source=importacion"');
  expect(renderReadableContent('/en/404.html')).toContain('href="/en"');
});

it('keeps the legal text in Spanish on the English legal pages, with the binding note', () => {
  const html = renderReadableContent('/en/privacy');
  expect(html).toContain('<div lang="es"><h1>Política de privacidad</h1>');
  expect(html).toContain('<p lang="en">This legal information is published in Spanish');
  expect(html).not.toContain('href="/cookies"');
});

it.each([
  ['/importacion', 'Importación llave en mano: qué gestionamos, paso a paso.', '1 · Búsqueda', 'Impuestos y trámites, según tu país.', '¿Qué incluye el servicio?'],
  ['/en/import', 'End-to-end import: what we manage, step by step.', '1 · Search', 'Taxes and paperwork depend on your country.', 'What does the service include?'],
])('includes the new import sections and FAQ in %s without JavaScript', (path, stages, firstStage, taxes, firstQuestion) => {
  const html = renderReadableContent(path);
  for (const title of [stages, taxes]) expect(html).toContain(`<h2>${title}</h2>`);
  for (const title of [firstStage, firstQuestion]) expect(html).toContain(`<h3>${title}</h3>`);
  expect(html.indexOf(stages)).toBeLessThan(html.indexOf(taxes));
  expect(html.indexOf(taxes)).toBeLessThan(html.indexOf(firstQuestion));
  expect(html).not.toContain('FAQPage');
});

it.each([
  ['/nosotros', 'Qué hacemos nosotros y qué coordinamos con terceros.', 'Lo que hace GP SELECT', '/aviso-legal'],
  ['/en/about', 'What we do ourselves, and what we coordinate.', 'What GP SELECT does', '/en/legal-notice'],
])('includes the new about rows and legal link in %s without JavaScript', (path, title, firstRow, legalPath) => {
  const html = renderReadableContent(path);
  expect(html).toContain(`<h2>${title}</h2>`);
  expect(html).toContain(`<h3>${firstRow}</h3>`);
  expect(html).toContain(`href="${legalPath}"`);
});

it('uses the approved entity summary in both languages of llms.txt', () => {
  const llms = renderLlmsText();
  expect(llms).toContain(`> ${entityCopy.es}`);
  expect(llms).toContain(`## English\n\n> ${entityCopy.en}`);
});

it.each([
  ['/contacto', 'Quiero que GP SELECT lo busque por mí', 'Leemos tu solicitud y te contactamos.'],
  ['/en/contact', 'I want GP SELECT to find it for me', 'We read your request and get back to you.'],
])('renders the updated contact path and next steps in %s', (path, option, firstStep) => {
  const html = renderReadableContent(path);
  expect(html).toContain(option);
  expect(html).toContain(`<ol><li>${firstStep}</li>`);
});

it.each([
  ['/guias/importar-un-coche-de-europa', 'Guía', 'Dentro de la Unión Europea.', 'Revisada el'],
  ['/en/guides/importing-a-car-from-europe', 'Guide', 'Within the European Union.', 'Reviewed on'],
])('renders the import guide in %s with its review date and official sources', (path, title, section, reviewed) => {
  const html = renderReadableContent(path);
  expect(html).toContain(`<h1>${title} <span class="static-content__lede">`);
  expect(html).toContain(`<h2>${section}</h2>`);
  expect(html).toContain(`${reviewed} <time datetime="2026-10-13">`);
  expect(html).toContain('href="https://www.dgt.es/');
  expect(html).not.toContain('FAQPage');
});

it.each([['/importacion', '/guias/importar-un-coche-de-europa'], ['/en/import', '/en/guides/importing-a-car-from-europe']])(
  'links %s to the guide from its taxes section', (path, guide) => {
    expect(renderReadableContent(path)).toContain(`href="${guide}"`);
  });

it('lists the guide in llms.txt in both languages', () => {
  const llms = renderLlmsText('https://gpselect.com');
  expect(llms).toContain('(https://gpselect.com/guias/importar-un-coche-de-europa)');
  expect(llms).toContain('(https://gpselect.com/en/guides/importing-a-car-from-europe)');
});


it('links each English page only to English pages', () => {
  const english = [...Object.keys(staticPageMeta), ...Object.keys(legalPageMeta)].filter((path) => path.startsWith('/en'));
  for (const path of [...english, '/en/404.html']) {
    const internal = [...renderReadableContent(path).matchAll(/href="(\/[^"]*)"/g)].map((match) => match[1]);
    expect(internal.length, path).toBeGreaterThan(0);
    expect(internal.filter((href) => href !== '/en' && !href.startsWith('/en/')), path).toEqual([]);
  }
});

it.each([
  ['/', '/vehiculos'], ['/en', '/en/vehicles'],
  ['/importacion', '/guias/importar-un-coche-de-europa'], ['/en/import', '/en/guides/importing-a-car-from-europe'],
  ['/guias/importar-un-coche-de-europa', '/importacion'], ['/en/guides/importing-a-car-from-europe', '/en/import'],
  ['/nosotros', '/importacion'], ['/en/about', '/en/import'],
])('links %s to %s in its content', (path, target) => {
  const main = renderReadableContent(path).split('</main>')[0];
  expect(main).toContain(`href="${target}"`);
});

it('lists the hash of every inline script and style in the Caddy CSP', () => {
  // Tests run from frontend/.
  const caddyfile = readFileSync('../deploy/Caddyfile', 'utf8');
  const inline = [...readableHead.matchAll(/<(script|style)>([\s\S]*?)<\/\1>/g)];
  expect(inline).toHaveLength(2);
  for (const [, tag, body] of inline)
    expect(caddyfile, tag).toContain(`'sha256-${createHash('sha256').update(body).digest('base64')}'`);
});
