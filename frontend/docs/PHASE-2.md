# GP SELECT — decisiones de fase 2

## Alcance y decisiones que sustituyen la auditoría

La auditoría sigue como evidencia del material y backend existentes. Las instrucciones posteriores del usuario prevalecen:

1. Inter Tight e Inter son fuentes provisionales. Las familias display/body/label, tamaños y pesos están centralizados para poder sustituirlas.
2. No se extraen coches, paisajes ni mapas de los PNG. Tampoco se genera arte definitivo. Se usan reservas de espacio estructurales e intercambiables mediante un manifiesto.
3. La secuencia sigue la fase 1 aceptada: hero lateral → proceso tipográfico oscuro → BMW M3 cenital. «Tres primeras escenas» no se interpreta como añadir el mockup de servicios; el usuario vuelve a señalar BMW M3 como escena 3.
4. Las dos composiciones claras reproducen proporciones, jerarquía y posición, pero la similitud fotográfica queda deliberadamente pendiente. La pantalla oscura no tiene un PNG dedicado y sigue la especificación textual.
5. El admin futuro amplía el alcance de la auditoría: lista, crear, editar, fotos, ordenar, portada, publicar, archivar y previsualizar. Se reutilizarán los endpoints existentes. No se construye en esta fase.
6. GP SELECT no tiene ni tendrá dentro de este producto checkout, carrito, pasarelas, depósitos ni reservas mediante pago. La conversión será mediante cuestionarios contextuales.
7. El backend no se modifica en fase 2. No se añade inventario ficticio, autenticación alternativa ni endpoint duplicado.

## Estructura

`components` contiene piezas básicas y cabecera; `sections` las tres escenas; `pages` Home y la pantalla de rutas pendientes; `layouts` la estructura común; `hooks` la animación; `lib` utilidades de contexto; `services` el límite futuro con la API; `styles` tokens y presentación; `assets` el manifiesto; `i18n` diccionarios; `types` contratos del frontend. Se evita una capa genérica de repositorios o estado global de scroll.

## Recursos y fidelidad

Las reservas temporales muestran dónde irán los medios, manteniendo el texto y controles como DOM. Los archivos SVG temporales son geometría simple, no ilustraciones de coches ni sucedáneos fotográficos.

Faltan para completar visualmente estas escenas:

- Foto lateral del vehículo de portada, con encuadre suficiente para desplazarse verticalmente.
- Fondo limpio de esa portada, independiente del coche.
- BMW M3 cenital aislado, a resolución suficiente, y su sombra si debe animarse por separado.
- Fondo fotográfico claro de la escena cenital.
- Fuente exacta si el propietario dispone de ella; Inter Tight sigue siendo una aproximación.

Al disponer de las imágenes, cambiar sus rutas y metadatos en `sceneAssets.ts`. Deben respetar las proporciones del slot o ajustar su object-fit/object-position centralizado. Las etiquetas de recurso provisional se desactivan desde el manifiesto. No será necesario rehacer los componentes.

Diferencias previstas frente a los PNG: ausencia de fotografía, reflejos, nubes y sombras reales; posibles diferencias de anchura de glifos; distribución adaptada al español. Los encabezados ingleses se mantienen disponibles para comparar geometría con la referencia original. No se afirmará coincidencia pixel-perfect ni fidelidad fotográfica con placeholders.

## Movimiento

Cada escena tiene una sección estable, un contenedor fijado y capas independientes de fondo, medio, tipografía y UI. Un timeline controlado por ScrollTrigger coordina cada escena. El scroll es nativo. No hay Framer Motion, Lenis, reproducción única ni estado de progreso en React en cada frame.

El desplazamiento vertical domina en ambos medios, con escala moderada. Los cambios de fondo, recorte, opacidad y texto unen los estados; la pantalla oscura ilumina secuencialmente sus cuatro verbos. Las escenas deben restaurarse al invertir el scroll.

Las distancias se adaptan por breakpoint; se refrescan mediciones tras cambios de tamaño/fuentes y se limpian efectos al abandonar HOME. Reduced motion presenta el contenido en flujo legible sin fijaciones prolongadas. Los controles no dependen de completar una animación para poder pulsarse.

## Cualificación — preparado, no implementado

`QualificationContext` representa origen e intención: vehículo concreto, importación, búsqueda o información. `qualificationUrl` genera rutas a `/contacto` con contexto, no con datos personales. `QualificationDraft` enumera campos opcionales para que los pasos futuros dependan de ese contexto. No se monta todavía un formulario ni se simula envío.

Los CTA de navegación «Ver colección» y «Ver vehículos» enlazan al catálogo preparado. Cuando se incorporen CTA comerciales, deberán utilizar el contexto del cuestionario. No dirigirlos a pagos ni a acciones de compra.

La API actual no recibe leads. Propuesta mínima, pendiente de aprobación e implementación:

- `POST /api/public/enquiries`, único punto de recepción, sin crear un CRM.
- Payload: contexto (intent, source, vehicleSlug opcional), nombre, email/teléfono, consentimiento y versión del aviso; campos de búsqueda/importación opcionales según intención.
- Para vehículo: validar el slug contra el inventario publicado. Para búsqueda/importación: marca/modelo, presupuesto EUR, país deseado y preferencias según las preguntas respondidas. Financiación solo como declaración de interés; entrega de otro coche solo como dato informativo.
- Validación del lado servidor, límites de longitud/tamaño, tratamiento de errores con ProblemDetails y limitación de frecuencia.
- Responder con confirmación solo cuando exista entrega o persistencia duradera configurada. El destino real de recepción y la política de conservación deben acordarse antes de activar el formulario; no inventar un buzón ni devolver éxito sin guardar/enviar.
- UI futura por pasos: grupos pequeños, progreso discreto, volver atrás, validación clara y revisión final. No guardar datos personales en query strings o localStorage.

## Datos y API de inventario para fases posteriores

| Necesidad | Situación actual | Propuesta mínima antes de implementar |
|---|---|---|
| Kilometraje público | Está en Domain, falta en DTOs públicos | Añadir `MileageKm` explícitamente a detalle/tarjeta. |
| Combustible/transmisión en tarjeta | Existen y salen en detalle, no en tarjeta | Ampliar DTO de tarjeta si el diseño los muestra. |
| Equipamiento/especificaciones | Existen como JSON privado | Acordar estructura validada y mapear solo campos públicos. |
| VIN | Existe en Domain, no es escribible con los contratos actuales | Proponer campo administrativo explícito sin exposición pública. |
| Potencia/motor/tracción/prestaciones | No hay propiedades dedicadas | Proponer esquema mínimo tipado o esquema validado de especificaciones antes de tocar Domain. |
| Kilometraje en lista admin | Está en detalle admin, no en lista | Ampliar DTO de lista. |

Límites reales: EUR, 30 imágenes activas, 20 MiB por imagen, JPEG/PNG/WebP. Autenticación futura: email/contraseña y cookie HttpOnly existentes, rol Admin, CORS restringido y validación de origen. No JWT ni segundo proveedor de identidad.

## Revisión

Las evidencias y resultados finales de build, lint, typecheck y navegador se registrarán en `VALIDACION.md`. Las capturas corresponden al frontend real, no a montajes ni mockups incrustados. La revisión no valida inventario ni administración conectados porque están fuera del alcance actual.
