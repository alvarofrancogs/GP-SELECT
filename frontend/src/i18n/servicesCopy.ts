import type { Locale } from './types';

export type ServiceId = 'sourcing' | 'inspection' | 'import' | 'transparency';

interface ServicesCopy {
  title: string;
  titleFine: string;
  description: string;
  image: string;
  items: { id: ServiceId; title: string; description: string; image: string }[];
}

export const servicesCopy: Record<Locale, ServicesCopy> = {
  es: {
    title: 'Más que',
    titleFine: 'un coche.',
    description: 'Te acompañamos desde la búsqueda hasta la compra, para que disfrutes de tu vehículo sin fronteras.',
    image: 'Fotografía de servicios pendiente',
    items: [
      { id: 'sourcing', title: 'Búsqueda en toda Europa', description: 'Definimos contigo el vehículo que buscas y localizamos opciones en el mercado europeo según tus preferencias y presupuesto.', image: 'Fotografía de búsqueda en Europa pendiente' },
      { id: 'inspection', title: 'Análisis de cada opción', description: 'Revisamos la especificación, la documentación y el historial disponibles de cada vehículo antes de que tomes una decisión.', image: 'Fotografía de análisis pendiente' },
      { id: 'import', title: 'Compra e importación', description: 'Coordinamos contigo los pasos de la compra y la importación: qué se necesita en cada momento y qué queda pendiente.', image: 'Fotografía de importación pendiente' },
      { id: 'transparency', title: 'Un proceso transparente', description: 'Sabes en todo momento qué se sabe de cada coche, qué falta y qué queda por confirmar.', image: 'Fotografía del acompañamiento al cliente pendiente' },
    ],
  },
  en: {
    title: 'More than',
    titleFine: 'a car.',
    description: 'We guide you from the search to the purchase, so you can enjoy your vehicle without borders.',
    image: 'Services photography pending',
    items: [
      { id: 'sourcing', title: 'Sourcing across Europe', description: 'We define what you are looking for together and source options across the European market to suit your preferences and budget.', image: 'European sourcing photography pending' },
      { id: 'inspection', title: 'Every option analysed', description: 'We review each vehicle’s specification, documents and available history before you make your decision.', image: 'Analysis photography pending' },
      { id: 'import', title: 'Purchase & import', description: 'We coordinate the purchase and import steps with you: what is needed at each stage and what is still pending.', image: 'Import photography pending' },
      { id: 'transparency', title: 'Transparent process', description: 'At every stage you know what is known about each car, what is missing and what still needs confirming.', image: 'Client guidance photography pending' },
    ],
  },
};
