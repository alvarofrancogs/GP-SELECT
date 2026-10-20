import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider, useNavigate } from 'react-router-dom';
import { LanguageProvider } from '../i18n/LanguageProvider';
import { Vehicles } from './Vehicles';
import { rememberCatalogue } from '../lib/catalogueReturn';
import { es } from '../i18n/es';
import type { VehicleSummary } from '../types/vehicle';
import { listVehicles } from '../services/vehicles';
import { catalogueReturn } from '../lib/catalogueReturn';

const cars: VehicleSummary[] = Array.from({ length: 20 }, (_, i) => ({
  slug: `car-${i}`, make: 'BMW', model: `M${i}`, variant: null, firstRegistrationYear: 2020, firstRegistrationMonth: null,
  mileageKm: 1000 * i, priceEur: 50000 + i, powerHp: 300, fuelType: i % 2 ? 'Gasolina' : 'Diésel', transmission: 'Automático',
  bodyType: 'Coupé', availability: 'available', images: null, video: null,
}));

vi.mock('../services/vehicles', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/vehicles')>();
  return { ...actual, getInitialVehicles: () => null, consumeInitialVehicles: () => {}, listVehicles: vi.fn(async () => cars) };
});

/** Stands in for the vehicle page: what matters is how it was reached and how it goes back. */
function Detail() {
  const navigate = useNavigate();
  return <button type="button" onClick={() => navigate(-1)}>atrás</button>;
}

function renderCatalogue(search = '', first = false) {
  const router = createMemoryRouter([
    { path: '/vehiculos', element: <LanguageProvider><Vehicles /></LanguageProvider> },
    { path: '/vehiculos/:slug', element: <Detail /> },
  ], { initialEntries: first ? [`/vehiculos${search}`] : ['/', `/vehiculos${search}`], initialIndex: first ? 0 : 1 });
  render(<RouterProvider router={router} />);
  return router;
}

const cards = () => document.querySelectorAll('.vehicle-card').length;

