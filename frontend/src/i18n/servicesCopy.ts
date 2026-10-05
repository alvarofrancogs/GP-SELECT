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
    title: 'Búsqueda',
    titleFine: 'e importación.',
    description: 'Comprar un coche en otro país europeo obliga a comparar anuncios, leer documentación en otro idioma y coordinar la importación. Hacemos ese trabajo contigo, desde Murcia y para clientes de toda España.',
    image: 'Fotografía de servicios pendiente',
    items: [
      { id: 'sourcing', title: 'Búsqueda por encargo', description: 'Partimos de lo que necesitas: modelo, motorización, equipamiento, kilometraje y presupuesto. Con eso buscamos unidades en el mercado europeo.', image: 'Fotografía de búsqueda en Europa pendiente' },
      { id: 'inspection', title: 'Análisis de cada unidad', description: 'Revisamos la especificación, las fotografías, el historial y la documentación que aporta el vendedor, y comparamos el precio con unidades similares.', image: 'Fotografía de análisis pendiente' },
      { id: 'import', title: 'Compra e importación', description: 'Cuando eliges una unidad, coordinamos contigo los pasos de la compra y la importación: qué hace falta en cada momento y qué queda pendiente.', image: 'Fotografía de importación pendiente' },
      { id: 'transparency', title: 'Información antes de decidir', description: 'Antes de que te comprometas, sabes qué información hay de cada coche, quién la aporta, qué falta y qué conviene comprobar.', image: 'Fotografía del acompañamiento al cliente pendiente' },
    ],
  },
  en: {
    title: 'Sourcing',
    titleFine: 'and import.',
    description: 'Buying a car in another European country means comparing listings, reading paperwork in another language and coordinating the import. We do that work with you, from Murcia, for clients across Spain.',
    image: 'Services photography pending',
    items: [
      { id: 'sourcing', title: 'Sourcing to your brief', description: 'We start from what you need: model, engine, equipment, mileage and budget. Then we search the European market for cars that match.', image: 'European sourcing photography pending' },
      { id: 'inspection', title: 'Every car reviewed', description: 'We review the specification, photographs, history and documents the seller provides, and compare the price with similar cars.', image: 'Analysis photography pending' },
      { id: 'import', title: 'Purchase & import', description: 'Once you choose a car, we coordinate the purchase and import steps with you: what is needed at each stage and what is still pending.', image: 'Import photography pending' },
      { id: 'transparency', title: 'The facts before you commit', description: 'Before you commit, you know what information there is on each car, who provided it, what is missing and what is worth checking.', image: 'Client guidance photography pending' },
    ],
  },
};
