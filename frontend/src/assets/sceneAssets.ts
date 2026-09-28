// Replace a source here when its approved individual asset is delivered.
// No mockup is included in the rendered interface.
export const sceneAssets = {
  heroBackground: { src: '/assets/temp/background-plane.svg', temporary: true },
  heroCar: { src: '/assets/temp/lateral-plane.svg', temporary: true },
  vehicleBackground: { src: '/assets/temp/background-plane.svg', temporary: true },
  vehicleCar: { src: '/assets/temp/overhead-plane.svg', temporary: true },
};

export type SceneAsset = { src: string; temporary: boolean };
