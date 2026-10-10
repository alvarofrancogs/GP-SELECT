import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { VehicleSummary } from '../types/vehicle';
import { useLanguage } from '../i18n/useLanguage';
import { formatKm, formatPower, formatPrice, translateValue } from '../lib/vehicleFormat';

export function VehicleCard({ vehicle }: { vehicle: VehicleSummary }) {
  const { copy, locale, href } = useLanguage();
  const text = copy.vehicles;
  const [failed, setFailed] = useState(false);
  const image = failed ? undefined : vehicle.images?.[0];
  const name = `${vehicle.make} ${vehicle.model}`;
  const translate = (value: string | null) => translateValue(text.values, value);
  const facts = [vehicle.firstRegistrationYear, formatKm(vehicle.mileageKm, locale)].filter((v) => v !== null).join(' · ');
  const mechanical = [formatPower(vehicle.powerHp, locale), translate(vehicle.fuelType), translate(vehicle.transmission)].filter(Boolean).join(' · ');
  return (
    <Link className="vehicle-card" to={href(`/vehiculos/${encodeURIComponent(vehicle.slug)}`)}>
      <figure className="vehicle-card__media editorial-media">
        {image ? <img src={image.src} alt={image.temporary ? '' : image.alt ?? name}
          style={{ objectFit: image.fit }} data-fit={image.fit}
          width={image.width ?? 1200} height={image.height ?? 900} loading="lazy"
          decoding="async" onError={() => setFailed(true)} /> : <div className="vehicle-media-empty type-ui">{text.noImage}</div>}
        {image?.temporary ? <figcaption className="type-ui">{name}<span>{copy.common.temporaryAsset}</span></figcaption> : null}
      </figure>
      <div className="vehicle-card__identity">
        <h2 className="type-heading">{name}</h2>
        {vehicle.variant ? <p className="vehicle-card__variant type-fine">{vehicle.variant}</p> : null}
      </div>
      <div className="vehicle-card__facts type-ui type-numeric">
        {facts ? <p>{facts}</p> : null}
        {mechanical ? <p>{mechanical}</p> : null}
      </div>
      <div className="vehicle-card__pricing">
        {vehicle.availability !== 'sold' ? <p className="vehicle-card__price type-ui type-numeric">{formatPrice(vehicle.priceEur, locale, text.onRequest)}</p> : <p className="vehicle-card__availability type-ui">{text.sold}</p>}
        {vehicle.availability === 'coming-soon' || vehicle.availability === 'reserved' ? <p className="vehicle-card__availability type-ui">{vehicle.availability === 'reserved' ? text.reserved : text.comingSoon}</p> : null}
      </div>
      <span className="vehicle-card__link editorial-link type-ui">{text.view}<span aria-hidden="true">→</span></span>
    </Link>
  );
}
