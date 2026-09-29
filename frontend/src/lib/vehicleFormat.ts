import type { Locale } from '../i18n/types';

const locales = { es: 'es-ES', en: 'en-GB' };
export function formatPrice(value: number | null, locale: Locale, fallback: string): string {
  return value === null ? fallback : new Intl.NumberFormat(locales[locale], {
    style: 'currency', currency: 'EUR', maximumFractionDigits: 0, useGrouping: 'always',
  }).format(value);
}
export function formatKm(value: number | null, locale: Locale): string | null {
  return value === null ? null : `${new Intl.NumberFormat(locales[locale], { useGrouping: 'always' }).format(value)} km`;
}
export function formatPower(value: number | null, locale: Locale): string | null {
  return value === null ? null : `${new Intl.NumberFormat(locales[locale], { useGrouping: 'always' }).format(value)} ${locale === 'es' ? 'CV' : 'hp'}`;
}
export function formatRegistration(year: number | null, month: number | null, locale: Locale): string | null {
  if (year === null) return null;
  if (month === null || month < 1 || month > 12) return String(year);
  return new Intl.DateTimeFormat(locales[locale], { month: '2-digit', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(Date.UTC(year, month - 1, 1)));
}
