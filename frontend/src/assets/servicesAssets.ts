import type { SceneAsset } from './sceneAssets';
import type { ServiceId } from '../i18n/servicesCopy';

// Each slot is separate so approved service photos can be supplied independently.
export const servicesAssets: Record<ServiceId | 'overview', SceneAsset> = {
  overview: { src: '/assets/temp/lateral-plane.svg', temporary: true },
  sourcing: { src: '/assets/temp/lateral-plane.svg', temporary: true },
  inspection: { src: '/assets/temp/lateral-plane.svg', temporary: true },
  import: { src: '/assets/temp/lateral-plane.svg', temporary: true },
  transparency: { src: '/assets/temp/lateral-plane.svg', temporary: true },
};
