import { sceneAssets } from '../assets/sceneAssets';
import { AssetSlot } from '../components/AssetSlot';
import { Button } from '../components/Button';
import { ScrollScene } from '../components/ScrollScene';
import { useLanguage } from '../i18n/useLanguage';

export function VehicleScene() {
  const { copy } = useLanguage();

  return (
    <ScrollScene id="ingenieria" kind="vehicle" className="vehicle-scene" labelledBy="vehicle-title" handoffTarget="process">
      <div className="scene-background" data-scene-background>
        <AssetSlot asset={sceneAssets.vehicleBackground} label={copy.common.backgroundAsset} background />
      </div>
      <h2 id="vehicle-title" className="scene-title vehicle-title">
        <span data-scene-title>{copy.vehicle.left}</span>
        <span data-scene-title>{copy.vehicle.right}</span>
      </h2>
      <p className="scene-description vehicle-description" data-scene-ui>{copy.vehicle.description}</p>
      <div className="vehicle-media" data-scene-media>
        <AssetSlot asset={sceneAssets.vehicleCar} label={copy.common.vehicleAsset} />
        <div className="vehicle-lights" data-vehicle-lights aria-hidden="true">
          <AssetSlot asset={sceneAssets.vehicleCarLights} label="" />
        </div>
      </div>
      <div className="scene-cta" data-scene-ui>
        <Button to="/vehiculos" variant="light">{copy.vehicle.cta}</Button>
      </div>
    </ScrollScene>
  );
}
