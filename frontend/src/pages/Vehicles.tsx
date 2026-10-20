import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigationType, useSearchParams } from 'react-router-dom';
import { gsap } from 'gsap';
import { InteriorPageHeader } from '../components/InteriorPageHeader';
import { VehicleGrid, VehicleGridPlaceholder } from '../components/VehicleGrid';
import { VehicleFilters } from '../components/VehicleFilters';
import { SoldVehicle } from '../components/SoldVehicle';
import { useLanguage } from '../i18n/useLanguage';
import { consumeInitialVehicles, getInitialVehicles, lastVehicles, listVehicles } from '../services/vehicles';
import { filterVehicles, sanitizeParams, sortVehicles, vehicleFilterKeys } from '../lib/vehicleFacets';
import type { VehicleSummary } from '../types/vehicle';
import { qualificationUrl } from '../lib/qualification';
import { catalogueReturn, rememberCatalogue } from '../lib/catalogueReturn';
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
  // A list already read in this visit (the Home's featured car, an earlier catalogue) is shown while a fresh one loads.
  const [known] = useState(() => initialList ? null : lastVehicles());
  const [vehicles, setVehicles] = useState<VehicleSummary[]>(initialList ?? known ?? []);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(initialList || known ? 'ready' : 'loading');
  const [attempt, setAttempt] = useState(0);
  const mainCount = useRef(restore?.count ?? 9);
  const mainVehicles = useMemo(() => vehicles.filter((vehicle) => vehicle.availability !== 'sold'), [vehicles]);
  const soldVehicles = useMemo(() => vehicles.filter((vehicle) => vehicle.availability === 'sold'), [vehicles]);
  useEffect(() => {
    consumeInitialVehicles();
    if (initialList && attempt === 0) return;
    const request = new AbortController();
    // The list prefetched by the start-up screen ignores this signal: drop it if the page has gone.
    listVehicles(request.signal).then((data) => { if (!request.signal.aborted) { setVehicles(data); setStatus('ready'); } },
      // A failed refresh keeps the list on screen.
      () => { if (!request.signal.aborted && !(known && attempt === 0)) setStatus('error'); });
    return () => request.abort();
  }, [attempt, initialList, known]);
  // The URL is the source of truth; selections that no longer exist are dropped before rendering.
  const clean = useMemo(() => status === 'ready' ? sanitizeParams(mainVehicles, params) : params, [status, mainVehicles, params]);
  useEffect(() => {
    if (clean.toString() !== params.toString()) setParams(clean, { replace: true, preventScrollReset: true });
  }, [clean, params, setParams]);
  const shown = useMemo(() => sortVehicles(filterVehicles(mainVehicles, clean), clean.get('sort')), [mainVehicles, clean]);
  // Runs after SiteLayout's scroll reset (tree order), once the list is on the page.
  const ready = status === 'ready';
  useLayoutEffect(() => {
    if (ready && restore) window.scrollTo({ top: restore.scrollY, behavior: 'instant' });
  }, [ready, restore]);
  // A list that had to be waited for (the placeholder showed) settles in instead of popping up: the filters, then
  // each card's text. The photo boxes stay: they are the placeholder's own grey boxes.
  const pageRef = useRef<HTMLElement>(null);
  const waited = useRef(status === 'loading');
  useLayoutEffect(() => {
    const page = pageRef.current;
    if (status === 'loading') waited.current = true;
    if (status !== 'ready' || !waited.current || !page) return;
    waited.current = false;
    const media = gsap.matchMedia();
    media.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.fromTo(page.querySelectorAll('.vehicle-filters, .vehicle-state'), { opacity: 0 }, { opacity: 1, duration: 0.4, ease: 'power2.out', clearProps: 'opacity' });
      page.querySelectorAll('#vehicle-results .vehicle-card').forEach((card, index) => {
        gsap.fromTo(card.querySelectorAll(':scope > :not(.vehicle-card__media)'), { opacity: 0, y: 10 }, {
          opacity: 1, y: 0, duration: 0.5, delay: 0.08 + index * 0.06, ease: 'power2.out', clearProps: 'opacity,transform',
        });
      });
    });
    return () => media.revert();
  }, [status]);
  const searchUrl = href(qualificationUrl({ intent: 'import', source: 'vehicles' }));
  function clear() {
    mainCount.current = 9;
    const next = new URLSearchParams(clean);
    vehicleFilterKeys.forEach((key) => next.delete(key));
    setParams(next, { preventScrollReset: true });
  }
  // Filters combine freely: changing one never removes another. While a range is typed, the URL is replaced.
  function change(key: string, value: string, typing = false) {
    mainCount.current = 9;
    const next = new URLSearchParams(clean);
    if (value) next.set(key, value); else next.delete(key);
    setParams(next, { preventScrollReset: true, replace: typing });
  }
  return <article ref={pageRef} className="interior-page vehicles-page">
    <InteriorPageHeader {...text} />
    {status === 'loading' ? <VehicleGridPlaceholder label={text.loading} /> : null}
    {status === 'error' ? <div className="vehicle-state" role="alert"><p className="type-lede">{text.error}</p><button className="editorial-link type-ui" onClick={() => { setStatus('loading'); setAttempt(attempt + 1); }}>{text.retry}</button></div> : null}
    {status === 'ready' && !mainVehicles.length ? <div className="vehicle-state"><h2 className="type-section">{text.emptyCurrent}</h2><div className="vehicle-state__links"><Link className="editorial-link type-ui" to={searchUrl}>{text.search}<span aria-hidden="true">→</span></Link></div></div> : null}
    {status === 'ready' && mainVehicles.length ? <>
      <VehicleFilters vehicles={mainVehicles} params={clean} count={shown.length} onClear={clear} onChange={change} />
      {shown.length ? <VehicleGrid key={clean.toString()} vehicles={shown} initialCount={search === restore?.search ? restore.count : undefined} onCountChange={(count) => { mainCount.current = count; }} /> : <div className="vehicle-state">
        <h2 className="type-section">{text.empty}</h2><div className="vehicle-state__links"><button className="editorial-link type-ui" onClick={clear}>{text.clear}</button><Link className="editorial-link type-ui" to={searchUrl}>{text.search}<span aria-hidden="true">→</span></Link></div>
      </div>}
    </> : null}
    {status === 'ready' && soldVehicles.length ? <section className="vehicle-sold" aria-labelledby="vehicle-sold-title">
      <header className="vehicle-sold__header"><h2 id="vehicle-sold-title" className="type-section">{text.soldTitle}</h2><p className="type-body">{text.soldIntro}</p></header>
      <div className="vehicle-grid--sold" onClickCapture={() => rememberCatalogue({ search, scrollY: window.scrollY, count: mainCount.current })}>
        {soldVehicles.map((vehicle) => <SoldVehicle key={vehicle.slug} vehicle={vehicle} />)}
      </div>
    </section> : null}
    <section className="interior-closing vehicle-closing"><h2 className="type-section">{text.closing}</h2><div className="interior-closing__links"><Link className="editorial-link type-ui" to={searchUrl}>{text.find}<span aria-hidden="true">→</span></Link></div></section>
  </article>;
}
