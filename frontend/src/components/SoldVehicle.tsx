import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../i18n/useLanguage';
import { formatKm } from '../lib/vehicleFormat';
import type { VehicleSummary } from '../types/vehicle';

export function SoldVehicle({ vehicle }: { vehicle: VehicleSummary }) {
  const { copy, locale, href } = useLanguage();
  const [failed, setFailed] = useState(false);
  const image = failed ? undefined : vehicle.images?.[0];
  const name = `${vehicle.make} ${vehicle.model}`;
  const facts = [vehicle.firstRegistrationYear, formatKm(vehicle.mileageKm, locale)].filter((value) => value !== null).join(' · ');

  return <Link className="sold-vehicle" to={href(`/vehiculos/${encodeURIComponent(vehicle.slug)}`)}
    state={{ fromCatalogue: true }}>
    <div className="sold-vehicle__media">
      {/* The heading already names the car inside this link: a fallback alt would only repeat it. */}
      {image ? <img src={image.src} alt={image.temporary ? '' : image.alt ?? ''}
        style={{ objectFit: image.fit }} width={image.width ?? 1200} height={image.height ?? 900}
        loading="lazy" decoding="async" onError={() => setFailed(true)} />
        : <span className="sold-vehicle__empty type-ui" aria-hidden="true">{copy.vehicles.noImage}</span>}
    </div>
    <div className="sold-vehicle__identity">
      <h3 className="type-heading">{name}</h3>
      {vehicle.variant ? <p className="sold-vehicle__variant type-body">{vehicle.variant}</p> : null}
      {facts ? <p className="sold-vehicle__facts type-ui type-numeric">{facts}</p> : null}
    </div>
    <span className="sold-vehicle__status type-ui">{copy.vehicles.sold}</span>{' '}
    <span className="sold-vehicle__link editorial-link type-ui">{copy.vehicles.view}<span aria-hidden="true">→</span></span>
  </Link>;
}
