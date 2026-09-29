import type { VehicleImage } from '../types/vehicle';

// Neutral photographic slots, never representations of an actual vehicle.
export const vehicleAssets = {
  m4: { src: '/assets/vehicles/bmw-m4-off.png', alt: 'BMW M4 Competition', temporary: false, fit: 'contain', width: 835, height: 941 },
  silver: { src: '/assets/temp/vehicle-silver.svg', alt: null, temporary: true, fit: 'cover', width: 1200, height: 900 },
  stone: { src: '/assets/temp/vehicle-stone.svg', alt: null, temporary: true, fit: 'cover', width: 1200, height: 900 },
  slate: { src: '/assets/temp/vehicle-slate.svg', alt: null, temporary: true, fit: 'cover', width: 1200, height: 900 },
  detail: { src: '/assets/temp/vehicle-detail.svg', alt: null, temporary: true, fit: 'cover', width: 1500, height: 1000 },
  interior: { src: '/assets/temp/vehicle-interior.svg', alt: null, temporary: true, fit: 'cover', width: 1500, height: 1000 },
} satisfies Record<string, VehicleImage>;
