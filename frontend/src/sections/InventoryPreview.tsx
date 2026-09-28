import { Button } from '../components/Button';
import { Container } from '../components/Container';
import { VehiclePreviewCard } from '../components/VehiclePreviewCard';
import { inventoryCopy } from '../i18n/inventoryCopy';
import { useLanguage } from '../i18n/useLanguage';
import { exampleInventory } from '../services/inventoryPreview';
import type { InventoryPreviewStatus, InventoryPreviewVehicle } from '../types/inventory';
import '../styles/inventory-preview.css';

interface InventoryPreviewProps {
  vehicles?: InventoryPreviewVehicle[];
  status?: InventoryPreviewStatus;
}

export function InventoryPreview({ vehicles = exampleInventory, status = 'ready' }: InventoryPreviewProps) {
  const { locale } = useLanguage();
  const copy = inventoryCopy[locale];
  const featured = vehicles[0];
  const remaining = vehicles.slice(1, 4);
  const hasExamples = vehicles.some((vehicle) => vehicle.source === 'example');

  return (
    <section id="seleccion" className="inventory-preview" aria-labelledby="inventory-title" aria-busy={status === 'loading'}>
      <Container>
        <div className="inventory-preview__intro">
          <div>
            <p className="eyebrow">{copy.eyebrow}</p>
            <h2 id="inventory-title">{copy.title}<span>{copy.titleFine}</span></h2>
          </div>
          <div className="inventory-preview__intro-aside">
            <p>{copy.description}</p>
            <Button to="/vehiculos" variant="outline">{copy.allVehicles}</Button>
          </div>
        </div>

        {status === 'ready' && hasExamples ? <p className="inventory-preview__notice">{copy.examplesNotice}</p> : null}

        {status === 'loading' ? <p className="inventory-preview__state" role="status">{copy.loading}</p> : null}
        {status === 'error' ? <p className="inventory-preview__state" role="alert">{copy.error}</p> : null}
        {status === 'ready' && !featured ? <p className="inventory-preview__state" role="status">{copy.empty}</p> : null}
        {status === 'ready' && featured ? (
          <>
            <VehiclePreviewCard vehicle={featured} featured />
            {remaining.length > 0 ? (
              <div className="inventory-preview__grid">
                {remaining.map((vehicle) => <VehiclePreviewCard key={vehicle.id} vehicle={vehicle} />)}
              </div>
            ) : null}
          </>
        ) : null}
      </Container>
    </section>
  );
}
