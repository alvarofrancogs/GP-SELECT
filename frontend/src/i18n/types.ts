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

export interface Dictionary {
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
