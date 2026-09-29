import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { InteriorPageHeader } from '../components/InteriorPageHeader';
import { VehicleGrid } from '../components/VehicleGrid';
import { VehicleFilters } from '../components/VehicleFilters';
import { useLanguage } from '../i18n/useLanguage';
import { listVehicles, VEHICLE_DATA_SOURCE, filterVehicles, vehicleFilterKeys } from '../services/vehicles';
import type { VehicleSummary } from '../types/vehicle';
import { qualificationUrl } from '../lib/qualification';
import '../styles/interiors.css';
import '../styles/vehicles.css';

export function Vehicles() {
  const { copy, locale } = useLanguage();
  const text = copy.vehicles;
  const [params, setParams] = useSearchParams();
  const [vehicles, setVehicles] = useState<VehicleSummary[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let ignore = false;
    listVehicles(locale).then((data) => { if (!ignore) { setVehicles(data); setStatus('ready'); } },
      () => { if (!ignore) setStatus('error'); });
    return () => { ignore = true; };
  }, [locale, attempt]);
  const shown = filterVehicles(vehicles, params);
  const searchUrl = qualificationUrl({ intent: 'import', source: 'vehicles' });
  function clear() {
    const next = new URLSearchParams(params);
    vehicleFilterKeys.forEach((key) => next.delete(key));
    setParams(next, { preventScrollReset: true });
  }
  return <article className="interior-page vehicles-page">
    <InteriorPageHeader {...text} />
    {VEHICLE_DATA_SOURCE === 'mock' ? <p className="vehicle-mock-note type-ui">{text.mock}</p> : null}
    {status === 'loading' ? <p className="vehicle-state type-lede" role="status">{text.loading}</p> : null}
    {status === 'error' ? <div className="vehicle-state" role="alert"><p className="type-lede">{text.error}</p><button className="editorial-link type-ui" onClick={() => { setStatus('loading'); setAttempt(attempt + 1); }}>{text.retry}</button></div> : null}
    {status === 'ready' ? <>
      <VehicleFilters vehicles={vehicles} params={params} count={shown.length} onClear={clear} onChange={(key, value) => {
        const next = new URLSearchParams(params);
        if (value) next.set(key, value); else next.delete(key);
        setParams(next, { preventScrollReset: true });
      }} />
      {shown.length ? <VehicleGrid vehicles={shown} /> : <div className="vehicle-state">
        <h2 className="type-section">{text.empty}</h2><div className="vehicle-state__links"><button className="editorial-link type-ui" onClick={clear}>{text.clear}</button><Link className="editorial-link type-ui" to={searchUrl}>{text.search}<span aria-hidden="true">→</span></Link></div>
      </div>}
    </> : null}
    <section className="interior-closing vehicle-closing"><h2 className="type-section">{text.closing}</h2><div className="interior-closing__links"><Link className="editorial-link type-ui" to={searchUrl}>{text.find}<span aria-hidden="true">→</span></Link></div></section>
  </article>;
}
