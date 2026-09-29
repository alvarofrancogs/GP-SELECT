import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button } from '../components/Button';
import { EditorialMedia } from '../components/EditorialMedia';
import { VehicleGallery } from '../components/VehicleGallery';
import { VehicleSpecs } from '../components/VehicleSpecs';
import { useLanguage } from '../i18n/useLanguage';
import { contactConfig, showContactPreview } from '../config/contact';
import { getVehicle, VEHICLE_DATA_SOURCE } from '../services/vehicles';
import type { VehicleDetail as Vehicle } from '../types/vehicle';
import { formatKm, formatPower, formatPrice, formatRegistration } from '../lib/vehicleFormat';
import { qualificationUrl } from '../lib/qualification';
import '../styles/interiors.css';
import '../styles/vehicles.css';

export function VehicleDetail() {
  const { slug = '' } = useParams();
  // Keying the request boundary prevents showing a previous vehicle on slug changes.
  const { locale } = useLanguage();
  return <VehicleDetailContent key={`${slug}-${locale}`} slug={slug} />;
}

function VehicleDetailContent({ slug }: { slug: string }) {
  const { copy, locale } = useLanguage();
  const text = copy.vehicles;
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let ignore = false;
    getVehicle(slug, locale).then((data) => { if (!ignore) { setVehicle(data); setStatus('ready'); } },
      () => { if (!ignore) setStatus('error'); });
    return () => { ignore = true; };
  }, [slug, locale, attempt]);
  const back = <Link className="editorial-link type-ui" to="/vehiculos"><span aria-hidden="true">←</span>{text.back}</Link>;
  if (status !== 'ready') return <article className="interior-page vehicle-detail vehicle-detail--state">{back}<div className="vehicle-state" role={status === 'error' ? 'alert' : 'status'}><p className="type-lede">{status === 'error' ? text.error : text.loading}</p>{status === 'error' ? <button className="editorial-link type-ui" onClick={() => { setStatus('loading'); setAttempt(attempt + 1); }}>{text.retry}</button> : null}</div></article>;
  if (!vehicle) return <article className="interior-page vehicle-detail vehicle-detail--state">{back}<div className="vehicle-state"><h1 className="type-display">{text.notFound}</h1><Link className="editorial-link type-ui" to={qualificationUrl({ intent: 'import', source: 'vehicle-not-found' })}>{text.search}<span aria-hidden="true">→</span></Link></div></article>;

  const translate = (value: string | null) => value ? text.values[value] ?? value : null;
  const name = `${vehicle.make} ${vehicle.model}`;
  const contactUrl = `/contacto?${new URLSearchParams({ vehiculo: vehicle.slug, intent: 'vehicle' })}`;
  const core = [
    { label: text.registration, value: formatRegistration(vehicle.firstRegistrationYear, vehicle.firstRegistrationMonth, locale) },
    { label: text.mileage, value: formatKm(vehicle.mileageKm, locale) },
    { label: text.power, value: formatPower(vehicle.powerHp, locale) },
    { label: text.fuelType, value: translate(vehicle.fuelType) },
    { label: text.transmission, value: translate(vehicle.transmission) },
  ];
  const specifications = [
    { label: text.bodyType, value: translate(vehicle.bodyType) },
    { label: text.drivetrain, value: translate(vehicle.drivetrain) },
    { label: text.exteriorColour, value: translate(vehicle.exteriorColour) },
    { label: text.interiorColour, value: translate(vehicle.interiorColour) },
    ...(vehicle.customSpecifications ?? []),
  ];
  const extraImages = vehicle.images?.slice(1) ?? [];
  return <article className="interior-page vehicle-detail">
    <header className="vehicle-detail__header">{back}
      <h1 className="vehicle-detail__title"><span className="type-display">{name}</span>{vehicle.variant ? <span className="type-fine">{vehicle.variant}</span> : null}</h1>
      {VEHICLE_DATA_SOURCE === 'mock' ? <p className="vehicle-mock-note type-ui">{text.mock}</p> : null}
    </header>
    <div className="vehicle-detail__opening">
      <VehicleGallery images={vehicle.images ?? []} name={name} />
      <aside className="vehicle-detail__data" aria-label={text.specifications}>
        <p className="vehicle-detail__price type-ui type-numeric">{formatPrice(vehicle.priceEur, locale, text.onRequest)}</p>
        {vehicle.availability === 'reserved' || vehicle.availability === 'coming-soon' ? <p className="vehicle-detail__availability type-ui">{vehicle.availability === 'reserved' ? text.reserved : text.comingSoon}</p> : null}
        <VehicleSpecs rows={core} />
        <Button to={contactUrl}>{text.request}</Button>
        {contactConfig.whatsapp ? <a className="editorial-link type-ui" href={`https://wa.me/${contactConfig.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noreferrer">{text.whatsapp}<span aria-hidden="true">→</span></a>
          : showContactPreview ? <button type="button" className="editorial-link type-ui" disabled>{text.whatsapp}<span aria-hidden="true">→</span></button> : null}
      </aside>
    </div>
    <div className="vehicle-detail__body">
      {vehicle.description ? <section className="vehicle-detail__section" aria-labelledby="vehicle-description"><h2 id="vehicle-description" className="type-heading">{text.description}</h2><p className="type-body">{vehicle.description}</p></section> : null}
      {specifications.some((row) => row.value) ? <section className="vehicle-detail__section" aria-labelledby="vehicle-specifications"><h2 id="vehicle-specifications" className="type-heading">{text.specifications}</h2><VehicleSpecs rows={specifications} /></section> : null}
      {vehicle.equipment?.length ? <section className="vehicle-detail__section" aria-labelledby="vehicle-equipment"><h2 id="vehicle-equipment" className="type-heading">{text.equipment}</h2><ul className="vehicle-equipment type-body">{vehicle.equipment.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul></section> : null}
      <section className="vehicle-detail__section" aria-labelledby="vehicle-inspection"><h2 id="vehicle-inspection" className="type-heading">{text.inspection}</h2><div>
        {vehicle.historyStatus !== null || vehicle.ownersCount !== null ? <VehicleSpecs rows={[{ label: text.history, value: vehicle.historyStatus }, { label: text.owners, value: vehicle.ownersCount === null ? null : new Intl.NumberFormat(locale === 'es' ? 'es-ES' : 'en-GB', { useGrouping: 'always' }).format(vehicle.ownersCount) }]} /> : null}
        <p className="type-body">{text.verification}</p>
      </div></section>
      {vehicle.provenanceCountry ? <section className="vehicle-detail__section" aria-labelledby="vehicle-provenance"><h2 id="vehicle-provenance" className="type-heading">{text.provenance}</h2><p className="type-lede">{translate(vehicle.provenanceCountry)}</p></section> : null}
    </div>
    <section className="interior-band vehicle-import"><h2 className="type-section">{text.importTitle}</h2><div><p className="type-body">{text.importBody}</p><Link className="editorial-link type-ui" to="/importacion">{text.importLink}<span aria-hidden="true">→</span></Link></div></section>
    {extraImages.length > 1 ? <div className="vehicle-detail__extra">{extraImages.map((image, index) => <div key={`${image.src}-${index}`} className="vehicle-detail__extra-item" style={{ '--vehicle-image-fit': image.fit } as CSSProperties}><EditorialMedia asset={image} label={image.alt ?? `${name} · ${text.image} ${index + 2}`} /></div>)}</div> : null}
    <section className="interior-closing vehicle-detail__closing"><h2 className="type-heading">{name}{vehicle.variant ? <span className="type-fine"> {vehicle.variant}</span> : null}</h2><Button to={contactUrl}>{text.request}</Button></section>
  </article>;
}
