import type { LegalField } from '../config/legal';
import type { Locale } from './types';

/** The legal texts, in Spanish (the binding version), as data: the page and the SEO build render the same
    content. They describe what the site really does (frontend/src and the API); review them with a legal
    professional before publishing, and update them whenever data handling changes. */

export type LegalDoc = 'aviso-legal' | 'privacidad' | 'cookies';

/** A run of text: plain, a configured field, or a link. */
export type LegalInline = string | { field: LegalField; optional?: boolean } | { to: string; text: string };
export type LegalBlock = { p: LegalInline[] } | { list: LegalInline[][] };
export interface LegalSection { heading: string; blocks: LegalBlock[] }
export interface LegalPageCopy { title: string; lede: string; sections: LegalSection[] }

export const legalPaths: Record<LegalDoc, string> = {
  'aviso-legal': '/aviso-legal',
  privacidad: '/privacidad',
  cookies: '/cookies',
};

/** How a missing field is announced on the page. */
export const pendingLabels: Record<LegalField, string> = {
  holder: 'titular', taxId: 'NIF/CIF', address: 'domicilio', email: 'email de contacto',
  phone: 'teléfono', registry: 'datos registrales', retention: 'plazo de conservación',
};

const holderBlock: LegalBlock = {
  list: [
    ['Titular: ', { field: 'holder' }],
    ['NIF/CIF: ', { field: 'taxId' }],
    ['Domicilio: ', { field: 'address' }],
    ['Email: ', { field: 'email' }],
    ['Teléfono: ', { field: 'phone', optional: true }],
    ['Datos registrales: ', { field: 'registry', optional: true }],
  ],
};

