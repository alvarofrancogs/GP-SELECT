import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Container } from '../components/Container';
import { useFeaturedVehicleScene } from '../hooks/useFeaturedVehicleScene';
import { useFeaturedRotation } from '../hooks/useFeaturedRotation';
import { featuredCopy } from '../i18n/featuredCopy';
import { useLanguage } from '../i18n/useLanguage';
import { formatKm, formatPower, formatRegistration, translateValue } from '../lib/vehicleFormat';
import { listVehicles } from '../services/vehicles';
import type { VehicleSummary } from '../types/vehicle';
import '../styles/featured-vehicle.css';

type State = { status: 'loading' } | { status: 'error' } | { status: 'ready'; vehicles: VehicleSummary[] };
const EMPTY: VehicleSummary[] = [];

/** The public inventory, starting with the API's first vehicle. No price: curiosity, not a listing. */
export function FeaturedVehicle() {
  const { copy, locale } = useLanguage();
  const text = featuredCopy[locale];
  const labels = copy.vehicles;
  const [state, setState] = useState<State>({ status: 'loading' });
  const [failedPhoto, setFailedPhoto] = useState<string | null>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const vehicles = state.status === 'ready' ? state.vehicles : EMPTY;
  const { index, paused, togglePaused } = useFeaturedRotation(sectionRef, vehicles);
  const vehicle = vehicles[index] ?? null;
  useFeaturedVehicleScene(sectionRef, `${state.status}:${vehicle?.slug ?? ''}`, locale);

  useEffect(() => {
    const request = new AbortController();
    listVehicles(request.signal).then(
      (list) => { if (!request.signal.aborted) setState({ status: 'ready', vehicles: list }); },
      () => { if (!request.signal.aborted) setState({ status: 'error' }); },
    );
    return () => request.abort();
  }, []);

  const name = vehicle ? `${vehicle.make} ${vehicle.model}` : '';
  // Optional data is never rendered empty: a missing value drops its whole row.
  const specs = vehicle ? [
    [labels.registration, formatRegistration(vehicle.firstRegistrationYear, vehicle.firstRegistrationMonth, locale)],
    [labels.mileage, formatKm(vehicle.mileageKm, locale)],
    [labels.fuelType, translateValue(labels.values, vehicle.fuelType)],
    [labels.power, formatPower(vehicle.powerHp, locale)],
    [labels.transmission, translateValue(labels.values, vehicle.transmission)],
  ].filter((row): row is [string, string] => Boolean(row[1])) : [];
  // The API sends the cover first.
  const photo = failedPhoto === vehicle?.slug ? undefined : vehicle?.images?.[0];

  return (
    <section ref={sectionRef} id="seleccion" className="featured" aria-labelledby="featured-title" aria-busy={state.status === 'loading'}>
      <Container>
        <h2 id="featured-title" className="featured__title"><span>{text.title}</span><span>{text.titleFine}</span></h2>
        {vehicles.length > 1 ? <div className="featured__rotation type-ui">
          <span className="type-numeric" aria-hidden="true">{String(index + 1).padStart(2, '0')} / {String(vehicles.length).padStart(2, '0')}</span>
          <span className="sr-only">{text.position(index + 1, vehicles.length)}</span>
          <button type="button" className="featured__pause" aria-pressed={paused} onClick={togglePaused}>
            <span className="featured__pause-box" aria-hidden="true" />{text.pause}
          </button>
        </div> : null}
        {state.status === 'loading' ? <p className="featured__state" role="status">{text.loading}</p> : null}
        {state.status === 'error' ? <p className="featured__state" role="alert">{text.error}</p> : null}
        {state.status === 'ready' && !vehicle ? <p className="featured__state" role="status">{text.empty}</p> : null}
        {vehicle ? (
          <Link className="featured__piece" to={`/vehiculos/${encodeURIComponent(vehicle.slug)}`}>
            <div className="featured__media">
              <div className="featured__image">
                {photo
                  ? <img key={photo.src} src={photo.src} alt="" width={1600} height={1000} loading="lazy" decoding="async" onError={() => setFailedPhoto(vehicle.slug)} />
                  : <div className="featured__empty" aria-hidden="true" />}
              </div>
            </div>
            <div className="featured__data">
              <div className="featured__identity">
                <p className="featured__make">{vehicle.make}</p>
                <h3>{vehicle.model}</h3>
                {vehicle.variant ? <p className="featured__variant">{vehicle.variant}</p> : null}
                {vehicle.availability === 'sold' ? <p className="featured__availability type-ui">{labels.sold}</p> : null}
              </div>
              {specs.length ? (
                <dl className="featured__specs">
                  {specs.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
                </dl>
              ) : null}
              <span className="featured__link">{text.view}<span className="sr-only"> · {name}</span><span className="featured__arrow" aria-hidden="true">→</span></span>
            </div>
          </Link>
        ) : null}
      </Container>
    </section>
  );
}
