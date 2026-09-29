import type { VehicleSummary } from '../types/vehicle';
import { VehicleCard } from './VehicleCard';

export function VehicleGrid({ vehicles }: { vehicles: VehicleSummary[] }) {
  return <div className="vehicle-grid">{vehicles.map((vehicle) =>
    <VehicleCard key={vehicle.slug} vehicle={vehicle} />,
  )}</div>;
}
