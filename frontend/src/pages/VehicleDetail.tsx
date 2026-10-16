import { useEffect, useState } from 'react';
import { siteUrl, usePageMeta } from '../lib/usePageMeta';
import { getVehiclePageMeta, notFoundMeta } from '../lib/pageMeta';
import type { CSSProperties, ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '../components/Button';
import { EditorialMedia } from '../components/EditorialMedia';
import { VehicleGallery } from '../components/VehicleGallery';
import { VehicleSpecs } from '../components/VehicleSpecs';
import { useLanguage } from '../i18n/useLanguage';
import { contactConfig, showContactPreview, whatsappUrl } from '../config/contact';
import { consumeInitialVehicle, getInitialVehicle, getVehicle } from '../services/vehicles';
import type { VehicleDetail as Vehicle } from '../types/vehicle';
import { formatKm, formatPower, formatPrice, formatRegistration, translateValue } from '../lib/vehicleFormat';
import { qualificationUrl } from '../lib/qualification';
import { catalogueReturn } from '../lib/catalogueReturn';
import '../styles/interiors.css';
import '../styles/vehicles.css';

export function VehicleDetail({ slug }: { slug: string }) {
  // Keying the request boundary prevents showing a previous vehicle on slug changes.
  return <VehicleDetailContent key={slug} slug={slug} />;
}

function VehicleDetailContent({ slug }: { slug: string }) {
  const { copy, locale, href } = useLanguage();
  const text = copy.vehicles;
  const { key, state } = useLocation();
  // Opened from the catalogue: «← Vehicles» goes back to the same filters, batch and scroll.
  const [from] = useState(() => (state as { fromCatalogue?: boolean } | null)?.fromCatalogue ? catalogueReturn() : null);
  const [initialVehicle] = useState(() => getInitialVehicle(slug, key));
  const [vehicle, setVehicle] = useState<Vehicle | null>(initialVehicle);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(initialVehicle ? 'ready' : 'loading');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    consumeInitialVehicle();
    if (initialVehicle && attempt === 0) return;
    const request = new AbortController();
    getVehicle(slug, request.signal).then((data) => { setVehicle(data); setStatus('ready'); },
      () => { if (!request.signal.aborted) setStatus('error'); });
    return () => request.abort();
  }, [slug, attempt, initialVehicle]);
  const english = locale === 'en';
  usePageMeta(status === 'ready' && vehicle ? getVehiclePageMeta(vehicle, siteUrl, locale) : {
    ...notFoundMeta[locale],
    title: status === 'ready' ? (english ? 'Vehicle not found · GP SELECT' : 'Vehículo no encontrado · GP SELECT')
      : english ? 'Vehicle · GP SELECT' : 'Ficha de vehículo · GP SELECT',
    // A failed request is transient: only a confirmed missing vehicle is kept out of the index.
    robots: status === 'ready' ? 'noindex' : 'index,follow',
    tabTitle: status === 'ready' ? `${text.notFound} · GP SELECT` : undefined,
  });
  const back = <Link className="editorial-link type-ui" to={href('/vehiculos') + (from?.search ?? '')} state={from ? { fromVehicle: true } : undefined}><span aria-hidden="true">←</span>{text.back}</Link>;
  if (status !== 'ready') return <article className="interior-page vehicle-detail vehicle-detail--state">{back}<div className="vehicle-state" role={status === 'error' ? 'alert' : 'status'}>{status === 'error' ? <h1 className="type-lede">{text.detailError}</h1> : <p className="type-lede">{text.loading}</p>}{status === 'error' ? <button className="editorial-link type-ui" onClick={() => { setStatus('loading'); setAttempt(attempt + 1); }}>{text.retry}</button> : null}</div></article>;
  if (!vehicle) return <article className="interior-page vehicle-detail vehicle-detail--state">{back}<div className="vehicle-state"><h1 className="type-display">{text.notFound}</h1><Link className="editorial-link type-ui" to={href(qualificationUrl({ intent: 'import', source: 'vehicle-not-found' }))}>{text.search}<span aria-hidden="true">→</span></Link></div></article>;

  return <VehicleDetailView vehicle={vehicle} back={back} />;
}

