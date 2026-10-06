
# GP SELECT — estado actual

## PHASE

**Estado vivo: FINAL CLOSURE PASS, 3C PASS (01-10-2026); ver el bloque 3C más abajo.** Historial: **PHASE COMPLETED: MOTION / SCROLL ARCHITECTURE PASS (29-09-2026).** Objetivo cumplido: HOME completa de principio a fin con scroll, pinning, handoffs y vehículos en movimiento ligados al scroll y reversibles. Siguiente fase (sin abrir todavía): FINAL VISUAL POLISH PASS.

Unidades: 1A PASS · 1B PASS · 1C PASS · 1D PASS · 1E PASS · 1F PASS.

**Sustituido por `CarHandoffScene` (1F):** la antigua escena BMW de 1B (`PerformanceScene` conserva solo Process) y la antigua escena Europe de 1E fueron eliminadas (commit `fd8336a`). Ahora un único frame fijado hace BMW → noche/mapa → Audi RS Q3 (`useCarHandoffScene.ts`, `CarHandoffScene.tsx`, `car-handoff.css`). Los apartados BMW y Europe de más abajo son historial: su motion y sus deudas ya no aplican al código actual, salvo donde se indique lo contrario.

Secuencia de la HOME (desde 3C): Hero (claro) → Process (oscuro) → **CarHandoff: BMW cenital → corte mecánico, cielo claro → nublado** → Services (crema) → vehículo destacado real (`FeaturedVehicle`) → Footer (oscuro). Sin CTA final ni Inventory de ejemplo (UI Simplification). El texto de 1F de abajo es historial: 3C sustituyó noche/mapa/Audi.

**1F — PASS.** Un solo pin (4,5 vh; 3,5 en móvil). Timeline de escena (cielo, sombreado, noche desde arriba, mapa, titulares y CTA) y timeline de coches con scrub más pesado. Ambos coches comparten caja, ancla y origen de transformación: un único avance continuo con crossfade BMW → Audi en la misma caja. Titulares con la receta del hero y tamaño ajustado por palabra; «Visión / Global» no invade el coche. Services entra como telón de papel sobre el último viewport. El header lee el tono publicado por la escena (`data-header-tone`) sin hit-test por frame. Reduced-motion y alturas < 600 px: dos frames estáticos. QA a 1440, 1920 y 390 (descenso, ascenso, reduced-motion), build, lint y consola OK.

**FINAL VISUAL POLISH PASS — en curso.** 2F-A PASS (29-09-2026) · 2F-B PASS (29-09-2026) · 2F-C.1 PASS (30-09-2026) · 2F-C.2 PASS (30-09-2026) · HOME HANDOFF FIX PASS (30-09-2026) · 2F-C.3 PASS (30-09-2026) · 2G PASS (30-09-2026).

**FINAL CLOSURE PASS (desde 30-09-2026):** 3A production readiness (**PASS técnico**, aceptado por el usuario) → Final Technical / UX QA (**TECHNICALLY READY**) → 3B copy truth (**PASS**) → 3C final visual / asset polish → 3D final release QA. Una fase cada vez; cada una con su tag `<fase>-pass`.

## 3C FINAL VISUAL / ASSET POLISH = PASS (01-10-2026)

Rama `feat/3c-visual-asset-polish`. Commits 3C.1–3C.4 más un commit de cierre (UI Simplification, QA A–G, Real Stack Regression y sus fixes). Tag `3c-pass` sobre el commit de cierre. Sin push ni merge a `main`.

### Post-3C: Admin, catálogo y destacado (02-10-2026, sin tag)

Trabajo posterior a `3c-pass`, en la misma rama. Verificación (02-10-2026): typecheck, lint y build del frontend OK; backend con 0 warnings y 84/84 unitarios. Una ejecución de integración con Docker apagado dio 26 fallos de entorno (Testcontainers) y 27 OK. La verificación completa (integración y navegador) se hizo el 01-10-2026 según el usuario; no hay resultados detallados registrados aquí.

- **Vendidos visibles (`ShowWhenSold`, migración `AddShowWhenSold`):** `POST …/status` acepta `showWhenSold`; un `Sold` marcado aparece en el catálogo al final de la lista y exige portada, no precio.
- **Archivar y recuperar:** `POST …/restore` devuelve un archivado como `Draft`; archivado = solo lectura (409 `archived`). Nuevo `RestoreVehicleButton` en el Admin.
- **Fotos en staging (`IsStaged`, migración `AddStagedImages`):** las subidas del editor no son públicas ni portada hasta guardar; un único guardado del editor publica, quita y ordena. `CoverPersistence.cs` guarda el cambio de portada en dos pasos por el índice único. Portada = primera foto Ready.
- **Frontend:** `Select` y `SuggestInput` propios (`select.css`), `useProgressiveList` (catálogo por tandas con foco al primer nuevo), `useFeaturedRotation` (el destacado rota cada 10 s solo con la sección visible, sin hover/foco ni reduced-motion, tras decodificar la siguiente portada). Ajustes en filtros, tarjetas, editor y listado del Admin, preloader, CTA y Services.
- **Pendiente:** decidir si esta ronda merece tag propio.

### Backend hardening — 02-10-2026 (rama `backend-hardening`, sin tag)

Plan en `docs/superpowers/plans/2026-10-02-backend-hardening.md`. Sin migraciones, sin paquetes nuevos y sin cambios de contrato para el frontend (solo dos códigos en `adminCopy.ts`).

- **Enums solo por nombre declarado:** `"7"`, `"6"` o `"Sold, ComingSoon"` → 400; `ChangeStatus` rechaza estados no definidos.
- **Imágenes:** lectura acotada a 20 MiB en memoria (arregla el stream no seekable de S3); dimensiones comprobadas con `Identify` antes de decodificar; EXIF/IPTC/XMP eliminados tras auto-orientar. El worker nunca pisa una imagen borrada (ni al reclamarla, ni al terminar, ni al fallar) ni un job cancelado; una imagen borrada o inexistente cierra su job al momento.
- **Archivado = solo lectura también en la galería:** intent, complete, portada, quitar, reordenar y guardar → 409 `archived`. Imagen pública con `Cache-Control: public,max-age=86400`.
- **Guardado del editor:** publica solo las fotos en staging que lista `gallery.order` (el resto sigue en staging); retirar va antes de validar (Draft + precio 0 en un guardado funciona); reordenar puede omitir fotos en staging.
- **Texto y precio:** caracteres de control rechazados en todos los textos de vehículo y consulta (`invalid_text`); precio con 2 decimales como máximo (`invalid_precision`).
- **Slugs URL-safe:** minúsculas, sin diacríticos, `[a-z0-9-]`, fallback `vehicle` (`SlugGenerator.cs`).
- **Verificación (02-10-2026):** build 0 warnings; 104/104 unitarios; 63/63 de integración; typecheck, lint y build del frontend OK. Datos de desarrollo: 0 filas con estado desconocido o slug no URL-safe. QA del Admin en navegador a 1440 y 390: subir, guardar, descartar, portada, archivar y recuperar (las acciones de galería de un archivado muestran «El vehículo está archivado y ya no admite cambios.»), carácter de control y precio con tres decimales (el Admin lo frena antes de enviar; el API responde `invalid_precision`).

**Deuda abierta del backend:**

- **Concurrencia:** `complete` puede crear dos jobs; publicar mientras se borra la portada; superar las 30 fotos con intents simultáneos.
- **S3:** la URL firmada no limita el tamaño (el worker ya rechaza más de 20 MiB, pero el objeto se queda en el bucket); no hay limpieza de huérfanos, de intents abandonados (bloquean cupo) ni de registros de idempotencia.
- **Sesiones:** no se revocan al cambiar contraseña o email. ~~Claves de Data Protection sin persistencia~~: resuelto en INFRA-1 (`DataProtection__KeysPath`, obligatoria en Production).
- **Login:** sin límite agregado entre IP; un hash de contraseña mal formado solo falla al hacer login.
- **Listados sin paginar:** el catálogo se trunca a 100.
- **Índices:** faltan `Images(VehicleUnitId)` completo e `Images(OriginalKey)`.
- **Jobs:** la recuperación de jobs caducados consume intentos; el outbox puede reenviar un aviso; la cancelación del futuro proveedor de email.
- **Estados:** Available → Sold con `showWhenSold` + precio 0 en el mismo guardado sigue dando `price_zero`.
- **Imágenes:** las fotos pequeñas se amplían al generar `detail` (ResizeMode.Max: 1600×1000 → 2400×1500); valorar no ampliar.
- **Memoria:** el peor caso por job ronda 0,7 GB (40 MP, PNG de 16 bits); dar ~1 GB al contenedor o usar `DecoderOptions.TargetSize`.
- **Validación:** los 400 de cuerpo inválido incluyen un error espurio `"r"` del model binding (no tocar `SuppressImplicitRequiredAttribute…`, que quitaría los [Required] implícitos).
- **Admin:** se puede archivar con una subida en curso; la foto queda pendiente y bloquea Guardar hasta Descartar tras recuperar. Deshabilitar archivar mientras hay subida/cambios.
- **Slugs:** ß, ø, æ, ł, đ se pierden («Straße» → `stra-e`).
- **Otros:** ~~objeto ausente → 500~~ (resuelto en STORAGE-404); equipamiento con validación cuadrática; aviso ICC de ImageSharp 3.1.11 sin CVE; SSH.NET solo en los tests.

### UI Simplification Pass — aprobado expresamente por el usuario

Forma parte de 3C por decisión del usuario; no es una ampliación accidental de alcance.

