import { HeroScene } from '../sections/HeroScene';
import { PerformanceScene } from '../sections/PerformanceScene';
import { CarHandoffScene } from '../sections/CarHandoffScene';
import { ServicesSection } from '../sections/ServicesSection';
import { FeaturedVehicle } from '../sections/FeaturedVehicle';
import '../styles/services.css';

export function Home() {
  return (
    <>
      <HeroScene />
      <PerformanceScene />
      <CarHandoffScene />
      <ServicesSection />
      <FeaturedVehicle />
    </>
  );
}
