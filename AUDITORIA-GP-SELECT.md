# GP SELECT — Auditoría y propuesta, fase 1

Fecha: 26 de septiembre de 2026. Estado: auditoría terminada; implementación pendiente de aprobación.

No se ha escrito código de producción ni generado arte nuevo. Se ha leído el README completo, todo el código del backend, sus contratos, migraciones y pruebas; inspeccionado las seis imágenes; analizado el vídeo local con la skill `watch`; y contrastado la referencia en el navegador.

## 1. Material encontrado

La raíz del proyecto es una copia independiente del backend, no un repositorio Git inicializado. Contiene cuatro proyectos .NET, un proyecto de pruebas, la solución, el README, seis PNG y un MP4. No hay frontend, package.json, fuentes tipográficas, logotipo vectorial, inventario de muestra, configuración de despliegue ni fotografías independientes de los mockups.

La skill Watch está instalada globalmente en `C:/Users/alvar/.codex/skills/watch/SKILL.md`, no dentro del proyecto.

Vídeo: `2026-09-26 15-54-09.mp4`, 168,65 segundos, 1920 × 1080, 60 fps, pista AAC estéreo. Se inspeccionaron 38 fotogramas distribuidos por todo el recorrido y otros 12 entre los segundos 46 y 68. El audio completo se transcribió con WhisperX small local, indicando español. La transcripción contiene errores menores de reconocimiento; las conclusiones siguientes resumen su intención, no reproducen literalmente esos errores.

## 2. Recorrido observado y voz

| Tiempo aproximado | Evidencia visual y verbal |
|---|---|
| 00:00–00:30 | Búsqueda y entrada a Jesko Jets. Hero con ventanilla, cielo y títulos laterales que pasan de desenfocados a nítidos. La voz pide adaptar la experiencia a GP SELECT. |
| 00:30–00:37 | El marco de la ventanilla aumenta y sale del encuadre. El cielo ocupa la pantalla y el logotipo llega a la cabecera. |
| 00:37–00:44 | Párrafo grande que se ilumina progresivamente sobre el cielo; después aparecen bloques de información. La voz destaca expresamente la iluminación al hacer scroll. |
| 00:46–00:58 | Composición «Fly in / Luxury». El morro del avión entra por abajo, asciende entre los textos y aparecen fuselaje y alas. La voz pide un M4 en su lugar. |
| 00:58–01:08 | Los textos grandes se desplazan, entra información técnica, el avión se reduce y una máscara revela el plano interior. Hay un pequeño retorno de scroll, visible en la reaparición del morro. La voz permite conservar el M4 con información, sin exigir el plano interior. |
| 01:11–01:48 | Servicios con acordeón e imagen a la derecha. Las interacciones cambian las imágenes; el desplazamiento revela parallax dentro del marco. Se sugieren contenidos sobre importación y ventajas. |
| 01:48–02:25 | Paso a fondo oscuro, lista de ciudades con una posición iluminada, globo, tarjeta y contacto. Se recorre en ambos sentidos. La voz destaca el cambio de color y pide una pequeña selección de coches publicados. |
| 02:25–02:49 | Hover/navegación entre apartados y regreso a servicios y zona global. La voz pide catálogo, nosotros y fichas de cada vehículo con el mismo estilo. |

El documento escrito más reciente prevalece donde concreta o cambia la narración: tipografía de los mockups GP SELECT, dos escenas de coche separadas por tipografía oscura, Europa oscura y movimiento principalmente vertical sin acercamiento fuerte a cámara.

## 3. Primera secuencia y escena cenital

La referencia contiene una apertura de ventanilla y una gran secuencia de avión cenital; no contiene dos secuencias automovilísticas independientes. La división en dos coches pertenece al diseño solicitado para GP SELECT.

El avión aparece desde el borde inferior y sube por el centro. El ancho del fuselaje permanece aproximadamente estable durante el primer recorrido: se revela el vehículo por desplazamiento vertical, no por avance hacia el espectador. Las alas se superponen a la tipografía. Después existe una reducción importante para mostrar especificaciones y una transición enmascarada hacia un plano interior.