- Fuera la sección negra «Encuentra tu próximo coche» (HOME: …Services → vehículo destacado → Footer) y todos los CTA de la HOME. CTA global único «Ver catálogo» (`CatalogueCta`, liquid glass + magnetismo ≤6 px solo con ratón y sin reduced-motion; oculto en `/vehiculos*`).
- Eliminados eyebrows, rayitas y captions decorativas; títulos de dos partes a peso único `--type-title-weight` (520).
- Hero: el Porsche avanza con `translateX` (0,34 del viewport) y solo 1,06 de escala. Assets renovados el 05-10-2026: Porsche completo (4236×1069, ya sin corte duro ni cola estirada), M3 de techo gris y cutaway a 1800×2700, con Astra + BiRefNet + Upscayl x2. La caja del hero parte del techo del coche (`top` 54 %, 64 % tablet, 69 % móvil).
- «Vehículos excepcionales» = un solo vehículo real (`FeaturedVehicle`), el más nuevo por `CreatedAt`. El API público lista ahora **descendente** (antes ascendente + `Take(100)` perdía el más nuevo con >100); el cliente ya no invierte. Sin precio, filas opcionales solo si tienen dato, estado vacío y de error limpios. Mocks de inventario, `InventoryPreview` y `FinalCta` eliminados.
- Pasadas posteriores: preloader (≤2 s, una vez por carga, precarga la lista de vehículos), fundido entre rutas, `lib/scrollRefresh.ts` (un solo `ScrollTrigger.refresh()` compartido: arregla el «crasheo» al volver a la Home), reset de scroll antes de construir los pins, telón Hero→Process con borde degradado, cortinilla BMW→rayos X como variable CSS (sobrevive a un refresh), título de pestaña por ruta, anti doble envío (contacto y login admin), `scroll-padding-bottom` por el botón fijo, foco al `main` tras navegar, bloqueo de scroll con `<dialog>` abierto.

### Exhaustive QA A–G — PASS

- Gemini como tester adversarial (READ-ONLY), Opus como gate.
- Cobertura: navegación, routing, datos hostiles, formularios, Admin, responsive, performance y chaos/soak.
- **0 P0 y 0 P1 abiertos.** Reduced-motion y touch comprobados a mano. Falsos positivos conocidos: contraste del header (`mix-blend-mode: difference`) y foco por `.focus()` en script.

### Real Stack Final Regression — PASS

- **Entorno:** build de producción del frontend, API .NET real, PostgreSQL real, migraciones desde cero, almacenamiento real de QA.
- **Resultados:**
  - backend: build con 0 warnings, 78/78 unitarios, 52/52 de integración, migraciones limpias;
  - frontend: typecheck, lint y build OK;
  - navegador: 81/81 checks PASS tras el último fix;
  - Contacto persistido de verdad en PostgreSQL; Admin de principio a fin; catálogo y detalle con datos reales;
  - reduced-motion y touch;
  - 0 errores JS inesperados y 0 HTTP 500 inesperados.

### Findings corregidos (QA A–G y Real Stack)

- `FeaturedVehicle` desbordaba entre 768 y 1024 px: columnas `minmax(0, …)` y `min-width: 0`.
- Textos largos válidos según contrato (modelo de 60 caracteres, URLs en descripciones) ensanchaban fichas y detalle: `overflow-wrap` en catálogo, detalle y destacado.
- Caption de la galería del detalle: un texto largo se parte en vez de desbordar la fila del contador.
- Specs largas del destacado (`fuelType`, etc.): se parten dentro de su celda.
- Título de pestaña normalizado para `/nosotros/`, `/NOSOTROS` y variantes (el router ignora mayúsculas y barra final).
- Título correcto para un vehículo inexistente.
- Menú móvil: se cierra al pasar a escritorio (≥1200 px).

### P3 / deuda no bloqueante

- Datos imposibles según el contrato (`NaN`, `images: null`): sin hardening adicional.
- Guard síncrono opcional del Admin frente a eventos sintéticos (doble envío por eventos disparados por script).
- `/#criterio` no hace scroll al ancla por navegación interna.
- ~~Miniaturas de la galería cargan la imagen grande~~: resuelto en PERF-1.
- Imagen que falta en el almacenamiento → 500 en vez de 404 (P2 previo).
- ~~Bundle público > 500 kB~~: dividido en chunks en PERF-1 (el total sigue igual).
- CLS ~3 en el scroll de la Home por los pins de GSAP (métrica, sin saltos visibles; decidir en SEO/rendimiento).
- `hero-car.webp` lleva una cola sintética hasta tener foto ancha en alta resolución (la versión HQ de prueba queda fuera del repo).
- El resto de P2/P3 ya registrados más abajo siguen vigentes.

### Remaining release blockers (no invalidan el PASS técnico de 3C)

- **LEGAL / PRIVACY:** páginas hechas (05-10-2026: `/aviso-legal`, `/privacidad`, `/cookies`, enlaces en el footer y primera capa RGPD bajo el formulario). Titular (Miguel Reverte Peñalver, autónomo), NIF y teléfono puestos el 06-10-2026; **faltan domicilio fiscal, email (será `info@gpselect.com`) y plazo de conservación (propuesto: 12 meses)** en `frontend/src/config/legal.ts`. Hasta entonces se ven como «Pendiente» y el build avisa. Textos pendientes de revisión por un profesional legal.
- **EMAIL PROVIDER:** sin adaptador de `IEnquiryNotifier`.
- **RECIPIENT MAILBOX:** `Enquiries__NotificationEmail` sin definir.
- **DOMAIN / DEPLOY:** infraestructura lista y probada en local (INFRA-1, `deploy/`). Falta contratar el servidor y el dominio y elegir el almacenamiento de fotos: SeaweedFS propio o un S3 externo como R2 o B2.
- **SEO:** SEO-1, GEO-1 y SEO-2 PASS. Pendiente: GEO-2 (FAQ, espera datos del usuario), Google Business Profile (fuera del código) y dominio para activar `VITE_SITE_URL` y `Seo__SiteUrl`.
- **FINAL USER PHOTOGRAPHY / ASSETS:** fotos reales del usuario para sustituir los slots provisionales.

### SEO-1 · base técnica = PASS (04-10-2026, tag `seo-1-pass`)

- Metadatos ES compartidos por React/build, JSON-LD público, robots e iconos; dominio mediante `VITE_SITE_URL` (origen http(s), sin subruta). Sin dominio se omiten canonical, `og:url` y sitemap. SEO-2 (fichas en servidor y sitemap dinámico) sigue pendiente.
- Salida/rewrite agnóstico: servir primero archivos y `/<ruta>/index.html`; `/admin/*` → `/admin/index.html`, `/vehiculos/:slug` → `/spa.html` (sin canonical ni `noindex` inicial), desconocidas → `/404.html` con HTTP 404; conservar `/api` para el backend y redirigir `/servicios` → `/importacion`. No usar la home como fallback universal.
- Ubicación confirmada: Murcia, sin dirección pública ni horario. Desde el 06-10-2026: mercado principal España y también clientes del resto de Europa (copy ES/EN, metas, `areaServed` con `Continent` Europa, `VehicleSeo.cs` y `og-default.jpg` dicen «Clientes en España y Europa»). Dominio previsto: `gpselect.com` principal, `gpselect.es` redirigido. Footer ES/EN; iconos y OG en `frontend/public/assets/seo/`, con el logo real desde el 05-10-2026 (ver bloque UI).
- QA: typecheck, lint y build OK con/sin `VITE_SITE_URL=https://example.com`; 8 HTML por build inspeccionados y URLs limpias sin JS. Preview 1440/390, ES/EN, navegación/head y footer calibrado al mockup `15_42_09`: OK. Sin excepciones JS ni assets fallidos; API local ausente (500 del proxy, 9 por viewport), detalle real pendiente; estados/precio/schema comprobados con fixtures aislados. Aviso de bundle >500 kB ya conocido.
- Gate de Opus: la ficha con error de red ya no se marca `noindex` (solo un vehículo inexistente confirmado). Detalle comprobado con API simulada en el navegador: `Car` + `Offer` (sin `offers` si está vendido), `<` escapado en el JSON-LD, 404 → `noindex`, navegación y vuelta atrás restauran el head, ruta desconocida → HTTP 404.
- **Siguiente propuesto: GEO-1** (contenido legible sin JS en las páginas estáticas, bots de IA en robots, `llms.txt`). GEO-2 (FAQ) espera datos del usuario. SEO-2 espera hosting (recomendado: un servidor con Caddy para web + API).

### UI: CTA, idioma y marca (04-10-2026, pedido por el usuario, pendiente de su visto bueno)

