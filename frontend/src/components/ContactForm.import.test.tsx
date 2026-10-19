import { afterEach, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../i18n/LanguageProvider';
import { es } from '../i18n/es';
import { ContactForm } from './ContactForm';

vi.mock('../config/contact', async (original) => ({ ...await original<typeof import('../config/contact')>(), enquiriesEnabled: true }));
afterEach(() => vi.unstubAllGlobals());

it.each(['delivery', 'vehicle', 'year', 'mileage', 'budget', 'timeframe', 'message'])('announces the import %s server error at the right field without losing the draft', async (field) => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ field }), { status: 400 })));
  const { container } = render(<MemoryRouter><LanguageProvider><ContactForm configuration="import" intent="search" /></LanguageProvider></MemoryRouter>);
  const input = (name: string) => container.querySelector<HTMLInputElement>(`[name="${name}"]`)!;
  for (const [name, value] of Object.entries({ name: 'Alex Smith', email: 'alex@example.test', delivery: 'Murcia', make: 'BMW', model: 'M4 CS' })) {
    fireEvent.change(input(name), { target: { value } });
  }
  fireEvent.click(screen.getByRole('button', { name: es.interiors.contact.submit }));
  const invalid = input(field === 'vehicle' ? 'make' : field);
  await waitFor(() => {
    expect(invalid.getAttribute('aria-invalid')).toBe('true');
    expect(document.activeElement).toBe(invalid);
    const error = screen.getByRole('alert');
    expect(invalid.getAttribute('aria-describedby')?.split(' ')).toContain(error.id);
  }, { timeout: 5000 });
  expect(input('model').value).toBe('M4 CS');
}, 10000);
