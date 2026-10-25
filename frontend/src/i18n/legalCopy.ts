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
          { p: ['Los que nos facilitas en los formularios de la web:'] },
          { list: [
            ['Contacto e importación: nombre y email, obligatorios; teléfono, opcional; el vehículo que te interesa o que buscas, con los detalles que nos des (presupuesto, año, kilometraje, lugar de entrega o plazo), y el mensaje que escribas.'],
            ['Citas: el día y la hora que eliges, nombre y teléfono, obligatorios, y el mensaje que escribas.'],
          ] },
          { p: ['Si nos escribes por WhatsApp o nos llamas, tratamos los datos que nos facilites con la misma finalidad. WhatsApp es un servicio de Meta y se rige por su propia política de privacidad.'] },
          { p: ['Además, el servidor puede registrar datos técnicos de la conexión, como la dirección IP, para proteger la web frente a abusos. No te pedimos datos especialmente protegidos: no incluyas en el mensaje información que no necesitemos para tu consulta.'] },
        ],
      },
      {
        heading: 'Analítica web',
        blocks: [
          { p: ['Solo si aceptas las cookies de análisis, usamos Google Analytics 4 para saber cuántas personas visitan la web, qué páginas ven y cuántas consultas se envían. Google recibe un identificador del navegador, las páginas visitadas, el tipo de dispositivo y navegador y la ubicación aproximada, y no recibe lo que escribes en los formularios. Tenemos desactivadas las señales de Google y la personalización de anuncios.'] },
          { p: ['La base jurídica es tu consentimiento (artículo 6.1.a del RGPD), que puedes retirar cuando quieras desde «Configurar cookies», en el pie de página. Los datos de análisis se conservan como máximo 14 meses. Más detalles, en la ', { to: legalPaths.cookies, text: 'política de cookies' }, '.'] },
        ],
      },
      { heading: 'Para qué los usamos', blocks: [{ p: ['Para responder a tu consulta, gestionar la cita que nos pidas y, si nos lo pides, ayudarte a buscar, valorar o comprar un vehículo. No los usamos para enviarte publicidad ni tomamos decisiones automatizadas sobre ti.'] }] },
      { heading: 'Base jurídica', blocks: [{ p: ['Tratamos tus datos para aplicar, a petición tuya, medidas previas a un posible contrato (artículo 6.1.b del RGPD). Los datos técnicos de conexión se tratan por nuestro interés legítimo en mantener la web segura (artículo 6.1.f del RGPD).'] }] },
      { heading: 'Cuánto tiempo los conservamos', blocks: [{ p: ['Cuando envías un formulario, tu consulta o tu petición de cita se guarda en nuestro servidor un máximo de 30 días, solo para asegurarnos de que nos llega, y después se borra automáticamente. Las copias de seguridad locales se eliminan a los 14 días y las copias externas a los 30 días. Si falla la creación de nuevas copias locales, se conserva la última disponible hasta disponer de una nueva copia válida. Si falla el envío de copias externas, las ya enviadas se conservan hasta que vuelva a funcionar. También nos llega por correo electrónico, donde la conservamos el tiempo necesario para atenderla y, como máximo, ', { field: 'retention' }, '. Si llegamos a formalizar una operación, los datos se conservarán durante los plazos que exija la ley.'] }] },
      { heading: 'Quién puede acceder a ellos', blocks: [{ p: ['No cedemos tus datos a terceros salvo obligación legal. Los proveedores que nos prestan los servicios de alojamiento web y de correo electrónico pueden acceder a ellos solo para prestarnos ese servicio, como encargados del tratamiento y con las garantías que exige el RGPD. Si aceptas las cookies de análisis, Google Ireland Limited recibe los datos de navegación descritos arriba como encargado del tratamiento. Si algún proveedor estuviera fuera del Espacio Económico Europeo, como puede ocurrir con Google, la transferencia se haría con las garantías previstas en el RGPD.'] }] },
      { heading: 'Tus derechos', blocks: [{ p: ['Puedes ejercer tus derechos de acceso, rectificación, supresión, oposición, limitación del tratamiento y portabilidad escribiendo a ', { field: 'email' }, '. Si consideras que no hemos atendido bien tu solicitud, puedes reclamar ante la ', { to: 'https://www.aepd.es', text: 'Agencia Española de Protección de Datos' }, '.'] }] },
      { heading: 'Cambios en esta política', blocks: [{ p: ['Si cambiamos cómo tratamos tus datos, actualizaremos esta página y la fecha de su última revisión.'] }] },
    ],
  },
  cookies: {
    title: 'Política de cookies',
    lede: 'Solo usamos cookies de análisis si las aceptas. No usamos cookies de publicidad.',
    sections: [
      {
        heading: 'Qué usamos',
        blocks: [
          { p: ['Almacenamiento técnico en tu navegador, necesario para que la web funcione:'] },
          { list: [
            ['Pantalla de carga (almacenamiento de sesión, «gp-select.preloader.seen»): evita repetir la animación completa al recargar. Se borra al cerrar la pestaña.'],
            ['Idioma («gp-select.locale.v1») y preferencia de cookies («gp-select.consent.v1»), en el almacenamiento local: recuerdan el idioma que eliges y si aceptaste o rechazaste el análisis, para no preguntarte de nuevo.'],
            ['Sesión y dispositivo del área de administración (cookies técnicas): solo se crean cuando inicia sesión el personal autorizado de GP SELECT. La del dispositivo («gp_admin_device») dura 180 días y evita que los intentos de acceso de terceros bloqueen su entrada.'],
          ] },
        ],
      },
      {
        heading: 'Analítica (solo con tu consentimiento)',
        blocks: [
          { p: ['Si aceptas, usamos Google Analytics 4, un servicio de Google Ireland Limited, para medir de forma agregada las visitas a la web, las páginas vistas y las consultas enviadas. Instala estas cookies de la propia web:'] },
          { list: [
            ['«_ga»: distingue a un visitante de otro. Dura hasta 2 años.'],
            ['«_ga_EC224ST2HT»: mantiene el estado de la sesión de medición. Dura hasta 2 años.'],
          ] },
          { p: ['No activamos las señales de Google ni la personalización de anuncios. Google puede tratar estos datos fuera del Espacio Económico Europeo, con las garantías del RGPD; lo explica la ', { to: legalPaths.privacidad, text: 'política de privacidad' }, '.'] },
        ],
      },
      { heading: 'Consentimiento', blocks: [{ p: ['Los elementos técnicos están exceptuados del deber de consentimiento (artículo 22.2 de la LSSI). Los de análisis no: la web te pregunta al entrar y no los activa hasta que aceptas. Puedes cambiar de opinión cuando quieras desde «Configurar cookies», en el pie de página; al rechazar, dejamos de medir y borramos las cookies de análisis.'] }] },
      { heading: 'Servicios de terceros', blocks: [{ p: ['Salvo Google Analytics, y solo si lo aceptas, la web no carga contenido de terceros que instale cookies: las tipografías y las imágenes se sirven desde nuestro propio servidor. Si abres un enlace externo, como WhatsApp, se aplica la política de ese servicio.'] }] },
      { heading: 'Cómo eliminarlo', blocks: [{ p: ['Puedes borrar las cookies y el almacenamiento cuando quieras desde la configuración de tu navegador.'] }] },
      { heading: 'Cambios', blocks: [{ p: ['Si incorporamos otras herramientas que usen cookies, lo indicaremos aquí y te pediremos el consentimiento antes de activarlas.'] }] },
    ],
  },
};

