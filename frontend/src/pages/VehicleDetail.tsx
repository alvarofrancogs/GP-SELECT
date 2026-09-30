import { useEffect, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button } from '../components/Button';
import { EditorialMedia } from '../components/EditorialMedia';
import { VehicleGallery } from '../components/VehicleGallery';
import { VehicleSpecs } from '../components/VehicleSpecs';
import { useLanguage } from '../i18n/useLanguage';
import { contactConfig, showContactPreview } from '../config/contact';
import { getVehicle } from '../services/vehicles';
import type { VehicleDetail as Vehicle } from '../types/vehicle';
import { formatKm, formatPower, formatPrice, formatRegistration, translateValue } from '../lib/vehicleFormat';
import { qualificationUrl } from '../lib/qualification';
import '../styles/interiors.css';
import '../styles/vehicles.css';

export function VehicleDetail() {
  const { slug = '' } = useParams();
  // Keying the request boundary prevents showing a previous vehicle on slug changes.
  return <VehicleDetailContent key={slug} slug={slug} />;
}

function VehicleDetailContent({ slug }: { slug: string }) {
  const { copy } = useLanguage();
  const text = copy.vehicles;
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const request = new AbortController();
    getVehicle(slug, request.signal).then((data) => { setVehicle(data); setStatus('ready'); },
      () => { if (!request.signal.aborted) setStatus('error'); });
    return () => request.abort();
  }, [slug, attempt]);
  const back = <Link className="editorial-link type-ui" to="/vehiculos"><span aria-hidden="true">←</span>{text.back}</Link>;
  if (status !== 'ready') return <article className="interior-page vehicle-detail vehicle-detail--state">{back}<div className="vehicle-state" role={status === 'error' ? 'alert' : 'status'}><p className="type-lede">{status === 'error' ? text.error : text.loading}</p>{status === 'error' ? <button className="editorial-link type-ui" onClick={() => { setStatus('loading'); setAttempt(attempt + 1); }}>{text.retry}</button> : null}</div></article>;
  if (!vehicle) return <article className="interior-page vehicle-detail vehicle-detail--state">{back}<div className="vehicle-state"><h1 className="type-display">{text.notFound}</h1><Link className="editorial-link type-ui" to={qualificationUrl({ intent: 'import', source: 'vehicle-not-found' })}>{text.search}<span aria-hidden="true">→</span></Link></div></article>;

  return <VehicleDetailView vehicle={vehicle} back={back} />;
}

/** Presentational detail, shared with the private admin preview. */
export function VehicleDetailView({ vehicle, back, className = '' }: { vehicle: Vehicle; back: ReactNode; className?: string }) {
  const { copy, locale } = useLanguage();
  const text = copy.vehicles;
  const translate = (value: string | null) => translateValue(text.values, value);
  const name = `${vehicle.make} ${vehicle.model}`;
  const sold = vehicle.availability === 'sold';
  // A sold vehicle cannot be requested: the call to action looks for an alternative.
  const contactUrl = sold ? qualificationUrl({ intent: 'search', source: 'vehicle-sold' }) : `/contacto?${new URLSearchParams({ vehiculo: vehicle.slug, intent: 'vehicle' })}`;
  const cta = sold ? text.soldAlternative : text.request;
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
  return <article className={`interior-page vehicle-detail ${className}`.trim()}>
    <header className="vehicle-detail__header">{back}
      <h1 className="vehicle-detail__title"><span className="type-display">{name}</span>{vehicle.variant ? <span className="type-fine">{vehicle.variant}</span> : null}</h1>
    </header>
    <div className="vehicle-detail__opening">
      <VehicleGallery images={vehicle.images ?? []} name={name} />
      <aside className="vehicle-detail__data" aria-label={text.specifications}>
        {sold ? <p className="vehicle-detail__price type-ui" role="status">{text.soldNotice}</p> : <p className="vehicle-detail__price type-ui type-numeric">{formatPrice(vehicle.priceEur, locale, text.onRequest)}</p>}
        {vehicle.availability === 'reserved' || vehicle.availability === 'coming-soon' ? <p className="vehicle-detail__availability type-ui">{vehicle.availability === 'reserved' ? text.reserved : text.comingSoon}</p> : null}
        <VehicleSpecs rows={core} />
        <Button to={contactUrl}>{cta}</Button>
        {contactConfig.whatsapp ? <a className="editorial-link type-ui" href={`https://wa.me/${contactConfig.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noreferrer">{text.whatsapp}<span aria-hidden="true">→</span></a>
          : showContactPreview ? <button type="button" className="editorial-link type-ui" disabled>{text.whatsapp}<span aria-hidden="true">→</span></button> : null}
      </aside>
    </div>
    <div className="vehicle-detail__body">
      {vehicle.description ? <section className="vehicle-detail__section" aria-labelledby="vehicle-description"><h2 id="vehicle-description" className="type-heading">{text.description}</h2><p className="type-body">{vehicle.description}</p></section> : null}
      {specifications.some((row) => row.value) ? <section className="vehicle-detail__section" aria-labelledby="vehicle-specifications"><h2 id="vehicle-specifications" className="type-heading">{text.specifications}</h2><VehicleSpecs rows={specifications} /></section> : null}
      {vehicle.equipment?.length ? <section className="vehicle-detail__section" aria-labelledby="vehicle-equipment"><h2 id="vehicle-equipment" className="type-heading">{text.equipment}</h2><ul className="vehicle-equipment type-body">{vehicle.equipment.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul></section> : null}
      {vehicle.history ? <section className="vehicle-detail__section" aria-labelledby="vehicle-history"><h2 id="vehicle-history" className="type-heading">{text.history}</h2><p className="type-body">{vehicle.history}</p></section> : null}
      {vehicle.provenance ? <section className="vehicle-detail__section" aria-labelledby="vehicle-provenance"><h2 id="vehicle-provenance" className="type-heading">{text.provenance}</h2><p className="type-lede">{translate(vehicle.provenance)}</p></section> : null}
    </div>
    <section className="interior-band vehicle-import"><h2 className="type-section">{text.importTitle}</h2><div><p className="type-body">{text.importBody}</p><Link className="editorial-link type-ui" to="/importacion">{text.importLink}<span aria-hidden="true">→</span></Link></div></section>
    {extraImages.length > 1 ? <div className="vehicle-detail__extra">{extraImages.map((image, index) => <div key={`${image.src}-${index}`} className="vehicle-detail__extra-item" style={{ '--vehicle-image-fit': image.fit } as CSSProperties}><EditorialMedia asset={image} label={image.alt ?? `${name} · ${text.image} ${index + 2}`} /></div>)}</div> : null}
    <section className="interior-closing vehicle-detail__closing"><h2 className="type-heading">{name}{vehicle.variant ? <span className="type-fine"> {vehicle.variant}</span> : null}</h2><Button to={contactUrl}>{cta}</Button></section>
  </article>;
}
