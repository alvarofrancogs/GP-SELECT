import type { Locale } from './types';

interface FooterCopy {
  description: string;
  location: string;
  navigation: string;
}

export const footerCopy: Record<Locale, FooterCopy> = {
  es: {
    description: 'Selección e importación de coches europeos.',
    location: 'Murcia · Clientes en toda España',
    navigation: 'Explorar GP SELECT',
  },
  en: {
    description: 'European car sourcing and import.',
    location: 'Murcia · Clients throughout Spain',
    navigation: 'Explore GP SELECT',
  },
};
