# Safari 26 (iOS) — bordes de pantalla

Reglas leídas en el código de WebKit (`Source/WebCore/page/LocalFrameView.cpp`, `fixedContainerEdges`, y `Source/WebKit/UIProcess/API/Cocoa/WKWebView.mm`, `_updateFixedColorExtensionViews`), no deducidas de artículos. Skills instaladas: `safari26-liquid-glass` y `mobile-native` (`.agents/skills/`).

## Cuándo Safari pinta una barra sólida

- Para cada borde (arriba y abajo) hace un hit-test en el centro, 4 px dentro del área visible, y sube por los ancestros del elemento que encuentra.
- Si llega a una capa `fixed` o `sticky` que ocupa al menos el 90 % del ancho, no está oculta (opacidad ≥ 0,1, no `visibility: hidden`) y no supera el 105 % del alto, ese borde queda «fijo». Safari pinta la zona de la barra (hora arriba, barra de Safari abajo) con un color sólido: el fondo de esa capa o, si es transparente, el color predominante de una franja de 2 px.
- Si no la encuentra, el borde queda translúcido (el «liquid glass»): se ve la página pasando por debajo.
- `theme-color` no interviene. Una capa `fixed` nunca se pinta bajo las barras.
- Lo que se ve al tirar más allá de los extremos de la página es el fondo del documento (`body` sobre `html`).

## Cómo lo aplica la web

- **Cabecera:** su caja fija mide el 87 % del ancho (`--header-inset: 6.5vw`). `.header-inner` vuelve a ocupar el 100 %, así que el logo, el menú y los idiomas no se mueven. Resultado: arriba el borde es translúcido en todas las páginas.
- **Menú abierto:** la cabecera vuelve al 100 % (`.site-header--menu`), y las dos barras quedan de papel sólido, como una hoja.
- **Escenas fijadas de la Home:** son capas `fixed` a pantalla completa. Mientras están fijadas, Safari extiende el color del borde de la escena a sus barras. Es lo único posible sin cambiar el pinning de GSAP (`pinType: 'transform'` va a tirones en iOS).
- **Al tirar (y «tirar para recargar», activo de nuevo):** `#root` pinta la página, y el fondo de `body` sigue el scroll (`animation-timeline: scroll(root)`):
  - en la parte de arriba, el color de lo que hay arriba (el cielo del hero en la Home, papel en el resto);
  - en el último 1 %, el negro del pie.

  En Safari anterior al 26 queda siempre el color de arriba. Con «reducir movimiento» se mantiene, porque no es movimiento.
- **Pendiente:** confirmarlo en un iPhone real. El WebKit de Playwright en Windows no reproduce las barras de iOS; `webkit-edges.mjs` (scratchpad) solo replica el hit-test.
