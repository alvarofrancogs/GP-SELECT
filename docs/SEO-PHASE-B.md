# SEO Fase B · plan B0–B10 y estado

Plan aprobado por el usuario el 09-10-2026 (sesión del portátil). Sustituye a la «Fase B» y a la «Fase D, opción 2» de `docs/SEO-AUDIT.md`. Se reconstruye aquí desde la transcripción de esa sesión, que se copió desde el terminal con algunas líneas cortadas: lo que falta se marca como *(cortado)*. El estado vivo sigue en `docs/CURRENT-STATE.md`.

## Estado (10-10-2026)

| Bloque | Estado | Dónde |
|---|---|---|
| B0 · Línea base | Aceptado | Capturas y scripts en el scratchpad (no en el repo) |
| B1 · Textos ES/EN | Aprobado | Documento «GP SELECT · B1 Textos comerciales ES/EN» (Claude Docs, enlace en `CURRENT-STATE.md`) |
| B2 · i18n por URL | Hecho | `main` (PR #6, `0533d3d`) |
| B3 · HTML EN, head, hreflang, sitemap | Hecho | `main` (PR #6) |
| B4 · Vehículos EN | Aprobado | `feat/seo-b4` (`6e2b936`) |
| B5 · Textos aprobados | Aprobado | `feat/seo-b5` (`3cd2199`) |
| B6 · Encabezados semánticos | Hecho (interiores) | `feat/seo-b6` |
| B7 · Secciones nuevas | **Absorbido por B5** | Ver abajo |
| B8 · Guía ES/EN | Pendiente | — |
| B9 · Entidad, GEO y conversión | Pendiente | — |
| B10 · Validación final | Pendiente | — |

Orden aprobado: B0 → B1 → B2 y B3 → B5, B6 y B7 → B4 → B8 → B9 → B10 (en la práctica B4 se hizo antes de B5). Un commit por bloque; sin push ni merge sin aprobación; tag `seo-phase-b-pass` al final.

## Decisiones que cambiaron después del plan

- **Fichas EN (B4):** el plan las dejaba en `noindex` y sin hreflang. El 10-10-2026 el usuario decidió **indexarlas ya**, con hreflang recíproco; los textos libres del Admin siguen en español con `lang="es"`. Sin campos EN en el Admin.
- **Schema:** el plan mantenía `AutoDealer`; B1 lo cambió a `AutomotiveBusiness` y quitó `seller` del Offer (hecho en B4). El Offer se retirará si el precio publicado incluye el servicio (dato pendiente).
- **FAQ comercial:** 1–5 y 8 publicadas; 6 (precio) y 7 (plazos) esperan datos. Sin FAQPage.
- **Modelos:** implementación delegada a `gpt-6-sol` high (`gpt-6.1-sol` no está disponible con la cuenta de ChatGPT en Codex); Astra para composición; Gemini 3.8 Flash para QA de navegador y revisión de capturas; Opus verifica y da el gate.

## Bloques

### B0 · Línea base
- Objetivo: referencia para detectar regresiones.
- Solución: build con `VITE_SITE_URL`; capturas a 390, 1440 y 1920 de todas las rutas y de la Home en varias posiciones de scroll; volcado de head, H1–H3 y JSON-LD de cada HTML *(cortado)*.
- Aceptación: línea base reproducible.

### B1 · Textos ES/EN para aprobar
- Todos los textos comerciales, metas, FAQ comercial y ledes, antes de tocar código. Opus redacta; el agente seo-content revisa E-E-A-T, patrones de IA y afirmaciones. Marcadores `[P]` para lo no confirmado.
- Aceptación: aprobación del usuario.

### B2 · i18n por URL
- Archivos: `App.tsx`, `SiteLayout.tsx`, `LanguageProvider.tsx`, `LanguageSwitcher.tsx`, `Header.tsx`, `Footer.tsx`, `qualification.ts`, enlaces de las páginas, `legalCopy.ts` (Cookies).
- Solución: tabla de rutas única; el idioma sale de la URL; clave de `<main>`/`<Header>` por página, no por pathname; selector con `<a href>` que conserva el fundido; helper de enlaces localizados.
- Riesgo: volver a montar o recalcular ScrollTrigger, saltos de scroll.
- Aceptación: ES↔EN a mitad de un pin sin remontar ni saltar; atrás/adelante; reduced-motion; tests de la tabla de rutas.

### B3 · HTML estático EN, head, hreflang, sitemap y Caddy
- Archivos: `pageMeta.ts`, `seoPlugin.ts`, `readableContent.ts`, `en.ts`, `deploy/Caddyfile`, `SeoController.cs` (sitemap) y tests.
- Solución: build de `en/*` y `og:locale` por idioma; hreflang con x-default (→ EN); sitemaps ES+EN; 301 en Caddy para `/en/…`; `llms.txt` con sección EN.
- Aceptación: test que recorre todos los HTML (reciprocidad, canonical = URL del hreflang, un solo x-default por grupo).

### B4 · Vehículos EN
- Archivos: `SeoController.cs`, `VehicleSeo.cs`, `pageMeta.ts`, `VehicleDetail.tsx`, `Caddyfile`, `vehicle-seo.json`, `SeoTests`, Vitest.
- Solución: idioma en `/seo/vehiculos` y `/seo/vehiculos/{slug}`; head y migas por idioma; paridad TS↔C# ampliada a EN. *(Indexación: ver «Decisiones que cambiaron».)*
- Aceptación: head ES igual a B0 salvo lo previsto; `/en/vehicles` sin JS enlaza a las fichas EN; paridad en verde.

### B5 · Implementar los textos aprobados
- Archivos: `es.ts`, `en.ts`, `servicesCopy.ts`, `footerCopy.ts`, `pageMeta.ts`.
- Escenas fijadas (Process, Servicios, CarHandoff) con calibración de longitudes; alternativas cortas de B1 si algo no cabe.
- Aceptación: capturas frente a B0 (solo cambia el texto), pins y handoffs intactos, ES/EN.

### B6 · Encabezados semánticos
- Interiores: el H1 incluye el lede visible (`InteriorPageHeader.tsx`, `interiors.css`); aceptación píxel a píxel a 390, 1440 y 1920 y H1 estático = SPA. **Hecho** (0 de 40 capturas distintas).
- Home: «Selección Europea / Sourced in Europe» se mantiene. El plan proponía una **prueba acotada con Astra** para meter la descripción del hero en el H1 (toca `data-scene-title` y `data-scene-ui`, que anima GSAP): solo se acepta si queda idéntica al píxel y GSAP no cambia. **Pendiente.**
- Servicios: el icono +/− sale del H3 (P3-2 de la auditoría). **Pendiente.**
- (El H2 de Process ya cambió en B5 con el texto de B1.)

### B7 · Secciones nuevas de Importación, Nosotros y Vehículos
- Archivos previstos: `Import.tsx`, `About.tsx`, `Vehicles.tsx`, `interiors.css`, diccionarios, `readableContent.ts`. Astra para la maqueta con patrones existentes.
- Aceptación: sin cambios en las secciones existentes; HTML estático = SPA; responsive.
- **Estado:** el documento B1 aprobado fijó el contenido final de estas secciones y se integraron en B5: Importación («Nosotros gestionamos el resto», 7 etapas, impuestos, FAQ), Nosotros (fila nueva y sección de terceros, maqueta de Astra) y Vehículos (B1 sustituyó el párrafo de 60–100 palabras por la frase de cierre con «por encargo»). Si se quiere el párrafo largo de Vehículos, es un texto nuevo que necesita aprobación.

### B8 · Guía ES/EN
- Archivos: nueva página y ruta, diccionario, `pageMeta.ts` (Article + BreadcrumbList, `dateModified`, publisher `@id`), sitemap, `llms.txt`.
- URLs previstas: `/guias/importar-un-coche-de-europa` y su equivalente EN *(la ruta EN exacta quedó cortada; probablemente `/en/guides/importing-a-car-from-europe`)*.
- Estructura: (1) qué cambia según origen y destino; (2) dentro de la UE: sin aranceles; IVA de vehículo «nuevo» ≤ 6 meses o ≤ 6.000 km (Directiva 2006/112/CE, art. 2.2.b; Your Europe); vendedor particular frente a profesional; (3) fuera de la UE (Reino Unido, Suiza, Noruega): aduana, DUA, origen preferencial, sin tipos; (4) en origen (Alemania): Zulassungsbescheinigung Teil I/II (FZV §13–14), placas de exportación (FZV §45); (5) en destino: España en detalle (ITV y ficha técnica, CoC u homologación, IEDMT con modelos 576/06/05 — Ley 38/1992, IVA con el 309 para nuevos, ITP según comunidad, IVTM y DGT) y los demás países remitidos a su autoridad (ANTS/service-public, Revenue, Belastingdienst); (6) riesgos habituales; (7) FAQ informativa; (8) «Qué hace GP SELECT en este proceso»; (9) fuentes oficiales con enlace y fecha de revisión.
- Sin importes, plazos ni requisitos universales; cada plazo se comprueba en la norma original (ya hay una discrepancia detectada en las instrucciones del 576). Sin páginas por país hasta que Search Console muestre demanda.
- Contenido de Opus con fuentes verificadas; revisión de seo-content; maqueta de Astra con componentes interiores; fecha de revisión visible. Conviene revisión profesional.
- Aceptación: cada afirmación normativa con fuente; ningún trámite español presentado como europeo.
- Al publicarse la guía: añadir el enlace «Guía: cómo importar un coche desde Europa →» en la sección de impuestos de Importación (B1).

### B9 · Entidad, GEO y conversión
- Archivos: `pageMeta.ts`, `contactChannels.ts`, `ContactForm.tsx`, `EnquiriesController.cs` y `Enquiry.cs` (+ migración), notificación por email.
- Solución: Schema final; matriz de enlaces internos (Home → Importación y Vehículos; Importación ↔ guía; fichas → Importación; Nosotros → Importación; cada página EN enlaza solo a EN); idioma de la consulta guardado y mostrado en el aviso, respuesta en el idioma del cliente; mensaje de WhatsApp en EN; el build avisa si queda un marcador `[P]`.
- Modelo: Opus; agentes seo-schema y seo-geo para revisar.
- Aceptación: JSON-LD válido, `@id` coherentes, consulta en modo vista previa mientras el formulario siga desactivado *(cortado)*.

### B10 · Validación final
- La matriz completa de pruebas (build, lint, typecheck, tests, HTML sin JS, metadatos y canonical, hreflang recíproco, sitemap ES/EN, navegación y selector, enlaces y CTAs, capturas a 390/1440/1920, GSAP/ScrollTrigger/reduced-motion, sin regresiones de la Fase A). Las comprobaciones mecánicas se delegan; Opus da el gate, actualiza `CURRENT-STATE.md` y pone el tag.

## Estrategia (resumen del plan)

- **Entidad:** la misma frase en ES, EN, Schema y `llms.txt` (texto final en `frontend/src/i18n/entityCopy.ts`).
- **Tres niveles:** Europa = posicionamiento de entidad y conversión internacional; España = principal fuente de tráfico (/importacion, Home, guía ES); Murcia = señal local sin páginas propias (Schema, Google Business Profile).
- **Términos:** alta prioridad «importar coche de Alemania/de Europa», «importación de coches llave en mano», «import a car from Germany to Spain / register a German car in Spain», «car sourcing service Europe»; media «coches por encargo», «importar coche deportivo», «importar coche Murcia», «bespoke car sourcing»; descartados «turnkey…», «luxury import service», «performance car sourcing», Irlanda y Países Bajos. Sin datos de volumen: priorización cualitativa.
- **Arquitectura:** ES en las URLs de siempre, EN bajo `/en` (`/en/import`, `/en/about`, `/en/vehicles`, `/en/contact`, legales EN `noindex`); forma canónica sin barra final; idioma solo por URL, sin redirecciones por IP ni navegador; hreflang solo entre pares que existen en los dos idiomas.
- **E-E-A-T sin persona:** transparencia sobre qué gestiona GP SELECT y qué coordina con terceros, datos legales, canales y fuentes oficiales con fecha. No se inventan años, operaciones, testimonios, garantías, instalaciones ni acuerdos.
- **Schema mínimo:** organización con `@id`, Service en Importación, Article + BreadcrumbList en la guía, WebSite con `inLanguage`. Nada de Review, AggregateRating ni FAQPage.
