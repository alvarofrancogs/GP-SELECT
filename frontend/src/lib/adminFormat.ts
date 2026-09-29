import type { VehicleStatus } from '../types/admin';

/** Same rule as VehicleVisibility.IsListed in the domain. */
export function isListed(status: VehicleStatus) {
  return status === 'ComingSoon' || status === 'Available' || status === 'Reserved';
}

const number = new Intl.NumberFormat('es-ES', { useGrouping: 'always' });
export const formatNumber = (value: number) => number.format(value);

/** Accent- and case-insensitive text for the local search. */
export function searchable(value: string) {
  return value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}
