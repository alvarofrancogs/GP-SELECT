import type { Locale } from './types';

export type ServiceId = 'sourcing' | 'inspection' | 'import' | 'transparency';

interface ServicesCopy {
  title: string;
  titleFine: string;
  description: string;
  items: { id: ServiceId; title: string; description: string }[];
}

export const servicesCopy: Record<Locale, ServicesCopy> = {
  es: {
    title: 'Búsqueda',
    titleFine: 'e importación.',
    description: "Comprar un coche en otro país europeo obliga a comparar anuncios, revisar documentación en otro idioma, organizar el transporte y matricularlo en tu país. Estas son las cuatro partes del servicio.",
    items: [
      { id: 'sourcing', title: 'Búsqueda por encargo', description: 'Partimos de lo que necesitas: modelo, motorización, equipamiento, kilometraje y presupuesto. Con eso buscamos unidades en el mercado europeo.' },
      { id: 'inspection', title: "Selección y evaluación", description: "Revisamos la especificación, las fotografías, el historial y la documentación que aporta el vendedor, comparamos el precio con unidades similares y te decimos qué falta por confirmar." },
      { id: 'import', title: "Compra y trámites", description: "Cuando eliges una unidad, negociamos y coordinamos la compra con el vendedor y nos encargamos de la documentación y los trámites de importación. Antes de comprar te confirmamos a nombre de quién va el coche." },
      { id: 'transparency', title: "Transporte, matrícula y entrega", description: "Organizamos el transporte internacional, gestionamos la matriculación en tu país de residencia y coordinamos la entrega." },
    ],
  },
  en: {
    title: 'Sourcing',
    titleFine: 'and import.',
    description: "Buying a car in another European country means comparing listings, checking paperwork in another language, arranging transport and registering it in your country. These are the four parts of the service.",
    items: [
      { id: 'sourcing', title: 'Sourcing to your brief', description: 'We start from what you need: model, engine, equipment, mileage and budget. Then we search the European market for cars that match.' },
      { id: 'inspection', title: "Selection and evaluation", description: "We review the specification, photographs, history and documents the seller provides, compare the price with similar cars and tell you what still needs confirming." },
      { id: 'import', title: "Purchase and paperwork", description: "Once you choose a car, we negotiate and coordinate the purchase with the seller and take care of the transfer and registration paperwork. Before the purchase we confirm whose name the car goes in." },
      { id: 'transparency', title: "Transport, registration and delivery", description: "We arrange international transport, manage registration in your country of residence and coordinate delivery of your car." },
    ],
  },
};
