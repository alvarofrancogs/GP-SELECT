import { expect, it } from 'vitest';
import { renderReadableContent } from './readableContent';

it('leaves one empty vehicle-list marker pair inside the catalogue main', () => {
  const html = renderReadableContent('/vehiculos');
  const markers = '<!--vehicle-list--><!--/vehicle-list-->';
  expect(html.split(markers)).toHaveLength(2);
  expect(html).toMatch(/<main>[\s\S]*<\/p><!--vehicle-list--><!--\/vehicle-list--><section>[\s\S]*<\/main>/);
});
