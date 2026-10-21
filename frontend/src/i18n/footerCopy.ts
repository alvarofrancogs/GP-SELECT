import type { Locale } from './types';

interface FooterCopy {
  description: string;
  location: string;
  navigation: string;
}

export const footerCopy: Record<Locale, FooterCopy> = {
  es: {
    description: "Negocio familiar con más de 25 años en la compraventa de coches. Coches premium en stock e importación por encargo.",
    location: "Murcia · Clientes en toda Europa",
    navigation: 'Explorar GP SELECT',
  },
  en: {
    description: "A family business with more than 25 years of buying and selling cars. Premium cars in stock, plus import to order.",
    location: "Murcia, Spain · Clients across Europe",
    navigation: 'Explore GP SELECT',
  },
};
