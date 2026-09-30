import type { VehicleSummary } from '../types/vehicle';

/** One selection per facet, AND between facets. Options come from the published inventory. */
export const vehicleFilterKeys = ['make', 'bodyType', 'fuelType', 'price', 'year', 'mileage'] as const;
export type FacetKey = typeof vehicleFilterKeys[number];

export const vehicleSortKeys = ['priceAsc', 'priceDesc', 'year', 'km'] as const;

export interface Band { min: number; max: number | null }
export interface FacetOption { value: string; text: string | null; band: Band | null }
export interface Facet { key: FacetKey; options: FacetOption[] }

const MAX_BANDS = 5;
const STEPS = [1, 2, 2.5, 5, 10];

/** Free text is grouped without regard to case or accents ("Gasolina" = "gasolina"). */
export const normalise = (value: string) => value.normalize('NFD').replace(/\p{M}/gu, '').trim().toLowerCase();

const text = (vehicle: VehicleSummary, key: 'make' | 'bodyType' | 'fuelType') => vehicle[key]?.trim() || null;
const numeric = (vehicle: VehicleSummary, key: 'price' | 'mileage' | 'year') =>
  key === 'price' ? vehicle.priceEur : key === 'mileage' ? vehicle.mileageKm : vehicle.firstRegistrationYear;
const isBanded = (key: FacetKey): key is 'price' | 'mileage' => key === 'price' || key === 'mileage';

const bandValue = (band: Band) => `${band.min}:${band.max ?? ''}`;

/** Bands cover the real min–max of the inventory with a 1-2-2.5-5 step, so they never depend on the other filters. */
export function buildBands(values: (number | null)[]): Band[] {
  const known = values.filter((value): value is number => value !== null);
  if (!known.length) return [];
  const low = Math.min(...known);
  const high = Math.max(...known);
  const rough = Math.max(high - low, 1) / (MAX_BANDS - 1);
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const step = (STEPS.find((candidate) => candidate * magnitude >= rough) ?? 10) * magnitude;
  const bands: Band[] = [];
  for (let min = Math.floor(low / step) * step; min <= high; min += step) bands.push({ min, max: min + step });
  return bands;
}

function inBand(value: number | null, selected: string): boolean {
  if (value === null) return false;
  const [min, max] = selected.split(':');
  return value >= Number(min) && value < (max ? Number(max) : Infinity);
}

/** Applies every active filter except `exclude`, which is how each facet is recalculated. */
export function filterVehicles(vehicles: VehicleSummary[], params: URLSearchParams, exclude?: FacetKey): VehicleSummary[] {
  return vehicles.filter((vehicle) => vehicleFilterKeys.every((key) => {
    const selected = params.get(key);
    if (!selected || key === exclude) return true;
    if (isBanded(key)) return inBand(numeric(vehicle, key), selected);
    if (key === 'year') return String(vehicle.firstRegistrationYear) === selected;
    const value = text(vehicle, key);
    return value !== null && normalise(value) === normalise(selected);
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

/** Facet options given the other active filters: an option that would return nothing is not offered. */
export function getFacets(vehicles: VehicleSummary[], params: URLSearchParams): Facet[] {
  const bands = { price: buildBands(vehicles.map((v) => v.priceEur)), mileage: buildBands(vehicles.map((v) => v.mileageKm)) };
  return vehicleFilterKeys.map((key): Facet => {
    const scope = filterVehicles(vehicles, params, key);
    if (isBanded(key)) {
      return { key, options: bands[key].filter((band) => scope.some((v) => inBand(numeric(v, key), bandValue(band))))
        .map((band) => ({ value: bandValue(band), text: null, band })) };
    }
    if (key === 'year') {
      const years = [...new Set(scope.flatMap((v) => v.firstRegistrationYear === null ? [] : [v.firstRegistrationYear]))].sort((a, b) => b - a);
      return { key, options: years.map((year) => ({ value: String(year), text: String(year), band: null })) };
    }
    // Spelling variants collapse into one option, shown as the most used spelling (capitalised on a tie).
    const variants = new Map<string, Map<string, number>>();
    for (const vehicle of scope) {
      const value = text(vehicle, key);
      if (value === null) continue;
      const spellings = variants.get(normalise(value)) ?? new Map<string, number>();
      spellings.set(value, (spellings.get(value) ?? 0) + 1);
      variants.set(normalise(value), spellings);
    }
    const shown = [...variants.values()].map((spellings) => [...spellings].sort((a, b) => b[1] - a[1] || Number(b[0] !== b[0].toLowerCase()) - Number(a[0] !== a[0].toLowerCase()))[0][0]);
    return { key, options: shown.sort((a, b) => a.localeCompare(b)).map((value) => ({ value, text: value, band: null })) };
  });
}

/**
 * Drops selections that no longer exist (stale URL, or a facet change that made a combination impossible)
 * and canonicalises the rest. `keep` is the facet the user just changed: the others give way to it.
 */
export function sanitizeParams(vehicles: VehicleSummary[], params: URLSearchParams, keep?: FacetKey): URLSearchParams {
  const next = new URLSearchParams(params);
  const order = [...vehicleFilterKeys.filter((key) => key !== keep), ...(keep ? [keep] : [])];
  // First pass: a value the inventory does not have at all (stale or hand-edited URL). Second: combinations with no vehicle.
  for (const scope of [new URLSearchParams(), next]) {
    for (const key of order) {
      const selected = next.get(key);
      if (selected === null) continue;
      const options = getFacets(vehicles, scope).find((facet) => facet.key === key)!.options;
      const match = options.find((option) => option.value === selected)
        ?? (isBanded(key) || key === 'year' ? undefined : options.find((option) => normalise(option.value) === normalise(selected)));
      if (match) next.set(key, match.value); else next.delete(key);
    }
  }
  const sort = next.get('sort');
  if (sort !== null && !availableSorts(vehicles).includes(sort)) next.delete('sort');
  return next;
}
