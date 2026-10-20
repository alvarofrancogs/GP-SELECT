import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Select } from './Select';
import { availableSorts, choiceKeys, digits, getFacets, rangeKeys, rangeParam, vehicleFilterKeys } from '../lib/vehicleFacets';
import type { ChoiceKey, RangeKey } from '../lib/vehicleFacets';
import { useLanguage } from '../i18n/useLanguage';
import type { VehicleSummary } from '../types/vehicle';
import { translateValue } from '../lib/vehicleFormat';

type Change = (key: string, value: string, typing?: boolean) => void;

/** Typing waits this long before the list updates, so each keystroke does not reshuffle the cards. */
const TYPING_MS = 450;

/** A free number. It applies while typing (after a pause), on Enter and when it loses focus. */
function RangeInput({ param, value, label, placeholder, onChange }: {
  param: string; value: string; label: string; placeholder: string; onChange: Change;
}) {
  const [draft, setDraft] = useState(value);
  const [synced, setSynced] = useState(value);
  const timer = useRef<number | undefined>(undefined);
  // The URL changed from elsewhere (Clear filters, back button): show it, unless it is what is being typed.
  if (value !== synced) {
    setSynced(value);
    if (digits(draft) !== value) setDraft(value);
  }
  useEffect(() => () => window.clearTimeout(timer.current), []);
  function commit(next: string, typing: boolean) {
    window.clearTimeout(timer.current);
    if (digits(next) !== value) onChange(param, digits(next), typing);
  }
  return <input className="vehicle-range__input" type="text" inputMode="numeric" autoComplete="off" enterKeyHint="search"
    aria-label={label} placeholder={placeholder} value={draft}
    onChange={(event) => {
      const next = event.target.value;
      setDraft(next);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => commit(next, true), TYPING_MS);
    }}
    onBlur={() => commit(draft, false)}
    onKeyDown={(event) => { if (event.key === 'Enter') commit(draft, false); }} />;
}

export function VehicleFilters({ vehicles, params, onChange, count, onClear }: {
  vehicles: VehicleSummary[]; params: URLSearchParams; onChange: Change; count: number; onClear: () => void;
}) {
  const { copy } = useLanguage();
  const text = copy.vehicles;
  const [open, setOpen] = useState(false);
  const id = useId();
  const facets = useMemo(() => getFacets(vehicles), [vehicles]);
  const sorts = useMemo(() => availableSorts(vehicles), [vehicles]);
  const active = vehicleFilterKeys.some((key) => params.has(key));
  const choiceLabels: Record<ChoiceKey, string> = { make: text.make, bodyType: text.bodyType, fuelType: text.fuelType };
  const rangeLabels: Record<RangeKey, string> = { price: `${text.price} (€)`, mileage: `${text.mileage} (km)`, year: text.year };
  const sortLabels: Record<string, string> = { priceAsc: text.priceAsc, priceDesc: text.priceDesc, year: text.yearSort, km: text.kmSort };
  const orders = [{ value: '', label: text.recent }, ...sorts.map((value) => ({ value, label: sortLabels[value] }))];
  return <div className="vehicle-filters type-ui">
    <button type="button" className="vehicle-filters__toggle editorial-link" aria-expanded={open} aria-controls="vehicle-filter-fields" onClick={() => setOpen(!open)}>{text.filters}<span aria-hidden="true">{open ? '↑' : '→'}</span></button>
    <div id="vehicle-filter-fields" className={`vehicle-filters__fields${open ? ' is-open' : ''}`}>
      {choiceKeys.map((key) => {
        const options = facets.find((facet) => facet.key === key)!.options;
        if (!options.length) return null;
        return <div className="vehicle-filter" key={key}>
          <label id={`${id}-${key}`} htmlFor={`${id}-${key}-control`}>{choiceLabels[key]}</label>
          <Select id={`${id}-${key}-control`} labelledBy={`${id}-${key}`} value={params.get(key) ?? ''} onChange={(value) => onChange(key, value)}
            options={[{ value: '', label: text.all }, ...options.map((option) => ({ value: option, label: translateValue(text.values, option) ?? option }))]} />
        </div>;
      })}
      {rangeKeys.map((key) => <div className="vehicle-filter" key={key} role="group" aria-labelledby={`${id}-${key}`}>
        <span id={`${id}-${key}`} className="vehicle-filter__label">{rangeLabels[key]}</span>
        <div className="vehicle-range">
          <RangeInput param={rangeParam(key, 'min')} value={params.get(rangeParam(key, 'min')) ?? ''} label={`${rangeLabels[key]}: ${text.from}`} placeholder={text.from} onChange={onChange} />
          <span className="vehicle-range__dash" aria-hidden="true">–</span>
          <RangeInput param={rangeParam(key, 'max')} value={params.get(rangeParam(key, 'max')) ?? ''} label={`${rangeLabels[key]}: ${text.to}`} placeholder={text.to} onChange={onChange} />
        </div>
      </div>)}
      <div className="vehicle-filter vehicle-filter--sort">
        <label id={`${id}-sort`} htmlFor={`${id}-sort-control`}>{text.sort}</label>
        <Select id={`${id}-sort-control`} labelledBy={`${id}-sort`} value={params.get('sort') ?? ''} onChange={(value) => onChange('sort', value)} options={orders} />
      </div>
    </div>
    <div className="vehicle-filters__result"><p className="type-numeric" role="status">{count} {count === 1 ? text.singular : text.plural}</p>{active ? <button type="button" className="editorial-link" onClick={onClear}>{text.clear}</button> : null}</div>
  </div>;
}
