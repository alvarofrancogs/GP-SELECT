import type { VehicleSummary } from '../types/vehicle';
import { VehicleCard } from './VehicleCard';
import { useLanguage } from '../i18n/useLanguage';
import { useProgressiveList } from '../hooks/useProgressiveList';

export function VehicleGrid({ vehicles }: { vehicles: VehicleSummary[] }) {
  const { copy } = useLanguage();
  const { containerRef, count, revealMore } = useProgressiveList<HTMLDivElement>(9, '', '.vehicle-card');
  return <>
    <div ref={containerRef} id="vehicle-results" className="vehicle-grid">{vehicles.slice(0, count).map((vehicle) =>
    <VehicleCard key={vehicle.slug} vehicle={vehicle} />,
    )}</div>
    {count < vehicles.length ? <div className="vehicle-grid__more"><button type="button" className="button button--dark" aria-controls="vehicle-results" onClick={revealMore}>{copy.vehicles.showMore}<span aria-hidden="true">↓</span></button></div> : null}
  </>;
}
