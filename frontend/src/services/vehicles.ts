import type { VehiclePublicCardDto } from '../types/inventory';
import type { VehicleDetail, VehiclePublicDto, VehicleSummary } from '../types/vehicle';

const API = '/api/public/vehicles';

// Captured before the router starts: reloads can retain a non-default history key.
const initialPath = typeof window === 'undefined' ? '' : window.location.pathname;
const initialKey: string = typeof window === 'undefined' ? 'default' : window.history.state?.key ?? 'default';
let initialData: VehicleDetail | null | undefined;
let initialDataConsumed = false;

/** Read once, but retain the result for StrictMode's repeated state initializer. */
export function getInitialVehicle(slug: string, locationKey: string): VehicleDetail | null {
  if (initialDataConsumed || locationKey !== initialKey
    || !/^\/(?:vehiculos|en\/vehicles)\/[^/]+\/?$/i.test(initialPath)) return null;
  try {
    if (decodeURIComponent(initialPath.replace(/\/$/, '').split('/').pop()!) !== slug) return null;
  } catch { return null; }
  if (initialData === undefined) {
    const script = document.getElementById('vehicle-data');
    initialData = null;
    try {
      const dto = JSON.parse(script?.textContent ?? '') as VehiclePublicDto;
      if (dto?.slug === slug) initialData = fromPublicDetail(dto);
    } catch { /* Missing or invalid data uses the normal API request. */ }
    script?.remove();
  }
  return initialData?.slug === slug ? initialData : null;
}

/** Called on commit, after both StrictMode initializers; later visits must fetch. */
export function consumeInitialVehicle(): void {
  initialDataConsumed = true;
  initialData = null;
}

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

// The catalogue page from the server carries the list, read before React replaces the page's content.
let initialList: VehicleSummary[] | null = null;
if (typeof document !== 'undefined' && /^\/(?:vehiculos|en\/vehicles)\/?$/i.test(initialPath)) {
  const script = document.getElementById('vehicles-data');
  try {
    const list = JSON.parse(script?.textContent ?? '') as VehiclePublicCardDto[];
    if (Array.isArray(list)) initialList = list.map(fromPublicCard);
  } catch { /* Missing or invalid data uses the normal API request. */ }
  script?.remove();
}
const listEmbedded = initialList !== null;

/** The first catalogue render of the document's own history entry starts from the embedded list. */
export function getInitialVehicles(locationKey: string): VehicleSummary[] | null {
  return locationKey === initialKey ? initialList : null;
}

/** Called on commit, after both StrictMode initializers; later visits must fetch. */
export function consumeInitialVehicles(): void {
  initialList = null;
}

// A request on its way serves every reader that asks for the same address before it settles, and is cancelled
// only when none is left. In development StrictMode mounts each effect twice; the first run's cancel would
// otherwise cost a second request.
const pending = new Map<string, { result: Promise<unknown>; controller: AbortController; readers: number }>();

function shared<T>(url: string, load: (signal: AbortSignal) => Promise<T>, signal?: AbortSignal): Promise<T> {
  let entry = pending.get(url);
  if (!entry) {
    const controller = new AbortController();
    const created = { result: load(controller.signal), controller, readers: 0 };
    const settle = () => { if (pending.get(url) === created) pending.delete(url); };
    created.result.then(settle, settle);
    pending.set(url, created);
    entry = created;
  }
  const reader = entry;
  reader.readers += 1;
  signal?.addEventListener('abort', () => {
    reader.readers -= 1;
    // After this task: StrictMode's second run asks again straight away.
    queueMicrotask(() => {
      if (reader.readers > 0) return;
      reader.controller.abort();
      if (pending.get(url) === reader) pending.delete(url);
    });
  }, { once: true });
  return reader.result as Promise<T>;
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
  if (listEmbedded) return Promise.resolve(); // already in the page
  // Development's StrictMode runs the start-up screen's effect twice: one request is enough.
  if (prefetched && Date.now() - prefetched.at < PREFETCH_TTL) return prefetched.list.catch(() => undefined);
  const list = fetchVehicles();
  prefetched = { at: Date.now(), list };
  return list.catch(() => { prefetched = null; });
}

/** The API lists newest first by creation date (max 500, no filter or pagination). */
export function listVehicles(signal?: AbortSignal): Promise<VehicleSummary[]> {
  if (prefetched && Date.now() - prefetched.at < PREFETCH_TTL) {
    const { list } = prefetched;
    // Single use: later visits always ask the API again. Cleared after this task, so StrictMode's second run of the
    // same effect (development) still finds it instead of sending another request.
    queueMicrotask(() => { prefetched = null; });
    return list;
  }
  return shared(API, fetchVehicles, signal);
}

async function fetchVehicle(url: string, signal: AbortSignal): Promise<VehicleDetail | null> {
  const response = await fetch(url, { signal });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Vehicle detail failed (${response.status})`);
  return fromPublicDetail((await response.json()) as VehiclePublicDto);
}

/** Resolves to null when the vehicle is not public (404); any other failure throws. */
export function getVehicle(slug: string, signal?: AbortSignal): Promise<VehicleDetail | null> {
  const url = `${API}/${encodeURIComponent(slug)}`;
  return shared(url, (own) => fetchVehicle(url, own), signal);
}
