// Replace a source here when its approved individual asset is delivered.
// No mockup is included in the rendered interface.
export const sceneAssets = {
  heroBackground: { src: '/assets/temp/hero-sky.svg', temporary: true },
  heroCar: { src: '/assets/temp/hero-car.svg', temporary: true },
  vehicleBackground: { src: '/assets/temp/hero-sky.svg', temporary: true },
  // Independent, aligned layers: replace these sources when production media arrives.
  vehicleCar: { src: '/assets/vehicles/bmw-m4-off.png', temporary: false },
  vehicleCarLights: { src: '/assets/vehicles/bmw-m4-on.png', temporary: false },
};

export type SceneAsset = { src: string; temporary: boolean };