interface LegalUiCopy {
  links: Record<LegalDoc, string>;
  navigation: string;
  /** The analytics notice (components/ConsentBanner.tsx) and the footer button that reopens it. */
  consent: { title: string; text: string; more: string; accept: string; reject: string; settings: string };
  updated: string;
  /** Shown above the Spanish text in other languages. */
  bindingNote: string | null;
  /** First information layer under the contact form (GDPR art. 13). */
  formNotice: { before: string; purpose: string; appointmentPurpose: string; link: string; after: string };
}

export const legalUi: Record<Locale, LegalUiCopy> = {
  es: {
    links: { 'aviso-legal': 'Aviso legal', privacidad: 'Privacidad', cookies: 'Cookies' },
    navigation: 'Información legal',
    consent: {
      title: 'Cookies de análisis',
      text: 'Usamos Google Analytics para saber cuántas personas visitan la web y qué páginas ven. Solo se activa si lo aceptas, y la web funciona igual si lo rechazas.',
      more: 'Más información',
      accept: 'Aceptar',
      reject: 'Rechazar',
      settings: 'Configurar cookies',
    },
    updated: 'Última revisión',
    bindingNote: null,
    formNotice: {
      before: 'Responsable: ',
      purpose: '. Finalidad: responder a tu consulta. Legitimación: medidas precontractuales a petición tuya. Destinatarios: no cedemos tus datos salvo obligación legal. Derechos: acceso, rectificación, supresión y otros, como explica la ',
      appointmentPurpose: '. Finalidad: gestionar tu cita. Legitimación: medidas precontractuales a petición tuya. Destinatarios: no cedemos tus datos salvo obligación legal. Derechos: acceso, rectificación, supresión y otros, como explica la ',
      link: 'política de privacidad',
      after: '.',
    },
  },
  en: {
    links: { 'aviso-legal': 'Legal notice', privacidad: 'Privacy', cookies: 'Cookies' },
    navigation: 'Legal information',
    consent: {
      title: 'Analytics cookies',
      text: 'We use Google Analytics to count how many people visit the site and which pages they view. It only starts if you accept, and the site works the same if you reject it.',
      more: 'More information',
      accept: 'Accept',
      reject: 'Reject',
      settings: 'Cookie settings',
    },
    updated: 'Last reviewed',
    bindingNote: 'This legal information is published in Spanish, which is the binding version.',
    formNotice: {
      before: 'Controller: ',
      purpose: '. Purpose: to answer your enquiry. Legal basis: steps taken at your request before a possible contract. Recipients: we do not share your data unless required by law. Rights: access, rectification, erasure and others, as explained in the ',
      appointmentPurpose: '. Purpose: to arrange your appointment. Legal basis: steps taken at your request before a possible contract. Recipients: we do not share your data unless required by law. Rights: access, rectification, erasure and others, as explained in the ',
      link: 'privacy policy',
      after: '.',
    },
  },
};