- `CatalogueCta`: el glass se adapta al lenguaje de la web: esquinas `--radius-small`, filete de 1 px, sin brillos ni sombra pesada, flecha en su propia celda tras un filete (hover: celda rellena). Mantiene tono claro/oscuro, magnetismo y reflejo.
- Cambio de idioma: fundido de 260 ms con View Transitions (`LanguageSwitcher.tsx`, `global.css`); sin soporte o con reduced-motion, cambio directo.
- «GP SELECT» (header y footer) en la Home: `lib/scrollToTop.ts`, scroll nativo con GSAP (power3.inOut, 0,45–0,95 s), interrumpible con rueda, touch o tecla; reduced-motion = salto. Desde otra ruta navega a la Home como antes.
- Menú móvil (<1200 px, pedido por el usuario): telón de papel a pantalla completa con `clip-path` (cae 640 ms, sube 420 ms), enlaces grandes que suben por máscara con stagger de 60 ms, filetes que se dibujan, flecha SVG (gira en la página actual) y ubicación abajo. Icono de dos líneas que pasa a X en dos tiempos. Abierto: scroll bloqueado (`html.menu-open`), `inert` detrás y CTA oculto. Reduced-motion: sin transiciones ni retardos. Escritorio intacto. QA 320/390/768, Escape, navegación desde el menú.
- Fix (reportado por el usuario, reproducido por Gemini en 9/11 casos): al volver arriba deprisa (logo o salto instantáneo) el velo `.hero-handoff` se quedaba en opacidad 0,88 y el hero en negro. Lo animaban dos timelines (uno con scrub 0,7). Ahora un único timeline sin lag, de todo el pin, lleva 0 → 0,88 (hasta 1,45 vh) → 1. Verificado 11/11 a 1440/390 y la curva de bajada es la misma.
- Preloader con el logo real (`GP Select_v4_8.png` en la raíz, sin versionar): fondo `--color-white`, monograma GP negro y SELECT champán (`--color-gold: #d5be97`, nuevo token). Piezas con alfa en `public/assets/brand/logo-gp.webp` y `logo-select.webp`, con preload en `index.html`. GP entra por la izquierda y SELECT por la derecha (600 ms, `--ease-out`, desenfoque de 10 px a 0) y se juntan en el logo. Duración la de siempre por petición del usuario: 0,7–1,2 s en pantalla y 0,75 s de salida (~1,5 s medido); una recarga en la misma pestaña, ~0,7 s.
- Logo SEO (05-10-2026): logo real vectorizado con potrace (`seo/logo.svg`, GP negro + SELECT champán). `favicon.svg` es el monograma GP sobre un cuadro `#fffcf7`, más grande y con el trazo engrosado para leerse a 16–32 px; `favicon-32.png` sale de él. `apple-touch-icon.png` (180) lleva el grosor original. `logo.png` (1344×337 sobre blanco) es el logo del JSON-LD (Google prefiere raster). `og-default.jpg` (1200×630): logo y «Murcia · Clientes en toda España» sobre papel, con el coche del hero a la derecha.
- QA 1440/390 con API real (pruebasGP): tonos del CTA en todas las escenas, rewind de 10 628 px en ~0,85 s, interrupción, ES↔EN a mitad de pin, reduced-motion. Ojo en QA automatizada: con la pestaña en segundo plano rAF y las view transitions se congelan (falsos positivos).

### GEO-1 · contenido legible sin JS = PASS (04-10-2026, tag `geo-1-pass`)

- `frontend/build/readableContent.ts`: el build mete en `#root` de las 5 rutas estáticas y de `404.html` un HTML semántico (h1/h2/h3, listas, enlaces internos y footer) generado desde los mismos diccionarios ES que la SPA. Sin SSR del árbol React. Un script inline pone `html.js` y oculta ese bloque; `createRoot` lo sustituye antes de `DOMContentLoaded`, así que con JS nunca se ve.
- `robots.txt` con un único grupo `*` (un grupo por bot anularía los `Disallow`). `/llms.txt` con resumen, ubicación, ledes de Nosotros e Importación y enlaces. JSON-LD de la home en `@graph`: `AutoDealer` (con `description` y `sameAs` desde `contactConfig.sameAs`, vacío hasta tener perfiles verificados) + `WebSite`.
- QA: typecheck, lint y build OK con y sin `VITE_SITE_URL`; sin JS a 1440/390, cada ruta legible y sin desborde; h1/h2 estáticos = SPA; red lenta con JS sin destello; sin excepciones JS. Astra hizo la implementación y su QA; Opus cerró la verificación (se le acabó el saldo a Astra) y añadió los ledes a `llms.txt`.
- **Siguiente:** GEO-2 (FAQ con `FAQPage` en Importación) espera datos del usuario; SEO-2 espera hosting; rellenar `sameAs` al crear perfiles.

### Legal y privacidad (05-10-2026, rama `feat/legal-pages`, pendiente de los datos del titular)

- Contenido como datos en `src/i18n/legalCopy.ts` (español, versión vinculante; en EN una nota lo indica), renderizado por `pages/Legal.tsx` y por el build (HTML propio con contenido legible y `noindex,follow`, fuera del sitemap). Datos del titular en `src/config/legal.ts`: nunca inventarlos; si faltan, se marcan «Pendiente» y `seoPlugin` avisa en el build.
- Reflejan lo que hace el código: formulario (nombre y email obligatorios; teléfono, vehículo y mensaje), IP en los registros del servidor, base jurídica art. 6.1.b (consulta) y 6.1.f (seguridad), solo almacenamiento técnico (`gp-select.locale.v1`, `gp-select.preloader.seen`, cookie de sesión del Admin) y, por tanto, sin banner de cookies (art. 22.2 LSSI). **Si se añade analítica, email o algún proveedor, actualizar los textos.**
- Formulario: primera capa RGPD bajo el botón (responsable = titular o, si falta, la marca). El envío en producción sigue desactivado hasta tener los datos legales, el proveedor de email y el buzón.

### PERF-1 · rendimiento = PASS (05-10-2026, rama `feat/perf-1`, tag `perf-1-pass`)

- **Home:** el build precarga `hero-sky` y `hero-car` (solo en `index.html`, tomadas de `sceneAssets`) y `AssetSlot` acepta `priority`: `high` en el hero, `low` en las 4 imágenes de `CarHandoffScene`. Lighthouse móvil (mediana de 3, preview local): LCP 6,46 s → 4,44 s, puntuación 70 → 78; FCP, TBT y CLS sin cambios. Escritorio ya estaba en 95.
- **JS:** `manualChunks` separa `react` (69 kB gzip), `gsap` (45), `router` (32) y la web (37): las librerías quedan en caché entre despliegues y desaparece el aviso de >500 kB. El total no baja.
- **Ficha:** `VehiclePublicDto` añade `cardImages` (versión de 800 px, mismo orden que `images`; aditivo). Miniaturas con la card, foto principal con `srcset` card/detail y `sizes`. Las diapositivas ocultas están apiladas en pantalla y el `lazy` nativo las cargaba todas a 2400 px: ahora solo se carga la visible y sus vecinas, y cada una se queda cargada. Con 8 fotos en escritorio: 3 detail + 8 card en vez de 8 detail; en móvil (DPR 2), 2 card (~100 kB) en vez de ~760 kB.
- Verificación: 105/105 unitarios, 70/70 de integración, typecheck, lint y build; pruebasGP a 1440/390 (galería con 8 fotos simuladas, navegación y swipe, Home completa con scroll y vuelta arriba, ficha servida por la API con los nuevos chunks), sin errores JS.
- ~~TBT y CLS del motion de la Home~~: ver PERF-2. ~~Un objeto que falta en el almacenamiento sigue dando 500~~: resuelto en STORAGE-404.

### INFRA-1 · despliegue en producción = PASS (05-10-2026, rama `feat/infra-1`, tag `infra-1-pass`)

- `deploy/`: `docker-compose.yml` con estos servicios:
  - Caddy: HTTPS automático, la web compilada, el proxy a la API y las cabeceras de seguridad. Los ficheros con hash llevan caché `immutable`; el resto de assets, 7 días; las páginas, `no-cache`.
  - API en Production, con IP fija del proxy para `Security__TrustedProxies` y 1 GB de memoria.
  - PostgreSQL 16.
  - Copia diaria con `pg_dump`, que conserva 14 días.
  - Almacenamiento S3 propio opcional: SeaweedFS 4.08, perfil `self-hosted-storage`, con bucket privado y una clave limitada a él.
  - Guía en `deploy/README.md`.
- Las reglas de Caddy son las del preview y nginx:
  - Ficheros y después `/<ruta>/index.html`.
  - `/admin/*` sirve el HTML del admin.
  - `/vehiculos/<slug>` va a la API, con fallback a `spa.html` si la API falla o está caída.
  - `/sitemap.xml` en vivo, con el estático como fallback.
  - `/servicios` redirige con 308 a `/importacion`, conservando la query.
  - El resto responde con un 404 real.
- **MinIO ya no publica imágenes de Docker:** por eso el almacenamiento propio es SeaweedFS. También vale cualquier S3 externo configurado solo desde `.env`.
- **Código:**
  - `DataProtection__KeysPath` (obligatoria en Production) guarda en un volumen las claves de la cookie de sesión.
  - `Storage__PublicEndpoint` hace que las URLs de subida se firmen para la dirección pública del almacenamiento, mientras la API lo usa por la red interna.
  - 2 tests nuevos.
- **Verificación local en modo producción** (`gpselect.127.0.0.1.nip.io`, certificados locales de Caddy):
  - Login del admin, creación del vehículo y subida de la foto con URL firmada a SeaweedFS a través de Caddy, con CORS real desde el navegador. El worker la procesa hasta `Ready`. Es **la primera vez que se prueba el camino S3 de punta a punta**.
  - Publicación; imágenes card y detail servidas; la ficha generada por el servidor sale con título, OG y `Car` + `Offer`; el sitemap incluye el vehículo; la consulta responde 202.
  - Sesión válida tras reiniciar la API.
  - Con la API caída, la ficha se sirve como SPA y el sitemap estático responde 200.
  - Volcado y restauración en una base nueva.
  - Cabeceras y cachés comprobadas.
  - Build 0 avisos, 105/105 unitarios y 75/75 de integración.

### PERF-2 · CLS del scroll de la Home = PASS (05-10-2026, rama `feat/perf-2-motion`, tag `perf-2-pass`)

