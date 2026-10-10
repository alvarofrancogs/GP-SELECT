import { expect, it } from 'vitest';
import { renderReadableContent } from './readableContent';

it('leaves one empty vehicle-list marker pair inside the catalogue main', () => {
  const html = renderReadableContent('/vehiculos');
  const markers = '<!--vehicle-list--><!--/vehicle-list-->';
  expect(html.split(markers)).toHaveLength(2);
  expect(html).toMatch(/<main>[\s\S]*<\/p><!--vehicle-list--><!--\/vehicle-list--><section>[\s\S]*<\/main>/);
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
