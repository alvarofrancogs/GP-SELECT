import { StrictMode, useEffect, useState } from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const dto = { slug: 'bmw-m4', make: 'BMW', model: 'M4', year: 2023, status: 'Available', images: ['/detail'], cardImages: ['/card'] };

beforeEach(() => {
  vi.resetModules();
  window.history.replaceState(null, '', '/vehiculos/bmw-m4');
  document.body.innerHTML = '';
});

function embed(text = JSON.stringify(dto)) {
  const script = document.createElement('script');
  script.id = 'vehicle-data';
  script.type = 'application/json';
  script.textContent = text;
  document.body.append(script);
}

describe('initial vehicle data', () => {
  it('maps the matching initial slug and retains it for both initializers', async () => {
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
