import { useState } from 'react';
import { vehicleFilterKeys } from '../services/vehicles';
import { useLanguage } from '../i18n/useLanguage';
import type { VehicleSummary } from '../types/vehicle';
import type { VehicleCopy, Locale } from '../i18n/types';
import { formatKm, formatPrice } from '../lib/vehicleFormat';

type FilterKey = typeof vehicleFilterKeys[number];
interface Option { value: string; label: string }
interface Filter { key: FilterKey; label: string; options: Option[] }

function brackets(values: (number | null)[], limits: number[], format: (value: number) => string, text: VehicleCopy): Option[] {
  return limits.flatMap((min, index) => {
    const max = limits[index + 1] ?? Infinity;
    if (!values.some((value) => value !== null && value >= min && value < max)) return [];
    const label = min === 0 ? `${text.under} ${format(max)}` : max === Infinity ? `${text.from} ${format(min)}` : `${format(min)} - ${format(max)}`;
    return [{ value: `${min}:${max === Infinity ? '' : max}`, label }];
  });
}

function getVehicleFilters(vehicles: VehicleSummary[], text: VehicleCopy, locale: Locale): Filter[] {
  const strings = (key: 'make' | 'bodyType' | 'fuelType'): Option[] =>
    [...new Set(vehicles.flatMap((v) => v[key] ? [v[key]] : []))]
      .sort((a, b) => a.localeCompare(b, locale)).map((value) => ({ value, label: text.values[value] ?? value }));
  return [
    { key: 'make', label: text.make, options: strings('make') },
    { key: 'bodyType', label: text.bodyType, options: strings('bodyType') },
    { key: 'fuelType', label: text.fuelType, options: strings('fuelType') },
    { key: 'price', label: text.price, options: brackets(vehicles.map((v) => v.priceEur), [0, 75000, 100000, 125000], (v) => formatPrice(v, locale, ''), text) },
    { key: 'year', label: text.year, options: [...new Set(vehicles.flatMap((v) => v.firstRegistrationYear === null ? [] : [v.firstRegistrationYear]))].sort((a, b) => b - a).map((v) => ({ value: String(v), label: String(v) })) },
    { key: 'mileage', label: text.mileage, options: brackets(vehicles.map((v) => v.mileageKm), [0, 20000, 40000, 60000], (v) => formatKm(v, locale) ?? '', text) },
  ].filter((filter) => filter.options.length > 0) as Filter[];
}

export function VehicleFilters({ vehicles, params, onChange, count, onClear }: {
  vehicles: VehicleSummary[]; params: URLSearchParams; onChange: (key: string, value: string) => void; count: number; onClear: () => void;
}) {
  const { copy, locale } = useLanguage();
  const text = copy.vehicles;
  const [open, setOpen] = useState(false);
  const filters = getVehicleFilters(vehicles, text, locale);
  const active = vehicleFilterKeys.some((key) => params.has(key));
  const orders = [{ value: '', label: text.recent },
    ...(vehicles.some((v) => v.priceEur !== null) ? [{ value: 'priceAsc', label: text.priceAsc }, { value: 'priceDesc', label: text.priceDesc }] : []),
    ...(vehicles.some((v) => v.firstRegistrationYear !== null) ? [{ value: 'year', label: text.yearSort }] : []),
    ...(vehicles.some((v) => v.mileageKm !== null) ? [{ value: 'km', label: text.kmSort }] : []),
  ];
  return <div className="vehicle-filters type-ui">
    <button type="button" className="vehicle-filters__toggle editorial-link" aria-expanded={open} aria-controls="vehicle-filter-fields" onClick={() => setOpen(!open)}>{text.filters}<span aria-hidden="true">{open ? '↑' : '→'}</span></button>
    <div id="vehicle-filter-fields" className={`vehicle-filters__fields${open ? ' is-open' : ''}`}>
      {filters.map((filter) => <label className="vehicle-filter" key={filter.key}>
        <span>{filter.label}</span><select value={params.get(filter.key) ?? ''} onChange={(e) => onChange(filter.key, e.target.value)}>
          <option value="">{text.all}</option>
          {params.get(filter.key) && !filter.options.some((o) => o.value === params.get(filter.key)) ? <option value={params.get(filter.key)!}>{params.get(filter.key)}</option> : null}
          {filter.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </label>)}
      <label className="vehicle-filter vehicle-filter--sort"><span>{text.sort}</span><select value={params.get('sort') ?? ''} onChange={(e) => onChange('sort', e.target.value)}>{orders.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
    </div>
    <div className="vehicle-filters__result"><p className="type-numeric" role="status">{count} {count === 1 ? text.singular : text.plural}</p>{active ? <button type="button" className="editorial-link" onClick={onClear}>{text.clear}</button> : null}</div>
  </div>;
}
