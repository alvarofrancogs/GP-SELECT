# GP SELECT — Auditoría SEO

Fecha: 09-10-2026 · Rama: `main` (`294e4a3`) · Alcance: web pública (ES/EN), fichas de vehículo, SEO local y GEO.
Estado del sitio: **sin publicar** (no hay dominio en vivo). La auditoría se hizo sobre el build de producción servido en local.

---

## 0. Método y herramientas ejecutadas

Todo lo marcado **VERIFICADO** se comprobó con una herramienta en esta sesión. **INFERIDO** es una conclusión razonada a partir del código o de fuentes externas, sin medición directa. **ESTIMADO** es un juicio de impacto o esfuerzo.

| Paso | Herramienta | Resultado |
|---|---|---|
| Build | `npm ci` (desde el lockfile, autorizado) + `VITE_SITE_URL=https://gpselect.com npm run build` | OK. Aviso conocido: datos legales pendientes. |
| Servidor | `vite preview` en `127.0.0.1:4173` (reglas de `build/seoPlugin.ts`) | OK. API .NET apagada (Docker no arranca); el catálogo se simuló. |
| Render | Plugin `claude-seo` 2.4.2 · `render_page.py` | **No se pudo usar**: el guard anti-SSRF del plugin aborta la navegación de Playwright a `127.0.0.1`, incluso con `CLAUDE_SEO_LOCAL_TARGETS`. |
| Render (sustituto) | Script Playwright propio con el runtime y el Chromium del plugin (`scratchpad/audit/audit_pw.py`) | 9 rutas × 4 modos: escritorio 1440, móvil 390, EN y sin JS. API simulada con 2 vehículos (uno vendido) y un slug inexistente. |
| Rendimiento | Playwright + CDP: Slow 4G (150 ms, 1,6 Mbps) + CPU ×4, mediana de 3 | Medición de laboratorio aproximada. **No es Lighthouse** (no está instalado) ni datos de campo. |
| CLS | `PerformanceObserver` con las fuentes de cada layout shift | Causa localizada en la ficha. |
| Agentes / IA | `agentic_check.py` | 3 PASS en P0, 3 PASS en P1 y el resto informativo o no aplicable. |
| Calidad de texto | `content_quality.py` sobre el HTML estático | 75–77/100 en todas las páginas; 0 patrones de relleno o de IA. Ojo: el detector está calibrado para inglés. |
| SERP | `WebSearch` (5 consultas) | Cualitativo. **No es la SERP de Google.es** (el buscador de la herramienta está en EE. UU.). |
| Sin credenciales | `google_auth.py --check`, `backlinks_auth.py --check` | No hay GSC, GA4, CrUX, PSI, Moz ni DataForSEO. **No hay volúmenes de búsqueda ni datos de campo**: ninguna cifra de volumen de este informe es real. |

