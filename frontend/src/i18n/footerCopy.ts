import type { Locale } from './types';

interface FooterCopy {
  description: string;
  navigation: string;
}

export const footerCopy: Record<Locale, FooterCopy> = {
  es: {
    description: 'Vehículos excepcionales. Una perspectiva europea.',
    navigation: 'Explorar GP SELECT',
  },
  en: {
    description: 'Exceptional vehicles. A European perspective.',
    navigation: 'Explore GP SELECT',
  },
};
