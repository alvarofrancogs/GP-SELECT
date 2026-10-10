import type { Locale } from './types';

interface FooterCopy {
  description: string;
  location: string;
  navigation: string;
}

export const footerCopy: Record<Locale, FooterCopy> = {
  es: {
    description: "Importación integral de coches premium europeos.",
    location: "Murcia · Clientes en toda Europa",
    navigation: 'Explorar GP SELECT',
  },
  en: {
    description: "End-to-end sourcing and import of premium European cars.",
    location: "Murcia, Spain · Clients across Europe",
    navigation: 'Explore GP SELECT',
  },
};
