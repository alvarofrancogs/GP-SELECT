# GP SELECT — estado actual

## PHASE

**PHASE COMPLETED: MOTION / SCROLL ARCHITECTURE PASS (29-09-2026).** Objetivo cumplido: HOME completa de principio a fin con scroll, pinning, handoffs y vehículos en movimiento ligados al scroll y reversibles. Siguiente fase (sin abrir todavía): FINAL VISUAL POLISH PASS.

Unidades: 1A PASS · 1B PASS · 1C PASS · 1D PASS · 1E PASS · 1F PASS.

**Sustituido por `CarHandoffScene` (1F):** la antigua escena BMW de 1B (`PerformanceScene` conserva solo Process) y la antigua escena Europe de 1E fueron eliminadas (commit `fd8336a`). Ahora un único frame fijado hace BMW → noche/mapa → Audi RS Q3 (`useCarHandoffScene.ts`, `CarHandoffScene.tsx`, `car-handoff.css`). Los apartados BMW y Europe de más abajo son historial: su motion y sus deudas ya no aplican al código actual, salvo donde se indique lo contrario.

Secuencia de la HOME: Hero (claro) → Process (oscuro) → **CarHandoff: BMW (claro) → noche/mapa → Audi RS Q3 (oscuro)** → Services (crema) → Inventory (crema) → CTA final (oscuro) → Footer (oscuro).

**1F — PASS.** Un solo pin (4,5 vh; 3,5 en móvil). Timeline de escena (cielo, sombreado, noche desde arriba, mapa, titulares y CTA) y timeline de coches con scrub más pesado. Ambos coches comparten caja, ancla y origen de transformación: un único avance continuo con crossfade BMW → Audi en la misma caja. Titulares con la receta del hero y tamaño ajustado por palabra; «Visión / Global» no invade el coche. Services entra como telón de papel sobre el último viewport. El header lee el tono publicado por la escena (`data-header-tone`) sin hit-test por frame. Reduced-motion y alturas < 600 px: dos frames estáticos. QA a 1440, 1920 y 390 (descenso, ascenso, reduced-motion), build, lint y consola OK.

**FINAL VISUAL POLISH PASS — en curso.** 2F-A PASS (29-09-2026) · 2F-B PASS (29-09-2026) · **siguiente: 2F-C — ADMIN PANEL (registrada, NO iniciada).**

**2F-A — PASS.** Sistema tipográfico global y páginas interiores.
- **ADN tipográfico:** «Curated / Luxury» (hero) es la referencia absoluta: Archivo Variable, `font-stretch: 125%`, 800, −0,055em, interlineado 0,94, caja mixta.
- **Recetas `--type-*` (tokens.css) y clases `.type-*` (global.css):** display, section, heading, fine, lede y label a 125 %; body a 108 %; UI a 115 %. Cifras con `tabular-nums`. `.button` en una sola regla con la receta UI.
- **HOME migrada solo en tipografía:** Process, Services, Inventory, CTA final (ahora en caja mixta), botones, nav, eyebrows y footer. Tamaños recalibrados para conservar las cajas; motion, hooks y JSX intactos.
- **Navegación de cuatro enlaces:** Nosotros · Vehículos · Importación · Contacto. `/importacion` es la página integral (Servicios + Importación); `/servicios` redirige ahí. Footer en todas las páginas.
- **`/nosotros`:** manifiesto «Selección. / Transparencia. / Criterio.», bloques asimétricos, tres principios sin números, banda oscura Europa, cierre «Hablar con nosotros →».
- **`/importacion`:** pasos 01–05 en filas editoriales con tres espacios de imagen; 04–05 en banda oscura.
- **`/contacto`:** dos caminos (vehículo concreto / ayúdame a encontrarlo) con `?intent=search` y `?vehiculo=`. Formulario con `submitLead()` local sin red (endpoint de leads sin definir). Canales en `src/config/contact.ts`, todos `null`: en DEV se ve el panel de WhatsApp como preview sin datos; en producción se ocultan los canales sin configurar.
- **Componentes:** `InteriorPageHeader`, `EditorialMedia`, `ProcessStep`, `ContactForm`, `DirectContact`.
- **QA:** 1920, 1440 y 390 en ES/EN sin desbordamiento; reduced-motion OK; build, lint y consola OK.
- **Pendiente P2:** copy «Tu próximo coche empieza aquí.»; peso del nav (400 → 500) frente al mockup; datos reales de contacto y endpoint de leads.
- **MEDIA PROVISIONAL:** `about-selection`, `about-detail`, `import-search`, `import-inspection` e `import-delivery` (SVG en `public/assets/temp/`).

