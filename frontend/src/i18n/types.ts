export type Locale = 'es' | 'en';

export interface InteriorHeaderCopy { title: string; lede: string }
export interface EditorialCopy { title: string; body: string }
export interface InteriorCopy {
  about: InteriorHeaderCopy & {
    why: EditorialCopy;
    audience: { title: string; intro: string; rows: EditorialCopy[] };
    approach: { title: string; body: string; rows: EditorialCopy[] };
    transparency: { title: string; legalLabel: string; rows: EditorialCopy[] };
    closing: string;
    closingNote: string;
    cta: string;
    secondary: string;
    images: { opening: string; detail: string };
  };
  import: InteriorHeaderCopy & {
    formFields: { delivery: string; make: string; model: string; year: string; mileage: string; timeframe: string; budget: string; message: string };
    placeholders: { delivery: string; make: string; model: string; year: string; mileage: string; timeframe: string };
    formErrors: { delivery: string; make: string; model: string; year: string; mileage: string; timeframe: string; message: string };
    overviewTitle: string;
    overviewItems: string[];
    formTitle: string;
    backToForm: string;
    define: EditorialCopy & { items: string[]; detail: string };
    search: EditorialCopy;
    analysis: EditorialCopy;
    support: EditorialCopy & { detail: string };
    stages: { title: string; intro: string; rows: EditorialCopy[] };
    taxes: EditorialCopy & { guide: string };
    faq: { title: string; rows: EditorialCopy[] };
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
    informationPath: string;
    nextTitle: string;
    nextSteps: string[];
    enquirySteps: string[];
    vehicleIntro: string;
    searchIntro: string;
    informationIntro: string;
    formTitle: string;
    fields: { name: string; phone: string; email: string; vehicle: string; message: string; budget: string; desiredVehicle: string; comments: string; enquiry: string; importVehicle: string };
    optional: string;
    required: string;
    requiredHint: string;
    vehicleMessage: string;
    searchMessage: string;
    budgetHint: string;
    messageHint: string;
    stockPlaceholder: string;
    stockAlternative: string;
    stockLoading: string;
    stockEmpty: string;
    stockError: string;
    stockUnmatched: string;
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
    errors: { name: string; phone: string; email: string; vehicle: string; message: string; budget: string; desiredVehicle: string; enquiry: string };
    directLabel: string;
    whatsappTitle: string;
    whatsappBody: string;
    whatsappCta: string;
    /** First message of the WhatsApp chat. */
    whatsappMessage: string;
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
  to: string;
  from: string;
  view: string;
  onRequest: string;
  comingSoon: string;
  reserved: string;
  sold: string;
  soldTitle: string;
  soldIntro: string;
  emptyCurrent: string;
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
  /** First WhatsApp message from a vehicle page; {vehicle} is its name and {url} its address. */
  whatsappMessage: string;
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
  video: string;
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
    /** `fact`: a small supporting figure or detail with its public source; never a claim about GP SELECT. */
    states: { left: string; right: string; description: string; fact: string }[];
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
