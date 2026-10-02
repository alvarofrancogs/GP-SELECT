import { useId, useMemo, useState } from 'react';
import { Select } from './Select';
import { availableSorts, getFacets, vehicleFilterKeys } from '../lib/vehicleFacets';
import type { Band, FacetKey, FacetOption } from '../lib/vehicleFacets';
import { useLanguage } from '../i18n/useLanguage';
import type { VehicleSummary } from '../types/vehicle';
import { formatKm, formatPrice, translateValue } from '../lib/vehicleFormat';

export function VehicleFilters({ vehicles, params, onChange, count, onClear }: {
  vehicles: VehicleSummary[]; params: URLSearchParams; onChange: (key: string, value: string) => void; count: number; onClear: () => void;
}) {
  const { copy, locale } = useLanguage();
  const text = copy.vehicles;
  const [open, setOpen] = useState(false);
  const id = useId();
  const facets = useMemo(() => getFacets(vehicles, params), [vehicles, params]);
  const sorts = useMemo(() => availableSorts(vehicles), [vehicles]);
  const active = vehicleFilterKeys.some((key) => params.has(key));
  const labels: Record<FacetKey, string> = { make: text.make, bodyType: text.bodyType, fuelType: text.fuelType, price: text.price, year: text.year, mileage: text.mileage };
  const sortLabels: Record<string, string> = { priceAsc: text.priceAsc, priceDesc: text.priceDesc, year: text.yearSort, km: text.kmSort };

  function bandLabel(band: Band, format: (value: number) => string) {
    return band.min === 0 && band.max !== null ? `${text.under} ${format(band.max)}` : band.max === null ? `${text.from} ${format(band.min)}` : `${format(band.min)} - ${format(band.max)}`;
  }
  function optionLabel(key: FacetKey, option: FacetOption): string {
    if (option.band) return bandLabel(option.band, key === 'price' ? (v) => formatPrice(v, locale, '') : (v) => formatKm(v, locale) ?? '');
    return translateValue(text.values, option.text) ?? option.value;
  }
  const orders = [{ value: '', label: text.recent }, ...sorts.map((value) => ({ value, label: sortLabels[value] }))];
  return <div className="vehicle-filters type-ui">
    <button type="button" className="vehicle-filters__toggle editorial-link" aria-expanded={open} aria-controls="vehicle-filter-fields" onClick={() => setOpen(!open)}>{text.filters}<span aria-hidden="true">{open ? '↑' : '→'}</span></button>
    <div id="vehicle-filter-fields" className={`vehicle-filters__fields${open ? ' is-open' : ''}`}>
      {facets.filter((facet) => facet.options.length > 1 || params.has(facet.key)).map((facet) => <div className="vehicle-filter" key={facet.key}>
        <label id={`${id}-${facet.key}`} htmlFor={`${id}-${facet.key}-control`}>{labels[facet.key]}</label>
        <Select id={`${id}-${facet.key}-control`} labelledBy={`${id}-${facet.key}`} value={params.get(facet.key) ?? ''} onChange={(value) => onChange(facet.key, value)}
          options={[{ value: '', label: text.all }, ...facet.options.map((option) => ({ value: option.value, label: optionLabel(facet.key, option) }))]} />
      </div>)}
      <div className="vehicle-filter vehicle-filter--sort">
        <label id={`${id}-sort`} htmlFor={`${id}-sort-control`}>{text.sort}</label>
        <Select id={`${id}-sort-control`} labelledBy={`${id}-sort`} value={params.get('sort') ?? ''} onChange={(value) => onChange('sort', value)} options={orders} />
      </div>
    </div>
    <div className="vehicle-filters__result"><p className="type-numeric" role="status">{count} {count === 1 ? text.singular : text.plural}</p>{active ? <button type="button" className="editorial-link" onClick={onClear}>{text.clear}</button> : null}</div>
  </div>;
}
