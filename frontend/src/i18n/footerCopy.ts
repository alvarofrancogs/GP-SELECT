import type { Locale } from './types';

interface FooterCopy {
  description: string;
  contact: string;
  navigation: string;
  backToTop: string;
  rights: string;
  promise: string;
}

export const footerCopy: Record<Locale, FooterCopy> = {
  es: {
    description: 'Vehículos excepcionales. Una perspectiva europea.',
    contact: 'Hablar con GP SELECT',
    navigation: 'Explorar GP SELECT',
    backToTop: 'Volver arriba',
    rights: 'Todos los derechos reservados.',
    promise: 'Buscar. Seleccionar. Importar. Entregar.',
  },
  en: {
    description: 'Exceptional vehicles. A European perspective.',
    contact: 'Talk to GP SELECT',
    navigation: 'Explore GP SELECT',
    backToTop: 'Back to top',
    rights: 'All rights reserved.',
    promise: 'Source. Select. Import. Deliver.',
  },
};
