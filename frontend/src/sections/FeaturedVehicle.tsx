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
// Must match the fade-out of .featured--swapping (featured-vehicle.css).
const SWAP_OUT_MS = 200;

/** The public inventory without the sold cars, starting with the API's first vehicle. No price: curiosity, not a listing. */
export function FeaturedVehicle() {
  const { copy, locale, href } = useLanguage();
  const text = featuredCopy[locale];
  const labels = copy.vehicles;
  const [state, setState] = useState<State>({ status: 'loading' });
  const [failedPhoto, setFailedPhoto] = useState<string | null>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const vehicles = state.status === 'ready' ? state.vehicles : EMPTY;
  const { index, paused, togglePaused } = useFeaturedRotation(sectionRef, vehicles);
  // The car on screen follows the rotation after a short fade-out, so one car never cuts straight to the next.
  const [shown, setShown] = useState(index);
  const swapping = shown !== index;
  useEffect(() => {
    if (!swapping) return;
    const timer = window.setTimeout(() => setShown(index), SWAP_OUT_MS);
    return () => window.clearTimeout(timer);
  }, [index, swapping]);
  const vehicle = vehicles[shown] ?? null;
  useFeaturedVehicleScene(sectionRef, vehicle !== null);
  const notice = state.status === 'loading' ? text.loading : state.status === 'ready' && !vehicle ? text.empty : '';
  // Mount the live region empty; loading and empty results update the same node.
  const [statusMessage, setStatusMessage] = useState('');
  useEffect(() => { setStatusMessage(notice); }, [notice]);

  useEffect(() => {
    const request = new AbortController();
    listVehicles(request.signal).then(
      (list) => { if (!request.signal.aborted) setState({ status: 'ready', vehicles: list.filter((car) => car.availability !== 'sold') }); },
      () => { if (!request.signal.aborted) setState({ status: 'error' }); },
    );
    return () => request.abort();
  }, []);

  const name = vehicle ? `${vehicle.make} ${vehicle.model}` : '';
  // Keep animation targets mounted across rotations; missing values hide their whole row.
  const specs = vehicle ? [
    [labels.registration, formatRegistration(vehicle.firstRegistrationYear, vehicle.firstRegistrationMonth, locale)],
    [labels.mileage, formatKm(vehicle.mileageKm, locale)],
    [labels.fuelType, translateValue(labels.values, vehicle.fuelType)],
    [labels.power, formatPower(vehicle.powerHp, locale)],
    [labels.transmission, translateValue(labels.values, vehicle.transmission)],
  ] : [];
  // The API sends the cover first.
  const photo = failedPhoto === vehicle?.slug ? undefined : vehicle?.images?.[0];

  return (
    <section ref={sectionRef} id="seleccion" className={swapping ? 'featured featured--swapping' : 'featured'} aria-labelledby="featured-title" aria-busy={state.status === 'loading'}>
      <Container>
        <h2 id="featured-title" className="featured__title"><span>{text.title}</span>{' '}<span>{text.titleFine}</span></h2>
        {vehicles.length > 1 ? <div className="featured__rotation type-ui">
          <span className="type-numeric" aria-hidden="true">{String(shown + 1).padStart(2, '0')} / {String(vehicles.length).padStart(2, '0')}</span>
          <span className="sr-only">{text.position(shown + 1, vehicles.length)}</span>
          <button type="button" className="featured__pause" aria-pressed={paused} onClick={togglePaused}>
            <span className="featured__pause-box" aria-hidden="true" />{text.pause}
          </button>
        </div> : null}
        <p className="featured__state" role="status">{statusMessage}</p>
        {state.status === 'error' ? <p className="featured__state" role="alert">{text.error}</p> : null}
        {vehicle ? (
          <Link className="featured__piece" to={href(`/vehiculos/${encodeURIComponent(vehicle.slug)}`)}>
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
                <p className="featured__variant" hidden={!vehicle.variant}>{vehicle.variant}</p>
              </div>
              <dl className="featured__specs" hidden={!specs.some(([, value]) => Boolean(value))}>
                {specs.map(([label, value], index) => <div key={index} hidden={!value}><dt>{label}</dt><dd>{value}</dd></div>)}
              </dl>
              <span className="featured__link">{text.view}<span className="sr-only"> · {name}</span><span className="featured__arrow" aria-hidden="true">→</span></span>
            </div>
          </Link>
        ) : null}
      </Container>
    </section>
  );
}
