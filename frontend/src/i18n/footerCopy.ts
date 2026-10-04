import type { Locale } from './types';

interface FooterCopy {
  description: string;
  location: string;
  navigation: string;
}

export const footerCopy: Record<Locale, FooterCopy> = {
  es: {
    description: 'Vehículos excepcionales. Una perspectiva europea.',
    location: 'Murcia · Clientes en toda España',
    navigation: 'Explorar GP SELECT',
  },
  en: {
    description: 'Exceptional vehicles. A European perspective.',
    location: 'Murcia · Clients throughout Spain',
    navigation: 'Explore GP SELECT',
  },
};
