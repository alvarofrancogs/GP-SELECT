// Replace a source here when its approved individual asset is delivered.
// No mockup is included in the rendered interface.
export const sceneAssets = {
  // Generated HOME assets (3C), replaceable by photography with the same framing.
  heroBackground: { src: '/assets/home/hero-sky.webp', temporary: false },
  heroCar: { src: '/assets/home/hero-car.webp', temporary: false },
  // Car scene. Contract: WebP RGBA, top view, nose up, both views on the same
  // 1200×1800 canvas (car in the middle 75 %) with the same footprint, shadow baked in.
  // Swap the sources here; the motion never adjusts per asset.
  carA: { src: '/assets/home/car-a.webp', temporary: false },
  // The same BMW as a mechanical cutaway, cut to the photograph's exact silhouette.
  carCutaway: { src: '/assets/home/car-cutaway.webp', temporary: false },
  // Handoff world: the same sky seen from above, bright and overcast, aligned to crossfade.
  handoffBright: { src: '/assets/home/sky-bright.webp', temporary: false },
  handoffOvercast: { src: '/assets/home/sky-overcast.webp', temporary: false },
  // Neutral reserved photographic spaces for Unit 2F-A. Replace independently.
  aboutSelection: { src: '/assets/temp/about-selection.svg', temporary: true },
  aboutDetail: { src: '/assets/temp/about-detail.svg', temporary: true },
  importSearch: { src: '/assets/temp/import-search.svg', temporary: true },
  importInspection: { src: '/assets/temp/import-inspection.svg', temporary: true },
  importDelivery: { src: '/assets/temp/import-delivery.svg', temporary: true },
};

export type SceneAsset = { src: string; temporary: boolean };
