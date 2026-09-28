import { Link } from 'react-router-dom';
import { AssetSlot } from './AssetSlot';
import { Button } from './Button';
import { inventoryCopy } from '../i18n/inventoryCopy';
import { useLanguage } from '../i18n/useLanguage';
import { qualificationUrl } from '../lib/qualification';
import type { InventoryPreviewVehicle } from '../types/inventory';

interface VehiclePreviewCardProps {
  vehicle: InventoryPreviewVehicle;
  featured?: boolean;
}

export function VehiclePreviewCard({ vehicle, featured = false }: VehiclePreviewCardProps) {
  const { locale } = useLanguage();
  const copy = inventoryCopy[locale];
  const vehicleName = `${vehicle.make} ${vehicle.model}`;
  const isExample = vehicle.source === 'example';
  const enquiryUrl = vehicle.source === 'published'
    ? qualificationUrl({ intent: 'vehicle', source: 'home-inventory', vehicleSlug: vehicle.slug })
    : qualificationUrl({ intent: 'search', source: `home-inventory-${vehicle.id}` });
  const enquiryLabel = isExample ? copy.findSimilar : copy.interested;
  const formattedPrice = vehicle.source === 'published' && vehicle.priceEur !== null
    ? new Intl.NumberFormat(locale === 'es' ? 'es-ES' : 'en-GB', {
      style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 2,
    }).format(vehicle.priceEur)
    : null;

  return (
    <article className={`vehicle-preview${featured ? ' vehicle-preview--featured' : ''}`}>
      <div className="vehicle-preview__media" data-inventory-media>
        <AssetSlot asset={vehicle.image} label={vehicle.image.temporary ? copy.pendingPhoto : vehicleName} />
      </div>
      <div className="vehicle-preview__content">
        <div className="vehicle-preview__identity">
          {isExample || featured ? (
            <p className="vehicle-preview__label">{isExample ? copy.exampleLabel : copy.featuredLabel}</p>
          ) : null}
          <p className="vehicle-preview__make">{vehicle.make}</p>
          <h3>{vehicle.model}</h3>
          {vehicle.variant ? <p className="vehicle-preview__variant">{vehicle.variant}</p> : null}
        </div>
        <div className="vehicle-preview__action">
          {vehicle.source === 'published' ? (
            <p className="vehicle-preview__facts">
              <span><span className="sr-only">{copy.registration}: </span>{vehicle.year}</span>
              {formattedPrice ? <span>{formattedPrice}</span> : null}
            </p>
          ) : null}
          {featured ? (
            <Button to={enquiryUrl} variant="dark">
              {enquiryLabel}<span className="sr-only"> · {vehicleName}</span>
            </Button>
          ) : (
            <Link className="vehicle-preview__link" to={enquiryUrl}>
              <span>{enquiryLabel}<span className="sr-only"> · {vehicleName}</span></span>
              <span aria-hidden="true">→</span>
            </Link>
          )}
          {vehicle.source === 'published' ? (
            <Link className="vehicle-preview__detail" to={`/vehiculos/${encodeURIComponent(vehicle.slug)}`}>
              {copy.viewVehicle}<span className="sr-only"> · {vehicleName}</span>
            </Link>
          ) : null}
        </div>
      </div>
    </article>
  );
}
