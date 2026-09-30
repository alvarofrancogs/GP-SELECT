import type { SceneAsset } from '../assets/sceneAssets';

export type VehiclePublicStatus = 'ComingSoon' | 'Available' | 'Reserved' | 'Sold';

// Mirrors VehiclePublicCardDto and the ASP.NET Core JSON naming policy.
export interface VehiclePublicCardDto {
  slug: string;
  make: string;
  model: string;
  variant: string | null;
  year: number;
  month: number | null;
  priceEur: number | null;
  mileageKm: number | null;
  powerHp: number | null;
  fuelType: string | null;
  transmission: string | null;
  bodyType: string | null;
  status: VehiclePublicStatus;
  images: string[];
}

interface PreviewVehicleBase {
  id: string;
  make: string;
  model: string;
  variant: string | null;
  image: SceneAsset;
}

export interface ExamplePreviewVehicle extends PreviewVehicleBase {
  source: 'example';
}

export interface PublishedPreviewVehicle extends PreviewVehicleBase {
  source: 'published';
  slug: string;
  year: number;
  month: number | null;
  priceEur: number | null;
}

export type InventoryPreviewVehicle = ExamplePreviewVehicle | PublishedPreviewVehicle;
export type InventoryPreviewStatus = 'ready' | 'loading' | 'error';
