# Safari 26 (iOS) — bordes de pantalla

Reglas leídas en el código de WebKit (`Source/WebCore/page/LocalFrameView.cpp`, `fixedContainerEdges`, y `Source/WebKit/UIProcess/API/Cocoa/WKWebView.mm`, `_updateFixedColorExtensionViews`), no deducidas de artículos. Skills instaladas: `safari26-liquid-glass` y `mobile-native` (`.agents/skills/`).

## Cuándo Safari pinta una barra sólida

- Para cada borde (arriba y abajo) hace un hit-test en el centro, 4 px dentro del rect de layout de los `fixed`, ignorando inicialmente `pointer-events`, y sube por los ancestros del elemento que encuentra.
- Compara las dimensiones de cada ancestro `fixed`/`sticky` con el viewport: < 90 % es `Smaller`, de 90 % a < 105 % es `Similar`, y ≥ 105 % es `Larger`. `Similar` en ambos ejes es `IsViewportSizedCandidate`; `Smaller` en ambos es `TooSmall` y sigue subiendo. Los pins de la Home son candidatos viewport-sized: Safari pinta la barra con el fondo de la capa o con una muestra de 2 px. También descarta capas demasiado grandes, candidatos viewport-sized con z-index negativo y capas ocultas o casi transparentes.
- Una capa sin fondo, sin backdrop-filter, sin hijos y no reemplazada se considera oculta, igual que `visibility: hidden` u opacidad < ~0,1. Si la capa descartada como oculta tiene `pointer-events: none`, repite el hit-test respetando esa propiedad.
- Si no la encuentra, el borde queda translúcido (el «liquid glass»): se ve la página pasando por debajo.
- `theme-color` no interviene. Que una escena esté fijada no obliga por sí solo a tener barras sólidas: depende del candidato encontrado por el hit-test.
- Lo que se ve al tirar más allá de los extremos de la página es el fondo del documento (`body` sobre `html`).

## Cómo lo aplica la web

- **Cabecera:** su caja fija mide el 87 % del ancho (`--header-inset: 6.5vw`). `.header-inner` vuelve a ocupar el 100 %, así que el logo, el menú y los idiomas no se mueven. Resultado: arriba el borde es translúcido en todas las páginas.
- **Menú abierto:** la cabecera vuelve al 100 % (`.site-header--menu`), y las dos barras quedan de papel sólido, como una hoja.
- **Escenas fijadas de la Home:** sus pins son candidatos viewport-sized (`Similar`/`Similar`). Dos guardas fijas de 40 % × 8 px, centradas arriba y abajo, interceptan el hit-test y resultan `TooSmall` en ambos ejes; sus ancestros no incluyen los pins. Se renderizan una vez en `SiteLayout`, fuera de las escenas, también en las páginas interiores. Tienen `pointer-events: none`, `aria-hidden` y fondo negro con alfa .004 (opacidad del elemento 1), para que WebKit no las descarte como ocultas y vuelva a tocar el pin. Su nivel `--z-edge-guard` queda encima de las escenas y debajo de la cabecera, su menú, el preloader y los diálogos. No cambia el pinning ni la composición; el menú abierto conserva el papel sólido.
- **Al tirar (y «tirar para recargar», activo de nuevo):** `#root` pinta la página, y el fondo de `body` sigue el scroll (`animation-timeline: scroll(root)`):
  - en la parte de arriba, el color de lo que hay arriba (el cielo del hero en la Home, papel en el resto);
  - en el último 1 %, el negro del pie.

  En Safari anterior al 26 queda siempre el color de arriba. Con «reducir movimiento» se mantiene, porque no es movimiento.
- **En un iPhone real (23-10-2026, Safari 26.6.1 y Chrome iOS):** las guardas no funcionan; sobre Hero, Process y CarHandoff las barras siguen sólidas. Una réplica del hit-test decía lo contrario: en el dispositivo Safari parece muestrear dentro de las barras (bajo la hora y sobre la barra inferior), donde las guardas de 8 px no llegan. Probado y descartado: pins fijos con borde transparente hasta 115lvh (23-10, peor en el iPhone) y escenas `sticky` de 115lvh en táctil (23-10; el usuario prefirió dejar la Home como estaba, 24-10). Lo único validado en el iPhone es una capa fija aislada de `calc(100lvh * 1.15)` en una página de laboratorio.
- **Guardas altas y laboratorio (28-10-2026, sin confirmar en un iPhone):** las guardas pasan de 8 a 140 px: la de arriba desde `top: 0` y la de abajo desde `100lvh - 140px` (la barra inferior queda por debajo del viewport pequeño), para cubrir la zona donde Safari parece muestrear. `frontend/public/safari-edge-lab.html` (temporal, `noindex`) compara en un iPhone, sobre una escena rayada a 100lvh, siete estrategias con `#variante`: escena sola, guardas de 8 px, guardas altas, guardas altas+, capa de 115lvh, `sticky` y escena sin `fixed` movida por JS. Barras translúcidas = se ve el rayado difuminado; sólidas = color plano. Borrar el laboratorio al decidir.
