import type { VehicleStatus } from '../types/admin';

/** Same rule as VehicleVisibility.IsListed in the domain. */
export function isListed(status: VehicleStatus) {
  return status === 'ComingSoon' || status === 'Available' || status === 'Reserved';
}

const number = new Intl.NumberFormat('es-ES', { useGrouping: 'always' });
export const formatNumber = (value: number) => number.format(value);

const euros = new Intl.NumberFormat('es-ES', {
  style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2, trailingZeroDisplay: 'stripIfInteger', useGrouping: 'always',
});
/** 85.000 € or 85.000,50 €: cents only when there are any. */
export const formatEuros = (value: number) => euros.format(value);

/** Accent- and case-insensitive text for the local search. */
export function searchable(value: string) {
  return value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}
