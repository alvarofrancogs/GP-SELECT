import { describe, expect, it } from 'vitest';
import { filterVehicles, getFacets, sanitizeParams } from './vehicleFacets';
import { FUEL_TYPES } from './vehicleValues';
import type { VehicleSummary } from '../types/vehicle';

const car = (slug: string, make: string, bodyType: string | null, fuelType: string | null, priceEur: number | null, mileageKm: number | null, year: number | null): VehicleSummary => ({
  slug, make, model: slug, variant: null, firstRegistrationYear: year, firstRegistrationMonth: null, mileageKm, priceEur,
  powerHp: null, fuelType, transmission: null, bodyType, availability: 'available', images: null, video: null,
});

const inventory = [
  car('g', 'Mercedes-Benz', 'Cabrio', 'Gasolina', 255000, 118000, 2019),
  car('m4', 'BMW', 'Coupé', 'gasolina', 82500, 37500, 2021),
  car('glc', 'Mercedes-Benz', 'SUV', 'Gasolina', 88500, 29900, 2023),
  car('rs3', 'Audi', null, null, null, null, null),
];
const slugs = (params: string) => filterVehicles(inventory, new URLSearchParams(params)).map((vehicle) => vehicle.slug);

describe('vehicle facets', () => {
  it('offers every make and body style in the inventory, whatever else is selected', () => {
    const facets = getFacets(inventory);
    expect(facets.find((facet) => facet.key === 'make')!.options).toEqual(['Audi', 'BMW', 'Mercedes-Benz']);
    expect(facets.find((facet) => facet.key === 'bodyType')!.options).toEqual(['Cabrio', 'Coupé', 'SUV']);
  });

  it('always offers the standard fuels, in their order, with the inventory spelling merged in', () => {
    const fuels = getFacets([...inventory, car('x', 'Tesla', null, 'Hidrógeno', null, null, null)]).find((facet) => facet.key === 'fuelType')!.options;
    expect(fuels).toEqual([...FUEL_TYPES, 'Hidrógeno']);
    expect(getFacets([]).find((facet) => facet.key === 'fuelType')!.options).toEqual(FUEL_TYPES);
  });

  it('filters by free ranges, inclusive, and leaves out cars without the figure', () => {
    expect(slugs('priceMin=80000&priceMax=90000')).toEqual(['m4', 'glc']);
    expect(slugs('mileageMax=37500')).toEqual(['m4', 'glc']);
    expect(slugs('yearMin=2021')).toEqual(['m4', 'glc']);
    // Bounds typed the other way round still mean the same range.
    expect(slugs('priceMin=90000&priceMax=80000')).toEqual(['m4', 'glc']);
  });

  it('combines every filter at once', () => {
    expect(slugs('make=Mercedes-Benz&fuelType=Gasolina&yearMin=2020')).toEqual(['glc']);
    expect(slugs('make=BMW&bodyType=SUV')).toEqual([]);
  });
});

describe('sanitizeParams', () => {
  const clean = (params: string) => sanitizeParams(inventory, new URLSearchParams(params)).toString();

  it('keeps a combination with no result: choosing a filter never removes another', () => {
    expect(clean('make=BMW&bodyType=SUV&priceMin=200000')).toBe('make=BMW&bodyType=SUV&priceMin=200000');
  });

  it('keeps a standard fuel the inventory does not have yet', () => {
    expect(clean('fuelType=El%C3%A9ctrico')).toBe('fuelType=El%C3%A9ctrico');
  });

  it('canonicalises spellings and numbers, and drops what cannot be a filter', () => {
    expect(clean('make=bmw&priceMax=250.000+%E2%82%AC')).toBe('make=BMW&priceMax=250000');
    expect(clean('make=Ferrari&mileageMin=abc')).toBe('');
  });

  it('turns the old banded links into ranges', () => {
    expect(clean('price=50000:100000&mileage=0:')).toBe('priceMin=50000&priceMax=99999&mileageMin=0');
    expect(clean('year=2021')).toBe('yearMin=2021&yearMax=2021');
  });
});
