import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigationType, useSearchParams } from 'react-router-dom';
import { InteriorPageHeader } from '../components/InteriorPageHeader';
import { VehicleGrid } from '../components/VehicleGrid';
import { VehicleFilters } from '../components/VehicleFilters';
import { useLanguage } from '../i18n/useLanguage';
import { consumeInitialVehicles, getInitialVehicles, listVehicles } from '../services/vehicles';
import { filterVehicles, sanitizeParams, sortVehicles, vehicleFilterKeys } from '../lib/vehicleFacets';
import type { FacetKey } from '../lib/vehicleFacets';
import type { VehicleSummary } from '../types/vehicle';
import { qualificationUrl } from '../lib/qualification';
import { catalogueReturn } from '../lib/catalogueReturn';
import '../styles/interiors.css';
import '../styles/vehicles.css';

export function Vehicles() {
  const { copy, href } = useLanguage();
  const text = copy.vehicles;
  const [params, setParams] = useSearchParams();
  const { key, search, state } = useLocation();
  const navigationType = useNavigationType();
  // Back from a vehicle page (browser back or its «← Vehicles» link) to the same filters: the same batch and scroll.
  // A fresh visit from the menu, or a reload (the return point lives in memory), starts at the top.
  const [restore] = useState(() => {
    const point = catalogueReturn();
    const back = navigationType === 'POP' || (state as { fromVehicle?: boolean } | null)?.fromVehicle;
    return back && point?.search === search ? point : null;
  });
  // Rendering the list at once keeps the closing section from moving down when it arrives.
  const [initialList] = useState(() => getInitialVehicles(key));
  const [vehicles, setVehicles] = useState<VehicleSummary[]>(initialList ?? []);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(initialList ? 'ready' : 'loading');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    consumeInitialVehicles();
    if (initialList && attempt === 0) return;
    const request = new AbortController();
    // The list prefetched by the start-up screen ignores this signal: drop it if the page has gone.
    listVehicles(request.signal).then((data) => { if (!request.signal.aborted) { setVehicles(data); setStatus('ready'); } },
      () => { if (!request.signal.aborted) setStatus('error'); });
    return () => request.abort();
  }, [attempt, initialList]);
  // The URL is the source of truth; selections that no longer exist are dropped before rendering.
  const clean = useMemo(() => status === 'ready' ? sanitizeParams(vehicles, params) : params, [status, vehicles, params]);
  useEffect(() => {
    if (clean.toString() !== params.toString()) setParams(clean, { replace: true, preventScrollReset: true });
  }, [clean, params, setParams]);
  const shown = useMemo(() => sortVehicles(filterVehicles(vehicles, clean), clean.get('sort')), [vehicles, clean]);
  // Runs after SiteLayout's scroll reset (tree order), once the list is on the page.
  const ready = status === 'ready';
  useLayoutEffect(() => {
    if (ready && restore) window.scrollTo({ top: restore.scrollY, behavior: 'instant' });
  }, [ready, restore]);
  const searchUrl = href(qualificationUrl({ intent: 'import', source: 'vehicles' }));
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
      {shown.length ? <VehicleGrid key={clean.toString()} vehicles={shown} initialCount={search === restore?.search ? restore.count : undefined} /> : <div className="vehicle-state">
        <h2 className="type-section">{text.empty}</h2><div className="vehicle-state__links"><button className="editorial-link type-ui" onClick={clear}>{text.clear}</button><Link className="editorial-link type-ui" to={searchUrl}>{text.search}<span aria-hidden="true">→</span></Link></div>
      </div>}
    </> : null}
    <section className="interior-closing vehicle-closing"><h2 className="type-section">{text.closing}</h2><div className="interior-closing__links"><Link className="editorial-link type-ui" to={searchUrl}>{text.find}<span aria-hidden="true">→</span></Link></div></section>
  </article>;
}
