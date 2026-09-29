// Replace a source here when its approved individual asset is delivered.
// No mockup is included in the rendered interface.
export const sceneAssets = {
  heroBackground: { src: '/assets/temp/hero-sky.svg', temporary: true },
  heroCar: { src: '/assets/temp/hero-car.svg', temporary: true },
  // Car handoff. Contract for final media: PNG/WebP RGBA, top view, nose up,
  // both cars on the same canvas with the same centre and scale.
  // Swap the sources here; the motion never adjusts per asset.
  carA: { src: '/assets/temp/car-a.svg', temporary: true },
  carB: { src: '/assets/temp/car-b.svg', temporary: true },
  map: { src: '/assets/temp/europe-map.svg', temporary: true },
  // Neutral reserved photographic spaces for Unit 2F-A. Replace independently.
  aboutSelection: { src: '/assets/temp/about-selection.svg', temporary: true },
  aboutDetail: { src: '/assets/temp/about-detail.svg', temporary: true },
  importSearch: { src: '/assets/temp/import-search.svg', temporary: true },
  importInspection: { src: '/assets/temp/import-inspection.svg', temporary: true },
  importDelivery: { src: '/assets/temp/import-delivery.svg', temporary: true },
};

export type SceneAsset = { src: string; temporary: boolean };
