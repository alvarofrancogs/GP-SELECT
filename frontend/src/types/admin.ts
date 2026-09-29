/** Admin-only contracts. They mirror GpSelect.Application/Contracts.cs and never feed public pages directly. */

export type VehicleStatus = 'Draft' | 'ComingSoon' | 'Available' | 'Reserved' | 'Sold' | 'Archived';
export type ImageState = 'PendingUpload' | 'Processing' | 'Ready' | 'Failed' | 'Deleted';

export interface VehicleSpecification { label: string; value: string }

export interface AdminImage {
  id: string;
  state: ImageState;
  cardUrl: string | null;
  detailUrl: string | null;
  isCover: boolean;
  sortOrder: number;
  failureReason: string | null;
}

export interface AdminVehicleRow {
  id: string;
  slug: string;
  status: VehicleStatus;
  make: string;
  model: string;
  variant: string | null;
  year: number;
  month: number | null;
  mileageKm: number | null;
  powerHp: number | null;
  priceEur: number | null;
  internalReference: string | null;
  coverCardUrl: string | null;
  imageCount: number;
  readyImageCount: number;
  updatedAt: string;
  publishedAt: string | null;
}

export interface AdminVehicle {
  id: string;
  slug: string;
  status: VehicleStatus;
  make: string;
  model: string;
  year: number;
  month: number | null;
  priceEur: number | null;
  internalReference: string | null;
  description: string | null;
  mileageKm: number | null;
  powerHp: number | null;
  variant: string | null;
  fuelType: string | null;
  transmission: string | null;
  bodyType: string | null;
  drivetrain: string | null;
  exteriorColour: string | null;
  interior: string | null;
  history: string | null;
  provenance: string | null;
  equipment: string[];
  customSpecifications: VehicleSpecification[];
  images: AdminImage[];
  updatedAt: string;
  publishedAt: string | null;
}

/** GET /api/admin/vehicles/{id}/preview: the public detail contract with admin image URLs. */
export interface VehiclePreview {
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
  drivetrain: string | null;
  exteriorColour: string | null;
  interior: string | null;
  description: string | null;
  history: string | null;
  provenance: string | null;
  equipment: string[];
  customSpecifications: VehicleSpecification[];
  status: VehicleStatus;
  images: string[];
}

export interface CreateVehicleRequest {
  make: string;
  model: string;
  firstRegistrationYear: number;
  firstRegistrationMonth: number | null;
  internalReference: string | null;
}

/** Merge-patch body: an absent key keeps the stored value, null clears it. */
export interface VehiclePatch {
  make?: string;
  model?: string;
  variant?: string | null;
  firstRegistrationYear?: number;
  firstRegistrationMonth?: number | null;
  mileageKm?: number | null;
  priceEur?: number | null;
  powerHp?: number | null;
  fuelType?: string | null;
  transmission?: string | null;
  bodyType?: string | null;
  drivetrain?: string | null;
  exteriorColour?: string | null;
  interior?: string | null;
  provenance?: string | null;
  history?: string | null;
  description?: string | null;
  internalReference?: string | null;
  equipment?: string[] | null;
  customSpecifications?: VehicleSpecification[] | null;
}

export type SettableStatus = Exclude<VehicleStatus, 'Archived'>;

export interface ImageIntent { imageId: string; uploadUrl: string; expiresInSeconds: number }
export interface ImageStatus { imageId: string; state: ImageState; error: string | null }
export interface AdminSession { email: string; role: 'Admin' }

/** RFC 7807 problem details as the API writes them, including the `code`/`field` extensions. */
export interface ProblemDetails {
  status?: number;
  title?: string;
  detail?: string;
  code?: string;
  field?: string;
  correlationId?: string;
  errors?: Record<string, string[]>;
}
