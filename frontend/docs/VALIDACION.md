# GP SELECT — entrega y validación de fase 2

Fecha: 27 de septiembre de 2026. Alcance: vertical slice HOME con recursos estructurales provisionales. No se inicia fase 3.

## Resultado

Frontend React + TypeScript + Vite creado en `frontend/`, separado del backend .NET. Tres escenas DOM con capas independientes: hero lateral, proceso tipográfico oscuro y composición BMW M3 cenital. ES inicial y EN persistente. Las otras rutas están registradas pero muestran únicamente una pantalla de alcance pendiente.

## Estructura y archivos principales

```text
frontend/
  src/
    components/   Header, LanguageSwitcher, Button, Container, ScrollScene, AssetSlot
    sections/     HeroScene, PerformanceScene, VehicleScene
    pages/        Home, PlannedPage
    layouts/      SiteLayout
    hooks/        useGsapScene
    lib/          qualification
    services/     README de integración pendiente
    styles/       tokens.css, global.css, scenes.css
    assets/       sceneAssets.ts
    i18n/         es.ts, en.ts, tipos, contexto y proveedor
    types/        qualification.ts
    App.tsx
    main.tsx
  public/assets/temp/
  docs/qa/
  package.json
  package-lock.json
  vite.config.ts
  eslint.config.js
  tsconfig*.json
```

Los tokens centralizan familias, escalas, pesos, tracking, espaciados, colores, bordes, radios, easing y capas. Las familias siguen siendo provisionales. Los calibres ingleses de German/Performance se ajustan por separado en tokens porque las anchuras de esta fuente difieren de la referencia; no se deforma el texto con scaleX.

## Animación

`ScrollScene` mantiene SECTION → contenedor fijado → fondo/medio/tipografía/UI. `useGsapScene` coordina un timeline reversible por sección con GSAP y ScrollTrigger. Desplazamiento vertical, escala moderada, desenfoque, revelado por máscara e iluminación secuencial del texto. Las secciones animadas se solapan 50svh para anticipar la entrada siguiente. El fondo tiene margen inferior adicional para no descubrir franjas durante el parallax.

Scroll nativo, limpieza al salir de HOME y refresco al cambiar tamaño, fuentes y texto. Reduced motion y ventanas de menos de 600px de altura muestran composiciones estáticas sin pin. Se aplicaron las guías de ScrollTrigger y la revisión de buenas prácticas React para este ciclo de vida; no se añadió otra biblioteca de movimiento.

## Assets temporales y recursos pendientes

Se utilizaron exactamente tres SVG de geometría simple:

- `background-plane.svg`: reserva plana del fondo limpio.
- `lateral-plane.svg`: reserva de posición del vehículo lateral.
- `overhead-plane.svg`: reserva de posición del BMW cenital.

Sus rutas y estado temporal están en `src/assets/sceneAssets.ts`. No hay PNG de mockup importado, fondo completo incrustado, extracción de elementos ni fotografía generada.

Faltan el coche lateral independiente, su fondo limpio, BMW M3 cenital aislado, fondo cenital y posibles sombras independientes. La tipografía exacta y un archivo de logotipo oficial también permitirían afinar la aproximación actual.

## Revisión visual y discrepancias

Se compararon las composiciones reales con los PNG de hero y BMW. Se revisaron posición, jerarquía, escala, márgenes, CTA, recortes, móvil y estados de transición. La escena oscura procede de la secuencia de la auditoría aceptada: no existe un PNG dedicado a ella.

Correcciones tras revisión:

- Recorte de Performance en inglés: eliminado el límite de caja incorrecto y ajustados tokens ópticos.
- Tracking excesivamente solapado: reducido de −.065em a −.03em.
- Menú móvil en ventanas bajas: altura limitada y scroll interno.
- Franja inferior durante parallax: fondo con overscan del 3%.
- Pausa entre escenas: entrada de la siguiente adelantada mediante solape.
- Propuesta de endpoint unificada en `/api/public/enquiries`; no implementada.
- Favicon sin recurso aprobado: marcador vacío para evitar petición 404, sin inventar identidad.

