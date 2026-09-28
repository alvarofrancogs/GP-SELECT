import { HeroScene } from '../sections/HeroScene';
import { PerformanceScene } from '../sections/PerformanceScene';
import { VehicleScene } from '../sections/VehicleScene';
import { ServicesSection } from '../sections/ServicesSection';
import { InventoryPreview } from '../sections/InventoryPreview';
import { EuropeSection } from '../sections/EuropeSection';
import '../styles/services.css';

export function Home() {
  return (
    <>
      <HeroScene />
      <PerformanceScene />
      <VehicleScene />
      <ServicesSection />
      <InventoryPreview />
      <EuropeSection />
    </>
  );
}