- **Causa:** `overflow: hidden` en los elementos que fija ScrollTrigger (`.scroll-scene__pin`, `.car-handoff__pin`). Chrome contaba cada paso de `fixed` a su sitio en el pin-spacer como un layout shift de pantalla completa (rect previo vacío → pantalla entera): 3 entradas de ~1,0, CLS 2,93 (390) y 2,82 (1440). Con `overflow: clip` pasa igual; con `overflow: visible` desaparece, pero sale scroll horizontal (el coche del hero mide 146–291 % del ancho).
- **Cambio (solo CSS):** los pins recortan con `clip-path: inset(0)` (+ `display: flow-root`, que conserva el BFC) y la sección recorta solo el eje X con `overflow-x: clip` (el degradado `::before` del telón de Process sobresale por arriba y no se corta). **No volver a poner `overflow: hidden` en un pin.**
- **Resultado:** CLS 0 al bajar y al subir a 390 y 1440; 0 px de desborde horizontal con y sin reduced-motion; 93 capturas de la Home (390/1440) y 43 con reduced-motion idénticas píxel a píxel a las de antes; ES↔EN a mitad de pin, vuelta arriba con el logo (velo a 0), interrupción y menú móvil OK, sin errores. Lighthouse móvil (mediana de 3): 79, LCP 4,43 s, TBT 165 ms, CLS 0.
- **TBT (medido, sin cambio):** al cargar hay un único `ScrollTrigger.refresh()` (43–98 ms con CPU ×4). La tarea larga inicial (370–520 ms) es el primer layout de toda la Home (lo fuerza el `scrollTo` de `SiteLayout`, que se lleva la cuenta pero se haría igual en el primer frame), GSAP montando las escenas y el render de React. Sin ganancia segura sin cambiar cuándo se montan las escenas.
- Diagnóstico y QA de Opus (el sandbox de Astra no tiene navegador); Astra implementó el CSS.
- **HEADER-TONE (arreglado, 05-10-2026):** tras cualquier `ScrollTrigger.refresh()` con el Hero ya terminado (cambio de idioma, redimensionado, imagen o fuente tardía), el Hero calculaba su tono con los pins revertidos y se quedaba en `light`: header negro sobre Process y bloqueado el resto de la página. Era previo a PERF-2. Ahora el Hero recalcula el tono en cada evento `refresh` (`useGsapScene.ts`, implementado por Astra). QA de Opus: ES↔EN y redimensionado con Process, el bloque del coche y Servicios en pantalla a 390/1440, tono correcto; Home sin cambios visuales (solo ruido de antialiasing en el CTA) y CLS 0.

### STORAGE-404 = PASS (05-10-2026, rama `fix/storage-404`, tag `storage-404-pass`)

- `IObjectStorage.OpenReadAsync` devuelve `Stream?`: `null` si el objeto no existe (File: fichero o carpeta; S3: 404/`NoSuchKey`), como `HeadAsync`. Cualquier otro error sigue lanzando.
- `StoredImages.Serve` (API) sirve las imágenes de los 4 endpoints (card/detail públicos, card/detail del admin y la vista previa): si falta el objeto, 404 con ProblemDetails, un warning con la clave y sin `Cache-Control`. El caché de un día solo se pone en las respuestas correctas. El worker trata un original que falta como cualquier fallo de procesado (sin cambios).
- Implementación de Astra (worktree sobre una base antigua; Opus lo portó a `feat/perf-1`). Verificación: build 0 avisos, 105/105 unitarios, 73/73 de integración (3 nuevos).

### .NET 10 = PASS (06-10-2026, rama `chore/dotnet-10`, tag `dotnet-10-pass`)

- .NET 8 pierde soporte el 10-11-2026. `net10.0` centralizado en `Directory.Build.props`; EF Core 10.0.12, Npgsql 10.0.3, `Mvc.Testing`/`Hosting.Abstractions` 10.0.12, herramientas de test al día, `dotnet-ef` 10.0.12 como herramienta local (`dotnet-tools.json`). Swashbuckle eliminado (sin uso). ImageSharp y AWSSDK.S3 sin cambios.
- Código: `KnownNetworks` → `KnownIPNetworks` (obsoleto en ASP.NET Core 10) y el constructor de `PostgreSqlBuilder` con imagen (Testcontainers 4.15). Imágenes Docker `sdk`/`aspnet` 10.0.
- Npgsql 9+ negocia cifrado GSS por defecto y la imagen de .NET 10 no trae `libgssapi_krb5`: `GSS Encryption Mode=Disable` en la cadena de conexión de `docker-compose.yml` (sin Kerberos).
- Astra implementó (su sandbox no tenía NuGet ni Docker); Opus verificó: build 0 warnings, 105/105 unitarios, 75/75 integración, sin cambios pendientes de modelo, snippet del hash OK. Stack de producción local (Caddy + API + Postgres + SeaweedFS): migraciones desde cero, claves como usuario `app`, login, alta, subida S3, procesado, publicación, ficha del servidor, sitemap, 404 y sesión tras reiniciar; 0 errores en logs. Gemini (READ-ONLY): 20/20 checks de navegador a 1440/390.

### SEO-2 · fichas y sitemap desde el servidor = PASS (05-10-2026, tag `seo-2-pass`)

- `SeoController` (API): `GET /seo/vehiculos/{slug}` devuelve el `spa.html` del frontend con el head del vehículo (title, description, canonical, OG con su foto, JSON-LD `Car` + `Offer` si no está vendido y tiene precio) y su contenido legible en `#root` (GEO), con `max-age=60`. Inexistente o no público → 404 + `noindex`. Sin plantilla o sin marcadores → 503. `GET /seo/sitemap.xml`: rutas estáticas + vehículos listados con `lastmod`.
- Plantilla: `HttpSpaTemplate` la descarga de `Seo:TemplateUrl` (caché de 1 min; sirve la última buena si falla). El build marca el bloque con `<!--page-meta-->…<!--/page-meta-->`, y `spa.html` lleva los estilos del contenido legible. `VehicleSeo.cs` replica `getVehiclePageMeta`/`renderPageHead` de `pageMeta.ts`: cambiar ambos a la vez.
- **Despliegue (cualquier proxy):** `/vehiculos/<slug>` → API `/seo/vehiculos/<slug>` con fallback a `/spa.html` si la API responde 5xx; `/sitemap.xml` → API `/seo/sitemap.xml` con fallback al estático. Variables `Seo__TemplateUrl` y `Seo__SiteUrl` (README). Ejemplo funcionando: `Desktop/pruebasGP/nginx.conf`.
- Verificación: build 0 warnings; 105/105 unitarios; 70/70 de integración (5 nuevos en `SeoTests`); typecheck, lint y build del frontend. E2E en pruebasGP: ficha como crawler (sin JS), 404 `noindex`, sitemap, API parada → SPA y sitemap estático; con JS sin metadatos duplicados ni errores.

### Unidades 3C.1–3C.5

- **3C.1 · Assets HOME y escena del coche** (`0e2bec5`):
  - Assets generados por Astra y normalizados (WebP, `temporary: false`, en `public/assets/home/`):
    - hero: cielo y coupé;
    - BMW cenital (`car-a.webp`) y su **corte mecánico** (`car-cutaway.webp`: grafito y acero, misma silueta exacta que la foto);
    - cielo claro y cielo nublado alineados.
  - **CarHandoff reconstruido sobre la mecánica del jet de Jesko Jets**, medida en directo:
    - la página queda quieta y solo se mueve el coche: sube al ritmo del scroll y se encoge (power3.in) hasta su caja;
    - nunca es más ancho que el hueco entre «Ingeniería» y «Alemana»: no tapa las letras;
    - el titular cae por detrás del coche (en móvil sale por arriba con fundido);
    - «Potencia / Control» a la izquierda, después «Ingeniería, por dentro y por fuera.» y «Visión / Global» a la derecha;
    - una cortinilla de máscara degradada pasa de la foto al corte mecánico, de la cola al morro;
    - el cielo se nubla de forma progresiva (nunca de noche), con una luz multiply común a mundo y coche;
    - al final el pin se suelta y la escena se va con la página; **Services ya no es telón**.
  - Pin de 4,9 vh. El header sigue `data-header-tone`, incluido el tramo en que la escena se va.
  - Reduced-motion: dos frames (foto clara, corte nublado), con el tono del header por panel.
  - Copy nuevo ES/EN (`carHandoff.carCutaway`, `interlude`, `captions`), sin claims nuevos.
  - Eliminados: el mapa, el Audi y los SVG/PNG provisionales del coche (`temp/car-a|car-b|europe-map|hero-sky.svg`, `vehicles/bmw-m4-off|on.png`).
  - QA:
    - Opus a 1920/1440/390, ES/EN y reduced-motion: ningún solape coche–texto, coche siempre visible, nunca dos titulares legibles a la vez, consola limpia;
    - Gemini READ-ONLY sobre los fotogramas: lo que confirmó (header en reduced-motion, solape en el interludio, salida en móvil) está corregido y lo demás se descartó.
- **3C.2 · Interiores** (`9f2701f`): cabecera compacta también en `/vehiculos` (289 px a 1440); página activa marcada en la navegación; el error del detalle es ya su H1; título de WhatsApp más pequeño.
- **3C.3 · HOME** (`3d8d6f3`): eliminada la banda gris Inventory → CTA (borde limpio). Footer calibrado al mockup `15_42_09`: marca espaciada con filete, enlaces en dos columnas, © y ES/EN abajo. Sin ubicación, legales ni redes hasta que estén confirmados.
- **3C.4 · Limpieza** (`a6ba78d`):
  - desinstaladas `@fontsource-variable/inter` e `inter-tight`;
  - objetivos táctiles de al menos 24 px (marca, ES/EN, enlaces del footer, enlaces editoriales), sin mover la tipografía;
  - `--configLoader runner` se mantiene mientras se use Codex.
- **3C.5 · Calibración:**
  - el hero coincide con el mockup (titular a ~40 % de la altura, encuadre del coche);
  - Servicios e Importación difieren del mockup por decisiones ya aprobadas (migración tipográfica de la HOME, página de Importación de 2G);
  - catálogo y detalle no se pudieron calibrar sin backend.
- **Pendiente (no bloquea 3C):**
  - las fotos reales que enviará el usuario (Services, Inventory, CTA, Nosotros, Importación) sustituyen sus slots en `sceneAssets.ts` y en las páginas, un commit por lote;

**3B COPY TRUTH = PASS (01-10-2026).** Auditoría del texto público (HOME, Nosotros, Importación, Contacto, catálogo/detalle, footer) contra lo confirmado. Solo se cambió lo UNSUPPORTED, siempre en ES y EN con la misma promesa. Sin cambios de layout, CSS, motion, assets, backend ni Admin.

