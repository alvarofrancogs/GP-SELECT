import type { VehiclePublicCardDto } from '../types/inventory';
import type { VehicleDetail, VehiclePublicDto, VehicleSummary } from '../types/vehicle';
import type { Locale } from '../i18n/types';
import { mockVehicles } from '../data/vehicles.mock';

export const VEHICLE_DATA_SOURCE: 'mock' | 'api' = 'mock';

/** Target fields missing from current public DTOs. API integration must resolve these
 * capabilities explicitly; powerHp does not exist in the domain model either.
 * `interior` is free text and cannot safely be treated as an interior colour.
 * Neither endpoint currently accepts filter, sort or pagination parameters (list max 100).
 */
export const BACKEND_INTEGRATION_GAP = {
  both: ['mileageKm', 'powerHp', 'drivetrain', 'interiorColour (current name: interior, free text)',
    'availability', 'provenanceCountry', 'ownersCount', 'historyStatus', 'equipment',
    'customSpecifications', 'images.alt', 'images.width', 'images.height'],
  listOnly: ['fuelType', 'transmission', 'bodyType'],
  domain: ['powerHp'],
} as const;

export function fromPublicCard(dto: VehiclePublicCardDto): VehicleSummary {
  return {
    slug: dto.slug, make: dto.make, model: dto.model, variant: dto.variant ?? null,
    firstRegistrationYear: dto.year, firstRegistrationMonth: dto.month ?? null,
    priceEur: dto.priceEur ?? null, mileageKm: null, powerHp: null, fuelType: null,
    transmission: null, bodyType: null, availability: null,
    images: dto.images.map((src) => ({ src, fit: 'cover', alt: null, temporary: false, width: null, height: null })),
  };
}

export function fromPublicDetail(dto: VehiclePublicDto): VehicleDetail {
  return {
    ...fromPublicCard(dto), fuelType: dto.fuelType ?? null, transmission: dto.transmission ?? null,
    bodyType: dto.bodyType ?? null, exteriorColour: dto.exteriorColour ?? null,
    description: dto.description ?? null, drivetrain: null, interiorColour: null,
    provenanceCountry: null, ownersCount: null, historyStatus: null, equipment: null,
    customSpecifications: null,
  };
}

export async function listVehicles(locale: Locale = 'es'): Promise<VehicleSummary[]> {
  if (VEHICLE_DATA_SOURCE !== 'mock') throw new Error('Vehicle API source is not connected yet');
  return structuredClone(mockVehicles(locale));
}

export async function getVehicle(slug: string, locale: Locale = 'es'): Promise<VehicleDetail | null> {
  if (VEHICLE_DATA_SOURCE !== 'mock') throw new Error('Vehicle API source is not connected yet');
  return structuredClone(mockVehicles(locale).find((vehicle) => vehicle.slug === slug) ?? null);
}

export const vehicleFilterKeys = ['make', 'bodyType', 'fuelType', 'price', 'year', 'mileage'] as const;

export function filterVehicles(vehicles: VehicleSummary[], params: URLSearchParams): VehicleSummary[] {
  return vehicles.filter((vehicle) => vehicleFilterKeys.every((key) => {
    const selected = params.get(key);
    if (!selected) return true;
    if (key === 'price' || key === 'mileage') {
      const value = key === 'price' ? vehicle.priceEur : vehicle.mileageKm;
      const [min, max] = selected.split(':');
      return value !== null && value >= Number(min) && value < (max ? Number(max) : Infinity);
    }
    return String(key === 'year' ? vehicle.firstRegistrationYear : vehicle[key]) === selected;
  })).sort((a, b) => {
    const order = params.get('sort');
    const key = order === 'priceAsc' || order === 'priceDesc' ? 'priceEur' : order === 'km' ? 'mileageKm' : order === 'year' ? 'firstRegistrationYear' : null;
    // Latest is the service's curated publication order; registration is a separate sort.
    if (!key) return 0;
    const av = a[key]; const bv = b[key];
    if (av === null) return bv === null ? 0 : 1;
    if (bv === null) return -1;
    return (av - bv) * (order === 'priceDesc' || order === 'year' ? -1 : 1);
  });
}

