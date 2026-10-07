import type { AdminVehicle, VehiclePatch, VehicleSpecification } from '../types/admin';
import { adminCopy } from '../i18n/adminCopy';
import { formatNumber } from './adminFormat';

/** Limits mirror VehicleRules in the domain; the server stays the authority. */
export const LIMITS = {
  make: 60, model: 60, variant: 80, short: 120, provenance: 300, history: 4000, description: 10000,
  equipmentItems: 100, equipmentItem: 120, specRows: 50, specLabel: 80, specValue: 120,
} as const;

export const textFields = {
  variant: { max: LIMITS.variant, long: false },
  fuelType: { max: LIMITS.short, long: false },
  transmission: { max: LIMITS.short, long: false },
  bodyType: { max: LIMITS.short, long: false },
  drivetrain: { max: LIMITS.short, long: false },
  exteriorColour: { max: LIMITS.short, long: false },
  interior: { max: LIMITS.short, long: false },
  internalReference: { max: LIMITS.short, long: false },
  provenance: { max: LIMITS.provenance, long: true },
  history: { max: LIMITS.history, long: true },
  description: { max: LIMITS.description, long: true },
} as const;
export type TextField = keyof typeof textFields;

const numberFields = {
  mileageKm: { min: 0, max: 2_000_000 },
  powerHp: { min: 1, max: 2000 },
} as const;
type NumberField = keyof typeof numberFields | 'priceEur';
const PRICE_MAX = 10_000_000;

export interface SpecificationRow { key: string; label: string; value: string }

export type VehicleForm = Record<TextField | NumberField | 'make' | 'model' | 'firstRegistrationYear' | 'firstRegistrationMonth', string> & {
  equipment: string[];
  specifications: SpecificationRow[];
};

export const newRowKey = () => crypto.randomUUID();
export const maxYear = () => new Date().getFullYear() + 1;

const text = (value: string | null) => value ?? '';
const num = (value: number | null) => value === null ? '' : String(value);

export function toForm(v: AdminVehicle): VehicleForm {
  return {
    make: v.make, model: v.model, firstRegistrationYear: String(v.year), firstRegistrationMonth: num(v.month),
    variant: text(v.variant), fuelType: text(v.fuelType), transmission: text(v.transmission), bodyType: text(v.bodyType),
    drivetrain: text(v.drivetrain), exteriorColour: text(v.exteriorColour), interior: text(v.interior),
    internalReference: text(v.internalReference), provenance: text(v.provenance), history: text(v.history),
    description: text(v.description), mileageKm: num(v.mileageKm), priceEur: num(v.priceEur), powerHp: num(v.powerHp),
    equipment: [...v.equipment],
    specifications: v.customSpecifications.map((row) => ({ key: newRowKey(), label: row.label, value: row.value })),
  };
}

/** Stable comparison key: row keys are UI identity, not data. */
export function formSignature(form: VehicleForm) {
  return JSON.stringify({ ...form, specifications: form.specifications.map(({ label, value }) => [label, value]) });
}

/** Same normalisation as the server: short texts collapse inner whitespace, long texts only trim. */
const cleanShort = (value: string) => value.trim().replace(/\s+/g, ' ');
const cleanLong = (value: string) => value.trim();

/** Digits, optionally grouped with dots or spaces the Spanish way (85.000). */
export function parseInteger(value: string): number | null | undefined {
  const raw = value.trim();
  if (!raw) return null;
  const compact = raw.replace(/[\s.]/g, '');
  if (!/^\d+$/.test(compact) || !/^(\d+|\d{1,3}([.\s]\d{3})+)$/.test(raw)) return undefined;
  return Number(compact);
}

/** Euros with at most two decimals, as the server stores them. Thousands go in groups of three after a dot or a
 * space (85.000); the decimals after a comma (85.000,50) or after a dot followed by one or two digits, which is
 * how the server's own value reaches the form (85000.5). Null when empty. */