**2F-B — PASS.** `/vehiculos` y `/vehiculos/:slug`, frontend con datos mock y preparado para el backend.
- **Catálogo homogéneo:** 3 columnas iguales en escritorio, 2 en tablet y 1 en móvil. Todas las fichas son iguales: imagen 4:3 y `subgrid` para alinear identidad, datos, precio y CTA por fila. Sin destacados ni piezas anchas; la última fila queda alineada a la izquierda.
- **Ficha:** marca y modelo en heavy (`.type-heading`) y versión en fine (`.type-fine`); año · km; CV · combustible · transmisión; precio (o «Precio bajo consulta»); estado solo si aplica; «Ver vehículo →».
- **Filtros:** Marca, Carrocería, Combustible, Precio, Año y Kilometraje, más Orden. Estado en la URL. Son capability-driven: un filtro sin datos no se muestra. Transmisión no es filtro, solo dato.
- **Detalle:**
  - titular partido heavy/fine;
  - galería sin librería (miniaturas, teclado, contador, `scroll-snap` en móvil y `<dialog>` para ampliar);
  - columna sticky con datos principales y «Solicitar información →» hacia `/contacto?vehiculo=`;
  - Especificaciones solo con datos complementarios;
  - Equipamiento, Estado e inspección, Procedencia, banda de importación y estado propio para un slug desconocido.
- **Datos:**
  - view-model objetivo en `types/vehicle.ts`, con `VehicleImage.fit` (`cover` | `contain`) como dato;
  - `services/vehicles.ts` con fuente mock (`VEHICLE_DATA_SOURCE`) y adaptadores `fromPublicCard` / `fromPublicDetail` sobre los DTO reales;
  - 8 mocks en ES y EN;
  - `Intl` con `useGrouping: 'always'` («9.800 km»); potencia en CV (ES) y hp (EN);
  - `tsconfig.app.json` añade `ES2023.Intl` a `lib` para tipar `useGrouping`.
- **BACKEND INTEGRATION GAP** (constante `BACKEND_INTEGRATION_GAP`): el DTO público no expone km, potencia, tracción, color interior, estado, país de procedencia, propietarios, historial, equipamiento, especificaciones adicionales ni metadatos de imagen. El listado tampoco trae combustible, transmisión ni carrocería. `powerHp` no existe en el dominio. El API no filtra, ordena ni pagina (máximo 100). No se ha tocado el backend.
- **Ejecución:** Astra hizo la unidad y la mayor parte del ajuste final. Se quedó sin cuota de Codex a mitad del `--resume`, y Opus cerró el error de tipos y la QA.
- **QA:** 1920, 1440 y 390 en ES/EN con 8, 7, 5, 4, 3, 2 y 1 resultados, sin huecos ni desbordamiento. Detalle, galería, CTA y slug desconocido OK. Build, lint y consola OK.
- **MEDIA PROVISIONAL:** `vehicle-silver`, `vehicle-stone`, `vehicle-slate`, `vehicle-detail` y `vehicle-interior` (SVG en `public/assets/temp/`). Real: solo `public/assets/vehicles/bmw-m4-off.png` (recorte cenital, `fit: contain`).

## DONE

- Backend .NET 8 / EF Core / PostgreSQL existente; catálogo público y administración de vehículos e imágenes.
- Frontend React / TypeScript / Vite separado del backend. ES inicial, EN seleccionable y persistente.
- **Tipografía global única: Archivo Variable** (OFL, eje `wdth`). Roles por peso, tamaño, tracking y anchura; sin segunda familia ni `scaleX`.
- **Unidad 1A — PASS CON RESERVAS / POLISH DEFERRED.** Header con la estructura de hero/BMW; hero calibrado contra `16_51_51` (titulares, hueco central, logo, nav, CTA); el coche avanza a la izquierda ligado al scroll con zoom, blur y máscara; handoff continuo hacia Process (`data-handoff-target`); reversibilidad verificada.
- **Unidad 1B — PASS CON RESERVAS** (arquitectura de motion válida; deuda visual del BMW diferida). Process con activación progresiva y cuatro tramos equilibrados; handoff Process → BMW resuelto (texto de Process fuera antes de «German / Performance»); el BMW se mueve durante todo el pin; faros progresivos y reversibles; reversibilidad comprobada; build y lint OK.
- **Unidad 1C — PASS.**
  - BMW → Services: Services entra como telón opaco por encima del BMW fijado. «German / Performance» desaparece (60–78 % del pin) antes de que Services domine, y no hay pantalla crema vacía.
  - Motion de Services ligado al scroll: titular por líneas (desenfocado → enfocado), revelado de la imagen con máscara, entrada progresiva de la descripción y del acordeón, un único parallax y acordeón funcional y accesible (crossfade de imagen al cambiar de servicio).
  - Services → Inventory con continuidad.
  - Build, lint y consola OK; reversibilidad exacta. P0 y P1: ninguno.
