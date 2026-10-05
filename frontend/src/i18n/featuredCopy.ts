import type { Locale } from './types';

interface FeaturedCopy {
  title: string;
  titleFine: string;
  view: string;
  loading: string;
  empty: string;
  error: string;
  pause: string;
  position: (current: number, total: number) => string;
}

export const featuredCopy: Record<Locale, FeaturedCopy> = {
  es: {
    title: 'Ahora',
    titleFine: 'en catálogo.',
    view: 'Ver vehículo',
    pause: 'Pausar rotación',
    position: (current, total) => `Vehículo ${current} de ${total}`,
    loading: 'Cargando la selección…',
    empty: 'Ahora mismo no hay vehículos en el catálogo.',
    error: 'No se ha podido cargar el vehículo. Puedes intentarlo de nuevo más tarde.',
  },
  en: {
    title: 'In our',
    titleFine: 'catalogue.',
    view: 'View vehicle',
    pause: 'Pause rotation',
    position: (current, total) => `Vehicle ${current} of ${total}`,
    loading: 'Loading the selection…',
    empty: 'There are no cars in the catalogue right now.',
    error: 'The vehicle could not be loaded. Please try again later.',
  },
};