En GP SELECT:

- **Escena 01:** composición Curated/Luxury; paisaje, texto HTML, coche y CTA deben ser capas independientes. El coche asciende y cambia su recorte. La escala solo ajusta ligeramente la perspectiva.
- **Escena 03:** composición German/Performance; coche cenital centrado, misma jerarquía y tamaño del mockup en el fotograma principal; entrada, posición de referencia, ascenso y salida vertical. No trasladar la reducción a 0,4 ni el plano del avión al coche.

## 4. Tipografía oscura y transiciones

No aparece en el vídeo una pantalla negra con cuatro verbos gigantes. Hay dos mecanismos reutilizables: iluminación progresiva del párrafo y selección visual de una ciudad dentro de una lista enmascarada. La pantalla solicitada es una adaptación explícita de esos mecanismos.

Propuesta: `BUSCAMOS / INSPECCIONAMOS / SELECCIONAMOS / ENTREGAMOS`, con traducción inglesa. Cuatro intervalos de progreso, un término activo y los demás grises; color, opacidad y blur moderado interpolados en ambos sentidos. Sin coche, mapa ni retrato. Evitar heredar el ciclo automático de ciudades: el estado solicitado debe depender del scroll.

Los handoffs observados se apoyan en fondos compartidos, contenedores sticky, recortes y superposición de capas. La apertura conserva el cielo al salir la ventanilla; el cielo se disuelve hacia el fondo claro del avión; servicios continúa sobre claro; la sección global oscura entra desde abajo. El paso claro → negro → claro entre las primeras tres escenas es una exigencia específica de GP SELECT.

La navegación de referencia se mantiene arriba, cambia de contraste y utiliza enlaces a anclas; el CTA persiste cerca del borde inferior. El cursor observado es convencional, con efectos contenidos de hover en enlaces. No hay evidencia que justifique crear un cursor decorativo nuevo.

## 5. Medidas de movimiento contrastadas en navegador

Referencia inspeccionada: https://jeskojets.com/ a 1672 × 941.

- Hero: contenedor de 2823 px, equivalente a 300vh; progreso principal entre scroll 0 y 1882 px, equivalente a 200vh.
- Avión: sección de 3764 px, equivalente a 400vh; ventanas solapadas para fondo claro, objeto, texto y máscara.
- Fondo claro: 3764–5176 px; transición de texto: 5176–6022 px; objeto: 4235–6022 px; máscara/plano: 6022–6587 px.
- La referencia combina CSS sticky con GSAP ScrollTrigger; no emplea `pin: true` en esos triggers inspeccionados.
- Scrub directo en varios tramos y retraso de 1,2 s en objeto/texto; parallax de servicios con scrub de 0,5 s.
- Se comprobó el recorrido 4900 → 6100 → 4900 px: el transform del avión recuperó exactamente el mismo valor al volver. Esto verifica ese estado concreto, no todos los casos de scroll rápido/lento de la web.

Los segundos del vídeo incluyen pausas e interacción manual: no deben convertirse en duraciones fijas de animación. Se conservarán relaciones de distancia y fotogramas clave, ajustadas a coches y móvil.

## 6. Correspondencia de mockups

Todos los nombres empiezan por `Imagen de ChatGPT 26 sept 2026, `.

| Sufijo del archivo | Tamaño | Destino | Rasgos que conservar |
|---|---|---|---|
| `16_51_51.png` | 1672 × 941 | Escena 01 | Curated/Luxury, cielo, coche lateral recortado abajo, texto repartido y CTA inferior. |
| `16_52_05.png` | 1672 × 941 | Escena 03 | BMW cenital, centro libre para coche, títulos laterales, entorno claro con nubes y sombra. |
| `16_59_27.png` | 1817 × 866 | Servicios | More than/a car, contraste grueso/fino, acordeón izquierdo e imagen derecha. |
| `17_00_01.png` | 1672 × 941 | Europa | Fondo oscuro, Mercedes cenital, mapa derecho y titular izquierdo grueso/fino. |
| `17_08_23.png` | 1672 × 941 | Administración | Lista de vehículos, añadir, eliminar y panel lateral de carga. |
| `17_08_27.png` | 1672 × 941 | Ficha de vehículo | Galería principal + tres secundarias, miniaturas, tres columnas de datos y CTA circular. |

