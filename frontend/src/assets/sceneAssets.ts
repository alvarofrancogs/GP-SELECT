// Replace a source here when its approved individual asset is delivered.
// No mockup is included in the rendered interface.

/** Smaller copies (`name-<width>w.webp`, made from the original) so each screen downloads the width it shows. */
const widths = (src: string, sizes: number[], original: number) =>
  [...sizes.map((w) => `${src.replace(/\.webp$/, `-${w}w.webp`)} ${w}w`), `${src} ${original}w`].join(', ');

// Layout widths measured in the browser. The hero car overflows the screen (scenes.css) and grows to 1.06;
// the BMW is sized by the screen height (car-handoff.css) and starts at up to 1.3 times its size.
const heroCarSizes = '(max-width: 767px) 317vw, (max-width: 1199px) 234vw, 160vw';
const carSizes = '(max-width: 1023px) 32vh, 50vh';

export const sceneAssets = {
  // Generated HOME assets (3C), replaceable by photography with the same framing.
  heroBackground: { src: '/assets/home/hero-sky.webp', temporary: false },
  heroCar: {
    src: '/assets/home/hero-car.webp', temporary: false,
    srcSet: widths('/assets/home/hero-car.webp', [1200, 1800, 2400, 3200], 4236), sizes: heroCarSizes,
  },
  // Car scene. Contract: WebP RGBA, top view, nose up, both views on the same
  // 1200×1800 canvas (car in the middle 75 %) with the same footprint, shadow baked in.
  // Swap the sources here; the motion never adjusts per asset.
  carA: { src: '/assets/home/car-a.webp', temporary: false, srcSet: widths('/assets/home/car-a.webp', [600, 900, 1200], 1800), sizes: carSizes },
  // The same BMW as a mechanical cutaway, cut to the photograph's exact silhouette.
  carCutaway: {
    src: '/assets/home/car-cutaway.webp', temporary: false,
    srcSet: widths('/assets/home/car-cutaway.webp', [600, 900, 1200], 1800), sizes: carSizes,
  },
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

export type SceneAsset = { src: string; temporary: boolean; srcSet?: string; sizes?: string };
