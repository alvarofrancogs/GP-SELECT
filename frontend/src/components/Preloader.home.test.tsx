import { expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../i18n/LanguageProvider';
import { prefetchVehicles } from '../services/vehicles';
import { Preloader } from './Preloader';

vi.mock('../services/vehicles', () => ({ prefetchVehicles: vi.fn(() => Promise.resolve()) }));

// The preloader plays once per page load (module state), so each file renders it once: this one on the Home.
it('fetches the vehicle list on the Home, where the featured vehicle needs it', () => {
  window.matchMedia = vi.fn((query: string) => ({ matches: false, media: query, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia;
  HTMLImageElement.prototype.decode = () => Promise.resolve();
  Object.defineProperty(document, 'fonts', { value: { ready: Promise.resolve() }, configurable: true });
  const { container } = render(<MemoryRouter initialEntries={['/']}><LanguageProvider><Preloader /></LanguageProvider></MemoryRouter>);
  expect(container.querySelector('.preloader')).not.toBeNull();
  expect(prefetchVehicles).toHaveBeenCalledTimes(1);
});