No se encontró la captura aprobada del stock público mencionada en el documento. Tampoco una captura independiente de la pantalla de tipografía oscura.

## 7. Tipografía y sistema visual propuesto

La familia exacta no se puede certificar a partir de imágenes rasterizadas. La dirección observada es sans serif geométrica/neo-grotesca, ancha visualmente, con tracking compacto. Usar Inter Tight como sustitución indicada por el brief y Inter para texto si mejora la lectura. No introducir serif ni cursivas.

Hay excepciones importantes al peso 600–700: «a car» y «PERFORMANCE» en Europa son muy finos. Deben conservar su contraste con la línea gruesa. El logotipo presenta tracking amplio y no debe componerse como un título de contenido.

Medidas aproximadas de los mockups, para calibrar mediante comparación visual; no son medidas extraídas de un archivo de diseño:

| Elemento | Base propuesta |
|---|---|
| Contenedor | Fluido; márgenes de 4–5,5vw; límite de contenido alrededor de 1600–1680 px en pantallas grandes. |
| Header | 96–104 px de zona; logotipo centrado independientemente de los laterales. |
| Hero | Texto alrededor de 130–150 px en lienzo de 1672 px; cenital 105–125 px; ajuste según la masa de la traducción. |
| Títulos interiores | Servicios 110–125 px en 1817 px; ficha 52–60 px; administración 38–44 px. |
| Pesos | Titulares 600–700; líneas finas 200–300; cuerpo 400; controles 500–600. |
| Tracking / interlineado | Display aproximadamente -0,04em a -0,055em y 0,90–0,96; etiquetas espaciadas solo donde aparecen así. |
| Cuerpo / controles | 16–20 px habituales; textos de apoyo hero 22–26 px; tabla técnica 12–14 px a escala desktop. |
| Colores | Base cálida alrededor de #FAF6ED / #F5F2EC; tinta #101112; oscuro #090A0C; secundario #343536. |
| Reglas | 1 px, neutro cálido, bajo contraste; sin tarjetas elevadas arbitrarias. |
| Botones | Hero 58–60 px de alto, ancho aproximado 220–245 px y cápsula; admin 44–52 px, radio contenido. |
| Galería | Área alrededor del 83% del ancho; reparto 75/25; imagen principal panorámica, secundarias apiladas y rail inferior. |
| Servicios | Separación alrededor de 52/48; foto ocupa aproximadamente 45% del lienzo total; líneas del acordeón de unos 66 px. |
| Escena cenital | Coche centrado en x≈50%, ocupando aproximadamente 23% del ancho y 72% del alto. |
| CTA circular | Aproximadamente 125–132 px de diámetro en escritorio. |

Los fondos de las escenas 01 y 03 son fotográficos: no se sustituirán por un bloque crema plano. Los puntos claros muestreados en servicios, admin y ficha difieren ligeramente; se normalizará con prudencia, conservando la percepción cálida.

Los mockups tienen cabeceras distintas. Propuesta: conservar posición central del logo y proporciones, unificar navegación pública en español y añadir ES/EN sin copiar los teléfonos ficticios. El español será inicial y la selección persistirá entre rutas. La traducción cambia longitud; habrá ajustes tipográficos por idioma, sin comprimir artificialmente las letras.

## 8. Arquitectura existente

No hay arquitectura frontend que conservar. Backend .NET 8 / ASP.NET Core Web API, EF Core 8 y PostgreSQL:

- `GpSelect.Api`: controladores, cookies, CORS, validación de origen, limitación del login y errores HTTP.
- `GpSelect.Application`: DTOs, mapeos públicos e interfaz de slugs; no una capa completa de servicios de negocio.
- `GpSelect.Domain`: vehículos, imágenes, trabajos y reglas de publicación/archivo.
- `GpSelect.Infrastructure`: DbContext, migración inicial, File/S3, generación de slugs y worker ImageSharp.

