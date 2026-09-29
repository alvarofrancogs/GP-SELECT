import type { Dictionary } from './types';

export const es: Dictionary = {
  brand: 'GP SELECT',
  languages: { label: 'Idioma', es: 'Español', en: 'English' },
  nav: {
    home: 'Inicio', vehicles: 'Vehículos', import: 'Importación',
    services: 'Servicios', about: 'Nosotros', contact: 'Contacto', admin: 'Administración',
  },
  hero: {
    left: 'Selección', right: 'Exclusiva',
    description: 'Deportivos europeos seleccionados\npor su diseño atemporal\ny una búsqueda a tu medida.',
    cta: 'Ver colección',
  },
  carHandoff: {
    states: [
      { left: 'Ingeniería', right: 'Alemana', description: 'Precisión alemana.\nCarácter inconfundible.' },
      { left: 'Potencia', right: 'Control', description: 'Toda la potencia,\nsiempre bajo control.' },
      { left: 'Visión', right: 'Global', description: 'Vehículos premium,\nseleccionados en toda Europa.' },
    ],
    cta: 'Ver vehículos',
    carA: 'BMW M4 · vista cenital',
    carB: 'Audi RS Q3 · vista cenital',
    map: 'Mapa de Europa',
  },
  process: {
    eyebrow: 'EL CRITERIO GP SELECT',
    title: 'Cada detalle. Cada decisión.',
    steps: [
      { word: 'Buscamos', title: 'El punto de partida', description: 'Un vehículo que encaje contigo.' },
      { word: 'Inspeccionamos', title: 'La atención al detalle', description: 'Cada detalle cuenta antes de elegir.' },
      { word: 'Seleccionamos', title: 'Nuestro criterio', description: 'Sólo lo que cumple nuestras expectativas.' },
      { word: 'Entregamos', title: 'El siguiente capítulo', description: 'Tu próximo coche, con confianza.' },
    ],
  },
  common: {
    scroll: 'Desliza para descubrir', temporaryAsset: 'Recurso provisional',
    backHome: 'Volver al inicio', prototype: 'Vista previa · Fase 3',
    menu: 'Abrir menú', close: 'Cerrar menú', skipContent: 'Saltar al contenido',
    missingAsset: 'Imagen definitiva pendiente', heroAsset: 'Vehículo · vista lateral',
    backgroundAsset: 'Fondo fotográfico pendiente',
  },
  comingSoon: {
    eyebrow: 'GP SELECT · FASE 3', title: 'Esta página llegará en una próxima fase.',
    description: 'Esta entrega se centra en la página de inicio. Esta ruta está preparada, pero su contenido todavía no está implementado.',
    qualification: 'El cuestionario de cualificación está pendiente de una próxima fase y de su conexión con el backend. Todavía no recogemos ni enviamos datos desde esta vista previa.',
    unknown: 'Página no encontrada',
  },
};
