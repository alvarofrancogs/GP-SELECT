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
