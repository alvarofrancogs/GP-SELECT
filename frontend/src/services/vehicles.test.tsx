import { StrictMode, useEffect, useState } from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const dto = { slug: 'bmw-m4', make: 'BMW', model: 'M4', year: 2023, status: 'Available', images: ['/detail'], cardImages: ['/card'] };

beforeEach(() => {
  vi.resetModules();
  window.history.replaceState(null, '', '/vehiculos/bmw-m4');
  document.body.innerHTML = '';
});

function embed(text = JSON.stringify(dto), id = 'vehicle-data') {
  const script = document.createElement('script');
  script.id = id;
  script.type = 'application/json';
  script.textContent = text;
  document.body.append(script);
}

describe('initial vehicle data', () => {
  it.each(['/vehiculos/bmw-m4', '/en/vehicles/bmw-m4'])('maps %s and retains it for both initializers', async (path) => {
    window.history.replaceState(null, '', path);
    embed();
    const { getInitialVehicle } = await import('./vehicles');
    const first = getInitialVehicle('bmw-m4', 'default');
    expect(first).toMatchObject({ slug: 'bmw-m4', availability: 'available', images: [{ src: '/detail', smallSrc: '/card' }] });
    expect(getInitialVehicle('bmw-m4', 'default')).toBe(first);
    expect(document.getElementById('vehicle-data')).toBeNull();
  });

  it('ignores a different slug', async () => {
    embed(JSON.stringify({ ...dto, slug: 'another-car' }));
    const { getInitialVehicle } = await import('./vehicles');
    expect(getInitialVehicle('bmw-m4', 'default')).toBeNull();
  });

  it.each(['{broken', 'null', '{}'])('ignores invalid data: %s', async (text) => {
    embed(text);
    const { getInitialVehicle } = await import('./vehicles');
    expect(getInitialVehicle('bmw-m4', 'default')).toBeNull();
  });

  it('rejects SPA entries and returning to the original entry after consumption', async () => {
    embed();
    const { getInitialVehicle, consumeInitialVehicle } = await import('./vehicles');
    expect(getInitialVehicle('bmw-m4', 'new-entry')).toBeNull();
    expect(getInitialVehicle('bmw-m4', 'default')).not.toBeNull();
    consumeInitialVehicle();
    expect(getInitialVehicle('bmw-m4', 'default')).toBeNull();
  });

  it('rejects data when the document started on another route', async () => {
    window.history.replaceState(null, '', '/vehiculos');
    embed();
    const { getInitialVehicle } = await import('./vehicles');
    expect(getInitialVehicle('bmw-m4', 'default')).toBeNull();
  });

  it('supports reloads with an existing history key', async () => {
    window.history.replaceState({ key: 'existing-entry' }, '', '/vehiculos/bmw-m4');
    embed();
    const { getInitialVehicle } = await import('./vehicles');
    expect(getInitialVehicle('bmw-m4', 'existing-entry')).not.toBeNull();
  });

  it('keeps component state through StrictMode effect replay, but not a later mount', async () => {
    embed();
    const { getInitialVehicle, consumeInitialVehicle } = await import('./vehicles');
    function Probe() {
      const [vehicle] = useState(() => getInitialVehicle('bmw-m4', 'default'));
      useEffect(consumeInitialVehicle, []);
      return <p>{vehicle?.model ?? 'loading'}</p>;
    }
    const mounted = render(<StrictMode><Probe /></StrictMode>);
    expect(screen.getByText('M4')).toBeTruthy();
    mounted.unmount();
    render(<StrictMode><Probe /></StrictMode>);
    expect(screen.getByText('loading')).toBeTruthy();
  });
});

describe('initial catalogue data', () => {
  const card = { slug: 'bmw-m4', make: 'BMW', model: 'M4', variant: null, year: 2023, month: null, priceEur: 90000, mileageKm: 1000,
    powerHp: 510, fuelType: null, transmission: null, bodyType: null, status: 'Available', images: ['/card'] };

  it.each(['/vehiculos', '/en/vehicles/'])('maps the list embedded in %s and skips the start-up request', async (path) => {
    window.history.replaceState(null, '', path);
    embed(JSON.stringify([card]), 'vehicles-data');
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    const { getInitialVehicles, prefetchVehicles } = await import('./vehicles');
    expect(document.getElementById('vehicles-data')).toBeNull();
    expect(getInitialVehicles('default')).toMatchObject([{ slug: 'bmw-m4', availability: 'available', images: [{ src: '/card' }] }]);
    await prefetchVehicles();
    expect(fetch).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('keeps an empty catalogue, which is a real answer', async () => {
    window.history.replaceState(null, '', '/vehiculos');
    embed('[]', 'vehicles-data');
    const { getInitialVehicles } = await import('./vehicles');
    expect(getInitialVehicles('default')).toEqual([]);
  });

  it.each(['{broken', 'null', '{}'])('ignores invalid data: %s', async (text) => {
    window.history.replaceState(null, '', '/vehiculos');
    embed(text, 'vehicles-data');
    const { getInitialVehicles } = await import('./vehicles');
    expect(getInitialVehicles('default')).toBeNull();
  });

  it('rejects other routes, SPA entries and use after consumption', async () => {
    window.history.replaceState(null, '', '/vehiculos/bmw-m4');
    embed(JSON.stringify([card]), 'vehicles-data');
    expect((await import('./vehicles')).getInitialVehicles('default')).toBeNull();

    vi.resetModules();
    window.history.replaceState(null, '', '/vehiculos');
    embed(JSON.stringify([card]), 'vehicles-data');
    const { getInitialVehicles, consumeInitialVehicles } = await import('./vehicles');
    expect(getInitialVehicles('new-entry')).toBeNull();
    expect(getInitialVehicles('default')).toHaveLength(1);
    consumeInitialVehicles();
    expect(getInitialVehicles('default')).toBeNull();
  });
});