Permanecen diferencias deliberadas: los planos provisionales no reproducen silueta, luz, reflejos, nubes ni sombras; los glifos y el wordmark tipográfico no son idénticos; el español cambia las longitudes; los textos secundarios usan copy provisional de diccionario. No se afirma coincidencia pixel-perfect. La escena BMW mantiene ambos titulares gruesos como su PNG; el peso fino está disponible para texto secundario y composiciones posteriores.

## Comprobaciones técnicas

| Comprobación | Resultado |
|---|---|
| `npm run lint` | Correcto, sin errores |
| `npm run typecheck` | Correcto, sin errores |
| `npm run build` | Correcto, Vite 7.3.6, 69 módulos |
| Bundle JS | 390.17 kB; gzip 133.35 kB |
| CSS | 17.28 kB; gzip 4.13 kB |
| Matriz de navegador Chromium | 67/67 comprobaciones correctas |
| Errores JS durante matriz | Ninguno |
| Respuestas locales fallidas durante matriz final | Ninguna |

La matriz comprueba texto real con Range (no solo cajas CSS) en ES/EN, desbordamiento horizontal, reversibilidad de las tres timelines, rueda lenta y saltos de scroll, persistencia de idioma, navegación SPA desde CTA, limpieza de pins, rutas preparadas, menú/Escape/foco, menú horizontal y reduced motion.

Viewports: 1440×900, 1672×941, 1920×1080, 820×1180, 390×844, 320×700; comprobación adicional de menú a 667×375. Son emulaciones de viewport en Chromium, no pruebas en dispositivos físicos ni certificación Safari/Firefox. No se han comprobado formularios, autenticación ni inventario conectados: están fuera de esta fase.

## Capturas reales

| Viewport | Hero | Proceso | BMW cenital |
|---|---|---|---|
| 1440 ES | [Hero](qa/1440-hero-es.png) | [Proceso](qa/1440-process-es.png) | [BMW](qa/1440-vehicle-es.png) |
| 1672 ES | [Hero](qa/1672-hero-es.png) | [Proceso](qa/1672-process-es.png) | [BMW](qa/1672-vehicle-es.png) |
| 1920 ES | [Hero](qa/1920-hero-es.png) | [Proceso](qa/1920-process-es.png) | [BMW](qa/1920-vehicle-es.png) |
| 820 ES | [Hero](qa/820-hero-es.png) | [Proceso](qa/820-process-es.png) | [BMW](qa/820-vehicle-es.png) |
| 390 ES | [Hero](qa/390-hero-es.png) | [Proceso](qa/390-process-es.png) | [BMW](qa/390-vehicle-es.png) |
| 320 ES | [Hero](qa/320-hero-es.png) | [Proceso](qa/320-process-es.png) | [BMW](qa/320-vehicle-es.png) |
| 1672 EN | [Hero](qa/1672-hero-en.png) | [Proceso](qa/1672-process-en.png) | [BMW](qa/1672-vehicle-en.png) |

Además: [reduced motion](qa/390-reduced-motion.png), [menú horizontal](qa/667-landscape-menu.png), [handoff hero](qa/handoff-hero-1.png), [handoff BMW](qa/handoff-process-1.15.png). Las capturas son de la interfaz ejecutada; los recortes parciales en handoff corresponden intencionadamente a un estado intermedio del scroll.

Scripts de reproducción en la raíz del workspace: `.playwright-cli/verify-phase2.js` y `.playwright-cli/verify-handoffs.js`. Con Vite activo en 5173, desde la raíz:

```powershell
npx --yes @playwright/cli -s=gp-phase2 open http://127.0.0.1:5173/
npx --yes @playwright/cli -s=gp-phase2 run-code --filename=.playwright-cli/verify-phase2.js
npx --yes @playwright/cli -s=gp-phase2 run-code --filename=.playwright-cli/verify-handoffs.js
```

## Backend y límite de entrega

Ninguna modificación al backend, Domain, DTOs, endpoints o autenticación. No se envían leads ni datos personales. El cuestionario solo tiene contratos y contexto de navegación preparados; su endpoint mínimo está propuesto en PHASE-2.md, pendiente de aprobación. No hay pagos, CRM ni funcionalidades de fase 3.

La revisión independiente de frontend detectó el menú corto y la discrepancia documental, ambos corregidos. Los especialistas de UI y motion revisaron sus ajustes; el orquestador comprobó las capturas y la matriz final. La fase se cierra en este alcance estructural con los assets pendientes explicitados.
