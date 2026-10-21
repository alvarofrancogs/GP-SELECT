import type { VehicleSummary } from '../types/vehicle';
import { FUEL_TYPES } from './vehicleValues';

/** Any combination is allowed: AND between filters; an empty result is the page's own empty state. */
export const choiceKeys = ['make', 'bodyType', 'fuelType'] as const;
export const rangeKeys = ['price', 'mileage', 'year'] as const;
export type ChoiceKey = typeof choiceKeys[number];
export type RangeKey = typeof rangeKeys[number];

/** URL parameters of a range: priceMin / priceMax, mileageMin / mileageMax, yearMin / yearMax. */
export const rangeParam = (key: RangeKey, bound: 'min' | 'max') => `${key}${bound === 'min' ? 'Min' : 'Max'}`;
export const vehicleFilterKeys = [...choiceKeys, ...rangeKeys.flatMap((key) => [rangeParam(key, 'min'), rangeParam(key, 'max')])];

export const vehicleSortKeys = ['priceAsc', 'priceDesc', 'year', 'km'] as const;

export interface Facet { key: ChoiceKey; options: string[] }

/** Free text is grouped without regard to case or accents ("Gasolina" = "gasolina"). */
export const normalise = (value: string) => value.normalize('NFD').replace(/\p{M}/gu, '').trim().toLowerCase();

const text = (vehicle: VehicleSummary, key: ChoiceKey) => vehicle[key]?.trim() || null;
const numeric = (vehicle: VehicleSummary, key: RangeKey) =>
  key === 'price' ? vehicle.priceEur : key === 'mileage' ? vehicle.mileageKm : vehicle.firstRegistrationYear;

/** Digits only: "250.000 €" → "250000"; nothing typed → "". */
export const digits = (value: string) => value.replace(/\D/g, '').replace(/^0+(?=\d)/, '');

function bounds(params: URLSearchParams, key: RangeKey): [number, number] | null {
  const min = params.get(rangeParam(key, 'min'));
  const max = params.get(rangeParam(key, 'max'));
  if (!min && !max) return null;
  const low = min ? Number(min) : -Infinity;
  const high = max ? Number(max) : Infinity;
  // Typed the other way round: still the range the visitor meant.
  return low <= high ? [low, high] : [high, low];
}

export function filterVehicles(vehicles: VehicleSummary[], params: URLSearchParams): VehicleSummary[] {
  return vehicles.filter((vehicle) => choiceKeys.every((key) => {
    const selected = params.get(key);
    if (!selected) return true;
    const value = text(vehicle, key);
    return value !== null && normalise(value) === normalise(selected);
  }) && rangeKeys.every((key) => {
    const range = bounds(params, key);
    if (!range) return true;
    const value = numeric(vehicle, key);
    return value !== null && value >= range[0] && value <= range[1];
  }));
}

export function sortVehicles(vehicles: VehicleSummary[], order: string | null): VehicleSummary[] {
  const key = order === 'priceAsc' || order === 'priceDesc' ? 'priceEur' : order === 'km' ? 'mileageKm' : order === 'year' ? 'firstRegistrationYear' : null;
  // Without an order the service's newest-first sequence is kept.
  if (!key) return vehicles;
  const direction = order === 'priceDesc' || order === 'year' ? -1 : 1;
  return [...vehicles].sort((a, b) => {
    const av = a[key]; const bv = b[key];
    if (av === null) return bv === null ? 0 : 1;
    if (bv === null) return -1;
    return (av - bv) * direction;
  });
}

/** Sort options exist only when the inventory has the data to order by. */
export function availableSorts(vehicles: VehicleSummary[]): string[] {
  return [
    ...(vehicles.some((v) => v.priceEur !== null) ? ['priceAsc', 'priceDesc'] : []),
    ...(vehicles.some((v) => v.firstRegistrationYear !== null) ? ['year'] : []),
    ...(vehicles.some((v) => v.mileageKm !== null) ? ['km'] : []),
  ];
}

/** Every value in the published inventory, whatever else is selected; fuel adds the standard list. */
export function getFacets(vehicles: VehicleSummary[]): Facet[] {
  return choiceKeys.map((key) => {
    // Spelling variants collapse into one option, shown as the most used spelling (capitalised on a tie).
    const variants = new Map<string, Map<string, number>>();
    for (const value of [...(key === 'fuelType' ? FUEL_TYPES : []), ...vehicles.map((vehicle) => text(vehicle, key))]) {
      if (value === null) continue;
      const spellings = variants.get(normalise(value)) ?? new Map<string, number>();
      spellings.set(value, (spellings.get(value) ?? 0) + 1);
      variants.set(normalise(value), spellings);
    }
    const shown = [...variants.values()].map((spellings) => [...spellings].sort((a, b) => b[1] - a[1] || Number(b[0] !== b[0].toLowerCase()) - Number(a[0] !== a[0].toLowerCase()))[0][0]);
    // The standard fuels keep their order (petrol first); anything else follows alphabetically.
    const rank = (value: string) => { const index = FUEL_TYPES.findIndex((fuel) => normalise(fuel) === normalise(value)); return index < 0 ? FUEL_TYPES.length : index; };
    return { key, options: shown.sort((a, b) => key === 'fuelType' ? rank(a) - rank(b) || a.localeCompare(b) : a.localeCompare(b)) };
  });
}

/**
 * Keeps every selection the visitor made and only cleans the URL: unknown choices (stale or hand-edited)
 * and non-numeric bounds go, spellings are canonicalised, and the old banded links (price=0:50000) become ranges.
 */
export function sanitizeParams(vehicles: VehicleSummary[], params: URLSearchParams): URLSearchParams {
  const next = new URLSearchParams(params);
  for (const key of ['price', 'mileage'] as const) {
    const band = next.get(key);
    if (band === null) continue;
    const [min = '', max = ''] = band.split(':');
    if (digits(min) && !next.has(rangeParam(key, 'min'))) next.set(rangeParam(key, 'min'), digits(min));
    // Bands were half-open; the last euro or kilometre below the next band is the closest inclusive bound.
    if (digits(max) && !next.has(rangeParam(key, 'max'))) next.set(rangeParam(key, 'max'), String(Math.max(Number(digits(max)) - 1, 0)));
    next.delete(key);
  }
  // An old single year is that year as both bounds.
  const year = digits(next.get('year') ?? '');
  if (year && !next.has(rangeParam('year', 'min'))) next.set(rangeParam('year', 'min'), year);
  if (year && !next.has(rangeParam('year', 'max'))) next.set(rangeParam('year', 'max'), year);
  next.delete('year');
  const facets = getFacets(vehicles);
  for (const key of choiceKeys) {
    const selected = next.get(key);
    if (selected === null) continue;
    const match = facets.find((facet) => facet.key === key)!.options.find((option) => normalise(option) === normalise(selected));
    if (match) next.set(key, match); else next.delete(key);
  }
  for (const key of rangeKeys) {
    for (const bound of ['min', 'max'] as const) {
      const param = rangeParam(key, bound);
      const value = next.get(param);
      if (value === null) continue;
      if (digits(value)) next.set(param, digits(value)); else next.delete(param);
    }
  }
  const sort = next.get('sort');
  if (sort !== null && !availableSorts(vehicles).includes(sort)) next.delete('sort');
  return next;
}
