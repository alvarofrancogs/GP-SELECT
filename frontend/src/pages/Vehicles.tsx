import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { InteriorPageHeader } from '../components/InteriorPageHeader';
import { VehicleGrid } from '../components/VehicleGrid';
import { VehicleFilters } from '../components/VehicleFilters';
import { useLanguage } from '../i18n/useLanguage';
import { listVehicles } from '../services/vehicles';
import { filterVehicles, sanitizeParams, sortVehicles, vehicleFilterKeys } from '../lib/vehicleFacets';
import type { FacetKey } from '../lib/vehicleFacets';
import type { VehicleSummary } from '../types/vehicle';
import { qualificationUrl } from '../lib/qualification';
import '../styles/interiors.css';
import '../styles/vehicles.css';

export function Vehicles() {
  const { copy } = useLanguage();
  const text = copy.vehicles;
  const [params, setParams] = useSearchParams();
  const [vehicles, setVehicles] = useState<VehicleSummary[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const request = new AbortController();
    listVehicles(request.signal).then((data) => { setVehicles(data); setStatus('ready'); },
      () => { if (!request.signal.aborted) setStatus('error'); });
    return () => request.abort();
  }, [attempt]);
  // The URL is the source of truth; selections that no longer exist are dropped before rendering.
  const clean = useMemo(() => status === 'ready' ? sanitizeParams(vehicles, params) : params, [status, vehicles, params]);
  useEffect(() => {
    if (clean.toString() !== params.toString()) setParams(clean, { replace: true, preventScrollReset: true });
  }, [clean, params, setParams]);
  const shown = useMemo(() => sortVehicles(filterVehicles(vehicles, clean), clean.get('sort')), [vehicles, clean]);
  const searchUrl = qualificationUrl({ intent: 'import', source: 'vehicles' });
  function clear() {
    const next = new URLSearchParams(clean);
    vehicleFilterKeys.forEach((key) => next.delete(key));
    setParams(next, { preventScrollReset: true });
  }
  function change(key: string, value: string) {
    const next = new URLSearchParams(clean);
    if (value) next.set(key, value); else next.delete(key);
    setParams(key === 'sort' ? next : sanitizeParams(vehicles, next, key as FacetKey), { preventScrollReset: true });
  }
  return <article className="interior-page vehicles-page">
    <InteriorPageHeader {...text} />
    {status === 'loading' ? <p className="vehicle-state type-lede" role="status">{text.loading}</p> : null}
    {status === 'error' ? <div className="vehicle-state" role="alert"><p className="type-lede">{text.error}</p><button className="editorial-link type-ui" onClick={() => { setStatus('loading'); setAttempt(attempt + 1); }}>{text.retry}</button></div> : null}
    {status === 'ready' && !vehicles.length ? <div className="vehicle-state"><h2 className="type-section">{text.emptyCatalogue}</h2><div className="vehicle-state__links"><Link className="editorial-link type-ui" to={searchUrl}>{text.search}<span aria-hidden="true">→</span></Link></div></div> : null}
    {status === 'ready' && vehicles.length ? <>
      <VehicleFilters vehicles={vehicles} params={clean} count={shown.length} onClear={clear} onChange={change} />
      {shown.length ? <VehicleGrid key={clean.toString()} vehicles={shown} /> : <div className="vehicle-state">
        <h2 className="type-section">{text.empty}</h2><div className="vehicle-state__links"><button className="editorial-link type-ui" onClick={clear}>{text.clear}</button><Link className="editorial-link type-ui" to={searchUrl}>{text.search}<span aria-hidden="true">→</span></Link></div>
      </div>}
    </> : null}
    <section className="interior-closing vehicle-closing"><h2 className="type-section">{text.closing}</h2><div className="interior-closing__links"><Link className="editorial-link type-ui" to={searchUrl}>{text.find}<span aria-hidden="true">→</span></Link></div></section>
  </article>;
}
