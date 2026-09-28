import type { Locale } from './types';

interface FooterCopy {
  description: string;
  navigation: string;
  backToTop: string;
  rights: string;
}

export const footerCopy: Record<Locale, FooterCopy> = {
  es: {
    description: 'Vehículos excepcionales. Una perspectiva europea.',
    navigation: 'Explorar GP SELECT',
    backToTop: 'Volver arriba',
    rights: 'Todos los derechos reservados.',
  },
  en: {
    description: 'Exceptional vehicles. A European perspective.',
    navigation: 'Explore GP SELECT',
    backToTop: 'Back to top',
    rights: 'All rights reserved.',
  },
};
