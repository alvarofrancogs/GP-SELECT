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

## Tercera ronda · iPhone (17-10-2026, misma rama)

Tras desplegar la segunda ronda, el usuario prueba en su iPhone. Astra se quedó sin cuota de Codex (hasta las 21:19); con el visto bueno del usuario, lo implementó Opus y Gemini hizo la QA.

| ID | Sev. | Qué pasaba | Estado |
|---|---|---|---|
| MOB-15 | P1 | Al tocar ES/EN varias veces seguidas: los toques durante un cambio (~440 ms) se perdían y el temporizador de seguridad de un cambio anterior cortaba el fundido del siguiente (el texto cambiaba de idioma a la vista en 5 de 6 cambios con toques cada ~1 s). | **Arreglado.** `LanguageSwitcher` con un único temporizador compartido: en la salida manda el último toque (también volver al idioma actual); en la entrada, el toque espera a que acabe. 0 cambios a la vista con toques cada 120 a 1100 ms; idioma final = último toque. 4 tests nuevos. |
| MOB-16 | P1 | Hueco blanco bajo el Porsche (y bajo la escena del coche) pegado a la barra de Chrome. ScrollTrigger congela en píxeles la altura del pin al fijarlo; al esconderse la barra la pantalla crece sin refresh (GSAP lo ignora en táctil) y asomaba la página. Simulado: 68–83 % de papel en la franja nueva. | **Arreglado.** Mientras está fijada (`is-pinned`), cada escena pinta hasta un 25 % por debajo del pin: el coche del hero sobre el color de su carrocería, el oscurecido del hero, y el cielo y la luz de la escena del coche. 0–1 % de papel con la pantalla +80 px y +24 %. Escritorio sin cambios. |
| MOB-17 | P2 | El BMW empezaba sobre «un fondo blanco sin más»: el recorte vertical del cielo mostraba solo su carril central casi blanco. | **Arreglado.** En móvil se ve el 70 % central del cielo (los lados azules incluidos), algo estirado en vertical. |
| MOB-18 | P2 | En móvil de menos de 760 px de alto la escena del coche ocultaba el dato de cada estado. | **Arreglado.** Dato visible siempre; el coche aparca bajo el texto y sobre el botón, tan grande como quepa (máx. 38 %). ≥ 10 px de margen a 393×659, 375×667, 360×740, 390×844 y 430×932, ES y EN. |
| MOB-19 | P2 | «Demasiado recorrido» (elegido por el usuario). | **Hecho.** En móvil: hero 1,7 → 1,25 vh, Process 2,125 → 1,6 vh, escena del coche al 0,55 tras el relevo (4,28 → 3,03 vh). Home a 393×659: 7.519 → 6.056 px (−19 %; −27 % en las escenas). Escritorio idéntico (9.689 px). |

Pendiente: prueba en el iPhone del usuario; revisión a ojo de Astra (ritmo y composición nuevos en móvil) cuando vuelva su cuota.

## Revisión de diseño de Gemini (17-10-2026, misma rama)

El usuario pidió Gemini 4 Argon en high; la CLI de Gemini conoce el modelo pero esta cuenta no lo tiene (fallo conocido de la CLI), así que la hizo Gemini 3.8 Flash High, solo lectura, sobre 77 capturas de la web publicada (393×659 ES/EN, 320×568, 1440×900) y los mockups de la Home. Capturas en Edge: el WebKit de Playwright en Windows dibuja mal el eje de anchura de Archivo (letras finas y huecos tipo «El m ercado»; el iPhone no se ve afectado).

| ID | Sev. | Qué pasaba | Estado |
|---|---|---|---|
| MOB-20 | P2 | Parpadeo en las entradas escalonadas de Services (segunda línea del titular y filas del acordeón) y del destacado (segunda línea del titular, marca, modelo, datos y enlace): se veían, caían casi a 0 y volvían a entrar. Con `invalidateOnRefresh`, el refresh inicial de ScrollTrigger deja sin su estado de partida a todo `fromTo` escalonado salvo el primero. Gemini lo rozó (fila «Kilometraje» medio transparente); la causa salió al medirlo. | **Arreglado.** Fuera `invalidateOnRefresh` en esas tres líneas de tiempo (solo valores fijos). Detector de parpadeos en toda la Home: 5 → 0 en Edge (móvil y escritorio) y 2 → 0 en WebKit, ES y EN; reversibles al subir y tras un cambio de tamaño. La escena del coche también invalida (sus valores dependen del alto) y no parpadea. |
| — | — | Resto de hallazgos de Gemini: CTA fijo «Ver catálogo», faltan la sección Europa y el cuestionario final, la cabecera desaparece, franja de cielo sobre Services, choque Process/coche a 320×568, enlaces de cabecera y footer, filete suelto arriba. | Descartados: decisiones registradas (CTA global único; Europa sustituida por la escena del coche; fuera el bloque «Encuentra tu próximo coche»; la cabecera se esconde al bajar y vuelve al subir), el telón de Services en marcha, dos secciones estáticas seguidas (< 600 px de alto) y un botón cortado por el borde. Queda para Astra: el dato de «Toda Europa» alineado a la derecha en móvil (cinco líneas de lectura irregular). |

## Revisión de Astra · móvil (18-10-2026, misma rama)

Astra (high) revisó a ojo la Home en móvil sobre 83 capturas en Edge con datos reales (393×659 ES/EN, 375×667, 430×739): hero, Process, escena del coche, Services, destacado y footer. Sin P1.

| ID | Sev. | Qué pasaba | Estado |
|---|---|---|---|
| MOB-21 | P2 | «Toda Europa» alineaba a la derecha la descripción y el dato de cinco líneas: lectura irregular. | **Arreglado (Astra).** Mismo borde izquierdo de lectura en los tres estados; el titular sigue a la derecha. |
| MOB-22 | P2 | En móviles bajos (375×667) el coche recién aparcado rozaba el botón «Ver catálogo». | **Arreglado (Astra).** Más margen bajo el coche (5,75 → 7,25 rem). ≥ 13 px hasta el botón y ≥ 36 px hasta el texto a 393×659, 375×667, 360×740, 390×844 y 430×932, ES y EN. |
| — | — | Al entrar desde abajo, el coche pasa por detrás del botón fijo. | Aceptado: es la entrada del coche, igual que en escritorio. Quitarlo pediría otra máscara o movimiento. |

Comprobado por Astra y por Opus: 240 tests, typecheck, lint y build; 0 parpadeos (Edge y WebKit, ES y EN); 0–1 % de papel con la barra escondida; escritorio sin cambios (el cambio vive solo en `max-width: 1023px`). Pendiente: el texto legal pequeño del footer (MOB-07) y la revisión de las entradas nuevas de Vehículos y la ficha.

Recomendado por Astra y Opus, sin implementar: si en el iPhone siguen viéndose saltos al fijarse o soltarse una escena, el siguiente paso es pasar los pins de `position: fixed` puesto por JS a `position: sticky` (los mueve el compositor, sin el retraso del hilo principal). Exige rehacer alturas y solapes y validar toda la coreografía. Otros riesgos anotados por Astra: máscara animada y `multiply` a pantalla completa en el coche (perfilar en iPhone real antes de tocarlos) y umbrales de Services y del destacado medidos con la barra del navegador anterior.