Los controladores usan directamente el DbContext; no existe una capa de repositorios adicional. Se conservará esta estructura y no se creará otro backend.

## 9. Operaciones API

| Área | Operaciones existentes |
|---|---|
| Público | GET `/api/public/vehicles`; GET `/api/public/vehicles/{slug}`; GET imágenes `card` y `detail`. |
| Auth | POST `/api/admin/auth/login`; POST `/logout`; GET `/me`. |
| Admin vehículos | GET lista y detalle; POST crear; PATCH datos; POST `/{id}/publish`; POST `/{id}/archive`; GET `/{id}/preview` y su imagen. |
| Imágenes | POST `intent`; PUT binario `upload`; POST `complete`; GET `status`, `card`, `detail`; POST `cover`, `remove`, `reorder`. |
| File local | PUT `/api/admin/uploads/{key}`. |

El catálogo público devuelve hasta 100 vehículos ComingSoon/Available, ordenados por creación ascendente e ID. No hay búsqueda, paginación, contacto ni borrado físico de vehículos. Los slugs incluyen marca, modelo y sufijo UUID; el frontend debe usar el slug devuelto.

## 10. Campos y diferencias entre contratos

La entidad guarda marca, modelo, variante, año/mes de primera matriculación, kilómetros, combustible, transmisión, carrocería, exterior, interior, VIN, historial, procedencia, descripción, notas internas, referencia interna, precio EUR, coste de compra, equipamiento JSON, especificaciones JSON, estado, slug y fechas.

Pero guardar un campo en la entidad no implica poder escribirlo o leerlo a través de la API:

- Crear acepta solo marca/modelo/año/mes/referencia; además, el controlador actualmente no aplica la referencia recibida.
- PATCH acepta precio, descripción, kilometraje, variante, combustible, transmisión, carrocería, colores/interior, historial, procedencia, equipamiento y especificaciones, además de los básicos.
- VIN, notas y coste no son editables con estos contratos. No exponer un input VIN que finja guardarse.
- La lista admin no devuelve kilometraje. El detalle admin sí.
- La tarjeta pública devuelve slug, marca, modelo, variante, año/mes, precio e imágenes; faltan kilómetros, combustible y transmisión.
- El detalle público añade combustible, transmisión, carrocería, exterior, interior y descripción; sigue sin kilómetros, equipamiento ni especificaciones.
- Potencia, motor/cilindrada, tracción, 0–100 y velocidad máxima no tienen campos específicos. Existe un contenedor JSON de especificaciones privado; necesita un esquema acordado y un mapeo público explícito si se aprovecha.
- No hay campos bilingües de contenido editorial de vehículos. Traducir la interfaz es directo; no afirmar que una descripción española se ha traducido si no hay traducción real.

Propuesta: ampliar de manera mínima los DTOs del backend existente para los datos públicos aprobados y kilómetros en la lista admin. Mantener privados VIN, coste, notas y procedencia interna; nunca serializar toda la entidad.

## 11. Carga y almacenamiento

Flujo: crear borrador → guardar campos mediante PATCH → registrar intent → subir binario → complete → esperar Ready → portada/orden → publicar Available. La interfaz puede presentar una única acción «Añadir vehículo» que orqueste estas operaciones; no hace falta una pantalla de edición/publicación.

- JPEG, PNG, WebP; máximo 20 MiB por imagen y 30 activas por vehículo.
- `Idempotency-Key` en intent y complete. URL de subida con vigencia anunciada de 15 minutos; presign real en S3.
- Original privado bajo `quarantine/`; derivados bajo `vehicles/`.
- Worker cada 2 s, validación de firma/dimensiones, autoorientación, JPEG calidad 84.
- Variantes máximas 800 × 600 y 2400 × 1800, conservando proporción.
- Reintentos hasta cinco, retraso creciente y recuperación de trabajos atascados.
- Portada Ready obligatoria para publicar; reordenación ya disponible.
- File para desarrollo; S3-compatible obligatorio en producción. Las variantes públicas se sirven a través de la API con caché de un año.

