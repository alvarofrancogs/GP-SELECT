import type { SceneAsset } from '../assets/sceneAssets';

// Mirrors VehiclePublicCardDto and the ASP.NET Core JSON naming policy.
export interface VehiclePublicCardDto {
  slug: string;
  make: string;
  model: string;
  variant: string | null;
  year: number;
  month: number | null;
  priceEur: number | null;
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
