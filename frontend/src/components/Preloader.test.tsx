import { expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../i18n/LanguageProvider';
import { prefetchVehicles } from '../services/vehicles';
import { Preloader } from './Preloader';

vi.mock('../services/vehicles', () => ({ prefetchVehicles: vi.fn(() => Promise.resolve()) }));

// The preloader plays once per page load (module state), so each file renders it once: this one on Contact.
it('does not download the whole catalogue on a page that does not list vehicles', () => {
  window.matchMedia = vi.fn((query: string) => ({ matches: false, media: query, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia;
  Object.defineProperty(document, 'fonts', { value: { ready: Promise.resolve() }, configurable: true });
  const { container } = render(<MemoryRouter initialEntries={['/contacto']}><LanguageProvider><Preloader /></LanguageProvider></MemoryRouter>);
  expect(container.querySelector('.preloader')).not.toBeNull();
  expect(prefetchVehicles).not.toHaveBeenCalled();
});
