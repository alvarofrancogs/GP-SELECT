import { HeroScene } from '../sections/HeroScene';
import { PerformanceScene } from '../sections/PerformanceScene';
import { CarHandoffScene } from '../sections/CarHandoffScene';
import { ServicesSection } from '../sections/ServicesSection';
import { InventoryPreview } from '../sections/InventoryPreview';
import { FinalCta } from '../sections/FinalCta';
import '../styles/services.css';

export function Home() {
  return (
    <>
      <HeroScene />
      <PerformanceScene />
      <CarHandoffScene />
      <ServicesSection />
      <InventoryPreview />
      <FinalCta />
    </>
  );
}
