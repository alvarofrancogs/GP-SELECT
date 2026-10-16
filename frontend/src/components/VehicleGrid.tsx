import { useLocation } from 'react-router-dom';
import type { VehicleSummary } from '../types/vehicle';
import { VehicleCard } from './VehicleCard';
import { useLanguage } from '../i18n/useLanguage';
import { useProgressiveList } from '../hooks/useProgressiveList';
import { rememberCatalogue } from '../lib/catalogueReturn';

export function VehicleGrid({ vehicles, initialCount }: { vehicles: VehicleSummary[]; initialCount?: number }) {
  const { copy } = useLanguage();
  const { search } = useLocation();
  const { containerRef, count, revealMore } = useProgressiveList<HTMLDivElement>(9, '', '.vehicle-card', undefined, initialCount);
  // Opening a car remembers where the list was left, so coming back lands on the same card.
  const leave = () => rememberCatalogue({ search, scrollY: window.scrollY, count });
  return <>
    <div ref={containerRef} id="vehicle-results" className="vehicle-grid" onClickCapture={leave}>{vehicles.slice(0, count).map((vehicle) =>
    <VehicleCard key={vehicle.slug} vehicle={vehicle} state={{ fromCatalogue: true }} />,
    )}</div>
    {count < vehicles.length ? <div className="vehicle-grid__more"><button type="button" className="button button--dark" aria-controls="vehicle-results" onClick={revealMore}>{copy.vehicles.showMore}<span aria-hidden="true">↓</span></button></div> : null}
  </>;
}
