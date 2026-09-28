import type { SceneAsset } from './sceneAssets';

// Replace these sources with approved individual assets, keeping the components.
export const europeAssets: Record<'vehicle' | 'map', SceneAsset> = {
  vehicle: { src: '/assets/temp/europe-vehicle.svg', temporary: true },
  map: { src: '/assets/temp/lateral-plane.svg', temporary: true },
};