La orquestación no es atómica: si una imagen falla puede quedar un borrador. El frontend deberá conservar el ID, mostrar progreso y permitir reintentar dentro del mismo proceso de alta, sin crear duplicados.

Revisión pendiente para integración S3: el worker asigna `input.Position = 0` tras leer la firma, pero el stream devuelto por S3 no tiene garantía de ser seekable. Debe verificarse/corregirse antes de producción; no se ha probado S3 en esta auditoría.

## 12. Autenticación

Un administrador configurado por email y hash ASP.NET Identity; cookie HttpOnly, SameSite Strict y Secure fuera de Development. Rutas de gestión con rol Admin. No hay registro ni administración de usuarios.

La protección CSRF comprueba Origin/Referer contra `Security:AllowedOrigin` en peticiones mutables con cookie. CORS permite un origen exacto y credenciales. Propuesta: frontend y API bajo el mismo origen en producción y proxy `/api` en desarrollo; peticiones con credenciales. Evitar un despliegue entre sitios distintos incompatible con SameSite Strict.

Los enums salen numéricos por defecto en estos contratos; el cliente debe mapearlos expresamente. La limitación de login pretende combinar IP y email, pero el email se asigna dentro del controlador, después del middleware: revisar ese detalle en la integración, sin inventar otra autenticación.

## 13. Conflictos entre mockups y producto/API

1. «Eliminar» solo puede implementarse actualmente como archivo lógico. El vehículo desaparece de público y su detalle devuelve 404, pero queda en la base y en la lista admin sin filtrar. Propuesta: reutilizar archive y excluir Archived de la lista visible; la confirmación explicará que deja de aparecer en la web.
2. Añadir requiere varias llamadas internas y publicación tras procesar fotos. Con POST crear solamente no aparece en la web.
3. El mockup admin muestra USD, 20 imágenes y 10 MB; el backend usa EUR, 30 imágenes y 20 MiB. Mantener la composición y corregir las etiquetas/validaciones.
4. Faltan en DTOs datos que se ven en los diseños; no rellenarlos con cifras del mockup.
5. El buscador, campana, selecciones masivas y teléfono del mockup admin no justifican ampliar el producto. Solo lista, añadir, eliminar y sesión.
6. El teléfono de la ficha coincide con el teléfono público de Jesko Jets. No es una configuración confirmada de GP SELECT y no debe publicarse. El email de las imágenes tampoco está confirmado en configuración.
7. La galería de ejemplo tiene ocho fotos; el componente debe adaptarse al número real, incluyendo una sola imagen.
8. No existe endpoint de contacto. No crear un formulario que simule envíos; hace falta un canal real configurado para la CTA.
9. Falta la referencia de stock, por lo que no se puede afirmar fidelidad visual a esa captura.
10. Los PNG contienen diseño, textos y fotografía fusionados. Desplazar el PNG entero movería también las letras y rompería traducción, interacción y parallax independiente.

## 14. Arquitectura propuesta

Frontend separado bajo `frontend/`: React + TypeScript + Vite, enrutador, CSS con variables del sistema extraído, cliente tipado para la API .NET e i18n ES/EN. Es una propuesta, no una estructura ya creada. No requiere un servidor de inventario adicional.

Rutas: `/`, `/vehiculos`, `/vehiculos/:slug`, `/importacion`, `/servicios`, `/nosotros`, `/contacto`, `/admin`; login como estado protegido de `/admin`. Metadatos por ruta, título real por vehículo, canonical según dominio configurado y 404 apropiado. Revisar prerender/SSR cuando se concrete hosting si se necesitan metadatos sociales generados en servidor.

Componentes previstos:

- `PublicLayout`, `Header`, `LanguageSelector`, `Footer`.
- `HomePage`, `CinematicIntro`, `ProcessIllumination`, `TopDownPerformance`, `ServicesAccordion`, `InventoryPreview`, `EuropeSection`.
- `InventoryPage`, `VehicleCard`, `VehicleDetailPage`, `VehicleGallery`, `VehicleSpecs`, `EnquiryCTA`.
- `AdminPage`, `AdminLogin`, `VehicleList`, `AddVehiclePanel`, `ImageUploader`, `DeleteVehicleDialog`.
- `vehicleApi`, `authApi`, adaptación explícita de enums/DTOs y diccionarios ES/EN.

