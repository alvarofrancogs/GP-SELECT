import type { Locale } from './types';

interface InventoryCopy {
  title: string;
  titleFine: string;
  examplesNotice: string;
  exampleLabel: string;
  featuredLabel: string;
  allVehicles: string;
  findSimilar: string;
  interested: string;
  viewVehicle: string;
  pendingPhoto: string;
  registration: string;
  loading: string;
  empty: string;
  error: string;
}

export const inventoryCopy: Record<Locale, InventoryCopy> = {
  es: {
    title: 'Vehículos',
    titleFine: 'excepcionales.',
    examplesNotice: 'Modelos de ejemplo. No representan vehículos en venta.',
    exampleLabel: 'Modelo de ejemplo',
    featuredLabel: 'Destacado',
    allVehicles: 'Ver vehículos',
    findSimilar: 'Encontrar uno similar',
    interested: 'Me interesa',
    viewVehicle: 'Ver vehículo',
    pendingPhoto: 'Fotografía de vehículo pendiente',
    registration: 'Primera matriculación',
    loading: 'Cargando la selección de vehículos…',
    empty: 'No hay vehículos para mostrar en este momento.',
    error: 'No se ha podido cargar la selección. Puedes intentarlo de nuevo más tarde.',
  },
  en: {
    title: 'Premium',
    titleFine: 'vehicles.',
    examplesNotice: 'Example models. They do not represent vehicles for sale.',
    exampleLabel: 'Example model',
    featuredLabel: 'Featured',
    allVehicles: 'View vehicles',
    findSimilar: 'Find a similar vehicle',
    interested: 'I’m interested',
    viewVehicle: 'View vehicle',
    pendingPhoto: 'Vehicle photograph pending',
    registration: 'First registration',
    loading: 'Loading the vehicle selection…',
    empty: 'There are no vehicles to display at the moment.',
    error: 'The selection could not be loaded. Please try again later.',
  },
};
