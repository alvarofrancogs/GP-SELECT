import { useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';
import type { VehicleSummary } from '../types/vehicle';
import { VehicleCard } from './VehicleCard';
import { useLanguage } from '../i18n/useLanguage';
import { useProgressiveList } from '../hooks/useProgressiveList';
import { rememberCatalogue } from '../lib/catalogueReturn';

const BLANK = '\u00a0';

/** Holds the place of the filters and the first cards while the list loads, so nothing below jumps when it arrives. */
export function VehicleGridPlaceholder({ label }: { label: string }) {
  return <div className="vehicle-placeholder" role="status">
    <span className="sr-only">{label}</span>
    <div className="vehicle-filters vehicle-placeholder__filters" aria-hidden="true" />
    {/* The cards' own classes and one blank line per text line give the real heights. */}
    <div className="vehicle-grid" aria-hidden="true">{[0, 1, 2].map((index) => <div key={index} className="vehicle-card vehicle-placeholder__card">
      <div className="vehicle-card__media"><div className="vehicle-media-empty" /></div>
      <div className="vehicle-card__identity"><span className="type-heading">{BLANK}</span><span className="vehicle-card__variant type-fine">{BLANK}</span></div>
      <div className="vehicle-card__facts type-ui"><p>{BLANK}</p><p>{BLANK}</p></div>
      <div className="vehicle-card__pricing"><p className="vehicle-card__price type-ui">{BLANK}</p></div>
      <span className="vehicle-card__link type-ui">{BLANK}</span>
    </div>)}</div>
  </div>;
}

export function VehicleGrid({ vehicles, initialCount, onCountChange }: { vehicles: VehicleSummary[]; initialCount?: number; onCountChange?: (count: number) => void }) {
  const { copy } = useLanguage();
  const { search } = useLocation();
  const { containerRef, count, revealMore } = useProgressiveList<HTMLDivElement>(9, '', '.vehicle-card', undefined, initialCount);
  useLayoutEffect(() => { onCountChange?.(count); }, [count, onCountChange]);
  // Opening a car remembers where the list was left, so coming back lands on the same card.
  const leave = () => rememberCatalogue({ search, scrollY: window.scrollY, count });
  return <>
    <div ref={containerRef} id="vehicle-results" className="vehicle-grid" onClickCapture={leave}>{vehicles.slice(0, count).map((vehicle) =>
    <VehicleCard key={vehicle.slug} vehicle={vehicle} state={{ fromCatalogue: true }} />,
    )}</div>
    {count < vehicles.length ? <div className="vehicle-grid__more"><button type="button" className="button button--dark" aria-controls="vehicle-results" onClick={revealMore}>{copy.vehicles.showMore}<span aria-hidden="true">↓</span></button></div> : null}
  </>;
}
