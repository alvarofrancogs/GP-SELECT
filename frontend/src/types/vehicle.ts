import type { VehiclePublicCardDto } from './inventory';

export interface VehicleImage {
  src: string;
  fit: 'cover' | 'contain';
  alt: string | null;
  temporary: boolean;
  width: number | null;
  height: number | null;
}

export interface VehicleSummary {
  slug: string;
  make: string;
  model: string;
  variant: string | null;
  firstRegistrationYear: number | null;
  firstRegistrationMonth: number | null;
  mileageKm: number | null;
  priceEur: number | null;
  powerHp: number | null;
  fuelType: string | null;
  transmission: string | null;
  bodyType: string | null;
  availability: 'available' | 'coming-soon' | 'reserved' | 'sold' | null;
  images: VehicleImage[] | null;
}

export interface VehicleDetail extends VehicleSummary {
  drivetrain: string | null;
  exteriorColour: string | null;
  interiorColour: string | null;
  provenance: string | null;
  history: string | null;
  description: string | null;
  equipment: string[] | null;
  customSpecifications: { label: string; value: string }[] | null;
}

/** Mirrors VehiclePublicDto in GpSelect.Application/Contracts.cs. Free text stays free text. */
export interface VehiclePublicDto extends VehiclePublicCardDto {
  drivetrain: string | null;
  exteriorColour: string | null;
  interior: string | null;
  description: string | null;
  history: string | null;
  provenance: string | null;
  equipment: string[];
  customSpecifications: { label: string; value: string }[];
}