- **Cambiado (UNSUPPORTED → prudente):**
  - Process: «Inspeccionamos / Inspect» → «Analizamos / Analyse» (no hay inspección física confirmada); «Entregamos / Deliver» → «Acompañamos / Guide» (entrega y transporte sin confirmar). Mismas 4 etapas; «Seleccionamos» sigue siendo la palabra más ancha.
  - Services intro: «Nos ocupamos de todo, desde la búsqueda hasta la entrega» / «We handle the entire process…» → «Te acompañamos desde la búsqueda hasta la compra…» / «We guide you from the search to the purchase…».
  - Services: «Inspección del vehículo / Full inspection» → «Análisis de cada opción / Every option analysed», sin «estado del vehículo»; «Importación y matriculación / Import & registration» (transporte y matriculación) → «Compra e importación / Purchase & import», con la coordinación de pasos de Importación; «Un proceso transparente»: fuera «costes previstos» y «estado de cada gestión», ahora qué se sabe, qué falta y qué queda por confirmar. Etiquetas de foto provisional de «inspección» → «análisis».
  - CTA final: «Nosotros nos encargamos del resto / We'll take care of the rest» → «Te ayudamos a encontrarlo / We'll help you find it».
  - Banda de importación del detalle: «Localizamos… verificación, trámites y entrega» → búsqueda en el mercado europeo y acompañamiento en la compra y la importación.
  - EN que prometía más que ES: «Not here? We will find it in Europe» → «We will look for it…»; «Let us find it for you» → «Let us look for it».
- **Catálogo:** el error de red del detalle decía «No hemos podido cargar los vehículos»; ahora «No hemos podido cargar este vehículo» (`detailError`). Sold («ya no está disponible»), 404 («no está en el catálogo») y error quedan distintos. Sin cambios de lógica.
- **Contacto (bug corregido):** el footer (`intent=information`) y el enlace del header (sin intent) caían en el camino «vehículo» con vehículo obligatorio. Ahora solo `intent=vehicle`, o un `vehiculo` sin intent, abre ese camino; el resto entra por el camino abierto (vehículo opcional). Sold sigue en `intent=search`.
- **Conservado (SAFE/CONFIRMED):** Nosotros e Importación de 2G (sin tocar); «Búsqueda en toda Europa» y «seleccionados en toda Europa» (ámbito de búsqueda, no red propia); «Seleccionamos / Sólo lo que cumple nuestras expectativas» (criterio, no certificación); hero y titulares del handoff (carácter de los coches); «Vehículos excepcionales. Una perspectiva europea.» (footer); 404 aprobado; formulario desactivado honesto («Consulta preparada… GP SELECT no la ha recibido»).
- **QA:** typecheck, lint y build OK. Opus: palabras de Process a 390 (máx. 255/328 px) y Services EN a 1440 (títulos en una línea). Gemini (build de producción): textos a 1920/1440/390 ES/EN, 0 términos residuales en 7 rutas × 2 idiomas, sin overflow, regresión de motion de la HOME lenta y rápida en ambos sentidos a 1440 y 390, 7 casos de intent de Contacto, envío desactivado sin petición, 404 y consola: 7/7 PASS. Dejó una captura en la raíz del repo, borrada.
- **Deuda que sigue:** el estado de error del detalle no tiene H1 (hacerlo H1 cambiaría la tipografía de `.vehicle-state`); el resto de deudas P2 del QA técnico, intactas.

**FINAL TECHNICAL / UX QA — TECHNICALLY READY (01-10-2026).** Auditoría técnica, funcional, responsive, accesible y de release sobre `main` con 3A. Sin SEO, dominio, deploy ni analytics. No significa PUBLIC RELEASE READY (ver RELEASE BLOCKERS de 3A).

- **Cobertura:** Gemini (G1): 16 rutas públicas × 1920/1440/390 × ES/EN (96 cargas: H1, headings, overflow, imágenes y alt, consola, red, textos rotos, recorrido completo de la HOME en ambos sentidos) y los 28 enlaces internos: PASS. Opus (G3/G4, porque Gemini agotó su cuota): teclado y foco, móvil, reduced-motion, contraste, validación y estados de error del formulario y de la API, y el Admin completo en el navegador (login, sesión, logout, crear, editar/PATCH, equipamiento, especificaciones, estados, fotos, portada, orden, quitar, última foto, vista previa, cambios sin guardar, archivar, 390). API a mano: cookie, CSRF, 401/403/404/413/415/429, límites y persistencia.
- **P1 corregido:** el 404 global mostraba copy de desarrollo («GP SELECT · FASE 3», «Esta página llegará en una próxima fase»). Ahora `NotFound.tsx`: «Error 404», «Página no encontrada», «Volver al inicio» y «Ver vehículos» (ES/EN). `PlannedPage` eliminado.
- **P2 corregidos:** la API ya no envía `Server: Kestrel` y añade `X-Content-Type-Options: nosniff` (test).
- **Sin P0 ni P1 abiertos.** Consola: 0 errores inesperados (los 401 de `/api/admin/auth/me` sin sesión y los 404 de vehículos no públicos son esperados).
- **Cookies:** solo `.AspNetCore.Cookies` del Admin (first-party, `HttpOnly`, `SameSite=Strict`, `Secure` fuera de Development, cookie de sesión del navegador con ticket deslizante de 14 días): estrictamente necesaria. La web pública no crea cookies ni hace peticiones a terceros (fuentes locales). `localStorage` guarda solo el idioma elegido (`gp-select.locale.v1`). No hace falta banner por la funcionalidad actual; confirmarlo forma parte de la decisión legal.
- **Secretos:** ninguno en código, `.env*` (no hay ninguno trackeado), bundle, docs ni historial git. Las credenciales de docs son las de Postgres local de Docker.
- **Abuso:** login 5/min y consultas 5/10 min por IP, con 429 y `Retry-After`; los rechazados no se guardan y los aceptados sí; los inválidos también consumen cupo. Suficiente para la release inicial; sin CAPTCHA.
- **Deuda no bloqueante (P2):** (1) las miniaturas de la galería cargan la imagen de detalle (2400×1800): con fotos reales y muchas fotos, varios MB al abrir la ficha; exponer la URL `card` por imagen en el detalle (cambio de contrato, pendiente de decidir). (2) Un objeto que falta en el almacenamiento devuelve 500 en vez de 404 (la web muestra «sin imagen»). (3) Chunk principal 521 kB (174 kB gzip), dominado por react-dom, react-router y GSAP; el Admin ya va aparte; no hay ganancia trivial. (4) Objetivos táctiles de 18–23 px de alto (ES/EN, marca, enlaces del footer, «Ampliar», radios con label). (5) `public/assets/vehicles/bmw-m4-*.png` (1,4 MB) sin uso y dependencias `@fontsource-variable/inter` e `inter-tight` sin importar. (6) ~~El error del detalle dice «vehículos»; el footer «Contacto» abre la ruta con vehículo obligatorio; «Nos ocupamos de todo…»~~: resuelto en 3B; el error del detalle sigue sin H1.
- **ASSET NEED (deliberado, no blocker):** «Recurso provisional» en Nosotros/Importación/HOME y «Modelos de ejemplo» en la HOME, todos etiquetados.
- **Build y tests:** typecheck, lint y build OK; backend 0 warnings, 78 unitarios y 52 de integración (migraciones sobre Postgres limpio).

**3A — PASS técnico (30-09-2026), aceptado por el usuario.** Dos partes, ambas PASS: hardening de seguridad y consultas reales del formulario de Contacto, guardadas en PostgreSQL. El formulario queda desactivado en producción hasta resolver legal, email y dominio: son RELEASE BLOCKERS externos (ver abajo), no defectos técnicos de 3A. Detalle operativo en `docs/BACKEND-SETUP.md`. Cookie auth, CSRF, rol y modelo de un solo administrador sin cambios.

**3A.1 — Security hardening (PASS, aprobado por el usuario).**

- **Login (bug corregido):** el limitador agrupaba por IP más la cabecera `X-Login-Email`, que el cliente nunca enviaba y cualquiera podía variar para estrenar cupo. Reproducido antes de corregir: el sexto intento con la contraseña buena y una cabecera nueva devolvía 200. Ahora el cupo es por IP (en IPv6, el /64), 5 por minuto, y el rechazo es **429** `rate_limited` con `Retry-After`, sin cookie (antes, 503 sin cuerpo). El Admin muestra «Demasiados intentos» solo con 429.
- **Proxy inverso:** `Security__TrustedProxies` opcional (`ForwardedHeaders` nativo); `X-Forwarded-For` solo se acepta si llega de esas IP. Sin ella, detrás de un proxy todos compartirían cupo.
- **Production no arranca** sin `Security__AllowedOrigin`, con un origen que no sea `https`, que sea `localhost` o loopback, o con ruta, barra final o comodín, ni sin `Admin__Email` / `Admin__PasswordHash`. Development sin cambios.
- **`X-Correlation-ID`** del cliente solo se reutiliza si tiene como máximo 64 caracteres `[A-Za-z0-9._-]`.
- **Auditado sin cambios:** todas las rutas del Admin con `Authorize(Roles="Admin")`; errores sin traza fuera de Development; sin Swagger expuesto; sin credenciales sembradas; logs sin datos personales; frontend con `/api` relativo (mismo origen en producción).
- **Tests:** 54 unitarios y 37 de integración (6 anteriores + 31 nuevos: 429 y bypass por cabecera, IPv6 /64, proxy de confianza, CSRF por Referer, logout, correlation id, reglas de origen y arranque en Production). Build y lint del frontend OK.
- **QA:** Opus contra la API real con Postgres (login, `/me`, logout, CSRF con Origin correcto, ajeno, `localhost` y ausente, Referer, 429, bypass, `X-Forwarded-For` falso) y arranque real en Production con 6 configuraciones. Gemini (UI del Admin: login, error, sesión HttpOnly, logout, 429 con mensaje; Contacto a 1440 y 390, ES y EN: 0 peticiones, estado honesto, validación): los 10 checks PASS. Su FAIL se debió solo a un cambio de docs de Opus durante la ejecución.

