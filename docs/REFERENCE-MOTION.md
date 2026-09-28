# GP SELECT — referencia de motion

Destilado de Jesko Jets (web en vivo medida con Playwright a 1440×900, el 28-09-2026) y del vídeo `2026-09-26 15-54-09.mp4`, que es una **grabación de pantalla recorriendo Jesko Jets**, no un vídeo propio de GP SELECT. Solo sirve como referencia de movimiento; el diseño lo mandan los mockups. No volver a abrir ninguno de los dos salvo que surja una duda concreta.

## Mecánica general de Jesko

- GSAP 3.13 + ScrollTrigger + SplitText + CustomEase, con Lenis para el smooth scroll. **No usa pin-spacers**: cada escena es una sección alta (3–4 viewports) con un hijo `position: sticky` de 100vh. Los timelines van con `scrub: true` o con un `scrub` de 0,5–1,2 s para dar inercia.
- Página total de unas 12 alturas de viewport. El ritmo alterna escenas fijadas largas (2–3 vh de scroll) con tramos de scroll libre cortos (~1 vh).
- La mayoría de tweens scrubbed usan `ease: none`: el progreso del scroll es la curva. Las eases propias se reservan para el zoom del vehículo (`In`, que acelera tarde: 0 → 0,07 al 50 % → 1) y para las entradas de texto disparadas por umbral (`Out`, que frena al final).
- **Blur**: las líneas de texto entran desde `blur(36px)` + opacidad hasta enfocar. El blur es grande y corto, no un blur sutil permanente.
- **Masks**: `mask-image` con degradado, animando `--mask-size` / `--mask-y`, para conseguir barridos verticales de borde suave (sustitución foto → plano, salida de la lista de ciudades). No usa clip-path de borde duro.
- **Texto**: los titulares se revelan por líneas o caracteres con SplitText. Los párrafos largos van carácter a carácter con opacidad 0,15 → 1, scrubbed en unas 0,4 vh.

## Escenas y equivalencias con GP SELECT

| # | Jesko (rango en vh) | Qué pasa | Equivalente en GP SELECT |
|---|---|---|---|
| 1 | Hero ventanilla (0–3, sticky 1) | Al cargar, la cortinilla sube y aparece el cielo. Dos titulares flanquean la ventanilla. En 0→2 vh: el fondo escala 1→6,5, la escena escala 1→8 (se atraviesa la ventanilla) y los titulares salen a ±50vw. El cielo baja 100vh. | Hero «Curated / Luxury» con la ventanilla del coche. **Atravesar el cristal hacia el cielo** conecta con el cielo del BMW. |
| 2 | About (2–4,3) | Párrafo grande sobre las nubes, revelado carácter a carácter. El bloque se desplaza de −50vh a −200vh (más rápido que el scroll). | `PerformanceScene` (escena tipográfica del proceso). |
| 3 | Jet (4–8, sticky 1) | 4,0→5,5: el fondo cielo funde a crema (opacidad). «Fly in / Luxury» entra desenfocado y enfoca. 4,5→6,4: el jet cenital entra por abajo, entre las dos palabras, y recorre la pantalla (escala 1→0,4, yPercent −15, ease `In`). 5,5→6,4: el jet y las fichas técnicas salen hacia arriba. 6,4→7: barrido con máscara de foto → plano técnico. | `VehicleScene` BMW «German / Performance» cenital. El cambio de faros apagados/encendidos (`bmw_m4_faros_*.png`) puede ocupar el lugar del barrido foto → plano. |
| 4 | «A better way to fly» (7–9) | Fondo crema, acordeón de 4 ítems, foto grande a la derecha que cambia según el ítem. Parallax de la foto de −30 → +10 yPercent, scrub 0,5. | `ServicesSection` «Más que un coche». |
| 5 | Handoff crema → oscuro (≈8,1–9,1) | El panel crema, con una barra de datos y hora local, **sale hacia arriba como un telón** y aparece el oscuro. «Fly anywhere →» + lista vertical de ciudades rotando, con máscara. | Entrada a `EuropeSection`. La lista de países del mockup (Germany…Spain) encaja como lista rotatoria. |
| 6 | Global (9,1–12, sticky 1) | Palabra gigante «Global» de fondo, que sube 33em → 0. El globo entra desde yPercent 135 y escala 2→1. Tarjeta tipo billete «5K+ flights». Footer y contacto dentro de la misma escena oscura. | `EuropeSection` (mapa + GLC) → CTA del cuestionario → footer. |

## Reglas aplicables a GP SELECT

1. **Continuidad**: cada escena hereda algo de la anterior (cielo → cielo, color de fondo por fundido, telón). No hay cortes secos entre escenas fijadas.
2. **El vehículo es el protagonista del movimiento**: entra por abajo, entre titulares partidos, y el texto le deja paso lateralmente o se queda detrás.
3. **Pin**: entre 2 y 3 vh por escena protagonista; entre 1 y 1,5 vh para las secundarias.
4. **Scroll y movimiento**: lineal (`scrub`) para el recorrido. Las eases se reservan a zooms y entradas de texto.
5. Blur solo en entradas y como paso de desenfocado a enfocado. Máscaras con borde suave.
6. Implementarlo con **scroll nativo** y la arquitectura actual (`ScrollScene` / `useGsapScene`). Lenis no es obligatorio. Mantener la reversibilidad y `prefers-reduced-motion`.

## Tipografía observada (solo como dato)

Los titulares de Jesko usan **GT America Extended**. Los mockups de GP SELECT usan dos familias:
- una **grotesca extendida** en hero, BMW, logo y navegación;
- una **grotesca normal black + thin/light** en servicios, Europa y el CTA del cuestionario.

Elegir equivalentes le corresponde a Astra.
