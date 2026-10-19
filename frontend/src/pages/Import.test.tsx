import { afterEach, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../i18n/LanguageProvider';
import { es } from '../i18n/es';
import { en } from '../i18n/en';
import { Import } from './Import';

vi.mock('../config/contact', async (original) => ({ ...await original<typeof import('../config/contact')>(), enquiriesEnabled: false }));
afterEach(() => vi.unstubAllGlobals());

it.each([['/importacion', es], ['/en/import', en]])('keeps all editorial content in closed native disclosures on %s', (path, copy) => {
  const { container } = render(<MemoryRouter initialEntries={[path]}><LanguageProvider><Import /></LanguageProvider></MemoryRouter>);
  const text = copy.interiors.import;
  expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  const opening = container.querySelector('.import-opening')!;
  expect(Array.from(opening.children, (child) => child.className)).toEqual(['import-opening__header', 'import-opening__form', 'import-opening__information']);
  const disclosures = container.querySelectorAll('details');
  expect(disclosures).toHaveLength(12);
  expect(Array.from(disclosures).every((detail) => !detail.open)).toBe(true);
  expect(container.querySelector('img')).toBeNull();
  for (const block of [text.define, text.search, text.analysis, text.support, text.taxes, ...text.stages.rows, ...text.faq.rows]) expect(container.textContent).toContain(block.body);
  expect(screen.getByRole('link', { name: text.taxes.guide })).toBeTruthy();
  const anchor = screen.getByRole('link', { name: text.backToForm });
  fireEvent.click(anchor);
  expect(document.activeElement).toBe(container.querySelector('#import-form'));
});

it('keeps import vehicle optional and message required, with honest preview and editable draft', async () => {
  vi.stubGlobal('fetch', vi.fn());
  render(<MemoryRouter initialEntries={['/importacion']}><LanguageProvider><Import /></LanguageProvider></MemoryRouter>);
  const text = es.interiors.contact;
  const fill = (label: string, value: string) => fireEvent.change(screen.getByLabelText(new RegExp(`^${label}`)), { target: { value } });
  fill(text.fields.name, 'Alex Smith'); fill(text.fields.email, 'alex@example.test'); fill(text.fields.message, 'short');
  fireEvent.click(screen.getByRole('button', { name: text.submit }));
  expect(document.activeElement).toBe(screen.getByLabelText(new RegExp(`^${text.fields.message}`)));
  fill(text.fields.message, 'A family car for long trips.');
  fireEvent.click(screen.getByRole('button', { name: text.submit }));
  await screen.findByText(text.successTitle);
  expect(screen.queryByText(text.sentTitle)).toBeNull();
  expect(fetch).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: text.edit }));
  expect((screen.getByLabelText(new RegExp(`^${text.fields.message}`)) as HTMLTextAreaElement).value).toBe('A family car for long trips.');
});
