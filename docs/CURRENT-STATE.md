# GP SELECT — estado actual

## PHASE

**PHASE COMPLETED: MOTION / SCROLL ARCHITECTURE PASS (29-09-2026).** Objetivo cumplido: HOME completa de principio a fin con scroll, pinning, handoffs y vehículos en movimiento ligados al scroll y reversibles. Siguiente fase (sin abrir todavía): FINAL VISUAL POLISH PASS.

Unidades: 1A PASS · 1B PASS · 1C PASS · 1D PASS · 1E PASS · 1F PASS.

**Sustituido por `CarHandoffScene` (1F):** la antigua escena BMW de 1B (`PerformanceScene` conserva solo Process) y la antigua escena Europe de 1E fueron eliminadas (commit `fd8336a`). Ahora un único frame fijado hace BMW → noche/mapa → Audi RS Q3 (`useCarHandoffScene.ts`, `CarHandoffScene.tsx`, `car-handoff.css`). Los apartados BMW y Europe de más abajo son historial: su motion y sus deudas ya no aplican al código actual, salvo donde se indique lo contrario.

Secuencia de la HOME: Hero (claro) → Process (oscuro) → **CarHandoff: BMW (claro) → noche/mapa → Audi RS Q3 (oscuro)** → Services (crema) → Inventory (crema) → CTA final (oscuro) → Footer (oscuro).

**1F — PASS.** Un solo pin (4,5 vh; 3,5 en móvil). Timeline de escena (cielo, sombreado, noche desde arriba, mapa, titulares y CTA) y timeline de coches con scrub más pesado. Ambos coches comparten caja, ancla y origen de transformación: un único avance continuo con crossfade BMW → Audi en la misma caja. Titulares con la receta del hero y tamaño ajustado por palabra; «Visión / Global» no invade el coche. Services entra como telón de papel sobre el último viewport. El header lee el tono publicado por la escena (`data-header-tone`) sin hit-test por frame. Reduced-motion y alturas < 600 px: dos frames estáticos. QA a 1440, 1920 y 390 (descenso, ascenso, reduced-motion), build, lint y consola OK.

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

- 1F · Car handoff: `.scene-cta` no se reutilizó (añade `min-width` al botón); z-index locales sin simplificar; assets `car-a/car-b/europe-map` provisionales, con contrato PNG/WebP RGBA alineados en un mismo lienzo.

- P1 · Header: eliminar la banda sólida crema que aparece durante el handoff del hero (progreso 0,35–1). Resolver el contraste sin banda.
- P2 · Hero: más profundidad o parallax del cielo (hoy solo −3 %).
- P2 · `frontend/package.json`: revertir `--configLoader runner` (solo hace falta dentro del sandbox de Codex).
- P2 · Desinstalar `@fontsource-variable/inter` e `inter-tight`: ya no se usan.
- Con Archivo, «Performance» (BMW) y «EUROPEAN PERFORMANCE» quedan pegados a sus slots de coche. Calibrarlo por escena.
- Calibración por escena contra los mockups: tamaños, posiciones, responsive fino, máscaras y blur.
- Inventory (1D): motion deliberadamente sobrio (afinar intensidad), imágenes provisionales.
- Europe / CTA (1E): el placeholder del GLC pasa por detrás del botón «Ver vehículos» de Europe; el mapa es un placeholder oscuro; afinar el borde telón papel/negro en Europe → Services; la banda gris del sombreado Inventory → CTA; imagen del CTA provisional (reutiliza `hero-car.svg`); footer frente al mockup (Murcia / Spain, legales).
- Services (1C): imágenes definitivas por servicio (hoy comparten placeholder); posible enriquecimiento del handoff Services → Inventory.
- BMW (1B): los PNG `bmw-m4-off/on` están desalineados (el coche «encendido» está 134 px a la izquierda en su lienzo y es ~6 px más alto) y el coche se ve duplicado durante el crossfade: recortar o normalizar. También: encaje fino frente al mockup, glow y encendido final, y posición y tamaño exactos.

## MEDIA PROVISIONAL

- Hero: `hero-car.svg` y `hero-sky.svg`, pendientes de la foto real del Porsche y del cielo.
- BMW: `bmw_m4_faros_apagados/encendidos.png` (recortes RGBA) se usan como prototipo del encendido de faros.
- GLC cenital, mapa de Europa, fotos de servicios e inventario: placeholders.
- Todo el media de los vehículos puede sustituirse por vídeo, secuencia de frames, render o Canvas en la fase de media production.

## GAPS CONOCIDOS

- «Premium vehicles» (inventario) no tiene mockup específico.
- El vídeo `2026-09-26 15-54-09.mp4` es una grabación de Jesko Jets, no de GP SELECT.
- El PNG `28 sept 15_41_46` (importación) está borrado en el árbol de trabajo y se recupera con `git restore`.

## NEXT

- FINAL VISUAL POLISH PASS (por abrir).
- Catálogo, detalle, importación y cuestionario en su fase correspondiente; definir el endpoint mínimo de leads antes de implementarlo.

## DO NOT TOUCH

- No rediseñar escenas existentes ni cambiar la identidad visual; mejorar sobre lo implementado.
- No usar mockups completos como fondos ni inventar fotografías, mapas o datos comerciales definitivos.
- No tratar Jesko Jets como referencia visual.
- No crear pagos, carrito, reservas mediante pago, CRM o autenticación alternativa.
- No modificar backend o secciones ajenas a la tarea sin necesidad funcional concreta.
