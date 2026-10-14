import { StrictMode, useEffect, useState } from 'react';
import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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

describe('start-up list request', () => {
  const card = { slug: 'bmw-m4', make: 'BMW', model: 'M4', variant: null, year: 2023, month: null, priceEur: 90000, mileageKm: 1000,
    powerHp: 510, fuelType: null, transmission: null, bodyType: null, status: 'Available', images: ['/card'] };

  it('sends one request when StrictMode runs the start-up screen and its reader twice; a later visit asks again', async () => {
    window.history.replaceState(null, '', '/');
    const fetch = vi.fn(async () => ({ ok: true, status: 200, json: async () => [card] }));
    vi.stubGlobal('fetch', fetch);
    const { prefetchVehicles, listVehicles } = await import('./vehicles');
    function StartUp() {
      useEffect(() => { void prefetchVehicles(); }, []);
      return null;
    }
    function Reader() {
      const [model, setModel] = useState('loading');
      useEffect(() => {
        const request = new AbortController();
        void listVehicles(request.signal).then((list) => { if (!request.signal.aborted) setModel(list[0].model); });
        return () => request.abort();
      }, []);
      return <p>{model}</p>;
    }
    render(<StrictMode><StartUp /><Reader /></StrictMode>);
    expect(await screen.findByText('M4')).toBeTruthy();
    expect(fetch).toHaveBeenCalledTimes(1);
    await listVehicles();
    expect(fetch).toHaveBeenCalledTimes(2);
    vi.unstubAllGlobals();
  });
});

describe('requests shared by readers that ask at once', () => {
  const card = { slug: 'bmw-m4', make: 'BMW', model: 'M4', variant: null, year: 2023, month: null, priceEur: 90000, mileageKm: 1000,
    powerHp: 510, fuelType: null, transmission: null, bodyType: null, status: 'Available', images: ['/card'] };
  /** Answers after a tick, or fails as fetch does when its request is cancelled. */
  function answering(body: unknown) {
    const signals: AbortSignal[] = [];
    const fetch = vi.fn((_url: string, init: { signal: AbortSignal }) => {
      signals.push(init.signal);
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => resolve({ ok: true, status: 200, json: async () => body }), 20);
        init.signal.addEventListener('abort', () => { clearTimeout(timer); reject(new DOMException('Aborted', 'AbortError')); });
      });
    });
    vi.stubGlobal('fetch', fetch);
    return { fetch, signals };
  }
  function Reader({ read }: { read: (signal: AbortSignal) => Promise<{ model: string } | null | { model: string }[]> }) {
    const [model, setModel] = useState('loading');
    useEffect(() => {
      const request = new AbortController();
      read(request.signal).then((data) => {
        if (!request.signal.aborted) setModel(Array.isArray(data) ? data[0].model : data?.model ?? 'none');
      }, () => { if (!request.signal.aborted) setModel('error'); });
      return () => request.abort();
    }, [read]);
    return <p>{model}</p>;
  }
  afterEach(() => { vi.unstubAllGlobals(); });

  it('asks once for the list and once for a vehicle when StrictMode mounts the reader twice', async () => {
    window.history.replaceState(null, '', '/vehiculos');
    const { fetch, signals } = answering([card]);
    const { listVehicles } = await import('./vehicles');
    render(<StrictMode><Reader read={listVehicles} /></StrictMode>);
    expect(await screen.findByText('M4')).toBeTruthy();
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(signals[0].aborted).toBe(false);

    vi.resetModules();
    document.body.innerHTML = '';
    const detail = answering({ ...card, cardImages: [] });
    const { getVehicle } = await import('./vehicles');
    const read = (signal: AbortSignal) => getVehicle('bmw-m4', signal);
    render(<StrictMode><Reader read={read} /></StrictMode>);
    expect(await screen.findByText('M4')).toBeTruthy();
    expect(detail.fetch).toHaveBeenCalledTimes(1);
  });

  it('still cancels the request when its only reader goes away', async () => {
    window.history.replaceState(null, '', '/vehiculos');
    const { fetch, signals } = answering([card]);
    const { listVehicles } = await import('./vehicles');
    const view = render(<Reader read={listVehicles} />);
    view.unmount();
    await Promise.resolve();
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(signals[0].aborted).toBe(true);
    // The next visit asks again.
    render(<Reader read={listVehicles} />);
    expect(await screen.findByText('M4')).toBeTruthy();
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