**Subagentes:** se cancelaron al lanzarlos y la auditoría siguió en línea, con los scripts del plugin y Playwright.
**Datos en bruto** (fuera del repo): `%LOCALAPPDATA%\Temp\claude\…\scratchpad\audit\` (`pw/*.json`, capturas `pw/*.png`, `agentic.json`).

---

## 1. Resumen ejecutivo

**Puntuación SEO estimada: 66/100** (pesos del plugin: técnico 22 %, contenido 23 %, on-page 20 %, schema 10 %, rendimiento 10 %, IA 10 %, imágenes 5 %).

| Categoría | Nota | Motivo principal |
|---|---|---|
| SEO técnico | 80 | Base sólida: HTML estático legible por ruta, 404 reales, canonical, robots y sitemap dinámico. Faltan el catálogo en HTML y la normalización de URLs. |
| Contenido | 52 | Texto honesto y sin relleno, pero escaso para la intención de búsqueda real (costes, documentación, plazos) y sin señales de autoría ni experiencia. |
| On-page | 62 | Titles y descriptions buenos en las páginas estáticas; H1 de una palabra; meta de las fichas genérica. |
| Schema | 65 | Válido y prudente, pero sin `@id`, teléfono, migas ni disponibilidad en `Offer`. |
| Rendimiento | 68 | Escritorio excelente. Móvil limitado: LCP de laboratorio ~3,7 s, mucho trabajo de JS al cargar y ~1 MB de imágenes en la Home. CLS de 0,16 en la ficha. |
| Preparación para IA | 75 | Contenido sin JS, `llms.txt` válido y bots de IA permitidos. Faltan pasajes citables (FAQ, datos, autor). |
| Imágenes | 70 | Alt correctos y decorativas vacías. Sin variantes responsive en la Home; SVG provisionales en Importación y Nosotros. |

**Lo que ya está bien (VERIFICADO):** cada ruta estática sirve título, description, canonical, OG y JSON-LD en el HTML inicial. Hay contenido semántico legible sin JavaScript (345 palabras en la Home). Las rutas desconocidas devuelven un **404 real**. `/servicios` redirige con **308**. El H1 es único en todas las páginas. GSAP no oculta texto al renderizador y el CLS del scroll de la Home es ~0. Las fichas se generan en el servidor (`SeoController`) con `Car` + `Offer`, y el sitemap es dinámico.

**Lo que más limita el posicionamiento:**

1. **Falta contenido para la búsqueda principal.** La SERP de «importar coche de Alemania» es casi toda informativa (RACE, motor.es, Autohero, carwow, Mapfre, Autofácil): costes, documentación, matriculación, riesgos. `/importacion` explica el método, pero no responde a esas preguntas.
2. **Faltan señales de confianza (E-E-A-T).** No hay persona visible, experiencia, reseñas, fotos reales ni casos.
3. **Ya hay competencia local directa:** Radikal Cars (Alguazas, Murcia) se presenta como importador de coches alemanes de alta gama desde 2000 y tiene cobertura en prensa.
4. **El catálogo no aparece en el HTML.** `/vehiculos` sin JS no enlaza ninguna ficha; solo se descubren por el sitemap o renderizando JS.
5. **Medición y conversión en el lanzamiento:** el formulario está desactivado en producción hasta tener los datos legales, y no hay analítica ni Search Console.

**Top 5 quick wins** (bajo esfuerzo, sin tocar diseño ni motion):

1. `min-height: 100svh` en el estado de carga de la ficha: quita el CLS de 0,16.
2. Title y description de la ficha con variante, km, potencia y estado.
3. `@id`, `telephone` (el número de WhatsApp verificado) y `BreadcrumbList` en el JSON-LD.
4. Enlaces a las fichas en el HTML estático de `/vehiculos`, generados en el servidor.
5. Redirección 301 de `/ruta/`, `/RUTA` y `/ruta/index.html` a la URL canónica.

---

## 2. Problemas detectados con evidencias

### 2.1 Técnico / indexabilidad

**T1 · CLS 0,16 en la ficha de vehículo (VERIFICADO).**
Medido en 390, 1440 y 1920 px: 0,163, 0,160 y 0,159; el umbral de Google es 0,1. Ocurre a los 110–210 ms. La fuente principal es `FOOTER.site-footer`: mientras se carga el vehículo, el footer está dentro del viewport (y = 765 de 900) y después lo empuja el contenido. Hay una fuente menor: los `A.nav-link` se ensanchan cuando entra la fuente Archivo (70 → 84 px).
Causa en el código: `.vehicle-detail--state { min-height: 85svh; }` (`frontend/src/styles/vehicles.css:40`); con el header, no llega a cubrir el viewport.
En producción también pasa: el servidor entrega el HTML legible, React lo sustituye y vuelve a pedir el vehículo, así que el estado de carga aparece igual (INFERIDO de `VehicleDetail.tsx:45`).

**T2 · El catálogo no está en el HTML inicial (VERIFICADO).**
`/vehiculos` sin JS: 32 palabras, un H1 y **0 enlaces a fichas**. Con JS y la API simulada aparecen los H2 de cada coche. Las fichas solo se descubren por `/sitemap.xml` (dinámico) o si Google renderiza el JS y la API responde. Es el único listado que enlaza las fichas, así que pierden enlazado interno rastreable.

**T3 · Variantes de URL con 200 (VERIFICADO en preview, INFERIDO en Caddy).**
`/nosotros`, `/nosotros/`, `/NOSOTROS` y `/nosotros/index.html` → 200. El canonical estático (`https://gpselect.com/nosotros`) lo mitiga, pero se desperdicia rastreo y se diluyen enlaces externos mal escritos. En Caddy, `try_files {path} {path}/index.html` (`deploy/Caddyfile`) sirve también `/ruta/` y `/ruta/index.html`.

**T4 · ES/EN: el inglés no es indexable y la cabecera mezcla idiomas (VERIFICADO).**
El inglés es un interruptor del cliente (`localStorage gp-select.locale.v1`) sobre la misma URL; no hay URLs `/en/` ni `hreflang`. Con EN activo, la Home pone `<html lang="en">` y el H1 «Sourced in Europe», pero mantiene title, description y `og:locale es_ES` en español. En las interiores el title de la pestaña pasa al inglés («Stock · GP SELECT», «Import · GP SELECT») y la description sigue en español.
Googlebot no tiene ese `localStorage`, así que siempre indexa ES: **no hay penalización, pero el contenido EN no existe para los buscadores**. Es relevante porque `areaServed` incluye Europa.

**T5 · Fallback `spa.html` (VERIFICADO).**
Si la API cae, las fichas se sirven con `<title>GP SELECT</title>` y `robots index,follow` hasta que carga el JS. Es una situación excepcional, aceptable como degradación.

**T6 · Vendidos no listados (INFERIDO de `SeoController.cs`).**
Un coche vendido sin `ShowWhenSold` queda fuera del sitemap (bien), pero su URL sigue respondiendo 200 e indexable. Puede quedar en el índice como página sin oferta.

**T7 · Sitemap (VERIFICADO).**
El estático tiene 5 URLs sin `lastmod`; el dinámico añade los vehículos con `lastmod`. Las legales están fuera (correcto, son `noindex,follow`). No hay sitemap de imágenes (opcional).

**T8 · Cabeceras (VERIFICADO en `Caddyfile`).**
HSTS, `nosniff`, `X-Frame-Options`, `Referrer-Policy` y `Permissions-Policy` están. Falta la CSP, ya anotada como pendiente en `CURRENT-STATE.md`; no influye en el SEO.

### 2.2 On-page

| Ruta | Title (long.) | H1 | Palabras (render) | Observación |
|---|---|---|---|---|
| `/` | GP SELECT · Selección e importación de coches en Murcia (55) | Selección Europea | 277 | El H1 no dice qué hace la empresa; lo explica el lede. |
| `/vehiculos` | Coches europeos en venta · Catálogo de GP SELECT (48) | Vehículos | 83 | Página fina, sin texto propio de valor. |
| `/importacion` | Importar un coche de Alemania o de Europa · GP SELECT (53) | Importación | 288 | Buen title; el contenido no cubre costes, documentación ni plazos. |
| `/nosotros` | Sobre GP SELECT · Selección de coches europeos en Murcia (56) | Nosotros | 280 | Sin persona, trayectoria ni foto real. |
| `/contacto` | Contacto · Cuéntanos qué coche buscas · GP SELECT (49) | Contacto | 148 | Correcto. |
| ficha | Porsche 911 Carrera S (2021) · Vehículos europeos · GP SELECT | Porsche 911 Carrera S PDK | 115 | Title sin variante; description igual en todas las fichas. |

- **O1 (VERIFICADO): H1 no descriptivos.** Son H1 de una palabra o de marca. Google entiende el tema por el title y el texto, así que el impacto es moderado, pero el H1 es la señal on-page más barata y la que los sistemas de IA usan para resumir la página.
- **O2 (VERIFICADO): description de la ficha genérica.** «Consulta las fotos y los datos de este {coche} en GP SELECT. Selección de vehículos europeos desde Murcia…» (`pageMeta.ts` y `VehicleSeo.cs`). No incluye ningún dato diferencial (km, potencia, cambio, estado), y el title omite la variante («PDK»).
- **O3 (VERIFICADO): el icono «+/−» queda dentro de los H3 de Servicios.** Tiene `aria-hidden` (la accesibilidad está bien), pero el texto del encabezado queda como «Búsqueda por encargo +» (`ServicesSection.tsx:102-106`). Es menor.
- **O4 (VERIFICADO): el nombre del coche se repite como H2** en el bloque final de la ficha (`VehicleDetail.tsx:102`). Es menor.
- **O5 (VERIFICADO): H3 decorativos** («Potencia Control») con poco significado fuera de contexto. Aceptable como decisión de diseño.

### 2.3 Contenido y E-E-A-T

- **C1 (VERIFICADO): sin autoría ni experiencia visible.** Ninguna página pública nombra a la persona detrás de GP SELECT. El titular, Miguel Reverte Peñalver, solo figura en `/aviso-legal`, que es `noindex`. No hay años de experiencia, operaciones realizadas, testimonios, reseñas ni fotos reales. Para un servicio de alto importe (importar un coche premium) es la debilidad de confianza más grande, frente a buscadores y frente a clientes.
- **C2 (VERIFICADO): huecos frente a la intención de búsqueda.** `/importacion` describe el método (definir, buscar, leer, acompañar), pero no trata lo que buscan los usuarios según la SERP: impuesto de matriculación, IVA o ITP según el vendedor, ITV, DGT, CoC y homologación, documentación alemana, transporte, plazos orientativos, riesgos (kilometraje, daños) y cómo los mitiga el servicio. La Home sí cita fuentes (KBA, Ganvam/Faconauto, Agencia Tributaria): **es un buen patrón a extender**.
- **C3 (VERIFICADO): imágenes provisionales.** Importación y Nosotros usan SVG provisionales (`import-search.svg`, `about-selection.svg`…).
- **C4 (VERIFICADO con `content_quality.py`): tono.** 0 relleno y 0 patrones de IA; densidad informativa baja en `/importacion` (flag `low-density`). El tono es sobrio y coherente con la marca: **no hace falta reescribirlo, hace falta ampliarlo con hechos**.
- **C5: claims prudentes.** 3B Copy Truth retiró a propósito la inspección física, la entrega y el transporte. Este informe **no propone añadir promesas no confirmadas**; donde hace falta un dato, se marca `[dato a confirmar]`.

### 2.4 Schema.org (VERIFICADO en el HTML)

- Home: `@graph` con `AutoDealer` + `WebSite`. Importación: `Service`. Ficha: `Car` (+ `Offer` si hay precio y no está vendido). JSON válido y `<` escapado.
- **S1: sin `@id`.** Las entidades no se enlazan entre sí: `Service.provider` y `Car` no apuntan al mismo `AutoDealer`.
- **S2: `AutoDealer` sin `telephone`, `email`, `sameAs`, `image` ni `founder`.** `contactConfig.phone` es `null`, aunque el WhatsApp verificado `+34 661 631 555` es un teléfono. Sin dirección física: `PostalAddress` solo con localidad, región y país. Es coherente con un negocio sin local abierto al público; la dirección completa es «required» en el rich result de LocalBusiness (INFERIDO de la documentación de Google; verificarlo con Rich Results Test tras publicar).
- **S3: `Offer` sin `availability`, `itemCondition` ni `seller`.** `Car` sin `bodyType`, `vehicleEngine`/potencia ni `itemCondition`. No hay `BreadcrumbList` en las fichas.
- **S4: dos copias del mismo JSON-LD** (`pageMeta.ts` y `VehicleSeo.cs`). Hoy coinciden; cada cambio tiene que hacerse en los dos sitios (ya documentado).
- Nota: los rich results de listados de vehículos de Google tienen disponibilidad geográfica limitada (INFERIDO; verificar). El valor de `Car` está sobre todo en la comprensión de la entidad y en la IA, no en un rich result garantizado. Tampoco conviene esperar rich results de FAQ: Google los limita a sitios de autoridad y Administración.

### 2.5 Rendimiento y Core Web Vitals (laboratorio)

| Página | Perfil | LCP (mediana de 3) | FCP | Elemento LCP | Tareas largas >50 ms (suma) | Peso transferido |
|---|---|---|---|---|---|---|
| `/` | móvil, Slow 4G + CPU ×4 | **3,68 s** | 3,14 s | `hero-car.webp` | 1,6–2,7 s | 1,74 MB (imágenes 1,03 MB, JS 539 kB sin comprimir) |
| `/` | escritorio, sin limitación | 0,38 s | 0,28 s | `hero-car.webp` | 30–90 ms | igual |
| `/vehiculos` | móvil limitado | 3,60 s | 1,86 s | portada del coche | 250–460 ms | 1,0 MB |
| `/importacion` | móvil limitado | 2,65 s | 1,84 s | párrafo lede | 150–250 ms | 0,83 MB |

- Coherente con PERF-2 (Lighthouse móvil 79, LCP 4,43 s; `CURRENT-STATE.md`). LCP y TBT/INP en móvil son el margen de mejora; CLS de la Home ~0 al bajar y al subir (VERIFICADO: 0,0002).
- **P-1:** en la Home se descargan al cargar ~1 MB de imágenes sin variantes responsive. `car-cutaway.webp` (427 kB) y `car-a.webp` (188 kB) pertenecen a la escena del coche, muy por debajo del primer viewport; `hero-car.webp` (232 kB) es el mismo archivo en 390 y en 1920.
- **P-2:** el preloader (≤2 s, decisión de marca) retrasa el FCP en la primera visita: 3,1 s en móvil limitado (INFERIDO: el FCP coincide con su ventana).
- **P-3:** las tareas largas al montar (React + GSAP + el primer layout de una Home de ~11 900 px) suben el TBT y el riesgo de INP. Ya está documentado en PERF-2 como «sin ganancia segura sin cambiar cuándo se montan las escenas».
- **Impacto de GSAP en el SEO (VERIFICADO):** el texto está en el DOM desde el primer render; los H1–H3 renderizados coinciden con el HTML estático. Los pins no generan CLS desde PERF-2 y no hay contenido que solo aparezca con interacción (los paneles de Servicios están siempre en el DOM con `inert`). **GSAP no es un problema de indexación**; solo pesa en LCP y TBT en móvil.

### 2.6 Accesibilidad relacionada con el SEO (VERIFICADO)

- Hay `lang`, un H1 por página, landmarks (`header`, `main`, `nav`, `footer`), 0 campos de formulario sin etiqueta y 0 `<a>` sin `href`. Los enlaces de navegación son `<a href>` reales.
- Alt correctos en las imágenes con contenido («Porsche · vista lateral», «BMW M4 · vista cenital») y vacíos en las decorativas (cielos y miniaturas duplicadas).
- Pendiente: un alt descriptivo para las fotos reales cuando sustituyan a los SVG provisionales. En las fichas, el alt es «Marca Modelo · n», correcto pero mejorable con el ángulo («interior», «trasera»), que el contrato actual no recoge.

### 2.7 SEO local

- **L1 (VERIFICADO): NAP incompleto.** El nombre «GP SELECT» y la ciudad «Murcia» son coherentes en el footer, el schema y `llms.txt`. El teléfono solo aparece como WhatsApp en Contacto; el email está pendiente (`info@gpselect.com`); no hay dirección pública (decisión confirmada).
- **L2: sin Google Business Profile ni perfiles en `sameAs`** (pendiente fuera del código, según `CURRENT-STATE.md`).
- **L3 (INFERIDO de la SERP):** «coches premium Murcia» lo dominan páginas de stock (OcasionPlus, concesionarios oficiales) y Radikal Cars. GP SELECT no puede competir por volumen de stock; su ángulo local es **«importar un coche desde Murcia» / búsqueda por encargo**, no «concesionario».

### 2.8 GEO / buscadores con IA (VERIFICADO con `agentic_check.py`)

- PASS: contenido sin JS (345 palabras), `robots.txt` accesible con un único grupo `*` que permite GPTBot, OAI-SearchBot, ClaudeBot, PerplexityBot, Google-Extended…, `llms.txt` válido según las reglas de Lighthouse, 404 real.
- Informativo (opcional y de poco valor hoy): línea `Content-Signal`, versión Markdown y grupos por bot. No son prioritarios.
- **Lo que falta para ser citable:** pasajes autocontenidos que respondan una pregunta concreta (p. ej. «¿Qué impuestos paga un coche importado de Alemania?»), con fuente y fecha, y una entidad clara (quién, dónde, desde cuándo). Hoy el texto es de marca y de método, difícil de citar como respuesta.

---

## 3. Clasificación P0–P3 con impacto y esfuerzo

Esfuerzo: **S** < 2 h · **M** ½–1 día · **L** 2–5 días. El impacto es ESTIMADO.

### P0 — bloquea el lanzamiento o el objetivo (no hay P0 de código SEO)

| ID | Problema | Impacto | Esfuerzo | Nota |
|---|---|---|---|---|
| P0-1 | Desplegar con `VITE_SITE_URL` y `Seo__SiteUrl` definidos. Sin ellos no hay canonical, `og:url` ni sitemap. | Alto | S | Configuración de despliegue, ya prevista. |
| P0-2 | Formulario desactivado en producción hasta tener datos legales, proveedor de email y buzón. La única conversión activa es WhatsApp. | Alto (conversión) | S–M | Ya registrado como release blocker. |

### P1 — impacto significativo en el posicionamiento o en la captación

| ID | Problema | Impacto | Esfuerzo |
|---|---|---|---|
| P1-1 | CLS 0,16 en la ficha (T1) | Alto en las fichas (CWV) | S |
| P1-2 | Catálogo sin enlaces en el HTML (T2) | Alto en la indexación de fichas | M |
| P1-3 | Meta de la ficha genérica y title sin variante (O2) | Medio-alto (CTR y long tail por modelo) | S |
| P1-4 | `/importacion` no cubre la intención informativa (C2) | Alto (palabra clave principal) | M (texto) + datos del cliente |
| P1-5 | Sin E-E-A-T: persona, experiencia, fotos reales y reseñas (C1, C3) | Alto (confianza y conversión) | M + datos del cliente |
| P1-6 | Google Business Profile, NAP y teléfono/email en el schema (L1, L2, S2) | Alto en local | S (código) + gestión externa |
| P1-7 | Sin Search Console ni medición de conversiones | Alto (sin datos no se puede iterar) | S (GSC); M si se añade analítica, que obliga a actualizar los textos legales |
| P1-8 | LCP y TBT en móvil de la Home (P-1, P-3) | Medio | M |

### P2 — oportunidad de optimización

| ID | Problema | Impacto | Esfuerzo |
|---|---|---|---|
| P2-1 | H1 poco descriptivos (O1) | Medio | S, pero afecta a mockups aprobados: requiere visto bueno |
| P2-2 | Decidir la estrategia EN: solo UX o URLs `/en/` + `hreflang` (T4) | Medio (clientes europeos) | S (decidir) / L (implementar) |
| P2-3 | Schema: `@id`, `BreadcrumbList`, `Offer.availability`/`itemCondition`/`seller`, `founder` (S1, S3) | Medio | S–M |
| P2-4 | Guía pilar «Cómo importar un coche de Alemania» y FAQ (GEO-2) | Alto a medio plazo | L + datos del cliente |
| P2-5 | Texto propio en `/vehiculos` (qué es el catálogo, cómo se elige, enlace a búsqueda por encargo) | Medio | S |
| P2-6 | `lastmod` en las rutas estáticas del sitemap (T7) | Bajo-medio | S |
| P2-7 | Variantes responsive (AVIF/WebP 800/1600) de `hero-car`; carga diferida de las imágenes de la escena del coche (P-1) | Medio | M (con cuidado con los pins) |

### P3 — backlog

| ID | Problema | Esfuerzo |
|---|---|---|
| P3-1 | 301 a la URL canónica para `/ruta/`, mayúsculas e `index.html` (T3) | S |
| P3-2 | Icono «+/−» fuera del H3 (con CSS) y H2 repetido en la ficha (O3, O4) | S |
| P3-3 | Vendidos no listados: `noindex` o 410 pasado un tiempo (T6) | S |
| P3-4 | Fallback `spa.html` con un title genérico mejor (T5) | S |
| P3-5 | `size-adjust` en la fuente de respaldo para quitar el micro-shift del menú | S |
| P3-6 | `Content-Signal`, Markdown y sitemap de imágenes (opcional) | S |

---

## 4. Estrategia SEO recomendada

### 4.1 Validación de las hipótesis de palabras clave

Sin herramienta de volumen: **ningún volumen es real**. La validación es cualitativa, con la SERP observada (no Google.es) y el encaje con el negocio.

| Hipótesis | Intención observada | Competencia observada | Encaje | Veredicto |
|---|---|---|---|---|
| Importar coche de Alemania | **Informativa** (guías de costes, pasos, riesgos), con intermediarios comerciales en 2.º plano | Alta en el término principal (RACE, motor.es, Autohero, carwow, Mapfre, Autofácil); Radikal Cars por prensa | Muy alto | **Prioridad 1.** Página de servicio (`/importacion`) + guía pilar informativa. Long tail alcanzable: «cuánto cuesta importar un coche de Alemania», «impuesto de matriculación coche importado», «documentación coche importado Alemania», «importar coche Alemania con intermediario». |
| Importación de vehículos europeos | Genérica y ambigua | Media | Alto | Usar como apoyo semántico, no como objetivo principal. «Comprar coche en Europa» y «coche importado de Europa» son variantes naturales (INFERIDO). |
| Coches premium Murcia | **Transaccional con stock** (listados de concesionarios y portales) | Alta para un catálogo pequeño | Medio | No perseguir «concesionario». Apostar por la combinación local + servicio: «importar coche Murcia», «búsqueda de coches por encargo Murcia» (INFERIDO, validar con GSC tras el lanzamiento). |
| Selección personalizada de vehículos | Poco usada como consulta; la gente dice «personal shopper de coches», «coche por encargo», «te buscamos el coche» | Media (BuscoCochePorTi, mecambiodecoche) | Muy alto | Adoptar el vocabulario del usuario en el texto: «búsqueda de coches por encargo» y, una vez, «personal shopper de coches», sin forzarlo. |
| Importación de coches deportivos y alta gama | Nicho; prensa y concesionarios especializados (Elferspot, Radikal Cars) | Media | Alto | A medio plazo, páginas por marca o modelo **solo con casos reales** (p. ej. «Importar un Porsche 911 de Alemania»), nunca páginas puerta generadas en serie. |

### 4.2 Posicionamiento recomendado

- **Mensaje:** GP SELECT no es un concesionario con stock ni un importador masivo. Es **búsqueda por encargo y acompañamiento en la importación**, desde Murcia. Ese ángulo lo diferencia de Radikal Cars (stock e importación integral) y de los portales.
- **Arquitectura (hub-and-spoke ligera):**
  - Hub de servicio: `/importacion` (comercial: método, qué incluye, cómo empezar).
  - Hub informativo: `/importar-coche-alemania` o `/guia/importar-coche-alemania` (costes, documentación, matriculación, riesgos, fuentes oficiales), enlazado desde `/importacion` y la Home.
  - Apoyos futuros, solo con contenido real: «Impuesto de matriculación de un coche importado», «Qué revisar antes de comprar un coche en Alemania» y casos de búsquedas realizadas.
  - Catálogo y fichas: long tail por modelo; enlazar cada ficha con `/importacion` (ya ocurre) y con la guía.
- **Conversión:** cada página informativa termina en «Pedir una búsqueda» (cuestionario existente). Hoy el primer viewport de la Home solo ofrece «Ver catálogo»: es una decisión aprobada (UI Simplification), pero conviene medirla cuando haya analítica.

### 4.3 SEO local y Google Business Profile

1. Crear el perfil como **negocio de servicio a domicilio / en zona** (dirección oculta), con área España y la Región de Murcia como base. La verificación probablemente sea por vídeo (INFERIDO).
2. Categoría principal: la más cercana a «agente o corredor de compra de vehículos»; secundaria: «importador»/«concesionario de vehículos de ocasión». **Verificar los nombres exactos en el selector de GBP**, que cambian.
3. NAP idéntico en web, schema, GBP y directorios: «GP SELECT», el mismo teléfono (+34 661 631 555 si es el número comercial definitivo), email `info@gpselect.com` y web `https://gpselect.com/`.
4. Reseñas: pedirlas a cada cliente tras la compra; responderlas todas. Son la señal local más fuerte, y hoy hay cero.
5. Citas de calidad, pocas: perfiles de vendedor en AutoScout24/coches.net si se publica stock allí, LinkedIn o Instagram de la marca, y directorios generalistas (Páginas Amarillas, Cylex…). Añadir cada perfil verificado a `contactConfig.sameAs`.
6. Publicaciones en GBP con cada coche nuevo o cada búsqueda cerrada (con consentimiento).

### 4.4 GEO (IA)

- Escribir pasajes de 40–80 palabras que respondan una pregunta y citen una fuente oficial (Agencia Tributaria, DGT), con la fecha de la última revisión.
- Una entidad clara y repetida: «GP SELECT, búsqueda e importación de coches europeos por encargo, Murcia (España)», con `founder`, `sameAs` y `@id`.
- Mantener `llms.txt` sincronizado al añadir la guía y la FAQ (ya se genera en el build).

---

## 5. Propuestas concretas de contenido

Todas respetan el tono actual (sobrio, directo, sin superlativos) y **no añaden promesas**. `[dato a confirmar]` = lo tiene que aportar el cliente.

### 5.1 Metadatos

| Ruta | Title propuesto | Description propuesta |
|---|---|---|
| `/` | GP SELECT · Búsqueda e importación de coches europeos en Murcia | Buscamos en Alemania y en el resto de Europa el coche que quieres, analizamos cada unidad y te acompañamos en la compra y la importación. Desde Murcia. |
| `/importacion` | Importar un coche de Alemania o de Europa · GP SELECT | (actual, correcta) Añadir al final: «…y te explicamos impuestos, documentación y matriculación.» solo cuando la página lo cubra. |
| `/vehiculos` | Coches europeos seleccionados · Catálogo GP SELECT | Unidades europeas seleccionadas, con fotos y datos completos. Si el coche que buscas no está, lo buscamos por encargo en Europa. |
| ficha | `{Marca} {Modelo} {Variante} {Año} · {km} km · GP SELECT` | `{Marca} {Modelo} {Variante} de {Año} con {km} km, {potencia} CV y cambio {transmisión}. {Procedencia si existe}. Fotos, especificaciones y consulta directa con GP SELECT.` (omitir lo que falte; «Vendido» si aplica) |

### 5.2 H1 (requiere el visto bueno del cliente: afecta a mockups aprobados)

Opción conservadora, **sin cambio visual**: mantener el texto display y hacer que el H1 semántico incluya el lede, que ya se ve debajo. Por ejemplo, en la Home, `<h1><span>Selección Europea</span> <span class="hero-lede">Buscamos en Europa el coche que quieres…</span></h1>`. Lo implementaría Astra, que decide si la composición lo admite. **No usar texto oculto distinto del visible.**

En las interiores, mismo patrón: «Importación» + lede visible → H1 «Importación: te ayudamos a encontrar y comprar tu coche en Europa».

### 5.3 `/importacion` — secciones nuevas (debajo del método actual)

1. **«Qué cuesta importar un coche, concepto a concepto»:** impuesto especial de matriculación (según emisiones de CO₂; modelo 576, Agencia Tributaria), IVA o ITP según quién venda y la antigüedad del coche, ITV de importación, tasas de la DGT y placas, y transporte. **Sin importes propios**; enlazar las fuentes oficiales y ofrecer el cálculo del caso concreto en la consulta.
2. **«Documentación que pedimos al vendedor»:** permiso de circulación alemán (Zulassungsbescheinigung Teil I y II), CoC o ficha técnica, factura con el IVA desglosado o contrato, historial de mantenimiento. `[confirmar qué revisa GP SELECT en cada caso]`
3. **«Plazos orientativos»:** `[dato a confirmar]` o, si no hay dato, la frase honesta que ya se usa: «cada operación es distinta…».
4. **«Riesgos habituales y cómo los tratamos»:** kilometraje, daños previos, especificación distinta a la anunciada. Explicar qué se comprueba con la documentación y qué queda fuera del servicio (coherente con «decimos lo que sabemos y lo que no»).
5. **FAQ (GEO-2, ya planificada):** 5–7 preguntas reales de clientes. `[preguntas y respuestas del cliente]`

### 5.4 `/nosotros` — E-E-A-T

- Un bloque «Quién está detrás»: nombre, foto real, por qué empezó, desde cuándo trabaja con coches europeos y qué tipo de coches ha buscado. `[todo, dato del cliente]`
- Si hay operaciones cerradas: 2–3 **casos** breves (modelo, país de origen, qué se buscaba, qué se descartó y por qué), con el consentimiento del cliente.

### 5.5 `/vehiculos`

- Un párrafo de 60–100 palabras bajo el H1: cómo se eligen las unidades, que se puede pedir cualquier otra por encargo y un enlace a la guía. Con eso deja de ser página fina aunque haya pocos coches.

### 5.6 Fichas

- Animar al Admin a rellenar `description`, `history` y `provenance` con texto propio (hoy son opcionales). Son el contenido único de cada ficha.
- Alt con el ángulo de cada foto, si en el futuro el contrato lo permite.

---

## 6. Plan técnico por fases

**Reglas:** proteger GSAP, los pins y el scroll nativo; no tocar secciones aprobadas sin visto bueno; cada fase con su QA (build, lint, typecheck, Playwright 390/1440, reduced-motion) y su tag, como el resto del proyecto. Cambios en el JSON-LD o el head de las fichas: **siempre en `pageMeta.ts` y en `VehicleSeo.cs` a la vez**.

### Fase A — antes del lanzamiento (≈1–2 días, sin cambios visuales)

1. P1-1: `min-height: 100svh` (o reservar el alto del layout) en `.vehicle-detail--state`.
2. P1-3: nuevo title y description de la ficha en `getVehiclePageMeta` y `VehicleSeo.Head`, con su test en `SeoTests`.
3. P2-3 y S2: `@id` (`https://gpselect.com/#organization`, `#website`), `telephone` desde el WhatsApp verificado (si el cliente confirma que es el teléfono comercial), `email` cuando exista, `BreadcrumbList` en las fichas, `Offer.availability` (`InStock`, `PreOrder` para ComingSoon; sin `Offer` para Reserved/Sold, o decidirlo) e `itemCondition: UsedCondition`.
4. P1-2: `SeoController` sirve `/vehiculos` con el HTML legible y los enlaces a las fichas listadas (mismo patrón que las fichas: plantilla + `#root`), con fallback al estático si falla. Regla nueva en Caddy.
5. P3-1: redirecciones 301 en Caddy a la forma canónica (sin barra final, minúsculas, sin `index.html`).
6. P2-6: `lastmod` de las rutas estáticas = fecha del build.

### Fase B — contenido (depende de los datos del cliente; ≈3–5 días de redacción e implementación)

1. P1-4: secciones nuevas de `/importacion` (5.3) en `es.ts`/`en.ts` y en `readableContent.ts` (el HTML estático sale de los mismos diccionarios).
2. P1-5: bloque «Quién está detrás» y fotos reales (sustituir los SVG por los slots de `sceneAssets`).
3. P2-5: párrafo de `/vehiculos`.
4. P2-1: H1 semánticos (5.2), con Astra y la aprobación del cliente.
5. GEO-2: FAQ + `llms.txt` actualizado.

### Fase C — rendimiento móvil (≈2–3 días, con Astra; riesgo medio por los pins)

1. P2-7: `srcset` con variantes de `hero-car` (p. ej. 900/1800 px, AVIF + WebP) en `AssetSlot`; medir el LCP antes y después.
2. Cargar las imágenes de `CarHandoffScene` cuando el pin se acerque (IntersectionObserver con margen amplio) **sin cambiar el tamaño de sus cajas**, para que `ScrollTrigger` no recalcule.
3. Evaluar con el cliente un preloader más corto en la primera visita (decisión de marca).
4. P3-5: `size-adjust` en la fuente de respaldo de Archivo.

### Fase D — internacional (decisión del cliente)

- **Opción 1 (recomendada a corto plazo):** el inglés queda como ayuda de interfaz; se documenta que solo se indexa ES. Mínimo: que con EN activo la pestaña y la cabecera no mezclen idiomas, o que el title de la pestaña se quede en ES.
- **Opción 2 (si Europa se vuelve un mercado real):** rutas `/en/…` prerenderizadas en el build (igual que `readableContent.ts`), `hreflang` es/en/x-default en ambas versiones y en el sitemap, `og:locale` por idioma, fichas EN desde `SeoController` y el selector ES/EN enlazando a la URL equivalente. Esfuerzo L.

### Fase E — contenido de crecimiento (mes 2 en adelante)

- Guía pilar «Cómo importar un coche de Alemania» y 2–3 artículos de apoyo, solo con fuentes oficiales y experiencia propia.
- Casos reales y páginas por modelo cuando existan.

---

## 7. Pruebas para verificar cada cambio

| Cambio | Prueba |
|---|---|
| CLS de la ficha | Script `PerformanceObserver` (como `cls_probe.py`) a 390/1440/1920: CLS < 0,05; capturas idénticas en el estado final. |
| Meta de la ficha | Test unitario de `getVehiclePageMeta` y de integración en `SeoTests` (title, description, sin campos vacíos tipo «undefined km»); HTML del servidor = head del cliente tras navegar. |
| JSON-LD | Validator de schema.org y Rich Results Test (tras publicar); test de que `@id` coincide entre las páginas; parity test `pageMeta.ts` ↔ `VehicleSeo.cs`. |
| `/vehiculos` en el servidor | `curl` sin JS: `<a href="/vehiculos/{slug}">` de cada coche listado; con la API caída, fallback 200 estático; con JS, sin duplicar contenido ni el head. |
| Redirecciones | `curl -I` de `/nosotros/`, `/NOSOTROS`, `/nosotros/index.html` → 301 a `/nosotros`; `/servicios` sigue en 308; `/api` y `/admin` sin cambios. |
| Sitemap | Validar el XML; `lastmod` presente; las legales siguen fuera; los vendidos no listados, fuera. |
| Contenido nuevo | HTML estático = SPA (mismos H1–H3); 0 claims sin fuente; revisión ES/EN; `content_quality.py` sin flags; QA de motion de la Home si se toca algo de ella. |
| H1 semánticos | Capturas píxel a píxel antes y después a 390/1440/1920 (sin cambio visual); un solo H1. |
| Imágenes responsive | LCP mediana de 3 en móvil limitado (objetivo < 2,5 s en laboratorio); CLS 0 al bajar y al subir; scroll de pins, ES↔EN a mitad de pin y reduced-motion intactos. |
| hreflang (si se hace) | Cada página con las alternates recíprocas y x-default; `curl` de `/en/...` con contenido EN sin JS; sitemap con `xhtml:link`. |

---

## 8. Pendiente para después del despliegue

1. **Search Console:** propiedad de dominio, enviar `/sitemap.xml`, inspeccionar la Home, `/importacion` y una ficha, y comprobar el renderizado («Probar URL publicada»).
2. **Bing Webmaster Tools** (alimenta Copilot y ChatGPT Search): importar desde GSC.
3. **Rich Results Test** de la Home, `/importacion` y una ficha con precio y otra vendida.
4. **PageSpeed Insights y CrUX** a las 4 semanas con tráfico. Configurar una API key en `~/.config/claude-seo/google-api.json` para que el plugin (`seo-google`, `pagespeed_check.py`, `lighthouse_agentic.py`) aporte datos reales, y repetir esta auditoría con `render_page.py` contra el dominio público (el guard de localhost deja de aplicar).
5. **Comprobar en producción:** `gpselect.es` → 308 a `gpselect.com`, `robots.txt` y `llms.txt` servidos, cabeceras, 404 real y `/vehiculos/<slug>` servido por la API.
6. **Google Business Profile:** alta, verificación, categorías y primeras reseñas.
7. **Línea base de drift** con el plugin (`seo-drift`) tras el primer despliegue estable, para detectar regresiones en cada release.
8. **Medición de conversiones:** decidir analítica (preferible sin cookies) y actualizar Privacidad/Cookies antes de activarla, como pide `CURRENT-STATE.md`.
9. **Palabras clave reales:** a los 2–3 meses, extraer de GSC las consultas con impresiones y priorizar el contenido de las fases B y E con datos, no con hipótesis.
10. **Backlinks:** sin dominio no hay perfil que medir. Tras publicar, Common Crawl y Bing desde el plugin (`seo-backlinks`).