**3A.2 — Consultas / leads (PASS técnico, aceptado por el usuario).** Decisión del usuario: PostgreSQL + aviso por email. Flujo: formulario → `POST /api/public/enquiries` → la consulta se guarda (fuente de verdad) → 202 → un worker intenta el email después.

- **Modelo `Enquiry`:** solo los campos del formulario (intent, nombre, email, teléfono opcional, vehículo, mensaje) más `CreatedAt` (indexado, para una retención futura) y el estado técnico del aviso (`Pending`/`Sent`/`Failed`, intentos, próximo intento y `NotifiedAt`). Sin IP, sin estado comercial y sin CRM. Migración `AddEnquiries` (solo crea la tabla).
- **Validación en Domain** (mismas reglas que el formulario, límites de longitud, sin caracteres de control); 400 con `code` y `field`, 413 con más de 32 KB, 415 sin JSON, 429 al pasar de 5 envíos por 10 minutos por cliente, 503 `enquiries_unavailable` si `Enquiries__Enabled` no es `true`.
- **Email desacoplado:** puerto `IEnquiryNotifier` y outbox con reintentos (1 min, 5 min, 30 min, 2 h, 12 h; `Failed` al sexto intento, sin perder la consulta). **Sin adaptador:** proveedor sin decidir. Hasta entonces, las consultas quedan `Pending` y se leen por SQL; el worker enviará las pendientes cuando haya adaptador. Destinatario: `Enquiries__NotificationEmail`, sin valor en el código.
- **Frontend:** `submitLead` llama a la API solo con `enquiriesEnabled`: siempre en desarrollo, y en producción solo si se compila con `VITE_ENQUIRIES_ENABLED=true`. Por defecto el build de producción no incluye la llamada y el formulario avisa de que la consulta no se envía (el aviso de vista previa sale antes de rellenar). Copy nuevo ES/EN: «Consulta enviada.», «Enviar otra consulta» (el formulario se vacía), 429 («Has enviado varias consultas seguidas…») y fallo de envío. Errores 400 del servidor se muestran en su campo.
- **Admin:** sin pantalla de consultas; no hace falta mientras exista el aviso por email. Scope mínimo propuesto si se quiere operar sin email: `GET /api/admin/enquiries` de solo lectura (últimas 100) y una lista en el Admin, sin edición.
- **Bugs encontrados y corregidos durante la QA:** (1) Development valida el contenedor de dependencias al arrancar y la API no arrancaba (el outbox dependía de un notificador inexistente); lo cubre un test nuevo, rojo con el error y verde con el arreglo. (2) Un cuerpo por encima de `RequestSizeLimit` devolvía 500 en vez de 413 (defecto previo, también en la subida de imágenes del Admin): nuevo `BadRequestExceptionHandler`.
- **Tests:** 78 unitarios (54 + 24 de `Enquiry`) y 52 de integración (37 + 15: 202 y persistencia, 400 por campo, intent desconocido o numérico, 503, 429, CORS de otro origen, reintentos del aviso con un notificador falso, 413, host de Development). Build y lint del frontend OK.
- **QA:** Opus contra la API real con Postgres (202 y fila guardada `Pending`, 400, cuerpo no JSON, `text/plain` → 415, 40 KB → 413, 503 en una instancia desactivada, 429 con `Retry-After`, logs sin datos personales) y comprobación del bundle (con el flag desactivado no incluye el endpoint; con `VITE_ENQUIRIES_ENABLED=true` sí). Gemini en el navegador (dev y build de producción, 1440 y 390, ES y EN): envío real 202, «Enviar otra consulta», vehículo precargado, validación vacía, 429 con los datos conservados, producción sin peticiones y con aviso; 9/9 PASS, sin archivos modificados. Las 5 consultas de Gemini quedaron en PostgreSQL; la sexta (429) no. Datos de QA borrados.

**RELEASE BLOCKERS de 3A (decisiones externas, no técnicas; bloquean la publicación, no el PASS técnico):**

- **LEGAL/PRIVACY DECISION REQUIRED BEFORE PUBLIC RELEASE:** responsable del tratamiento, base jurídica, texto informativo o de consentimiento en el formulario y plazo de conservación. No se ha inventado nada. Hasta entonces, `Enquiries__Enabled` y `VITE_ENQUIRIES_ENABLED` quedan desactivados en producción.
- **Proveedor de email** sin elegir, y por tanto sin adaptador de `IEnquiryNotifier`. Alternativas mínimas: SMTP genérico (sin paquete nuevo; vale cualquier buzón con envío SMTP autenticado) o un adaptador HTTP para un proveedor concreto.
- **Buzón destinatario** (`Enquiries__NotificationEmail`) sin definir.
- **Dominio final** sin definir (`Security__AllowedOrigin`).
- **Deuda 3A (no bloqueante):** los cupos de login y consultas están en memoria (por instancia; suficiente con una sola instancia), y lo mismo el worker de avisos; sin límite global entre IP (para no permitir bloquear el login del administrador); la sesión dura lo predeterminado de ASP.NET (14 días deslizantes); `Swashbuckle` referenciado sin usar; con un cuerpo demasiado grande, el framework registra el error antes de que el handler devuelva el 413 (el log no lleva datos personales).

**2G — PASS (30-09-2026).** Interiores: escala tipográfica y densidad editorial de `/nosotros`, `/importacion` y `/contacto`. HOME, catálogo, detalle, Admin y backend sin cambios.

- **Escala:** H1 interior 96 / 76 / 40 px (1920 / 1440 / 390), igual en las tres páginas y en ES/EN; antes 192 / 151 / 55, por encima del hero de la HOME (120 / 90 / 46). Titulares de sección ≤ 56 / 44 / 30 px, body 16–18 px. Todo scopeado a `:is(.about-page, .import-page, .contact-page)` en `interiors.css`; las reglas compartidas con catálogo, detalle y Admin no cambian. Eliminado el hack `.import-page:lang(es)`.
- **Importación:** capítulos editoriales (Primero, qué buscas · Buscar y descartar · Leer cada opción · Contigo hasta el cierre) con wording prudente: búsqueda, comparación, análisis de la información disponible y acompañamiento. Sin inspección propia, negociación, transporte, impuestos, tasas, matriculación, garantía, posventa ni «de principio a fin». `ProcessStep.tsx` eliminado.
- **Nosotros:** página «quiénes somos» sin repetir Importación: por qué GP SELECT, con quién trabajamos (dos caminos, como Contacto), cómo trabajamos (banda oscura, cuatro compromisos de trato) y cierre al cuestionario + enlace a Importación. ~3,2 viewports a 1440. Sin cifras, años, sede ni fundadores.
- **Contacto:** solo cabecera compacta; formulario intacto.
- **Ejecución:** Astra implementó; Opus revisó y rehízo Nosotros tras feedback; una pasada de Impeccable (critique 18/24; detector limpio salvo tracking y paleta de la marca, falsos positivos).
- **QA:** Gemini (18 combinaciones de las tres páginas + regresión HOME y `/vehiculos`; después 10 checks de `/nosotros` en 6 combinaciones), todo PASS. Reduced-motion verificado por Opus. Build y lint OK.
- **Deuda 2G (no resuelta):**
  - ASSET NEED: 5 fotografías reales (2 Nosotros, 3 Importación); hoy placeholders `about-*` / `import-*`;
  - ~~claims de la HOME sin confirmar~~: resuelto en 3B;
  - `/vehiculos` conserva el H1 antiguo (151 px a 1440), distinto del resto de interiores;
  - el menú no marca la página activa (Header es HOME);
  - panel WhatsApp de Contacto (solo en desarrollo): titular ~49 px y microtexto pequeño;
  - Nosotros sin datos reales de empresa (sede, quién está detrás, desde cuándo), pendientes de confirmar;
  - cabecera interior ~370–395 px a 1440, algo por encima del objetivo orientativo de ~300 px.

**2F-C.3 — PASS (30-09-2026).** Catálogo y detalle reales. Implementado por Opus; backend, HOME y Admin sin cambios (salvo `AdminPreview.toDetail`).

- **Datos:** `services/vehicles.ts` lee `/api/public/vehicles` (una sola petición) y `/{slug}`; 404 → estado editorial, otro fallo → error con reintento. `vehicles.mock.ts` y `vehicleAssets.ts` eliminados; sin fallback a datos ficticios. Precio nulo o ≤ 0 → «Precio bajo consulta».
- **Orden:** el API lista por `CreatedAt` ascendente; el cliente lo invierte («Últimas incorporaciones»).
- **Facetas** (`lib/vehicleFacets.ts`, todo en cliente): una selección por categoría, AND entre categorías. Cada faceta se recalcula con los demás filtros activos y oculta lo imposible; una faceta con menos de 2 opciones se oculta. Marca, carrocería y combustible agrupan variantes de escritura sin distinguir mayúsculas ni tildes. Precio y km usan bandas 1-2-2,5-5 sobre el mín–máx real del inventario; el año son los años presentes. Las selecciones inválidas (URL editada o combinación imposible) se eliminan con `replace`; el filtro que acaba de cambiar el usuario prevalece. Los vehículos sin precio o km quedan fuera de un filtro numérico activo.
- **Detalle:** historial solo si existe `history` (sin párrafo de verificación ni propietarios); equipamiento y especificaciones solo si hay datos. `Sold`: aviso «Este vehículo ya no está disponible», sin precio y CTA «Buscar una alternativa» (`/contacto?intent=search`). Draft, Archived y desconocido: «Este vehículo no está en el catálogo».
- **Imágenes:** la portada es la primera (contrato del API); un error de carga muestra el hueco «Fotografías pendientes» sin romper el layout.
- **QA:** Playwright contra la API real (Postgres + proxy de Vite, 10 vehículos sembrados en los seis estados) y QA de solo lectura de Gemini (17 comprobaciones: 1920, 1440 y 390, ES y EN, consola, red, teclado y overflow), todo en PASS. Regresión de HOME frente a `home-closed-pass`: estado computado de todos los elementos visibles en 18 posiciones de scroll a 1440 y 17 a 390; 390 idéntico y 1440 idéntico salvo 1 px de redondeo subpíxel en una posición. Build y lint OK. No hay tests de frontend.
- **Deuda:**
  - el API trunca a 100 vehículos sin paginar, y las facetas y los rangos se calculan solo sobre esos 100;
  - los valores libres (combustible, carrocería, color, procedencia…) sin entrada en `values` se muestran tal cual, sin traducir, en ambos idiomas;
  - un vehículo con precio o kilometraje nulo queda fuera de un filtro numérico activo (y no cuenta para sus bandas);
  - el bundle público supera los 500 kB (desde 2F-C.2);
  - en desarrollo, StrictMode duplica la petición de la lista (la primera se cancela); en producción es una sola.

