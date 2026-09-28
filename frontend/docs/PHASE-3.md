# GP SELECT: fase 3, implementación y revisión

## Estado real

Implementadas las secciones restantes de HOME, sin avanzar a fase 4. Servicios y Europa se compararon con sus PNG a 1440 y 1920px. La preview de vehículos solo se ha podido construir conforme a la descripción «destacado grande + fila inferior»: el mockup aprobado «Premium vehicles» no está entre los seis PNG disponibles. Se ha solicitado su archivo/ruta. No se declara una réplica exacta ni se cierra la validación visual de esa preview.

Siguen vigentes las restricciones de assets de la fase anterior. Las composiciones aprobadas son referencias, no fondos utilizables. No se han extraído imágenes, trazado mapas, inventado fotografías ni incrustado mockups.

## Implementación

- `ServicesSection.tsx`: fondo crema, distribución 52/48, titular grueso y fino, cuatro acordeones accesibles, divisores, imagen y CTA al catálogo. Un solo acordeón abierto, con relación botón/panel y operación por teclado. La altura crece con el contenido y refresca las mediciones posteriores de ScrollTrigger.
- `InventoryPreview.tsx` y `VehiclePreviewCard.tsx`: destacado y tres modelos de ejemplo. Aviso explícito de que no representan vehículos en venta. No se inventan precios, kilometraje ni disponibilidad. Incluye estados vacío, carga y error.
- `EuropeSection.tsx` y `useEuropeScene.ts`: escena oscura con tipografía izquierda, capa cenital central, slot de mapa derecho, países y CTA inferior. Timeline independiente con scroll nativo, scrub, posiciones reversibles y reduced motion.
- `Footer.tsx`: navegación existente, consulta contextual y retorno al inicio con restauración de foco. No hay datos de contacto, redes o documentos legales inventados.

Cada bloque tiene CSS y diccionarios ES/EN propios, apoyados en el proveedor de idioma existente. No se duplican páginas ni familias tipográficas. Las escalas adicionales son variables locales de cada sección; los tokens globales aprobados se conservaron intactos.

Lectura de diseño: continuación de una homepage de automoción premium, no rediseño. Variación 7, movimiento 8 y densidad 3 como descripción del sistema existente, no como permiso para cambiarlo. Las guías de frontend se aplicaron a consistencia, accesibilidad y composición; las reglas genéricas contrarias al brief (cambiar fuentes, evitar crema, generar imágenes, añadir otra biblioteca o imponer un único fondo claro/oscuro) no se aplicaron. ScrollTrigger orientó limpieza, refresh y reduced motion.

## Protección de fase 2

Sin cambios en `useGsapScene.ts`, `HeroScene.tsx`, `PerformanceScene.tsx`, `VehicleScene.tsx`, `tokens.css` y `global.css`; sus SHA-256 coinciden antes/después.

Se ajustó únicamente el selector de solape en `scenes.css`: antes dependía de `:not(:last-child)`. Añadir servicios convertiría accidentalmente BMW en una sección con margen negativo. Ahora el selector identifica explícitamente hero y proceso, preservando los mismos dos solapes de 50svh. No se modificaron tiempos, easings, distancias, pin ni capas originales.

Nueve capturas de regresión: tres escenas a 1440×900, 1920×1080 y 390×844. Ocho son idénticas píxel a píxel; el hero de 1920 difiere en 155 píxeles de texto sobre 2.073.600 (0,0075%). Posiciones, alturas, tipografía CSS y progreso de las nueve composiciones coinciden. No se afirma igualdad binaria total.

La herramienta Argent no estaba disponible; la comparación se realizó con PNG del navegador, lectura de píxeles en Windows y verificación de geometría, además de inspección visual.

## Assets

Los nuevos manifiestos `servicesAssets.ts`, `inventoryAssets.ts` y `europeAssets.ts` reutilizan los SVG estructurales de `/assets/temp/`. Ninguna fotografía real está disponible todavía.

Pendientes:

1. Mockup aprobado «Premium vehicles» para conocer su geometría exacta.
2. Fotografía independiente de servicios (y variantes si se quieren asociar a cada acordeón).
3. Fotografías independientes del destacado y fila de vehículos.
4. Mercedes GLC cenital, mapa europeo y textura/fondo oscuro independientes.
5. Fuente exacta y logotipo oficial si están disponibles.

El asset se cambia desde el manifiesto; `temporary: false` elimina la etiqueta provisional. El oscurecimiento de Europa solo se aplica a los placeholders. No se obliga a oscurecer la fotografía definitiva.

## Datos y conversión

`types/inventory.ts` refleja `VehiclePublicCardDto` del backend actual, sin inventar propiedades públicas. `mapPublicVehicleCard` es un adaptador puro de slug, marca, modelo, variante, año/mes, precio EUR e imágenes ordenadas por portada.

Los ejemplos no tienen slug comercial y enlazan al contexto `intent=search`. Los registros publicados futuros enlazarán al contexto `intent=vehicle` con slug real. El footer utiliza `intent=information`. Todo conduce a la ruta preparada de cualificación; el formulario y su envío siguen pendientes y la pantalla lo indica. No se crean endpoints ni se simula un envío correcto.

