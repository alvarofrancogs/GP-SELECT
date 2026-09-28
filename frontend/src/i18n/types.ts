export type Locale = 'es' | 'en';

export interface Dictionary {
  brand: string;
  languages: { label: string; es: string; en: string };
  nav: {
    home: string;
    vehicles: string;
    import: string;
    services: string;
    about: string;
    contact: string;
    admin: string;
  };
  hero: { left: string; right: string; description: string; cta: string };
  vehicle: { left: string; right: string; description: string; cta: string };
  process: {
    eyebrow: string;
    title: string;
    steps: { word: string; title: string; description: string }[];
    footer: string;
  };
  common: {
    scroll: string;
    temporaryAsset: string;
    backHome: string;
    prototype: string;
    menu: string;
    close: string;
    skipContent: string;
    missingAsset: string;
    heroAsset: string;
    vehicleAsset: string;
    backgroundAsset: string;
  };
  comingSoon: {
    eyebrow: string;
    title: string;
    description: string;
    qualification: string;
    unknown: string;
  };
}