**HOME HANDOFF FIX — PASS (30-09-2026).** Auditoría motion de la HOME (Opus + QA mecánica de Gemini) y corrección del principio de la página. Defectos presentes desde 1A, sin regresiones. Todo en `useGsapScene.ts` y `Header.tsx`.

- **Hero → Process:** Process sube como telón opaco sobre el hero oscurecido. Se elimina el fundido que se sumaba al deslizamiento y que, con scroll rápido, dejaba ver un panel gris.
- **Header:** sin banda crema. El hero publica `data-header-tone` según su estado visible (timeline con scrub, igual que `#coches`): difference sobre el cielo, tinta desde 0,45 y blanco desde 0,72. El header lo sigue con un `MutationObserver`. En el cruce el fondo es gris medio y ni tinta ni blanco llegan solos a AA (mínimo real 3,57:1), así que durante el hero la tinta pasa a negro puro y el blanco lleva un halo oscuro ajustado (`data-tone-scene="hero"`, CarHandoff no cambia). Contraste mínimo medido bajo el texto: **4,61:1** (1920), 4,75:1 (1440) y 4,84:1 (390). EN inactivo (opacidad 0,55, en todo el sitio) queda fuera de esta medición.
- **Porsche:** el recorrido a la izquierda se calcula en cada refresh (`heroCarTravel`) para que el borde difuminado del coche (88 % de su caja) nunca entre en pantalla. Se conservan la dirección, el zoom 1,65 `power1.in` y los tiempos. El recorrido baja de 949 a ~250 px a 1440; para recuperarlo harían falta un asset más ancho o más zoom.
- **Process → BMW:** las palabras salen (0,72–0,82) antes de que entre el frame del BMW (0,82–1). Este tramo va sin retraso (`scrub: true`), así que el BMW siempre es opaco cuando Process se suelta.
- **QA:** 1920, 1440 y 390; scroll lento, medio, rápido y hacia arriba, frame a frame, sin fallos; reversibilidad exacta; consola limpia; build y lint OK. Reduced-motion idéntico a HEAD. Desde CarHandoff (fuera del fundido de entrada) hasta el Footer, idéntico pixel a pixel a HEAD, salvo el antialiasing del texto del CTA de CarHandoff al 70 %, con el mismo estado computado.

**2F-C.2 — PASS (Admin frontend).** Implementado por Opus contra el contrato real de 2F-C.1; backend sin cambios.

- **Rutas** (chunk lazy `pages/admin/AdminApp.tsx`, fuera del `SiteLayout` público):
  - `/admin/login`;
  - `/admin` (listado);
  - `/admin/nuevo` (alta mínima: marca, modelo, año; mes y referencia opcionales; después abre la ficha);
  - `/admin/vehiculos/:id` (editor);
  - `/admin/vehiculos/:id/vista-previa`.
  - Cualquier otra ruta bajo `/admin` vuelve a `/admin`.
- **Router:** `main.tsx` usa `createBrowserRouter` + `RouterProvider` (data router) para poder usar `useBlocker`. `App.tsx` y las rutas públicas no cambian. Coste: +58 kB min / +19 kB gzip en el bundle público, que ahora supera el aviso de 500 kB de Vite.
- **Auth:**
  - `AdminAuthProvider` + `RequireAdmin` con `/me`, login y logout, todo con `credentials: 'include'`.
  - La sesión solo vive en la cookie; el cliente guarda en memoria lo que responde `/me`.
  - Cualquier 401 durante la sesión limpia el estado y lleva al login con «Tu sesión ha terminado». Tras entrar, vuelve a la ruta de origen.
  - «Cerrar sesión» navega por el router, así que una ficha con cambios pide confirmación antes de salir.
- **Cliente:**
  - `services/adminApi.ts`: `ApiError` tipado con `status`, `code`, `field`, `correlationId` y errores de binding, y un handler de 401.
  - La subida del archivo usa XHR para tener progreso. Una URL relativa (`File`) va con cookie; una presignada absoluta (S3) va sin ella.
  - Tipos en `types/admin.ts`. Mensajes humanos en `lib/adminErrors.ts`, sin códigos crudos.
- **Copy:** `i18n/adminCopy.ts`, solo en español.
- **Listado:**
  - filas operativas con miniatura, identidad, año, km, CV, precio, estado y acciones (editar, vista previa, archivar);
  - búsqueda local por marca, modelo o versión, sin tildes ni mayúsculas;
  - archivados ocultos, con casilla para mostrarlos;
  - estado vacío con «Añadir vehículo →».
- **Editor:**
  - secciones Vehículo, Apariencia y procedencia, Información, Equipamiento, Especificaciones adicionales y Fotografías, con el título a la izquierda (mismo ritmo que el detalle público);
  - PATCH solo con lo que cambia (`lib/vehicleForm.ts`: ausente conserva, vacío → `null`, marca, modelo y año obligatorios);
  - errores de campo junto al campo, usando el `field` del servidor, y foco al primer error;
  - barra de guardado sticky solo cuando hay cambios;
  - `useBlocker` + `beforeunload`, también mientras hay subidas en curso;
  - sugerencias (`datalist`) para combustible, cambio, carrocería y tracción, para que las futuras facetas reciban valores coherentes.
- **Estado:** estado actual en texto, con un cuadrado relleno si está en el catálogo o vacío si no, más su efecto público. «Cambiar estado» abre las demás opciones con su significado. No deja cambiar el estado con cambios sin guardar. Los 422 del servidor se muestran como mensajes humanos.
- **Archivar:** `<dialog>` nativo que explica que es una acción definitiva. Un vehículo archivado queda en solo lectura.
- **Fotografías:**
  - intent → PUT → complete → polling de la ficha hasta Ready o Failed;
  - arrastrar y soltar o selector, varios archivos, preview local, progreso y error por imagen, reintentar y descartar;
  - validación previa de tipo, 20 MB y hueco hasta 30, contador `n / 30`;
  - portada y quitar;
  - reordenar arrastrando o con botones ← → (el foco vuelve a la foto movida);
  - la protección de la última foto publicada viene del servidor (409 traducido).
- **Vista previa:** `VehicleDetailView` extraído de `pages/VehicleDetail.tsx` (el detalle público no cambia) y un adaptador mínimo del DTO de preview bajo una banda privada.
- **Componentes:** `AdminLayout`, `AdminAuthProvider`, `ConfirmDialog`, `ArchiveVehicleDialog`, `StatusMark`, `StatusControl`, `FormField`, `MonthSelect`, `ListEditor`, `KeyValueEditor` e `ImageUploader`. Estilos en `styles/admin.css` (escala fija en rem, filetes, sin cards).
- **QA:**
  - Playwright contra la API real (Postgres + proxy de Vite): login erróneo y correcto, refresco, logout, guard, 401 en plena sesión, 403 CSRF desde un origen no permitido;
  - crear; editar; limpiar un opcional (`{"exteriorColour":null}`); marca vacía bloqueada; persistencia tras recargar;
  - Draft → ComingSoon → Available → Reserved → Sold → Draft → Available, comprobando listado y detalle públicos;
  - 422 sin fotos y por precio 0;
  - JPEG, PNG y WebP; TXT y 21 MB rechazados sin red; imagen corrupta → Failed;
  - portada, orden (botones, arrastre y teclado), quitar y 409 de la última foto;
  - equipamiento (con duplicado) y especificaciones (fila incompleta);
  - vista previa; archivar cancelando y confirmando; cambios sin guardar (diálogo, Escape y aviso nativo);
  - 1920, 1440 y 390 sin desbordamiento horizontal;
  - regresión pública pixel a pixel frente a `2f-c1-pass` (HOME, catálogo, detalle, interiores, `/servicios`, 1440 y 390): idéntica;
  - detector de impeccable limpio; lint y build OK. El proyecto no tiene tests de frontend.
- **Deuda:**
  - el bundle público pasa el umbral de 500 kB (data router);
  - en consola solo aparecen los logs de red del navegador para respuestas esperadas (401 de `/me` sin sesión, 404, 409 y 422); no hay errores de JS;
  - al caducar la sesión se pierden los cambios no guardados;

**2F-C.1 — PASS (backend contract hardening).** Detalle y puesta en marcha en `docs/BACKEND-SETUP.md`.

