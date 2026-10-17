# Auditoría móvil · 17-10-2026

Web auditada: `https://gpselect.31-70-158-233.sslip.io` (build de `main` @ `36efaba`). Opus con Playwright (Chromium, Pixel 7, 360 y 390 de ancho). Sin errores de JavaScript ni desbordes horizontales en 10 rutas × 2 anchos; los fallos eran de motion, carga y capas.

Reportado por el usuario en su móvil: «crashea», las letras parpadean, al hacer scroll en la Home se separan cosas y en Vehículos los coches aparecen de golpe al llegar los datos del backend.

Astra y Gemini no estaban disponibles (solo funcionan en el portátil): con el visto bueno del usuario, Opus implementó en `fix/mobile-audit`.

## Hallazgos y estado

| ID | Sev. | Qué pasaba | Estado |
|---|---|---|---|
| MOB-01 | P1 | Los pins medían `100svh` y los solapes mezclaban `svh` y `vh`, pero ScrollTrigger medía con `innerHeight`, que crece al esconderse la barra del navegador: franja crema de 84 px bajo el hero, Process y el bloque del coche, y saltos de hasta 370 px. | **Arreglado.** Pins y solapes en `100lvh` (fallback `100vh`); `useGsapScene` mide con la altura del pin. Simulando la barra visible y escondida: 0 franjas. |
| MOB-02 | P1 | Catálogo desde el menú: «Cargando vehículos…» con el bloque final arriba y, al llegar la lista, todo entraba de golpe y lo empujaba una pantalla. | **Arreglado.** Se reutiliza la última lista leída (`lastVehicles`) y se refresca detrás; sin lista, `VehicleGridPlaceholder` reserva filtros y fichas. Desde la Home: sin movimiento; desde otra página: sin saltos dentro de la pantalla. |
| MOB-03 | P1 | Letras que parpadean: `filter: blur()` con scrub en los titulares (hero, coche, Servicios) y Process; header fijo con `mix-blend-mode: difference`; CTA con `backdrop-filter` sobre escenas en movimiento. | **Arreglado (sin dispositivo real).** En táctil (`max-width: 1023px` o `pointer: coarse`) el mismo motion sin blur; header sin blend (≤ 1199 px o táctil), blanco sobre capas oscuras medidas por posición; CTA con tinte sólido. Contraste del header ≥ 3:1 en toda la Home y 5 páginas interiores. |
| MOB-04 | P2 | El CTA «Ver catálogo» tapaba el detalle del destacado y los enlaces del footer. | **Arreglado.** Se aparta sobre el footer (y, en móvil, sobre el destacado); vuelve con el foco de teclado. |
| MOB-05 | P2 | Scrub con retardo dentro de pins: con la inercia del dedo el contenido seguía moviéndose. | **Arreglado.** Retardo a la mitad en táctil. |
| MOB-09 | P2 | Petición del usuario: hacía falta mucho scroll en las escenas. | **Hecho.** Hero y Process 15 % más cortos (oscurecido del hero ajustado a su nuevo final); el coche, 15 % más corto tras el relevo de Process (0,75 vh, fijado por el solape CSS). Home: 10.820 → 9.725 px en móvil, 11.893 → 10.591 px en 1440. Misma secuencia, sin franjas, header ≥ 3:1 en toda la Home. |
| MOB-06 | P3 | Zonas táctiles pequeñas. | Falso positivo: en táctil ya tienen área invisible de 44 px (`global.css`). |
| MOB-07 | P3 | Texto a 10 px (legales del footer, pies de foto, placeholders). | Pendiente: escala tipográfica, decisión de Astra. |
| MOB-08 | P3 | Imágenes con poca resolución. | Falso positivo: el `srcset` sirve la resolución correcta. |

Escritorio 1440: antes de MOB-09, Home idéntica al píxel frente a producción salvo el CTA apartado sobre el footer; MOB-09 acorta el scroll también en escritorio. Vitest 232/232, lint, typecheck y build OK. Consola limpia en 9 rutas × 360/390 × motion/reduced (solo el 404 esperado).

«Crashea»: sin excepciones JS ni imágenes enormes (9,3 Mpx decodificados, ~1 MB en toda la Home). Si tras esta rama la pestaña sigue cerrándose, falta saber el móvil y el navegador.

## Pendiente

- **Prueba en móvil real** (iOS Safari y Chrome Android): parpadeo, barra del navegador y CTA.
- **Astra:** revisar a ojo el motion sin blur en móvil y MOB-07.
- **Gemini (READ-ONLY):** 390 y 360, ES/EN, motion y reduced-motion; Home completa en ambos sentidos; catálogo con red lenta; CTA sin tapar texto; consola y `git status --short`.
