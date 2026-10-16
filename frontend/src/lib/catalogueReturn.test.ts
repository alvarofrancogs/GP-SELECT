import { describe, expect, it, vi } from 'vitest';

describe('catalogue return point', () => {
  it('is empty on a fresh page load, then gives back what the visitor left', async () => {
    vi.resetModules();
    const { catalogueReturn, rememberCatalogue } = await import('./catalogueReturn');
    expect(catalogueReturn()).toBeNull();
    rememberCatalogue({ search: '?fuelType=Gasolina', scrollY: 1240, count: 18 });
    expect(catalogueReturn()).toEqual({ search: '?fuelType=Gasolina', scrollY: 1240, count: 18 });
  });
});
