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

it('requires delivery, make and model, with optional details and an editable preview draft', async () => {
  vi.stubGlobal('fetch', vi.fn());
  render(<MemoryRouter initialEntries={['/importacion']}><LanguageProvider><Import /></LanguageProvider></MemoryRouter>);
  const text = es.interiors.contact;
  const fields = es.interiors.import.formFields;
  const input = (label: string) => screen.getByLabelText((name) => name.startsWith(label));
  const fill = (label: string, value: string) => fireEvent.change(input(label), { target: { value } });
  fill(text.fields.name, 'Alex Smith'); fill(text.fields.email, 'alex@example.test');
  fireEvent.click(screen.getByRole('button', { name: text.submit }));
  expect(document.activeElement).toBe(input(fields.delivery));
  fill(fields.delivery, 'Murcia, Spain');
  fireEvent.click(screen.getByRole('button', { name: text.submit }));
  expect(document.activeElement).toBe(input(fields.make));
  fill(fields.make, 'BMW'); fill(fields.model, 'M4 CS');
  fireEvent.click(screen.getByRole('button', { name: text.submit }));
  await screen.findByText(text.successTitle);
  expect(screen.queryByText(text.sentTitle)).toBeNull();
  expect(fetch).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: text.edit }));
  expect((input(fields.model) as HTMLInputElement).value).toBe('M4 CS');
  expect((input(fields.message) as HTMLTextAreaElement).value).toBe('');
});

it.each([['/importacion', es], ['/en/import', en]])('labels and orders every import field on %s', (path, copy) => {
  const { container } = render(<MemoryRouter initialEntries={[path]}><LanguageProvider><Import /></LanguageProvider></MemoryRouter>);
  const inputs = Array.from(container.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('form input, form textarea'));
  expect(inputs.map((input) => input.name)).toEqual(['name', 'email', 'phone', 'delivery', 'make', 'model', 'year', 'mileage', 'budget', 'timeframe', 'message']);
  expect(inputs.filter((input) => input.required).map((input) => input.name)).toEqual(['name', 'email', 'delivery', 'make', 'model']);
  for (const input of inputs) {
    expect(container.querySelector(`label[for="${input.id}"]`)?.textContent).toBeTruthy();
    for (const id of input.getAttribute('aria-describedby')?.split(' ') ?? []) expect(document.getElementById(id)).toBeTruthy();
  }
  expect(screen.getByPlaceholderText(copy.interiors.import.placeholders.delivery)).toBe(inputs[3]);
});

it('opens and closes native disclosures instantly without animation support, retaining their copy', () => {
  const { container } = render(<MemoryRouter><LanguageProvider><Import /></LanguageProvider></MemoryRouter>);
  const details = container.querySelector('details')!;
  const summary = details.querySelector('summary')!;
  const body = details.querySelector('.editorial-disclosure__panel')!;
  fireEvent.click(summary);
  expect(details.open).toBe(true);
  fireEvent.click(summary);
  expect(details.open).toBe(false);
  expect(details.querySelector('.editorial-disclosure__panel')).toBe(body);
  expect(body.textContent).toContain(es.interiors.import.define.body);
});