export const legalPages: Record<LegalDoc, LegalPageCopy> = {
  'aviso-legal': {
    title: 'Aviso legal',
    lede: 'Quién es el titular de esta web y en qué condiciones puedes usarla.',
    sections: [
      { heading: 'Titular de la web', blocks: [holderBlock, { p: ['GP SELECT tiene su base en Murcia y atiende a clientes de España y del resto de Europa.'] }] },
      { heading: 'Objeto', blocks: [{ p: ['Esta web informa sobre el servicio de GP SELECT: la selección de vehículos premium europeos, su catálogo y el acompañamiento durante la compra y la importación. También permite enviar consultas mediante el formulario de contacto.'] }] },
      { heading: 'Condiciones de uso', blocks: [{ p: ['Al navegar por la web te comprometes a usarla de buena fe y conforme a la ley. No está permitido usarla con fines ilícitos, intentar acceder a sus zonas restringidas ni alterar su funcionamiento.'] }] },
      { heading: 'Información de los vehículos', blocks: [{ p: ['Publicamos la información de cada vehículo de buena fe, a partir de los datos de los que disponemos. Puede contener errores o cambiar sin previo aviso, y no constituye una oferta vinculante: las condiciones de cualquier operación se concretan contigo antes de que te comprometas.'] }] },
      { heading: 'Propiedad intelectual e industrial', blocks: [{ p: ['Los textos, las imágenes, el logotipo y el diseño de esta web pertenecen a su titular o a terceros que han autorizado su uso. No se pueden reproducir, distribuir ni transformar sin autorización, salvo para tu uso personal y privado.'] }] },
      { heading: 'Enlaces externos', blocks: [{ p: ['Si la web enlaza con servicios de terceros, como WhatsApp, su contenido y sus condiciones son responsabilidad de esos terceros.'] }] },
      { heading: 'Responsabilidad', blocks: [{ p: ['Procuramos que la web funcione correctamente, pero no podemos garantizar que esté siempre disponible ni libre de errores, ni respondemos de las interrupciones que no dependan de nosotros.'] }] },
      { heading: 'Ley aplicable', blocks: [{ p: ['Esta web se rige por la legislación española. Cualquier controversia se someterá a los juzgados y tribunales que correspondan conforme a la normativa aplicable.'] }] },
      { heading: 'Privacidad y cookies', blocks: [{ p: ['Cómo tratamos tus datos se explica en la ', { to: legalPaths.privacidad, text: 'política de privacidad' }, ', y el almacenamiento que usa la web en tu navegador, en la ', { to: legalPaths.cookies, text: 'política de cookies' }, '.'] }] },
    ],
  },
  privacidad: {
    title: 'Política de privacidad',
    lede: 'Qué datos tratamos cuando nos escribes, para qué y cuáles son tus derechos.',
    sections: [
      { heading: 'Responsable del tratamiento', blocks: [holderBlock] },
      {
        heading: 'Qué datos tratamos',
        blocks: [
          { p: ['Solo los que nos facilitas en el formulario de contacto:'] },
          { list: [['Nombre y email, obligatorios.'], ['Teléfono, opcional.'], ['El vehículo que te interesa y el mensaje que escribas.']] },
          { p: ['Si nos escribes por WhatsApp o nos llamas, tratamos los datos que nos facilites con la misma finalidad. WhatsApp es un servicio de Meta y se rige por su propia política de privacidad.'] },
          { p: ['Además, el servidor puede registrar datos técnicos de la conexión, como la dirección IP, para proteger la web frente a abusos. No te pedimos datos especialmente protegidos: no incluyas en el mensaje información que no necesitemos para tu consulta.'] },
        ],
      },
      { heading: 'Para qué los usamos', blocks: [{ p: ['Para responder a tu consulta y, si nos lo pides, ayudarte a buscar, valorar o comprar un vehículo. No los usamos para enviarte publicidad ni tomamos decisiones automatizadas sobre ti.'] }] },
      { heading: 'Base jurídica', blocks: [{ p: ['Tratamos tus datos para aplicar, a petición tuya, medidas previas a un posible contrato (artículo 6.1.b del RGPD). Los datos técnicos de conexión se tratan por nuestro interés legítimo en mantener la web segura (artículo 6.1.f del RGPD).'] }] },
      { heading: 'Cuánto tiempo los conservamos', blocks: [{ p: ['Cuando envías el formulario, tu consulta se guarda en nuestro servidor un máximo de 30 días, solo para asegurarnos de que nos llega, y después se borra automáticamente. También nos llega por correo electrónico, donde la conservamos el tiempo necesario para atenderla y, como máximo, ', { field: 'retention' }, '. Si llegamos a formalizar una operación, los datos se conservarán durante los plazos que exija la ley.'] }] },
      { heading: 'Quién puede acceder a ellos', blocks: [{ p: ['No cedemos tus datos a terceros salvo obligación legal. Los proveedores que nos prestan los servicios de alojamiento web y de correo electrónico pueden acceder a ellos solo para prestarnos ese servicio, como encargados del tratamiento y con las garantías que exige el RGPD. Si alguno estuviera fuera del Espacio Económico Europeo, la transferencia se haría con las garantías previstas en el RGPD.'] }] },
      { heading: 'Tus derechos', blocks: [{ p: ['Puedes ejercer tus derechos de acceso, rectificación, supresión, oposición, limitación del tratamiento y portabilidad escribiendo a ', { field: 'email' }, '. Si consideras que no hemos atendido bien tu solicitud, puedes reclamar ante la ', { to: 'https://www.aepd.es', text: 'Agencia Española de Protección de Datos' }, '.'] }] },
      { heading: 'Cambios en esta política', blocks: [{ p: ['Si cambiamos cómo tratamos tus datos, actualizaremos esta página y la fecha de su última revisión.'] }] },
    ],
  },
  cookies: {
    title: 'Política de cookies',
    lede: 'Esta web no usa cookies de análisis ni de publicidad.',
    sections: [
      {
        heading: 'Qué usamos',
        blocks: [
          { p: ['Solo almacenamiento técnico en tu navegador, necesario para que la web funcione o para recordar una preferencia que eliges tú:'] },
          { list: [
            ['Idioma (almacenamiento local, «gp-select.locale.v1»): recuerda si prefieres la web en español o en inglés. Se guarda hasta que borres los datos del navegador.'],
            ['Pantalla de carga (almacenamiento de sesión, «gp-select.preloader.seen»): evita repetir la animación completa al recargar. Se borra al cerrar la pestaña.'],
            ['Sesión del área de administración (cookie técnica): solo se crea cuando inicia sesión el personal autorizado de GP SELECT.'],
          ] },
        ],
      },
      { heading: 'Consentimiento', blocks: [{ p: ['Al ser elementos técnicos o de preferencia que solicitas tú, están exceptuados del deber de consentimiento (artículo 22.2 de la LSSI). Por eso la web no muestra un aviso de cookies.'] }] },
      { heading: 'Servicios de terceros', blocks: [{ p: ['La web no carga contenido de terceros que instale cookies: las tipografías y las imágenes se sirven desde nuestro propio servidor. Si abres un enlace externo, como WhatsApp, se aplica la política de ese servicio.'] }] },
      { heading: 'Cómo eliminarlo', blocks: [{ p: ['Puedes borrar este almacenamiento cuando quieras desde la configuración de tu navegador.'] }] },
      { heading: 'Cambios', blocks: [{ p: ['Si incorporamos herramientas de análisis u otras que usen cookies, lo indicaremos aquí y te pediremos el consentimiento antes de activarlas.'] }] },
    ],
  },
};

interface LegalUiCopy {
  links: Record<LegalDoc, string>;
  navigation: string;
  updated: string;
  /** Shown above the Spanish text in other languages. */
  bindingNote: string | null;
  /** First information layer under the contact form (GDPR art. 13). */
  formNotice: { before: string; purpose: string; link: string; after: string };
}

export const legalUi: Record<Locale, LegalUiCopy> = {
  es: {
    links: { 'aviso-legal': 'Aviso legal', privacidad: 'Privacidad', cookies: 'Cookies' },
    navigation: 'Información legal',
    updated: 'Última revisión',
    bindingNote: null,
    formNotice: {
      before: 'Responsable: ',
      purpose: '. Finalidad: responder a tu consulta. Legitimación: medidas precontractuales a petición tuya. Destinatarios: no cedemos tus datos salvo obligación legal. Derechos: acceso, rectificación, supresión y otros, como explica la ',
      link: 'política de privacidad',
      after: '.',
    },
  },
  en: {
    links: { 'aviso-legal': 'Legal notice', privacidad: 'Privacy', cookies: 'Cookies' },
    navigation: 'Legal information',
    updated: 'Last reviewed',
    bindingNote: 'This legal information is published in Spanish, which is the binding version.',
    formNotice: {
      before: 'Controller: ',
      purpose: '. Purpose: to answer your enquiry. Legal basis: steps taken at your request before a possible contract. Recipients: we do not share your data unless required by law. Rights: access, rectification, erasure and others, as explained in the ',
      link: 'privacy policy',
      after: '.',
    },
  },
};
