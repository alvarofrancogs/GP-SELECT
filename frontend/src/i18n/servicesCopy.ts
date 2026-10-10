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
    description: "Comprar un coche en otro país europeo obliga a comparar anuncios, revisar documentación en otro idioma, organizar el transporte y matricularlo en tu país. Estas son las cuatro partes del servicio.",
    image: 'Fotografía de servicios pendiente',
    items: [
      { id: 'sourcing', title: 'Búsqueda por encargo', description: 'Partimos de lo que necesitas: modelo, motorización, equipamiento, kilometraje y presupuesto. Con eso buscamos unidades en el mercado europeo.', image: 'Fotografía de búsqueda en Europa pendiente' },
      { id: 'inspection', title: "Selección y evaluación", description: "Revisamos la especificación, las fotografías, el historial y la documentación que aporta el vendedor, comparamos el precio con unidades similares y te decimos qué falta por confirmar.", image: "Selección y evaluación · fotografía pendiente" },
      { id: 'import', title: "Compra y trámites", description: "Cuando eliges una unidad, coordinamos la compra con el vendedor y nos encargamos de la documentación y los trámites de importación. El coche se compra a tu nombre.", image: "Compra y trámites · fotografía pendiente" },
      { id: 'transparency', title: "Transporte, matrícula y entrega", description: "Organizamos el transporte internacional, gestionamos la matriculación en tu país de residencia y coordinamos la entrega.", image: "Transporte, matrícula y entrega · fotografía pendiente" },
    ],
  },
  en: {
    title: 'Sourcing',
    titleFine: 'and import.',
    description: "Buying a car in another European country means comparing listings, checking paperwork in another language, arranging transport and registering it in your country. These are the four parts of the service.",
    image: 'Services photography pending',
    items: [
      { id: 'sourcing', title: 'Sourcing to your brief', description: 'We start from what you need: model, engine, equipment, mileage and budget. Then we search the European market for cars that match.', image: 'European sourcing photography pending' },
      { id: 'inspection', title: "Selection and evaluation", description: "We review the specification, photographs, history and documents the seller provides, compare the price with similar cars and tell you what still needs confirming.", image: "Selection and evaluation · photography pending" },
      { id: 'import', title: "Purchase and paperwork", description: "Once you choose a car, we coordinate the purchase with the seller and take care of the transfer and registration paperwork. The car is bought in your name.", image: "Purchase and paperwork · photography pending" },
      { id: 'transparency', title: "Transport, registration and delivery", description: "We arrange international transport, manage registration in your country of residence and coordinate delivery of your car.", image: "Transport, registration and delivery · photography pending" },
    ],
  },
};
