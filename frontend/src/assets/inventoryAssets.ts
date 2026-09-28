import type { SceneAsset } from './sceneAssets';

// Replace these entries with approved individual photographs, never a mockup.
export const inventoryAssets = {
  featured: { src: '/assets/temp/lateral-plane.svg', temporary: true },
  bmw: { src: '/assets/temp/lateral-plane.svg', temporary: true },
  porsche: { src: '/assets/temp/lateral-plane.svg', temporary: true },
  audi: { src: '/assets/temp/lateral-plane.svg', temporary: true },
  missingPhoto: { src: '/assets/temp/lateral-plane.svg', temporary: true },
} satisfies Record<string, SceneAsset>;