describe('back from a vehicle page to the catalogue', () => {
  let scrolled: number[];
  beforeEach(() => {
    scrolled = [];
    // Each test is one page load: no return point that could match its catalogue.
    rememberCatalogue({ search: '?none', scrollY: 0, count: 0 });
    Element.prototype.scrollIntoView = vi.fn();
    window.matchMedia = vi.fn((query: string) => ({ matches: false, media: query, addEventListener() {}, removeEventListener() {},
      addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false })) as typeof window.matchMedia;
    window.scrollTo = vi.fn((x: number | ScrollToOptions, y?: number) => {
      scrolled.push(typeof x === 'number' ? y! : x.top ?? 0);
    }) as typeof window.scrollTo;
  });
  afterEach(() => {
    Object.defineProperty(window, 'scrollY', { value: 0, configurable: true });
    vi.mocked(listVehicles).mockImplementation(async () => cars);
  });

  it.each([false, true])('keeps the filters, the revealed batch and the scroll position (catalogue opened first: %s)', async (first) => {
    const router = renderCatalogue('?fuelType=Gasolina', first);
    await screen.findAllByRole('link', { name: /BMW/ }, { timeout: 5000 });
    expect(cards()).toBe(9);
    fireEvent.click(screen.getByRole('button', { name: new RegExp(es.vehicles.showMore) }));
    expect(cards()).toBe(10); // ten petrol cars in all
    Object.defineProperty(window, 'scrollY', { value: 1240, configurable: true });
    fireEvent.click(document.querySelectorAll<HTMLAnchorElement>('.vehicle-card')[9]);
    const back = await screen.findByRole('button', { name: 'atrás' }, { timeout: 5000 });
    expect(router.state.location.pathname).toBe('/vehiculos/car-19');

    scrolled = [];
    fireEvent.click(back);
    await screen.findAllByRole('link', { name: /BMW/ }, { timeout: 5000 });
    await waitFor(() => {
      expect(router.state.location.search).toBe('?fuelType=Gasolina');
      expect(cards()).toBe(10);
      expect(scrolled.at(-1)).toBe(1240);
    }, { timeout: 5000 });
  }, 20000);

  it('starts at the top when the catalogue is opened again from the menu', async () => {
    const router = renderCatalogue();
    await screen.findAllByRole('link', { name: /BMW/ });
    Object.defineProperty(window, 'scrollY', { value: 800, configurable: true });
    fireEvent.click(document.querySelectorAll<HTMLAnchorElement>('.vehicle-card')[3]);
    scrolled = [];
    await act(() => router.navigate('/vehiculos'));
    await screen.findAllByRole('link', { name: /BMW/ });
    expect(cards()).toBe(9);
    expect(scrolled).not.toContain(800);
  });

  it('keeps sold cars outside filters, price markup and video preview, and restores the main batch from a sold detail', async () => {
    const sold: VehicleSummary = { ...cars[0], slug: 'sold-car', make: 'Sold Make', model: 'Sold Model', priceEur: 99999, availability: 'sold', video: '/sold.mp4' };
    vi.mocked(listVehicles).mockResolvedValue([...cars, sold]);
    const router = renderCatalogue();
    await screen.findByRole('heading', { name: es.vehicles.soldTitle });
    const section = document.querySelector('.vehicle-sold')!;
    expect(section.textContent).not.toContain('99.999');
    expect(section.querySelector('video')).toBeNull();
    expect(section.querySelector('h3')?.textContent).toBe('Sold Make Sold Model');
    expect(section.querySelector('.sold-vehicle__status')?.textContent).toBe(es.vehicles.sold);
    expect(screen.getByRole('link', { name: /Sold Make Sold Model.*Vendido Ver vehículo/ })).toBeTruthy();
    expect(document.querySelector('#vehicle-results')?.textContent).not.toContain('Sold Make');
    // The make filter lists the cars in stock only (its closed list is in the DOM): a sold make is never offered.
    expect(screen.getByRole('combobox', { name: es.vehicles.make })).toBeTruthy();
    expect(document.querySelector('.vehicle-filters')?.textContent).not.toContain('Sold Make');
    fireEvent.click(screen.getByRole('button', { name: es.vehicles.showMore }));
    Object.defineProperty(window, 'scrollY', { value: 3200, configurable: true });
    fireEvent.click(section.querySelector('a')!);
    expect(router.state.location.pathname).toBe('/vehiculos/sold-car');
    expect(catalogueReturn()?.count).toBe(18);
    fireEvent.click(screen.getByRole('button', { name: 'atrás' }));
    await screen.findByRole('heading', { name: es.vehicles.soldTitle });
    expect(document.querySelectorAll('#vehicle-results .vehicle-card')).toHaveLength(18);
    expect(scrolled.at(-1)).toBe(3200);
  });

  it('keeps sold cars visible when the available list is filtered and sorted', async () => {
    vi.mocked(listVehicles).mockResolvedValue([...cars, { ...cars[0], slug: 'sold-car', availability: 'sold' }]);
    renderCatalogue('?fuelType=Gasolina&sort=priceDesc');
    await screen.findByRole('heading', { name: es.vehicles.soldTitle });
    expect(screen.getByRole('heading', { name: es.vehicles.soldTitle })).toBeTruthy();
    expect(document.querySelectorAll('.vehicle-grid--sold .sold-vehicle')).toHaveLength(1);
    expect(document.querySelector('#vehicle-results')?.textContent).not.toContain('Diésel');
    expect(document.querySelector('#vehicle-results h2')?.textContent).toBe('BMW M19');
  });

  it('shows the available-list empty state and no filters when only sold cars exist', async () => {
    vi.mocked(listVehicles).mockResolvedValue([{ ...cars[0], availability: 'sold' }]);
    renderCatalogue();
    await screen.findByRole('heading', { name: es.vehicles.emptyCurrent });
    expect(document.querySelector('.vehicle-filters')).toBeNull();
    expect(screen.getByRole('heading', { name: es.vehicles.soldTitle })).toBeTruthy();
  });
});
