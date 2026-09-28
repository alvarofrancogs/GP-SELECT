import type { Locale } from './types';

export type ServiceId = 'sourcing' | 'inspection' | 'import' | 'transparency';

interface ServicesCopy {
  eyebrow: string;
  title: string;
  titleFine: string;
  description: string;
  cta: string;
  image: string;
  items: { id: ServiceId; title: string; description: string; image: string }[];
}

export const servicesCopy: Record<Locale, ServicesCopy> = {
  es: {
    eyebrow: 'OTRA FORMA DE CONDUCIR',
    title: 'Más que',
    titleFine: 'un coche.',
    description: 'Nos ocupamos de todo, desde la búsqueda hasta la entrega, para que disfrutes de tu vehículo sin fronteras.',
    cta: 'Explorar vehículos',
    image: 'Fotografía de servicios pendiente',
    items: [
      { id: 'sourcing', title: 'Búsqueda en toda Europa', description: 'Definimos contigo el vehículo que buscas y localizamos opciones en el mercado europeo según tus preferencias y presupuesto.', image: 'Fotografía de búsqueda en Europa pendiente' },
      { id: 'inspection', title: 'Inspección del vehículo', description: 'Revisamos el estado del vehículo, su documentación y su historial disponible antes de que tomes una decisión.', image: 'Fotografía de inspección pendiente' },
      { id: 'import', title: 'Importación y matriculación', description: 'Te acompañamos en los trámites de importación, transporte y matriculación, con los pasos y la documentación claros desde el principio.', image: 'Fotografía de importación pendiente' },
      { id: 'transparency', title: 'Un proceso transparente', description: 'Conoces la información disponible, los costes previstos y el estado de cada gestión durante todo el proceso.', image: 'Fotografía del acompañamiento al cliente pendiente' },
    ],
  },
  en: {
    eyebrow: 'A BETTER WAY TO DRIVE',
    title: 'More than',
    titleFine: 'a car.',
    description: 'We handle the entire process, from sourcing to delivery, so you can enjoy your vehicle without borders.',
    cta: 'Explore our stock',
    image: 'Services photography pending',
    items: [
      { id: 'sourcing', title: 'Sourcing across Europe', description: 'We define what you are looking for together and source options across the European market to suit your preferences and budget.', image: 'European sourcing photography pending' },
      { id: 'inspection', title: 'Full inspection', description: 'We review the vehicle’s condition, documents and available history before you make your decision.', image: 'Inspection photography pending' },
      { id: 'import', title: 'Import & registration', description: 'We guide you through import, transport and registration, with clear steps and documentation from the start.', image: 'Import photography pending' },
      { id: 'transparency', title: 'Transparent process', description: 'You know the available information, expected costs and the status of each arrangement throughout the process.', image: 'Client guidance photography pending' },
    ],
  },
};