/** Presentational detail, shared with the private admin preview. */
export function VehicleDetailView({ vehicle, back, className = '' }: { vehicle: Vehicle; back: ReactNode; className?: string }) {
  const { copy, locale, href } = useLanguage();
  const text = copy.vehicles;
  const translate = (value: string | null) => translateValue(text.values, value);
  const name = `${vehicle.make} ${vehicle.model}`;
  const sold = vehicle.availability === 'sold';
  // A sold vehicle cannot be requested: the call to action looks for an alternative.
  // The form shows this text in its vehicle field (and the enquiry email carries it): a readable name, not the slug.
  const label = `${name}${vehicle.variant ? ` ${vehicle.variant}` : ''} (${vehicle.firstRegistrationYear})`;
  // The public address, also from the admin preview, so the chat says exactly which car.
  const whatsappMessage = text.whatsappMessage.replace('{vehicle}', label)
    .replace('{url}', `${window.location.origin}${href(`/vehiculos/${encodeURIComponent(vehicle.slug)}`)}`);
  const contactUrl = href(sold ? qualificationUrl({ intent: 'search', source: 'vehicle-sold' }) : `/contacto?${new URLSearchParams({ vehiculo: label, intent: 'vehicle' })}`);
  const cta = sold ? text.soldAlternative : text.request;
  const core = [
    { label: text.registration, value: formatRegistration(vehicle.firstRegistrationYear, vehicle.firstRegistrationMonth, locale) },
    { label: text.mileage, value: formatKm(vehicle.mileageKm, locale) },
    { label: text.power, value: formatPower(vehicle.powerHp, locale) },
    { label: text.fuelType, value: translate(vehicle.fuelType) },
    { label: text.transmission, value: translate(vehicle.transmission) },
  ];
  // The Admin writes its free text in Spanish: English pages mark it, for screen readers and search engines.
  const freeText = locale === 'en' ? 'es' : undefined;
  const specifications = [
    { label: text.bodyType, value: translate(vehicle.bodyType) },
    { label: text.drivetrain, value: translate(vehicle.drivetrain) },
    { label: text.exteriorColour, value: translate(vehicle.exteriorColour) },
    { label: text.interiorColour, value: translate(vehicle.interiorColour) },
    ...(vehicle.customSpecifications ?? []).map((row) => ({ ...row, lang: freeText })),
  ];
  const extraImages = vehicle.images?.slice(1) ?? [];
  return <article className={`interior-page vehicle-detail ${className}`.trim()}>
    <header className="vehicle-detail__header">{back}
      <h1 className="vehicle-detail__title"><span className="type-display">{name}</span>{vehicle.variant ? ' ' : null}{vehicle.variant ? <span className="type-fine">{vehicle.variant}</span> : null}</h1>
    </header>
    <div className="vehicle-detail__opening">
      <VehicleGallery images={vehicle.images ?? []} name={name} />
      <aside className="vehicle-detail__data" aria-label={text.specifications}>
        {sold ? <p className="vehicle-detail__price type-ui" role="status">{text.soldNotice}</p> : <p className="vehicle-detail__price type-ui type-numeric">{formatPrice(vehicle.priceEur, locale, text.onRequest)}</p>}
        {vehicle.availability === 'reserved' || vehicle.availability === 'coming-soon' ? <p className="vehicle-detail__availability type-ui">{vehicle.availability === 'reserved' ? text.reserved : text.comingSoon}</p> : null}
        {sold ? null : <p className="vehicle-detail__availability type-ui">{text.ownership}</p>}
        <VehicleSpecs rows={core} />
        <Button to={contactUrl}>{cta}</Button>
        {contactConfig.whatsapp ? <a className="editorial-link type-ui" href={whatsappUrl(contactConfig.whatsapp, whatsappMessage)} target="_blank" rel="noreferrer">{text.whatsapp}<span aria-hidden="true">→</span></a>
          : showContactPreview ? <button type="button" className="editorial-link type-ui" disabled>{text.whatsapp}<span aria-hidden="true">→</span></button> : null}
      </aside>
    </div>
    <div className="vehicle-detail__body">
      {vehicle.description ? <section className="vehicle-detail__section" aria-labelledby="vehicle-description"><h2 id="vehicle-description" className="type-heading">{text.description}</h2><p className="type-body" lang={freeText}>{vehicle.description}</p></section> : null}
      {specifications.some((row) => row.value) ? <section className="vehicle-detail__section" aria-labelledby="vehicle-specifications"><h2 id="vehicle-specifications" className="type-heading">{text.specifications}</h2><VehicleSpecs rows={specifications} /></section> : null}
      {vehicle.equipment?.length ? <section className="vehicle-detail__section" aria-labelledby="vehicle-equipment"><h2 id="vehicle-equipment" className="type-heading">{text.equipment}</h2><ul className="vehicle-equipment type-body" lang={freeText}>{vehicle.equipment.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul></section> : null}
      {vehicle.history ? <section className="vehicle-detail__section" aria-labelledby="vehicle-history"><h2 id="vehicle-history" className="type-heading">{text.history}</h2><p className="type-body" lang={freeText}>{vehicle.history}</p></section> : null}
      {vehicle.provenance ? <section className="vehicle-detail__section" aria-labelledby="vehicle-provenance"><h2 id="vehicle-provenance" className="type-heading">{text.provenance}</h2><p className="type-body">{translate(vehicle.provenance)}</p></section> : null}
    </div>
    <section className="interior-band vehicle-import"><h2 className="type-section">{text.importTitle}</h2><div><p className="type-body">{text.importBody}</p><Link className="editorial-link type-ui" to={href('/importacion')}>{text.importLink}<span aria-hidden="true">→</span></Link></div></section>
    {extraImages.length > 1 ? <div className="vehicle-detail__extra">{extraImages.map((image, index) => <div key={`${image.src}-${index}`} className="vehicle-detail__extra-item" style={{ '--vehicle-image-fit': image.fit } as CSSProperties}><EditorialMedia asset={image} label={image.alt ?? `${name} · ${text.image} ${index + 2}`} /></div>)}</div> : null}
    <section className="interior-closing vehicle-detail__closing"><h2 className="type-heading">{name}{vehicle.variant ? <span className="type-fine"> {vehicle.variant}</span> : null}</h2><Button to={contactUrl}>{cta}</Button></section>
  </article>;
}
