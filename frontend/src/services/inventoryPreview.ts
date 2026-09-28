import { inventoryAssets } from '../assets/inventoryAssets';
import type { ExamplePreviewVehicle, PublishedPreviewVehicle, VehiclePublicCardDto } from '../types/inventory';

// Design examples only: these are not stock records and never carry a public slug.
export const exampleInventory: ExamplePreviewVehicle[] = [
  { id: 'example-mercedes', source: 'example', make: 'Mercedes-Benz', model: 'GLC 63 S', variant: null, image: inventoryAssets.featured },
  { id: 'example-bmw', source: 'example', make: 'BMW', model: 'X5 M', variant: null, image: inventoryAssets.bmw },
  { id: 'example-porsche', source: 'example', make: 'Porsche', model: '911', variant: null, image: inventoryAssets.porsche },
  { id: 'example-audi', source: 'example', make: 'Audi', model: 'RS Q8', variant: null, image: inventoryAssets.audi },
];

// Pure adapter for Phase 4; this module performs no network requests.
// The API already sorts images with the cover first. No extra fields are inferred.
export function mapPublicVehicleCard(vehicle: VehiclePublicCardDto): PublishedPreviewVehicle {
  const cover = vehicle.images[0];
  return {
    id: vehicle.slug,
    source: 'published',
    slug: vehicle.slug,
    make: vehicle.make,
    model: vehicle.model,
    variant: vehicle.variant,
    year: vehicle.year,
    month: vehicle.month,
    priceEur: vehicle.priceEur,
    image: cover ? { src: cover, temporary: false } : inventoryAssets.missingPhoto,
  };
}
