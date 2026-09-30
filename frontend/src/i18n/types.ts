export type Locale = 'es' | 'en';

export interface InteriorHeaderCopy { eyebrow: string; title: string; lede: string }
export interface EditorialCopy { title: string; body: string }
export interface InteriorCopy {
  about: InteriorHeaderCopy & {
    manifesto: string[];
    introduction: EditorialCopy;
    selection: EditorialCopy;
    principlesLabel: string;
    principles: EditorialCopy[];
    europe: EditorialCopy & { label: string; detail: string };
    cta: string;
    images: { selection: string; detail: string };
  };
  import: InteriorHeaderCopy & {
    steps: (EditorialCopy & { id: string; detail: string })[];
    images: { search: string; inspection: string; delivery: string };
    closing: string;
    cta: string;
    secondary: string;
  };
  contact: InteriorHeaderCopy & {
    pathsLabel: string;
    vehiclePath: string;
    searchPath: string;
    vehicleIntro: string;
    searchIntro: string;
    formTitle: string;
    fields: { name: string; phone: string; email: string; vehicle: string; message: string };
    optional: string;
    requiredHint: string;
    vehicleMessage: string;
    searchMessage: string;
    submit: string;
    submitting: string;
    preview: string;
    successTitle: string;
    successBody: string;
    edit: string;
    failure: string;
    errors: { name: string; phone: string; email: string; vehicle: string; message: string };
    directLabel: string;
    whatsappTitle: string;
    whatsappBody: string;
    whatsappCta: string;
    phoneLabel: string;
    emailLabel: string;
  };
}

export interface VehicleCopy extends InteriorHeaderCopy {
  singular: string;
  plural: string;
  filters: string;
  all: string;
  clear: string;
  make: string;
  bodyType: string;
  fuelType: string;
  price: string;
  year: string;
  mileage: string;
  transmission: string;
  sort: string;
  recent: string;
  priceAsc: string;
  priceDesc: string;
  yearSort: string;
  kmSort: string;
  under: string;
  from: string;
  view: string;
  onRequest: string;
  comingSoon: string;
  reserved: string;
  empty: string;
  search: string;
  closing: string;
  find: string;
  loading: string;
  error: string;
  retry: string;
  back: string;
  notFound: string;
  emptyCatalogue: string;
  soldNotice: string;
  soldAlternative: string;
  request: string;
  whatsapp: string;
  registration: string;
  power: string;
  description: string;
  specifications: string;
  equipment: string;
  provenance: string;
  drivetrain: string;
  exteriorColour: string;
  interiorColour: string;
  history: string;
  importTitle: string;
  importBody: string;
  importLink: string;
  gallery: string;
  previous: string;
  next: string;
  enlarge: string;
  close: string;
  image: string;
  noImage: string;
  values: Record<string, string>;
}

export interface Dictionary {
  vehicles: VehicleCopy;
  interiors: InteriorCopy;
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
  carHandoff: {
    states: { left: string; right: string; description: string }[];
    cta: string;
    carA: string;
    carB: string;
    map: string;
  };
  process: {
    eyebrow: string;
    title: string;
    steps: { word: string; title: string; description: string }[];
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
