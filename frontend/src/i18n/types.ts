export type Locale = 'es' | 'en';

export interface InteriorHeaderCopy { title: string; lede: string }
export interface EditorialCopy { title: string; body: string }
export interface InteriorCopy {
  about: InteriorHeaderCopy & {
    why: EditorialCopy;
    audience: { title: string; intro: string; rows: EditorialCopy[] };
    approach: { title: string; body: string; rows: EditorialCopy[] };
    closing: string;
    closingNote: string;
    cta: string;
    secondary: string;
    images: { opening: string; detail: string };
  };
  import: InteriorHeaderCopy & {
    define: EditorialCopy & { items: string[]; detail: string };
    search: EditorialCopy;
    analysis: EditorialCopy;
    support: EditorialCopy & { detail: string };
    images: { search: string; inspection: string; delivery: string };
    closing: string;
    closingBody: string;
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
    sending: string;
    sentTitle: string;
    sentBody: string;
    another: string;
    sendFailure: string;
    rateLimited: string;
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
  sold: string;
  showMore: string;
  empty: string;
  search: string;
  closing: string;
  find: string;
  loading: string;
  error: string;
  detailError: string;
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
    label: string;
    home: string;
    vehicles: string;
    import: string;
    services: string;
    about: string;
    contact: string;
    admin: string;
  };
  hero: { left: string; right: string; description: string };
  carHandoff: {
    states: { left: string; right: string; description: string }[];
    carA: string;
    carCutaway: string;
    /** Line shown while the scan reveals the car's insides. */
    interlude: string;
  };
  process: {
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
    catalogue: string;
    loading: string;
  };
  notFound: {
    eyebrow: string;
    title: string;
    description: string;
    vehicles: string;
  };
}