El mismo catálogo alimenta destacados, tarjetas y fichas. El destacado inicial puede tomar un vehículo real del resultado; no hay indicador Featured en el modelo. Invalidar/refrescar consultas tras alta o archivo y al recuperar foco, sin mantener inventarios paralelos.

## 15. Arquitectura de animación propuesta

GSAP + ScrollTrigger está justificado por las tres escenas sincronizadas. Seguir la guía `gsap-scrolltrigger`: un timeline por escena, progreso reversible, contenedor fijo/sticky separado de hijos animados, cleanup al cambiar ruta y refresh tras cargar fuentes/medios.

Documento de referencia técnica: https://gsap.com/docs/v3/Plugins/ScrollTrigger/

- Scroll nativo; no incorporar Lenis inicialmente.
- Variables de escena para Y del coche, desplazamiento de texto, opacidad, blur y máscara.
- Estado visual principal alineado con cada mockup; el movimiento conecta esos estados.
- Rango inicial orientativo de 200vh de recorrido en intro y hasta 300vh en cenital, basado en la referencia pero pendiente de ajuste con los assets finales.
- Sección de proceso con cuatro intervalos iguales como punto de partida. Esa temporización es propuesta, no una medida observada de una escena idéntica.
- Escala limitada aproximadamente a 0,98–1,02 en los coches; desplazamiento vertical dominante.
- Cambios claro/oscuro controlados en las zonas de salida/entrada para evitar huecos o flashes y mantener legibilidad de la cabecera.
- Acordeón con altura y opacidad interpoladas, interacción por teclado y cambio de imagen si existen las fotos de cada servicio.
- Móvil: títulos recompuestos, menor distancia de scroll y galería deslizable. Reduced motion: composiciones legibles sin pin prolongado ni blur animado.
- Cargar primero el recurso crítico y diferir el resto; no precargar todo el inventario.

Prueba de fase 2: scroll lento/rápido arriba/abajo, vuelta a posiciones conocidas, resize, móvil, reduced motion y comparación de fotogramas clave con mockups. No dar por validado ese prototipo antes de construirlo.

## 16. Verificación y bloqueos reales

`dotnet build GpSelect.sln --no-restore --nologo`: correcto, cero errores y advertencias. `dotnet test GpSelect.sln --nologo`: nueve pruebas existentes correctas. Son pruebas de dominio/contratos, no pruebas HTTP ni de almacenamiento.

No hay appsettings, configuración local ni valores en el entorno actual para conexión PostgreSQL, administrador, origen permitido o proveedor de almacenamiento. No se ha arrancado una API conectada ni aplicado migraciones; no se puede afirmar que alta, upload y archivo funcionen de extremo a extremo todavía. El paquete Swagger está referenciado, pero Program.cs no registra ni sirve Swagger.

Para fase 2 faltan las capas limpias de las dos escenas: coche/fondo de portada y BMW cenital/fondo/sombra. Los mockups sirven para medir y validar, pero no sustituyen estos recursos. El coche de portada está recortado, así que tampoco hay fotografía completa para revelar zonas ocultas.

Para fases posteriores faltan la captura aprobada de stock, recursos limpios de Europa/mapa, imágenes adicionales para el cambio del acordeón, fotos reales de inventario, datos reales de contacto y textos legales. La imagen de servicios puede aprovecharse mediante recorte del área fotográfica, sujeto a comprobar resolución y el botón superpuesto en su borde inferior.

Si no existen originales, habrá que acordar extracción/recorte y reconstrucción de fondos a partir de los recursos aprobados. Una generación o reconstrucción artística importante requiere la aprobación indicada en el brief; no se ha realizado.

La fase 2 queda pendiente de aprobación expresa, como exige el documento del usuario. Su alcance será exclusivamente las tres escenas iniciales, una vez resueltos los recursos de movimiento.
