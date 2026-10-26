// Replace a source here when its approved individual asset is delivered.
// No mockup is included in the rendered interface.

/** Smaller copies (`name-<width>w.webp`, made from the original) so each screen downloads the width it shows. */
const widths = (src: string, sizes: number[], original: number) =>
  [...sizes.map((w) => `${src.replace(/\.webp$/, `-${w}w.webp`)} ${w}w`), `${src} ${original}w`].join(', ');

// Short static frames have a 640px minimum height: their 140cqh cap is 896px.
const heroCarSizes = '(max-height: 599px) and (max-width: 767px) min(100vw, 896px), '
  + '(max-height: 599px) and (max-width: 1199px) min(96vw, 896px), (max-height: 599px) min(78vw, 896px), '
  + '(max-width: 767px) min(100vw, 140lvh), (max-width: 1199px) min(96vw, 140lvh), min(78vw, 140lvh)';
// The larger rear wheel is 638/4000 of the car; both instances share one download.
const heroWheelSizes = '(max-height: 599px) and (max-width: 767px) min(15.95vw, 142.912px), '
  + '(max-height: 599px) and (max-width: 1199px) min(15.312vw, 142.912px), (max-height: 599px) min(12.441vw, 142.912px), '
  + '(max-width: 767px) min(15.95vw, 22.33lvh), (max-width: 1199px) min(15.312vw, 22.33lvh), min(12.441vw, 22.33lvh)';
const carSizes = '(max-width: 1023px) 32vh, 50vh';

// Complementary queries, shared by <picture>, the HTML preload and the JS preloader.
// min/max syntax rather than ranges: Safari before 16.4 ignores range queries.
const portraitGarage = '(max-width: 767px), (max-width: 1199px) and (max-aspect-ratio: 1/1)';
const landscapeGarage = '(min-width: 1200px), (min-width: 768px) and (min-aspect-ratio: 10001/10000)';

export const sceneAssets = {
  // Generated garage, replaceable by photography with this framing. Wall and floor are cut at the
  // baseboard (desktop master y=1655/2161, portrait y=2980/3838). CSS shares the seam and contact anchors.
  // Original master artwork reduced/repositioned to clear the text; only the vacated plaster is inpainted.
  heroBackground: {
    src: '/assets/home/hero-garage.webp', temporary: false, media: landscapeGarage,
    srcSet: widths('/assets/home/hero-garage.webp', [1280, 1920, 2560], 3840), sizes: 'max(106vw, 178.66lvh)',
    sources: [{ media: portraitGarage, src: '/assets/home/hero-garage-mobile.webp',
      srcSet: widths('/assets/home/hero-garage-mobile.webp', [480, 800, 1200], 2160), sizes: 'max(106vw, 55.82lvh)' }],
  },
  heroFloor: {
    src: '/assets/home/hero-garage-floor.webp', temporary: false,
    srcSet: widths('/assets/home/hero-garage-floor.webp', [768, 1280], 1920), sizes: '100vw',
  },
  // Whole warm-white 992 GT3 RS, nose left, RGBA 4000×1333; tire contact at 94.6% of the canvas.
  // Original silhouette and detail, graded for warm plaster light. Only the car moves.
  heroCar: {
    src: '/assets/home/hero-gt3rs-warm.webp', temporary: false,
    srcSet: widths('/assets/home/hero-gt3rs-warm.webp', [480, 800, 1200, 1800, 2400], 4000), sizes: heroCarSizes,
  },
  // Generated circular wheel, caliper removed; tire, rim and drilled rotor rotate together.
  heroWheel: {
    src: '/assets/home/hero-gt3rs-wheel.webp', temporary: false,
    srcSet: widths('/assets/home/hero-gt3rs-wheel.webp', [96, 160, 256, 384, 640], 1024), sizes: heroWheelSizes,
  },
  // Photographic shadow extracted from image_gen's integrated/empty-floor ratio.
  // Black + alpha is neutral multiplication, avoiding an isolated blend group under the car.
  // Shares the car's origin and width, but its 4000×1600 canvas extends below the tires.
  heroShadow: {
    src: '/assets/home/hero-gt3rs-shadow.webp', temporary: false,
    srcSet: widths('/assets/home/hero-gt3rs-shadow.webp', [480, 800, 1200, 1800], 2400), sizes: heroCarSizes,
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
};

export type SceneImage = { src: string; srcSet?: string; sizes?: string; media?: string };
export type SceneAsset = SceneImage & { temporary: boolean; sources?: (SceneImage & { media: string })[] };

export const heroPreloadAssets: SceneAsset[] = [
  sceneAssets.heroBackground, sceneAssets.heroFloor, sceneAssets.heroCar, sceneAssets.heroWheel, sceneAssets.heroShadow,
];
