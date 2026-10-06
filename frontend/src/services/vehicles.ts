import type { VehiclePublicCardDto } from '../types/inventory';
import type { VehicleDetail, VehiclePublicDto, VehicleSummary } from '../types/vehicle';

const API = '/api/public/vehicles';

const availabilityByStatus = {
  Available: 'available', ComingSoon: 'coming-soon', Reserved: 'reserved', Sold: 'sold',
} as const;

/** The API already sends the cover first; alt text and dimensions are not part of the contract. */
export function fromPublicCard(dto: VehiclePublicCardDto): VehicleSummary {
  return {
    slug: dto.slug, make: dto.make, model: dto.model, variant: dto.variant ?? null,
    firstRegistrationYear: dto.year, firstRegistrationMonth: dto.month ?? null,
    // A missing price means "on request"; a zero price is never shown as a price.
    priceEur: dto.priceEur != null && dto.priceEur > 0 ? dto.priceEur : null,
    mileageKm: dto.mileageKm ?? null, powerHp: dto.powerHp ?? null, fuelType: dto.fuelType ?? null,
    transmission: dto.transmission ?? null, bodyType: dto.bodyType ?? null,
    availability: availabilityByStatus[dto.status] ?? null,
    images: dto.images.map((src) => ({ src, fit: 'cover', alt: null, temporary: false, width: null, height: null })),
  };
}

export function fromPublicDetail(dto: VehiclePublicDto): VehicleDetail {
  const summary = fromPublicCard(dto);
  return {
    ...summary, images: summary.images?.map((image, index) => ({ ...image, smallSrc: dto.cardImages?.[index] })) ?? null,
    drivetrain: dto.drivetrain ?? null, exteriorColour: dto.exteriorColour ?? null,
    interiorColour: dto.interior ?? null, provenance: dto.provenance ?? null, history: dto.history ?? null,
    description: dto.description ?? null, equipment: dto.equipment?.length ? dto.equipment : null,
    customSpecifications: dto.customSpecifications?.length ? dto.customSpecifications : null,
  };
}

// The start-up screen asks for the list while it loads; the first reader within a few seconds reuses it.
let prefetched: { at: number; list: Promise<VehicleSummary[]> } | null = null;
const PREFETCH_TTL = 8000;

async function fetchVehicles(signal?: AbortSignal): Promise<VehicleSummary[]> {
  const response = await fetch(API, { signal });
  if (!response.ok) throw new Error(`Vehicle list failed (${response.status})`);
  return ((await response.json()) as VehiclePublicCardDto[]).map(fromPublicCard);
}

/** Starts loading the list ahead of time (errors are left to the first real reader). */
export function prefetchVehicles(): Promise<unknown> {
  const list = fetchVehicles();
  prefetched = { at: Date.now(), list };
  return list.catch(() => { prefetched = null; });
}

/** The API lists newest first by creation date (max 500, no filter or pagination). */
export function listVehicles(signal?: AbortSignal): Promise<VehicleSummary[]> {
  if (prefetched && Date.now() - prefetched.at < PREFETCH_TTL) {
    const { list } = prefetched;
    prefetched = null; // single use: later visits always ask the API again
    return list;
  }
  return fetchVehicles(signal);
}

/** Resolves to null when the vehicle is not public (404); any other failure throws. */
export async function getVehicle(slug: string, signal?: AbortSignal): Promise<VehicleDetail | null> {
  const response = await fetch(`${API}/${encodeURIComponent(slug)}`, { signal });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Vehicle detail failed (${response.status})`);
  return fromPublicDetail((await response.json()) as VehiclePublicDto);
}
