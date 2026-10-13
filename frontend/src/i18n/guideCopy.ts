import type { Locale } from './types';

/** A paragraph, or a list of short items. */
export type GuideBlock = { p: string } | { list: string[] };

export interface GuideSection {
  id: string;
  title: string;
  blocks: GuideBlock[];
}

interface GuideCopy {
  title: string;
  lede: string;
  /** Shown under the header and used as dateModified. */
  reviewed: { label: string; date: string; iso: string };
  /** Says what the guide is, and is not, before any rule. */
  notice: string;
  sections: GuideSection[];
  faq: { title: string; rows: { title: string; body: string }[] };
  gpSelect: GuideSection;
  sources: { title: string; intro: string; rows: { label: string; href: string }[] };
  closing: string;
  closingBody: string;
  cta: string;
  /** Link to the Import page, which describes the service. */
  secondary: string;
  breadcrumb: string;
}

// Only rules checked in official sources (listed at the end); no amounts, rates or deadlines that vary by case.
// Spanish formalities are always named as Spanish: no Spanish rule is presented as European.
export const guideCopy: Record<Locale, GuideCopy> = {
  es: {
    title: 'Guía',
    lede: 'Cómo importar un coche desde Europa: qué cambia según el país de origen y el de destino, qué impuestos se pagan y qué trámites hacen falta para matricularlo.',
    reviewed: { label: 'Revisada el', date: '13 de octubre de 2026', iso: '2026-10-13' },
    notice: 'Es una guía general, no asesoramiento fiscal ni jurídico. Las normas cambian y cada operación tiene sus particularidades: antes de comprar, confirma tu caso con la administración de tu país o con un profesional.',
    sections: [
      {
        id: 'origen-destino',
        title: 'Qué cambia según el origen y el destino.',
        blocks: [
          { p: 'Importar un coche no es un único trámite europeo. Dependen del caso tres cosas: si el coche viene de un país de la Unión Europea o de fuera, si es nuevo o usado a efectos del IVA y si lo vende un particular o un profesional.' },
          { p: 'La matriculación, en cambio, siempre la decide el país donde vives: no existe una ley de matriculación común en la UE. Cada país fija sus documentos, su inspección técnica y sus impuestos.' },
        ],
      },
      {
        id: 'dentro-ue',
        title: 'Dentro de la Unión Europea.',
        blocks: [
          { p: 'Entre países de la UE no hay aranceles ni aduana. Lo que cambia es dónde se paga el IVA:' },
          { list: [
            'Coche nuevo: a efectos del IVA, un coche es nuevo si se entrega dentro de los seis meses siguientes a su primera puesta en servicio o si no ha recorrido más de 6.000 km. El IVA se paga en el país de destino, donde se matricula.',
            'Coche usado comprado a un profesional: el IVA se aplica en el país de compra. Algunos vendedores usan el régimen especial de bienes usados; la factura debe indicar cómo se ha aplicado.',
            'Coche usado comprado a un particular: la venta no lleva IVA. En España, la DGT pide el contrato traducido y el pago del Impuesto sobre Transmisiones Patrimoniales.',
          ] },
          { p: 'Si el vendedor cobra el IVA de su país por un coche que es nuevo a efectos del IVA, conviene aclararlo antes de pagar: ese IVA corresponde al país de destino y su devolución depende del país de origen.' },
        ],
      },
      {
        id: 'fuera-ue',
        title: 'Desde fuera de la UE.',
        blocks: [
          { p: 'Un coche que llega de fuera de la UE, por ejemplo del Reino Unido, de Suiza o de Noruega, pasa por la aduana: hay que presentar una declaración de importación (en España, el DUA) y pagar el IVA de importación.' },
          { p: 'El arancel depende de su origen. Si el coche acredita origen preferencial según el acuerdo comercial entre la UE y ese país, puede entrar sin arancel; sin esa prueba se aplica el arancel general. Antes de comprar, pide al vendedor la documentación de origen.' },
        ],
      },
      {
        id: 'origen-alemania',
        title: 'En el país de origen: el ejemplo de Alemania.',
        blocks: [
          { p: 'Alemania es uno de los mercados de ocasión más grandes de Europa, así que sirve de ejemplo. Su documentación tiene dos partes:' },
          { list: [
            'Zulassungsbescheinigung Teil I: el permiso de circulación.',
            'Zulassungsbescheinigung Teil II: el título del vehículo. Es el documento que acredita a quién pertenece y el que pedirá el país de destino.',
          ] },
          { p: 'Para sacar el coche circulando se pueden pedir placas de exportación (Ausfuhrkennzeichen, § 45 de la FZV), con un seguro específico. La oficina de matriculación retira el Teil I y actualiza el Teil II. La otra opción es trasladarlo en camión, sin circular.' },
        ],
      },
      {
        id: 'destino-espana',
        title: 'En el país de destino: España.',
        blocks: [
          { p: 'Para matricular en España un coche que viene de otro país de la UE, el orden habitual es este:' },
          { list: [
            'Inspección en una estación ITV, que revisa el coche y su documentación y emite la ficha técnica española. Para acreditar la homologación sirve el certificado de conformidad europeo (CoC) o el documento equivalente.',
            'Impuesto Especial sobre Determinados Medios de Transporte (impuesto de matriculación), con el modelo 576 de la Agencia Tributaria. Grava la primera matriculación definitiva en España de coches nuevos y usados, y su tipo depende de las emisiones de CO₂ (Ley 38/1992). Si hay una exención o no sujeción, como en algunos traslados de residencia, se usan los modelos 05 o 06.',
            'Si el coche es nuevo a efectos del IVA: el IVA español con el modelo 309, dentro de los treinta días siguientes a la compra y siempre antes de la matriculación definitiva.',
            'Si el coche se compró a un particular: el Impuesto sobre Transmisiones Patrimoniales, que gestiona cada comunidad autónoma.',
            'Matriculación en la DGT con la documentación original del vehículo, la ficha técnica de la ITV y los justificantes de los impuestos.',
          ] },
          { p: 'Después, el coche paga cada año el impuesto municipal de circulación del ayuntamiento donde se domicilia.' },
        ],
      },
      {
        id: 'otros-destinos',
        title: 'Si vives en otro país.',
        blocks: [
          { p: 'Cada país tiene su propio impuesto de matriculación y su propio procedimiento. Algunos ejemplos de la autoridad que lo gestiona:' },
          { list: [
            'Francia: ANTS, la agencia de títulos de vehículos, con el certificado fiscal (quitus fiscal) para coches comprados en otro país de la UE.',
            'Irlanda: Revenue, con el Vehicle Registration Tax (VRT).',
            'Países Bajos: RDW para la matriculación y Belastingdienst para el impuesto BPM.',
          ] },
          { p: 'Consulta siempre la autoridad de tu país antes de comprar: los plazos para matricular y las sanciones por hacerlo tarde también cambian de un país a otro.' },
        ],
      },
      {
        id: 'riesgos',
        title: 'Riesgos habituales.',
        blocks: [
          { list: [
            'Documentación incompleta: sin el título del vehículo (en Alemania, el Teil II) o sin acreditación de la homologación, la matriculación se retrasa o no es posible.',
            'IVA mal aplicado en un coche que es nuevo a efectos del IVA.',
            'Kilometraje e historial sin comprobar: pide el historial de mantenimiento y contrasta los datos con la documentación.',
            'Cargas o financiación pendientes: confirma que el coche está libre de deudas antes de pagar.',
            'Diferencias de equipamiento: un mismo modelo cambia según el país y el año, y el anuncio no siempre lo dice.',
          ] },
        ],
      },
    ],
    faq: {
      title: 'Preguntas frecuentes.',
      rows: [
        { title: '¿Hay que pagar aduana por un coche comprado en otro país de la UE?', body: 'No. Entre países de la UE no hay aranceles ni aduana. Sí se pagan los impuestos y tasas de matriculación del país donde vives y, si el coche es nuevo a efectos del IVA, el IVA de ese país.' },
        { title: '¿Cuándo se considera nuevo un coche a efectos del IVA?', body: 'Cuando se entrega dentro de los seis meses siguientes a su primera puesta en servicio o cuando no ha recorrido más de 6.000 km. Basta con una de las dos condiciones.' },
        { title: '¿Se paga el impuesto de matriculación en España aunque el coche sea usado?', body: 'Sí. En España grava la primera matriculación definitiva, también la de coches usados que vienen de otro país, salvo exención o no sujeción. Se liquida con el modelo 576.' },
        { title: '¿Puedo traer el coche conduciendo?', body: 'Depende del país de origen. En Alemania existen placas de exportación con un seguro específico; la alternativa es el transporte en camión.' },
      ],
    },
    gpSelect: {
      id: 'gp-select',
      title: 'Qué hace GP SELECT en este proceso.',
      blocks: [
        { p: 'Buscamos el coche, lo revisamos, negociamos con el vendedor y nos encargamos de la documentación, el transporte, la matriculación en tu país y la entrega. Según la operación, el coche se compra directamente a tu nombre o te lo vende GP SELECT con su factura; te confirmamos cuál antes de la compra.' },
        { p: 'Antes de comprar te indicamos qué impuestos y trámites suelen aplicarse en tu caso. Esta guía no sustituye esa revisión.' },
      ],
    },
    sources: {
      title: 'Fuentes oficiales.',
      intro: 'Cada regla de esta guía se ha comprobado en estas fuentes. Si alguna cambia, prevalece la norma vigente.',
      rows: [
        { label: 'Your Europe · IVA al comprar o vender un coche', href: 'https://europa.eu/youreurope/citizens/vehicles/cars/vat-on-cars-bought-abroad/index_es.htm' },
        { label: 'Your Europe · Matricular un coche en otro país de la UE', href: 'https://europa.eu/youreurope/citizens/vehicles/registration/registration-abroad/index_es.htm' },
        { label: 'Directiva 2006/112/CE del IVA, artículo 2.2.b (EUR-Lex)', href: 'https://eur-lex.europa.eu/legal-content/ES/TXT/?uri=CELEX:32006L0112' },
        { label: 'Ley 38/1992 de Impuestos Especiales (BOE)', href: 'https://www.boe.es/buscar/act.php?id=BOE-A-1992-28741' },
        { label: 'Agencia Tributaria · Modelo 576, instrucciones', href: 'https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/impuesto-matriculacion/modelo-576-impue_____eterminados-medios-transporte-autoliquidacion_/instrucciones.html' },
        { label: 'Agencia Tributaria · Primera matriculación del vehículo en España', href: 'https://sede.agenciatributaria.gob.es/Sede/vehiculos-embarcaciones/importar-vehiculo/requisitos-exigibles-despues-aduana/primera-matriculacion-vehiculo-espana.html' },
        { label: 'DGT · Matricular un vehículo proveniente de la UE', href: 'https://www.dgt.es/nuestros-servicios/tu-vehiculo/quieres-traer-o-llevarte-un-vehiculo-del-extranjero/matricular-un-vehiculo-proveniente-de-la-ue/' },
        { label: 'Punto de Acceso General · Impuesto de matriculación en un traslado', href: 'https://administracion.gob.es/pag_Home/Tu-espacio-europeo/derechos-obligaciones/ciudadanos/vehiculos/traslado/impuesto.html' },
        { label: 'FZV § 45 · Placas de exportación (Alemania)', href: 'https://www.gesetze-im-internet.de/fzv_2023/__45.html' },
      ],
    },
    closing: '¿Prefieres que lo gestionemos nosotros?',
    closingBody: 'Cuéntanos qué coche buscas y dónde vives, y te decimos qué trámites tendría tu caso.',
    cta: 'Pedir una búsqueda',
    secondary: 'Cómo funciona la importación',
    breadcrumb: 'Guía de importación',
  },
  en: {
    title: 'Guide',
    lede: 'Importing a car from Europe: what changes with the country of origin and the destination, which taxes apply and which formalities you need to register it.',
    reviewed: { label: 'Reviewed on', date: '13 October 2026', iso: '2026-10-13' },
    notice: 'This is a general guide, not tax or legal advice. Rules change and every purchase has its own details: before you buy, confirm your case with the authorities in your country or with a professional.',
    sections: [
      {
        id: 'origin-destination',
        title: 'What changes with origin and destination.',
        blocks: [
          { p: 'Importing a car is not one European procedure. Three things depend on the case: whether the car comes from an EU country or from outside the EU, whether it is new or used for VAT purposes, and whether a private individual or a business sells it.' },
          { p: 'Registration, however, is always decided by the country where you live: there is no common EU registration law. Each country sets its own documents, roadworthiness inspection and taxes.' },
        ],
      },
      {
        id: 'within-eu',
        title: 'Within the European Union.',
        blocks: [
          { p: 'There are no customs duties or customs checks between EU countries. What changes is where VAT is paid:' },
          { list: [
            'New car: for VAT purposes, a car is new if it is supplied within six months of first entering service or has travelled no more than 6,000 km. VAT is paid in the destination country, where the car is registered.',
            'Used car bought from a business: VAT applies in the country of purchase. Some sellers use the margin scheme for second-hand goods; the invoice should state how VAT was applied.',
            'Used car bought from a private seller: the sale carries no VAT. In Spain, the traffic authority (DGT) asks for the translated contract and payment of the transfer tax (Impuesto sobre Transmisiones Patrimoniales).',
          ] },
          { p: 'If the seller charges their own country’s VAT on a car that is new for VAT purposes, clear it up before you pay: that VAT belongs to the destination country, and getting it back depends on the country of origin.' },
        ],
      },
      {
        id: 'outside-eu',
        title: 'From outside the EU.',
        blocks: [
          { p: 'A car coming from outside the EU, for example from the United Kingdom, Switzerland or Norway, goes through customs: an import declaration is needed (in Spain, the DUA) and import VAT is paid.' },
          { p: 'Customs duty depends on the car’s origin. If it proves preferential origin under the trade agreement between the EU and that country, it can enter duty-free; without that proof the standard duty applies. Before you buy, ask the seller for the origin documents.' },
        ],
      },
      {
        id: 'origin-germany',
        title: 'In the country of origin: Germany as an example.',
        blocks: [
          { p: 'Germany is one of Europe’s largest used-car markets, so it serves as the example. Its registration documents come in two parts:' },
          { list: [
            'Zulassungsbescheinigung Teil I: the registration certificate used on the road.',
            'Zulassungsbescheinigung Teil II: the vehicle title. It shows who the car belongs to, and the destination country will ask for it.',
          ] },
          { p: 'To drive the car out of the country you can request export plates (Ausfuhrkennzeichen, section 45 of the FZV), with dedicated insurance. The registration office withdraws Teil I and updates Teil II. The alternative is to move it by truck, without driving it.' },
        ],
      },
      {
        id: 'destination-spain',
        title: 'In the destination country: Spain.',
        blocks: [
          { p: 'To register in Spain a car coming from another EU country, the usual order is:' },
          { list: [
            'An inspection at an ITV station, which checks the car and its documents and issues the Spanish technical card. The European certificate of conformity (CoC) or an equivalent document proves the type approval.',
            'Registration tax (Impuesto Especial sobre Determinados Medios de Transporte), with form 576 from the Spanish Tax Agency. It applies to the first permanent registration in Spain of new and used cars, and its rate depends on CO₂ emissions (Law 38/1992). Where an exemption applies, as with some changes of residence, forms 05 or 06 are used instead.',
            'If the car is new for VAT purposes: Spanish VAT with form 309, within thirty days of the purchase and always before permanent registration.',
            'If the car was bought from a private seller: the transfer tax, managed by each Spanish region.',
            'Registration with the DGT, with the car’s original documents, the ITV technical card and proof of the taxes.',
          ] },
          { p: 'After that, the car pays the annual municipal road tax of the town where it is registered.' },
        ],
      },
      {
        id: 'other-destinations',
        title: 'If you live in another country.',
        blocks: [
          { p: 'Each country has its own registration tax and procedure. Some examples of the authority in charge:' },
          { list: [
            'France: ANTS, the vehicle documents agency, with the tax clearance certificate (quitus fiscal) for cars bought in another EU country.',
            'Ireland: Revenue, with the Vehicle Registration Tax (VRT).',
            'Netherlands: RDW for registration and the Belastingdienst for the BPM tax.',
          ] },
          { p: 'Always check with the authority in your country before you buy: registration deadlines and penalties for registering late also vary from country to country.' },
        ],
      },
      {
        id: 'risks',
        title: 'Common risks.',
        blocks: [
          { list: [
            'Incomplete documents: without the vehicle title (in Germany, Teil II) or proof of type approval, registration is delayed or impossible.',
            'VAT applied wrongly on a car that is new for VAT purposes.',
            'Unverified mileage and history: ask for the service history and check it against the documents.',
            'Outstanding finance or charges: confirm the car is free of debts before you pay.',
            'Specification differences: the same model varies by country and year, and the listing does not always say so.',
          ] },
        ],
      },
    ],
    faq: {
      title: 'Frequently asked questions.',
      rows: [
        { title: 'Do I pay customs duty on a car bought in another EU country?', body: 'No. There are no customs duties or customs checks between EU countries. You do pay the registration taxes and fees of the country where you live and, if the car is new for VAT purposes, that country’s VAT.' },
        { title: 'When is a car new for VAT purposes?', body: 'When it is supplied within six months of first entering service, or when it has travelled no more than 6,000 km. Either condition is enough.' },
        { title: 'Is Spanish registration tax due on a used car?', body: 'Yes. In Spain it applies to the first permanent registration, including used cars coming from another country, unless an exemption applies. It is paid with form 576.' },
        { title: 'Can I drive the car home?', body: 'It depends on the country of origin. Germany issues export plates with dedicated insurance; the alternative is transport by truck.' },
      ],
    },
    gpSelect: {
      id: 'gp-select',
      title: 'What GP SELECT does in this process.',
      blocks: [
        { p: 'We find the car, check it, negotiate with the seller and take care of the documents, transport, registration in your country and delivery. Depending on the transaction, the car is bought directly in your name or sold to you by GP SELECT with its own invoice; we confirm which before the purchase.' },
        { p: 'Before you buy, we outline the taxes and formalities that usually apply to you. This guide does not replace that review.' },
      ],
    },
    sources: {
      title: 'Official sources.',
      intro: 'Every rule in this guide was checked against these sources. If one changes, the rule in force prevails.',
      rows: [
        { label: 'Your Europe · VAT when buying or selling a car', href: 'https://europa.eu/youreurope/citizens/vehicles/cars/vat-on-cars-bought-abroad/index_en.htm' },
        { label: 'Your Europe · Car registration in another EU country', href: 'https://europa.eu/youreurope/citizens/vehicles/registration/registration-abroad/index_en.htm' },
        { label: 'VAT Directive 2006/112/EC, Article 2(2)(b) (EUR-Lex)', href: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32006L0112' },
        { label: 'Spanish Law 38/1992 on Excise Duties (BOE, in Spanish)', href: 'https://www.boe.es/buscar/act.php?id=BOE-A-1992-28741' },
        { label: 'Spanish Tax Agency · Form 576 instructions (in Spanish)', href: 'https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/impuesto-matriculacion/modelo-576-impue_____eterminados-medios-transporte-autoliquidacion_/instrucciones.html' },
        { label: 'Spanish Tax Agency · First registration in Spain (in Spanish)', href: 'https://sede.agenciatributaria.gob.es/Sede/vehiculos-embarcaciones/importar-vehiculo/requisitos-exigibles-despues-aduana/primera-matriculacion-vehiculo-espana.html' },
        { label: 'DGT · Registering a vehicle from the EU (in Spanish)', href: 'https://www.dgt.es/nuestros-servicios/tu-vehiculo/quieres-traer-o-llevarte-un-vehiculo-del-extranjero/matricular-un-vehiculo-proveniente-de-la-ue/' },
        { label: 'Spanish government portal · Registration tax when moving (in Spanish)', href: 'https://administracion.gob.es/pag_Home/Tu-espacio-europeo/derechos-obligaciones/ciudadanos/vehiculos/traslado/impuesto.html' },
        { label: 'FZV section 45 · Export plates (Germany, in German)', href: 'https://www.gesetze-im-internet.de/fzv_2023/__45.html' },
      ],
    },
    closing: 'Would you rather we handled it?',
    closingBody: 'Tell us which car you want and where you live, and we will tell you which formalities your case would involve.',
    cta: 'Request a search',
    secondary: 'How import works',
    breadcrumb: 'Import guide',
  },
};
