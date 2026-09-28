import { HeroScene } from '../sections/HeroScene';
import { PerformanceScene } from '../sections/PerformanceScene';
import { VehicleScene } from '../sections/VehicleScene';
import { EuropeSection } from '../sections/EuropeSection';
import { ServicesSection } from '../sections/ServicesSection';
import { InventoryPreview } from '../sections/InventoryPreview';
import { FinalCta } from '../sections/FinalCta';
import '../styles/services.css';

// Light and dark scenes alternate: Europe is the dark interlude between BMW and Services.
export function Home() {
  return (
    <>
      <HeroScene />
      <PerformanceScene />
      <VehicleScene />
      <EuropeSection />
      <ServicesSection />
      <InventoryPreview />
      <FinalCta />
    </>
  );
}
