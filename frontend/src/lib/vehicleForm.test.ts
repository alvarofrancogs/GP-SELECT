import { describe, expect, it } from 'vitest';
import { buildPatch, parsePrice, toForm } from './vehicleForm';
import { adminCopy } from '../i18n/adminCopy';
import type { AdminVehicle } from '../types/admin';

const vehicle = (priceEur: number | null): AdminVehicle => ({
  id: 'v1', slug: 'bmw-m4', status: 'Draft', showWhenSold: false, make: 'BMW', model: 'M4', year: 2023, month: 6,
  priceEur, internalReference: null, description: null, mileageKm: 12000, powerHp: 510, variant: null, fuelType: null,
  transmission: null, bodyType: null, drivetrain: null, exteriorColour: null, interior: null, history: null,
  provenance: null, equipment: [], customSpecifications: [], images: [], updatedAt: '2026-10-01T00:00:00Z', publishedAt: null,
});

function patchWithPrice(saved: number | null, typed: string) {
  return buildPatch(vehicle(saved), { ...toForm(vehicle(saved)), priceEur: typed });
}

describe('parsePrice', () => {
  it.each([
    ['85000', 85000],
    ['85.000', 85000],
    ['85 000', 85000],
    ['1.234.567', 1234567],
    ['100,50', 100.5],
    ['100,5', 100.5],
    ['85.000,50', 85000.5],
    ['85 000,05', 85000.05],
    // As toForm writes the server's value: a dot followed by one or two digits is the decimal point.
    ['100.5', 100.5],
    ['100.05', 100.05],
    ['0', 0],
    ['  250 ', 250],
  ])('reads %j as %d', (typed, expected) => {
    expect(parsePrice(typed)).toBe(expected);
  });

  it('reads an empty field as no price', () => {
    expect(parsePrice('')).toBeNull();
    expect(parsePrice('   ')).toBeNull();
  });

  it.each(['100,505', '1.234,567', '0,001'])('refuses more than two decimals in %j', (typed) => {
    expect(parsePrice(typed)).toBe('precision');
  });

  it.each(['abc', '-5', '1e5', '10,', ',5', '85.00.0', '8.5000', '1,234.50', '100 €'])('refuses %j', (typed) => {
    expect(parsePrice(typed)).toBe('invalid');
  });

  it('gives back every value the server can send unchanged', () => {
    for (const price of [0, 0.01, 0.5, 99.99, 100.5, 85000, 85000.05, 1234567.89, 10_000_000]) {
      expect(parsePrice(toForm(vehicle(price)).priceEur)).toBe(price);
    }
  });
});

describe('buildPatch price', () => {
  it('lets other fields change when the saved price has cents', () => {
    const saved = vehicle(100.5);
    const result = buildPatch(saved, { ...toForm(saved), model: 'M4 Competition' });
    expect(result.errors).toEqual({});
    expect(result.patch).toEqual({ model: 'M4 Competition' });
  });

  it('sends an integer price', () => {
    expect(patchWithPrice(null, '85.000')).toMatchObject({ errors: {}, patch: { priceEur: 85000 } });
  });

  it('sends cents typed with a decimal comma', () => {
    expect(patchWithPrice(100.5, '100,75')).toMatchObject({ errors: {}, patch: { priceEur: 100.75 } });
  });

  it('does not resend the same amount written another way', () => {
    expect(patchWithPrice(100.5, '100,50')).toEqual({ errors: {}, patch: {}, specKeys: [] });
  });

  it('clears the price when the field is emptied', () => {
    expect(patchWithPrice(100.5, '')).toMatchObject({ errors: {}, patch: { priceEur: null } });
  });

  it('reports more than two decimals and malformed amounts', () => {
    expect(patchWithPrice(null, '100,505').errors).toEqual({ priceEur: adminCopy.errors.codes.invalid_precision });
    expect(patchWithPrice(null, 'cien').errors).toEqual({ priceEur: adminCopy.errors.price });
  });

  it('keeps the domain limits', () => {
    expect(patchWithPrice(null, '0').errors).toEqual({});
    expect(patchWithPrice(null, '10.000.000').errors).toEqual({});
    expect(patchWithPrice(null, '10.000.000,01').errors.priceEur).toBe(adminCopy.errors.range('0', '10.000.000'));
  });
});
