import type { Locale } from './types';

interface FeaturedCopy {
  title: string;
  titleFine: string;
  view: string;
  loading: string;
  empty: string;
  error: string;
}

export const featuredCopy: Record<Locale, FeaturedCopy> = {
  es: {
    title: 'Vehículos',
    titleFine: 'excepcionales.',
    view: 'Ver vehículo',
    loading: 'Cargando el último vehículo…',
    empty: 'Estamos preparando la próxima selección.',
    error: 'No se ha podido cargar el vehículo. Puedes intentarlo de nuevo más tarde.',
  },
  en: {
    title: 'Premium',
    titleFine: 'vehicles.',
    view: 'View vehicle',
    loading: 'Loading the latest vehicle…',
    empty: 'We are preparing the next selection.',
    error: 'The vehicle could not be loaded. Please try again later.',
  },
};