- **Merge-patch en `PATCH /api/admin/vehicles/{id}`** (`Optional<T>`): ausente conserva, `null` o vacío borra, un valor se valida. Marca, modelo y año no se pueden borrar.
- **Enums como texto** en todo el API; los números se rechazan.
- **`PowerHp` y `Drivetrain`** en dominio, DTOs y validación (migración `AddPowerHpAndDrivetrain`).
- **`POST …/status`:** Draft (retirar), ComingSoon, Available, Reserved y Sold; Archived sigue siendo terminal y solo se llega por `…/archive`.
- **Visibilidad pública:** el catálogo lista ComingSoon, Available y Reserved; el detalle sirve además los Sold que llegaron a publicarse.
- **DTOs públicos ampliados**, sin datos internos (lo protege un test).
- **Equipamiento y especificaciones** tipados y validados.
- **Portada = imagen principal:** va primero; la primera imagen Ready pasa a portada; al borrar la portada se promueve la siguiente; un vehículo listado no puede perder su última imagen Ready.
- **Listado del Admin** en 2 consultas, sin N+1.
- **`InternalReference`** se guarda al crear.
- **Límites de validación** aprobados; errores con `code` y `field`.
- **Verificación:**
  - 54 tests unitarios y 6 de integración (WebApplicationFactory + PostgreSQL con Testcontainers), todos en verde;
  - migraciones aplicadas sobre Postgres limpio;
  - prueba de humo completa con la API a través del proxy de Vite;
  - frontend intacto.

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
- **MEDIA PROVISIONAL:** `vehicle-silver`, `vehicle-stone`, `vehicle-slate`, `vehicle-detail` y `vehicle-interior` (SVG en `public/assets/temp/`). (El PNG `vehicles/bmw-m4-off.png` se eliminó en 3C.1; las fotos reales llegan por el Admin.)

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

- 1F · Car handoff: `.scene-cta` no se reutilizó (añade `min-width` al botón); z-index locales sin simplificar. ~~Assets provisionales~~: sustituidos en 3C.1 (contrato: WebP RGBA 1200×1800, coche en el 75 % central, sombra integrada).
- ~~P1 · Header: banda sólida crema durante el handoff del hero~~ — resuelto en HOME HANDOFF FIX.
- P2 · Hero: más profundidad o parallax del cielo (hoy solo −3 %).
- P2 · `frontend/package.json`: revertir `--configLoader runner` (solo hace falta dentro del sandbox de Codex).
- ~~P2 · Desinstalar `@fontsource-variable/inter` e `inter-tight`~~: hecho en 3C.4.
- Con Archivo, «Performance» (BMW) y «EUROPEAN PERFORMANCE» quedan pegados a sus slots de coche. Calibrarlo por escena.
- Calibración por escena contra los mockups: tamaños, posiciones, responsive fino, máscaras y blur.
- Inventory (1D): motion deliberadamente sobrio (afinar intensidad), imágenes provisionales.
- Europe / CTA (1E): el placeholder del GLC pasa por detrás del botón «Ver vehículos» de Europe; el mapa es un placeholder oscuro; afinar el borde telón papel/negro en Europe → Services; ~~la banda gris del sombreado Inventory → CTA~~ (3C.3); imagen del CTA provisional (reutiliza `hero-car.svg`); ~~footer frente al mockup~~ (3C.3; Murcia / Spain y legales siguen fuera hasta confirmarse).
- Services (1C): imágenes definitivas por servicio (hoy comparten placeholder); posible enriquecimiento del handoff Services → Inventory.
- ~~BMW (1B)~~ (historial; los PNG se eliminaron en 3C.1): los PNG `bmw-m4-off/on` están desalineados (el coche «encendido» está 134 px a la izquierda en su lienzo y es ~6 px más alto) y el coche se ve duplicado durante el crossfade: recortar o normalizar. También: encaje fino frente al mockup, glow y encendido final, y posición y tamaño exactos.

## MEDIA PROVISIONAL

- Hero y escena del coche: assets generados en 3C.1 (`public/assets/home/`), sustituibles por fotografía con el mismo encuadre.
- CTA final: reutiliza `temp/hero-car.svg`.
- BMW: los prototipos `bmw_m4_faros_apagados/encendidos.png` se retiraron de la raíz el 30-09-2026 (ya no se usaban; siguen en el historial de git).
- Fotos de servicios, inventario, Nosotros e Importación: placeholders hasta que el usuario las envíe.
- Todo el media de los vehículos puede sustituirse por vídeo, secuencia de frames, render o Canvas en la fase de media production.

## GAPS CONOCIDOS

- «Premium vehicles» (inventario) no tiene mockup específico.
- El vídeo `2026-09-26 15-54-09.mp4` es una grabación de Jesko Jets, no de GP SELECT.
- **Mockups aprobados** en `docs/mockups/` (nombres «Imagen de ChatGPT … .png»): `26 sept 16_51_51` hero · `16_52_05` BMW · `16_59_27` servicios · `17_00_01` Europa · `17_08_23` admin · `17_08_27` detalle · `28 sept 15_41_28` catálogo · `15_41_46` importación · `15_42_09` cuestionario/footer.

## WORKFLOW — Antigravity / Gemini Flash (desde 30-09-2026)

**`ANTIGRAVITY_WORKER_READY` para QA mecánica y exploración del repo, siempre READ-ONLY.** Modificar código todavía es **NOT READY**: primero tiene que superar un piloto aislado en un worktree.

- **Jerarquía:**
  - **Opus** orquesta, decide y es el gate final (PASS/FAIL).
  - **Astra** implementa lo visual complejo.
  - **Gemini** es un worker subordinado para lo mecánico y verificable. Su `PASS` significa «mis comprobaciones pasaron», nunca «unidad aprobada».
- **Herramienta:** CLI `agy` 1.2.14 en headless (`agy -p … --output-format json --json-schema <schema>`).
  - Modelo obligatorio: `--model gemini-3.8-flash-high`.
  - Nunca `--dangerously-skip-permissions`.
- **Regla del worker:** `.agents/rules/gemini-worker.md`, siempre activa. Aclara que la autoridad de Astra en `AGENTS.md` no le aplica.
- **Límites:**
  - no hace commit, tag ni push;
  - no toma decisiones de arquitectura, diseño, tipografía, motion, seguridad, auth/CSRF ni semántica de dominio (puede inspeccionarlas, no decidirlas);
  - no amplía el alcance; si algo es ambiguo, devuelve `BLOCKED`.
- **READ-ONLY por defecto:** Antigravity deja escribir en el workspace sin pedir permiso, así que la protección es la regla más el prompt. **Después de cada ejecución, Opus comprueba `git status --short`**; un cambio inesperado invalida el resultado.
- **Permisos** (`~/.gemini/antigravity-cli/settings.json`):
  - Solo las herramientas de inspección de Playwright, una a una con `mcp(playwright/<tool>)`: navigate, resize, evaluate, console_messages, take_screenshot, snapshot, wait_for, close y tabs.
  - Una sola orden de shell: `command(git status --short)`, para su comprobación del workspace (probado en headless el 30-09-2026). Copia previa en `settings.json.bak-before-git-status`.
  - El CLI no trae navegador; usa el MCP de Playwright aislado, con salida en el scratchpad.
  - Una herramienta denegada anula toda la ejecución sin salida. El prompt debe limitar las herramientas que puede usar.
- **Salida:** JSON con esquema (`status`, `checks`/`findings` con severidad P0–P2 y evidencia, `commands_run`, `files_modified`, `summary`). Opus solo incorpora a su contexto el resultado resumido, nunca logs, DOMs ni trazas completas.
- **Playwright exhaustivo** (matrices responsive, consola, rutas, regresión) se delega preferentemente a Gemini. Opus usa Playwright solo para confirmar un P0/P1 o una conclusión dudosa.
- **Métricas:** durante las próximas 2–3 unidades se anota de forma ligera el uso de cada ejecución (tokens de entrada, salida y razonamiento, caché, duración y estado) para medir el ahorro real de Opus y Astra.
  - Piloto: QA de 4 casos (`/vehiculos` y detalle, 1440 y 390) en 125 s, ~239k tokens de Gemini (507k de caché) y PASS. Las 12 cifras coinciden con la verificación de Opus.

## CHECKPOINTS (tags de git)

`pre-car-handoff` · `2f-a-pass` · `2f-b-pass` · `2f-c1-pass` · `2f-c2-pass` · `home-handoff-fix-pass` · **`home-closed-pass`** (HOME cerrada, 30-09-2026) · `2f-c3-pass` · `2g-pass` · `3a-production-ready-pass` · `final-technical-qa-pass` · `3b-copy-truth-pass` · **`3c-pass`** (último checkpoint). Cada unidad aprobada se cierra con un tag `<unidad>-pass`.

## NEXT

**Orden aprobado:**

1. 2F-C.1 backend (**PASS**);
2. 2F-C.2 Admin (**PASS**);
3. **2F-C.3 — catálogo real + detalle real + facetas dependientes + rangos derivados del inventario** (**PASS**);
4. **2G** interiores, escala tipográfica y densidad (**PASS**);
5. **3A** production readiness (**PASS técnico, aceptado**: hardening y consultas reales; quedan los RELEASE BLOCKERS externos de legal, email y dominio);
6. **Final Technical / UX QA** (**TECHNICALLY READY**, 01-10-2026);
7. **3B copy truth** (**PASS**, 01-10-2026);
8. **3C final visual / asset polish** (**PASS**, 01-10-2026: UI Simplification, QA A–G y Real Stack Regression incluidas; sin push ni merge);
9. **Siguiente: por decidir por el usuario**: sustituir las fotos del usuario según lleguen, y después 3D final release QA. SEO y dominio/deploy son fases aparte. NO iniciada.

**2F-C — ADMIN PANEL** (brief original, ya entregado en 2F-C.2 PASS; se conserva como referencia):

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
- ~~Deuda de seguridad preproducción del limitador del login~~: resuelta en 3A.
- `docs/HANDOFF.md` describe las fases 2 y 3 y está desfasado; la referencia vigente es este archivo.
- FINAL VISUAL POLISH PASS: continúa tras 2F-C.
- Catálogo, detalle, importación y cuestionario en su fase correspondiente; definir el endpoint mínimo de leads antes de implementarlo.

## DO NOT TOUCH

- No rediseñar escenas existentes ni cambiar la identidad visual; mejorar sobre lo implementado.
- No usar mockups completos como fondos ni inventar fotografías, mapas o datos comerciales definitivos.
- No tratar Jesko Jets como referencia visual.
- No crear pagos, carrito, reservas mediante pago, CRM o autenticación alternativa.
- No modificar backend o secciones ajenas a la tarea sin necesidad funcional concreta.
