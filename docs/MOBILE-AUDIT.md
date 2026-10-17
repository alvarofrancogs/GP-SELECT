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

## Segunda ronda · iPhone (17-10-2026, rama `fix/mobile-ios`)

Con `fix/mobile-audit` desplegado, el usuario sigue viendo en iPhone (Safari y Chrome, los dos WebKit) saltos, piezas descolocadas y tirones al hacer scroll en la Home, y el texto parpadea al cambiar de idioma. Opus midió con Playwright WebKit 26 (iPhone 15 emulado), producción frente a la rama; Astra revisó el motion y Gemini hizo la QA.

| ID | Sev. | Qué pasaba | Estado |
|---|---|---|---|
| MOB-10 | P1 | `ScrollTrigger.refresh()` corría 5 veces en un solo recorrido de la Home: con cada imagen que llegaba tarde a una escena (escuchas de `load`) y con las fuentes. Sin argumento es un refresh forzado: saca cada pin de su `pin-spacer`, lo vuelve a meter y hace `scrollTo(0)` y vuelta. En iPhone eso corta la inercia del dedo y recoloca las escenas. | **Arreglado.** `scheduleScrollRefresh` usa `refresh(true)`, que espera a `scrollEnd` mientras se hace scroll o el dedo sigue en la pantalla. Fuera las escuchas de `load`: todas las imágenes de las escenas van en cajas con tamaño fijado por CSS. 0 refresh durante el scroll (antes 5); mutaciones de `pin-spacer` 75 → 0. |
| MOB-11 | P1 | Parpadeo doble al cambiar de idioma: el refresh pedido por el texto nuevo caía en el fundido de entrada, reinsertaba los pins y `@starting-style` volvía a ocultar el texto (alfa 0 → 0,86 → 0 → 1). | **Arreglado.** El refresh espera a que no haya `lang-out` ni `lang-in`. 0 recaídas en 9 posiciones de scroll (antes, todas las líneas visibles). |
| MOB-12 | P2 | Al subir, la escena del coche se fijaba antes de tiempo (`anticipatePin` también anticipa la vuelta): saltaba ~34 px a 30 y 60 px/fotograma, más con un golpe de dedo, con el estado final en pantalla. | **Arreglado (Astra).** `anticipatePin: 0` en táctil; al bajar el pin empieza tapado por Process. Escritorio sin cambios. |
| MOB-13 | P2 | Al volver a la Home desde otra página, el montaje diferido del coche creaba su pin tarde y GSAP encola entonces un refresh forzado: si el visitante ya hacía scroll (< ~250 ms), se lo cortaba. Visto por Astra. | **Arreglado.** Diferido solo bajo el preloader; por navegación interna se monta en el acto. 0 scroll programático durante el gesto a 50 y 300 ms (antes 10 llamadas). |
| MOB-14 | P2 | Fundido del idioma: el texto anidado que hereda el color de un bloque que también se funde (marca y modelo del destacado, números y subtítulos de Process, pies de foto) se quedaba atrás y aparecía de golpe al final (+44 a +100 puntos en un fotograma). Previo a esta rama. | **Arreglado (Astra).** Un único progreso heredado (`--language-alpha`, `@property`) pinta las letras con `-webkit-text-fill-color` y funde enteros los enlaces y botones de palabra con `filter: opacity()`, sin tocar `color`, `opacity` de GSAP, fotos ni filetes. 0 saltos en 6 posiciones de la Home con datos reales (producción, con el mismo probe: saltos en 5 de 6). |
| — | — | Lecturas por fotograma del header y del CTA (`elementsFromPoint`, estilos). | Descartado: ~0,2 ms por fotograma en WebKit. |

Recomendado por Astra y Opus, sin implementar: si en el iPhone siguen viéndose saltos al fijarse o soltarse una escena, el siguiente paso es pasar los pins de `position: fixed` puesto por JS a `position: sticky` (los mueve el compositor, sin el retraso del hilo principal). Exige rehacer alturas y solapes y validar toda la coreografía. Otros riesgos anotados por Astra: máscara animada y `multiply` a pantalla completa en el coche (perfilar en iPhone real antes de tocarlos) y umbrales de Services y del destacado medidos con la barra del navegador anterior.