- **Unidad 1D — PASS.** No hay secciones intermedias: el recorrido es Services → Inventory → Europe.
  - Inventory está integrado en el scroll sin pin adicional (`useInventoryScene.ts`).
  - La cabecera entra de forma progresiva.
  - Tarjetas: revelado de la imagen con máscara suave, escalonado, parallax interno y entrada del texto.
  - Services → Inventory es continuo, e Inventory es el único dueño de su cabecera.
  - Inventory → Europe: borde con degradado oscuro continuo, sin huecos.
  - Build, lint y consola OK; reversibilidad exacta. P0 y P1: ninguno.
- **Unidad 1E — PASS** (Astra dejó la base; la terminó y auditó Opus tras agotarse los créditos de Codex).
  - Europe recolocada entre BMW y Services, como interludio oscuro.
  - BMW → Europe: Europe sube como telón oscuro sobre el último viewport del pin del BMW, precedido por un degradado oscuro (65 svh) que oscurece el cielo del BMW. «Ingeniería / Alemana» sale antes de que domine Europe; el cielo del BMW ya no funde a papel.
  - Europe: pin de 2,5 vh (2 en móvil). Titular por líneas con blur, vehículo con recorrido continuo (entra por abajo, sube y sale, escala 0,9 → 1,06) y contrato `--vehicle-progress` 0–1 independiente del asset, mapa con parallax, escala y revelado con máscara, países escalonados.
  - Europe → Services: Services sube como telón de papel opaco sobre el último viewport de Europe (`margin-bottom: -100svh`; capas Europe 1 < Services 2). El texto de Europe sale al 58–76 % y el coche y el mapa se desvanecen debajo.
  - Inventory → CTA: salida sobria (el contenido baja a opacidad 0,5 y un sombreado oscuro scrubbed en el borde inferior), sin pin nuevo.
  - CTA final «Encuentra / tu próximo coche.» + «Empezar cuestionario» → `/contacto?intent=search&source=home-final-cta` (helper `qualificationUrl`). Entrada propia por líneas; sin eyebrow ni adornos.
  - CTA → Footer en flujo natural; el footer está limpio tras el pase anti-AI.
  - QA con Playwright a 1440×900 (descenso y ascenso completos, cada 150 px): reversibilidad exacta; capas correctas en ambos telones (nada de Europe pinta sobre Services); sin huecos ni flicker; enlaces del CTA y del footer OK; 390 px sin desbordamiento; reduced-motion estático. Build, lint y consola OK. P0 y P1: ninguno.
- **Pase anti-AI (Opus, 28-09-2026):** números 01–04 integrados en el texto secundario; eliminada la frase de relleno de Process, el eyebrow y el microcopy de Inventory, y la frase de los verbos y la pastilla del footer (que pasa a ser el enlace Contacto); «Modelo de ejemplo» como texto neutro; flecha → en todos los botones (como en los mockups).
- Referencia de motion destilada en `docs/REFERENCE-MOTION.md`.

## FINAL POLISH — deuda registrada

- 1F · Car handoff: `.scene-cta` no se reutilizó (añade `min-width` al botón); z-index locales sin simplificar; assets `car-a/car-b/europe-map` provisionales, con contrato PNG/WebP RGBA alineados en un mismo lienzo.

- P1 · Header: eliminar la banda sólida crema que aparece durante el handoff del hero (progreso 0,35–1). Resolver el contraste sin banda.
- P2 · Hero: más profundidad o parallax del cielo (hoy solo −3 %).
- P2 · `frontend/package.json`: revertir `--configLoader runner` (solo hace falta dentro del sandbox de Codex).
- P2 · Desinstalar `@fontsource-variable/inter` e `inter-tight`: ya no se usan.
- Con Archivo, «Performance» (BMW) y «EUROPEAN PERFORMANCE» quedan pegados a sus slots de coche. Calibrarlo por escena.
- Calibración por escena contra los mockups: tamaños, posiciones, responsive fino, máscaras y blur.
- Inventory (1D): motion deliberadamente sobrio (afinar intensidad), imágenes provisionales.
- Europe / CTA (1E): el placeholder del GLC pasa por detrás del botón «Ver vehículos» de Europe; el mapa es un placeholder oscuro; afinar el borde telón papel/negro en Europe → Services; la banda gris del sombreado Inventory → CTA; imagen del CTA provisional (reutiliza `hero-car.svg`); footer frente al mockup (Murcia / Spain, legales).
- Services (1C): imágenes definitivas por servicio (hoy comparten placeholder); posible enriquecimiento del handoff Services → Inventory.
- BMW (1B): los PNG `bmw-m4-off/on` están desalineados (el coche «encendido» está 134 px a la izquierda en su lienzo y es ~6 px más alto) y el coche se ve duplicado durante el crossfade: recortar o normalizar. También: encaje fino frente al mockup, glow y encendido final, y posición y tamaño exactos.