## Comparación con los PNG y ajustes

Servicios: referencia `16_59_27.png`, 1817×866. Gutter local de escritorio corregido a 3,816vw (referencia aproximada 3,8vw), separación 52/48, imagen derecha, títulos en dos líneas y cuatro divisores. Se corrigió el texto EN a «Full inspection» y se apartó la etiqueta provisional del CTA. La altura se adapta al viewport y a los paneles abiertos.

Europa: referencia `17_00_01.png`, 1672×941. Coche a 38% del ancho, ancho 24%, posición vertical 15% y altura 68%; mapa derecho desde 70%. Se ajustó la escala local ES/EN para separar los titulares del coche. En móvil se sustituyeron las dos columnas de países por una columna para evitar el solapamiento de «NETHERLANDS».

Diferencias que permanecen: fotografía, siluetas, luz, textura y cartografía ausentes; fuente y wordmark provisionales; distinta longitud de traducciones. Se conserva la cabecera aprobada de fase 2 en vez de introducir las variantes de cabecera que aparecen en los otros mockups. El footer es una composición coherente con los tokens actuales: no existe un PNG de footer independiente. La preview de inventario no puede compararse contra una referencia que falta.

## Verificaciones

| Prueba | Resultado |
|---|---|
| ESLint | Correcto |
| TypeScript | Correcto |
| Build Vite | Correcto, 88 módulos |
| Bundle JS | 405,99 kB; gzip 138,01 kB |
| CSS | 30,56 kB; gzip 6,29 kB |
| Regresión funcional fase 2 | 67/67 |
| Navegador fase 3 | 86/86 |
| Adaptador y estados de inventario | 11/11 |

La matriz nueva cubre ES/EN a 1440×900, 1920×1080, 390×844 y 320×700: texto visible, overflow, footer, países, cuatro acordeones, teclado, reversibilidad europea tras cambios de altura, CTA contextual, limpieza de pins al salir de HOME y reduced motion. También comprueba ventana baja 667×375. Sin errores de ejecución ni respuestas HTTP fallidas durante la matriz final. Pruebas en Chromium con viewports emulados, no en teléfonos físicos.

Auditoría adicional sobre la build de producción: [Lighthouse JSON](qa-phase3/lighthouse.json), rendimiento 78, accesibilidad 96 y buenas prácticas 100; LCP simulado 2,7s y CLS 0. No equivale a certificación de rendimiento en dispositivos reales. Señala trabajo de main thread, JS sin usar y contraste 4,19:1 en una etiqueta pequeña de asset provisional compartida con fase 2 (objetivo 4,5:1). No se retocaron las etiquetas originales ni sus fuentes durante esta ampliación. El informe se generó sin error de auditoría, pero el comando terminó con EPERM al limpiar el directorio temporal de Chrome en Windows; se conserva esa limitación, no se registra como ejecución CLI limpia.

## Evidencias

| Sección | 1440 ES | 1920 ES | Referencia EN a 1920 |
|---|---|---|---|
| Servicios | [Captura](qa-phase3/1440-services-es.png) | [Captura](qa-phase3/1920-services-es.png) | [Captura](qa-phase3/1920-services-en.png) |
| Preview provisional | [Completa](qa-phase3/1440-inventory-full-es.png) | [Completa](qa-phase3/1920-inventory-full-es.png) | [Completa](qa-phase3/1920-inventory-full-en.png) |
| Europa | [Captura](qa-phase3/1440-europe-es.png) | [Captura](qa-phase3/1920-europe-es.png) | [Captura](qa-phase3/1920-europe-en.png) |
| Footer | [Captura](qa-phase3/1440-footer-es.png) | [Captura](qa-phase3/1920-footer-es.png) | [Captura](qa-phase3/1920-footer-en.png) |

Móvil: [Servicios](qa-phase3/390-services-es.png), [Europa EN 320](qa-phase3/320-europe-en.png), [Europa reduced motion](qa-phase3/390-europe-reduced.png). Baselines de fase 2 en `qa-phase3/before/`; capturas posteriores en `qa-phase3/after/`.

Scripts reproducibles desde la raíz del workspace, con Vite en 5173:

```powershell
npx --yes @playwright/cli -s=gp-phase3 open http://127.0.0.1:5173/
npx --yes @playwright/cli -s=gp-phase3 --raw run-code --filename=.playwright-cli/verify-phase2-in-phase3.js
npx --yes @playwright/cli -s=gp-phase3 --raw run-code --filename=.playwright-cli/verify-phase3.js
node .playwright-cli/verify-inventory.mjs
& ./.playwright-cli/compare-regression.ps1
```

## Límite

Backend intacto. Sin fase 4, sin API de leads, sin administración nueva, sin pagos ni CRM. Para cerrar la fidelidad de la preview falta el mockup «Premium vehicles»; no se ha sustituido esa aprobación por una decisión del agente.