export function parsePrice(value: string): number | null | 'invalid' | 'precision' {
  const raw = value.trim();
  if (!raw) return null;
  const match = /^(\d+|\d{1,3}(?:[.\s]\d{3})+)(?:,(\d+)|\.(\d{1,2}))?$/.exec(raw);
  if (!match) return 'invalid';
  const decimals = match[2] ?? match[3] ?? '';
  if (decimals.length > 2) return 'precision';
  return Number(`${match[1].replace(/[.\s]/g, '')}.${decimals || '0'}`);
}

export interface PatchResult {
  patch: VehiclePatch;
  errors: Record<string, string>;
  /** Row keys in the order they were sent, to place server errors like customSpecifications[2]. */
  specKeys: string[];
}

export function buildPatch(saved: AdminVehicle, form: VehicleForm): PatchResult {
  const e = adminCopy.errors;
  const patch: VehiclePatch = {};
  const errors: Record<string, string> = {};

  for (const field of ['make', 'model'] as const) {
    const value = cleanShort(form[field]);
    if (!value) errors[field] = e.required;
    else if (value.length > LIMITS[field]) errors[field] = e.tooLong(LIMITS[field]);
    else if (value !== saved[field]) patch[field] = value;
  }

  const year = parseInteger(form.firstRegistrationYear);
  if (year === null) errors.firstRegistrationYear = e.required;
  else if (year === undefined) errors.firstRegistrationYear = e.number;
  else if (year < 1886 || year > maxYear()) errors.firstRegistrationYear = e.range('1886', String(maxYear()));
  else if (year !== saved.year) patch.firstRegistrationYear = year;

  const month = form.firstRegistrationMonth ? Number(form.firstRegistrationMonth) : null;
  if (month !== saved.month) patch.firstRegistrationMonth = month;

  for (const [field, { min, max }] of Object.entries(numberFields) as [NumberField, { min: number; max: number }][]) {
    const value = parseInteger(form[field]);
    if (value === undefined) errors[field] = e.number;
    else if (value !== null && (value < min || value > max)) errors[field] = e.range(formatNumber(min), formatNumber(max));
    else if (value !== saved[field]) patch[field] = value;
  }

  const price = parsePrice(form.priceEur);
  if (price === 'invalid') errors.priceEur = e.price;
  else if (price === 'precision') errors.priceEur = e.codes.invalid_precision;
  else if (price !== null && price > PRICE_MAX) errors.priceEur = e.range(formatNumber(0), formatNumber(PRICE_MAX));
  else if (price !== saved.priceEur) patch.priceEur = price;

  for (const [field, { max, long }] of Object.entries(textFields) as [TextField, { max: number; long: boolean }][]) {
    const value = (long ? cleanLong : cleanShort)(form[field]) || null;
    if (value !== null && value.length > max) errors[field] = e.tooLong(max);
    else if (value !== saved[field]) patch[field] = value;
  }

  if (JSON.stringify(form.equipment) !== JSON.stringify(saved.equipment)) {
    patch.equipment = form.equipment.length ? form.equipment : null;
  }

  // Fully empty rows are ignored; half-filled rows are an error the admin must resolve.
  const rows = form.specifications
    .map((row) => ({ key: row.key, label: cleanShort(row.label), value: cleanShort(row.value) }))
    .filter((row) => row.label || row.value);
  for (const row of rows) if (!row.label || !row.value) errors[`spec:${row.key}`] = adminCopy.specifications.incomplete;
  const specifications: VehicleSpecification[] = rows.map(({ label, value }) => ({ label, value }));
  if (JSON.stringify(specifications) !== JSON.stringify(saved.customSpecifications)) {
    patch.customSpecifications = specifications.length ? specifications : null;
  }

  return { patch, errors, specKeys: rows.map((row) => row.key) };
}

/** Places server field names on the form: customSpecifications[i].label → the row it came from. */
export function mapServerErrors(errors: Record<string, string>, specKeys: string[]) {
  const mapped: Record<string, string> = {};
  for (const [field, message] of Object.entries(errors)) {
    const spec = /^customSpecifications\[(\d+)\]/.exec(field);
    if (spec && specKeys[Number(spec[1])]) mapped[`spec:${specKeys[Number(spec[1])]}`] = message;
    else mapped[field.replace(/\[\d+\].*$/, '')] = message;
  }
  return mapped;
}
