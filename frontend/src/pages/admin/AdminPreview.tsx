import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { adminApi } from '../../services/adminApi';
import type { VehiclePreview } from '../../types/admin';
import type { VehicleDetail } from '../../types/vehicle';
import { adminCopy } from '../../i18n/adminCopy';
import { describeError } from '../../lib/adminErrors';
import { isListed } from '../../lib/adminFormat';
import { VehicleDetailView } from '../VehicleDetail';
import { StatusMark } from '../../components/admin/StatusMark';

/** Minimal adapter from the preview DTO to the public detail view model (the full public mapping belongs to 2F-C.3). */
function toDetail(dto: VehiclePreview): VehicleDetail {
  return {
    slug: dto.slug, make: dto.make, model: dto.model, variant: dto.variant,
    firstRegistrationYear: dto.year, firstRegistrationMonth: dto.month, mileageKm: dto.mileageKm, priceEur: dto.priceEur,
    powerHp: dto.powerHp, fuelType: dto.fuelType, transmission: dto.transmission, bodyType: dto.bodyType,
    availability: dto.status === 'Available' ? 'available' : dto.status === 'Reserved' ? 'reserved' : dto.status === 'ComingSoon' ? 'coming-soon' : null,
    images: dto.images.map((src) => ({ src, fit: 'cover', alt: null, temporary: false, width: null, height: null })),
    drivetrain: dto.drivetrain, exteriorColour: dto.exteriorColour, interiorColour: dto.interior,
    provenanceCountry: dto.provenance, ownersCount: null, historyStatus: dto.history, description: dto.description,
    equipment: dto.equipment, customSpecifications: dto.customSpecifications,
  };
}

export function AdminPreview() {
  const { id = '' } = useParams();
  const text = adminCopy.preview;
  const [preview, setPreview] = useState<VehiclePreview | null>(null);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    let ignore = false;
    adminApi.previewVehicle(id).then((data) => { if (!ignore) setPreview(data); }, (failure) => { if (!ignore) setError(failure); });
    return () => { ignore = true; };
  }, [id]);

  const editor = `/admin/vehiculos/${id}`;
  const back = <Link className="editorial-link type-ui" to={editor}><span aria-hidden="true">←</span>{text.backToEditor}</Link>;
  if (error) return <div className="admin-state" role="alert"><p className="type-ui">{describeError(error)}</p>{back}</div>;
  if (!preview) return <p className="admin-state type-ui" role="status">{text.loading}</p>;

  return <div className="admin-preview">
    <div className="admin-preview__notice">
      <p>{text.notice}</p>
      <p><StatusMark status={preview.status} />{isListed(preview.status) ? null : <span className="admin-field__hint"> {text.hidden}</span>}</p>
    </div>
    <VehicleDetailView vehicle={toDetail(preview)} back={back} showMockNote={false} className="vehicle-detail--preview" />
  </div>;
}