## MEDIA PROVISIONAL

- Hero: `hero-car.svg` y `hero-sky.svg`, pendientes de la foto real del Porsche y del cielo.
- BMW: `bmw_m4_faros_apagados/encendidos.png` (recortes RGBA) se usan como prototipo del encendido de faros.
- GLC cenital, mapa de Europa, fotos de servicios e inventario: placeholders.
- Todo el media de los vehículos puede sustituirse por vídeo, secuencia de frames, render o Canvas en la fase de media production.

## GAPS CONOCIDOS

- «Premium vehicles» (inventario) no tiene mockup específico.
- El vídeo `2026-09-26 15-54-09.mp4` es una grabación de Jesko Jets, no de GP SELECT.
- El PNG `28 sept 15_41_46` (importación) está borrado en el árbol de trabajo y se recupera con `git restore`.

## NEXT

**2F-C — ADMIN PANEL. Registrada, NO iniciada:** sin orquestación, sin Astra y sin cambios de backend.
- **Objetivo:** panel administrativo muy sencillo para gestionar el inventario real.
- **Estilo:** mismo ADN de GP SELECT (Archivo Variable, `--type-*`, off-white / charcoal, filetes, jerarquía editorial, botones existentes), pero más funcional, compacto y menos cinematográfico. No es un dashboard SaaS: sin KPIs, gráficas, analytics, sidebar extensa, CRM, clientes, ventas, facturación, reservas ni pagos.
- **Flujo ideal:** login → listado → añadir → datos → fotografías → guardar borrador → vista previa → publicar → listado, y listado → eliminar (con confirmación y copy fiel al tipo de borrado real). Solo se implementa lo que el backend soporte de verdad.
- **Antes de Astra:** Opus inspecciona el backend de administración real y clasifica cada campo del formulario objetivo como:
  - **A:** soportado hoy;
  - **B:** existe en el dominio pero no en el DTO;
  - **C:** no existe;
  - **D:** flexible (`CustomSpecifications`).
  
  Sin tocar el backend sin aprobación.
- **Rutas previstas:** `/admin` (eyebrow «GP SELECT · ADMIN», H1 «Vehículos», «Añadir vehículo →», filas editoriales con filetes, sin cards) y `/admin/nuevo` (formulario por secciones: Vehículo · Acabado y procedencia · Información · Equipamiento · Especificaciones adicionales).
- **Formulario:** equipamiento y especificaciones con interfaz humana, nunca JSON.
- **Imágenes:** según lo que soporte el backend, arrastrar y soltar, selección múltiple, preview, eliminar y reordenar; contador «12 / 30»; portada identificada; errores por imagen sin `alert()`.
- **Auth:** reutilizar la existente (cookie, CSRF, rol Admin), sin `localStorage`.
- **Responsive:** 1920 / 1440 / 390; en 390, listado apilado, una columna, fotos en 2 columnas y sin tabla horizontal.
- **Skills:** Opus con frontend-design, impeccable, Playwright MCP y verification-before-completion. Astra con design-taste-frontend, vercel:react-best-practices y playwright-cli si existe. Sin GSAP.

- FINAL VISUAL POLISH PASS: continúa tras 2F-C.
- Catálogo, detalle, importación y cuestionario en su fase correspondiente; definir el endpoint mínimo de leads antes de implementarlo.

## DO NOT TOUCH

- No rediseñar escenas existentes ni cambiar la identidad visual; mejorar sobre lo implementado.
- No usar mockups completos como fondos ni inventar fotografías, mapas o datos comerciales definitivos.
- No tratar Jesko Jets como referencia visual.
- No crear pagos, carrito, reservas mediante pago, CRM o autenticación alternativa.
- No modificar backend o secciones ajenas a la tarea sin necesidad funcional concreta.
