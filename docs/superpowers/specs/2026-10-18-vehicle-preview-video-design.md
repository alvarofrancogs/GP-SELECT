# Vídeo de preview por vehículo — diseño

Fecha: 18-10-2026 · Rama: `feat/vehicle-preview-video`

## Objetivo

Cada coche puede tener, de forma opcional, un vídeo corto ya editado. Si lo tiene:

- En el catálogo, la tarjeta reproduce el vídeo al pasar el ratón (escritorio) o al quedar centrada en pantalla (móvil).
- La portada del coche pasa a ser el fotograma del segundo 0 del vídeo, en todos los sitios donde se usa la portada: tarjeta del catálogo, vehículo destacado de la home, imagen para compartir (og:image) y listado del Admin.
- En la página del coche, el vídeo es el primer elemento de la galería; las fotos van después.

Si no lo tiene, todo sigue como hoy: la portada es la primera foto.

## Decisiones tomadas

- Los vídeos llegan ya editados: no se recortan ni se transcodifican en el servidor. No se instala ffmpeg.
- Solo **MP4 (H.264)**, máximo **30 MiB**, un vídeo por coche. WebM queda fuera porque Safari/iOS no lo reproduce de forma fiable.
- El audio se ignora: el vídeo siempre se reproduce silenciado.
- La portada es una **imagen** extraída del segundo 0, no un `<video>` en pausa: el catálogo no descarga ningún vídeo hasta que va a reproducirse.
- El fotograma lo extrae el navegador del Admin al elegir el archivo y lo sube como una imagen más; pasa por el pipeline de imágenes actual (variantes card/detail, EXIF, caché, barrido).
- Vídeo y portada siguen el mismo modelo de staging que las fotos: no son públicos hasta que se guarda el editor.

## Modelo de datos (migración `AddPreviewVideo`)

- `VehicleImage.Kind`: `Photo` (por defecto, filas existentes) o `VideoPoster`.
- Nueva entidad `VehicleVideo`: `Id`, `VehicleUnitId`, `Key`, `MimeType`, `SizeBytes`, `State` (`PendingUpload`, `Ready`, `Deleted`), `IsStaged`, `PosterImageId`, `CreatedAt`, `StorageCleanedAt`.
- Índice único filtrado: un solo vídeo publicado (no staged, no borrado) por coche. Puede coexistir con uno staged mientras se sustituye.

## Reglas de dominio

- **Portada:** si el coche tiene un vídeo publicado `Ready` cuya portada (`VideoPoster`) está `Ready`, esa imagen es la portada. Si no, la primera foto `Ready`, como hoy (`VehicleGallery.EnsureCover`).
- La portada del vídeo **no** cuenta para el límite de 30 fotos ni se puede reordenar entre las fotos.
- **Publicar:** la regla actual («una portada `Ready`») se cumple también con la portada del vídeo. Un coche con vídeo y sin fotos es publicable.
- Coche archivado = solo lectura también para el vídeo (409 `archived`).
- Quitar el vídeo borra también su portada; la portada vuelve a ser la primera foto.

## API

Admin (`/api/admin/vehicles/{id}/video`), mismo patrón que las imágenes:

- `POST intent` `{ mimeType, sizeBytes, staged }` con `Idempotency-Key` → URL de subida (S3 firmada o `/api/admin/uploads/...` en local). 415 si no es `video/mp4`, 413 si supera 30 MiB.
- `PUT` de subida: `UploadsController` acepta también intents de vídeo con su propio límite de tamaño.
- `POST {videoId}/complete`: comprueba tamaño con `HEAD` y la firma del archivo (`ftyp` en el byte 4), mueve el objeto a `vehicles/{id}/video/{videoId}.mp4` y lo deja `Ready`. No hay worker: no se procesa.
- La portada se sube con el intent de imagen existente, añadiendo `kind: "videoPoster"` y `videoId`.
- Guardado del editor: el cuerpo admite `video: { keep: <videoId> | null }`. `keep` con un vídeo staged lo publica junto a su portada y borra el anterior; `null` quita el vídeo actual. Ausente = sin cambios.
- `GET {videoId}`: el Admin puede previsualizar un vídeo staged.

Público:

- `VehiclePublicCardDto` y `VehiclePublicDto` añaden `videoUrl: string | null`.
- Contrato: si `videoUrl` no es null, `images[0]` es su portada (por ser la portada del coche).
- `GET /api/public/vehicles/{slug}/video/{videoId}`: soporta peticiones `Range` (206 + `Content-Range`), necesario en Safari/iOS. `Cache-Control: public,max-age=86400`. En S3 se pide el rango a S3 (`ByteRange`); en almacenamiento local, `FileStream` con `enableRangeProcessing`. Se añade una lectura por rango a `IObjectStorage`.
- `BackendMaintenance.SweepOrphansAsync` reconoce las claves de vídeo como conocidas.

## Admin

- Recuadro propio, separado de la galería de fotos, rotulado «Vídeo de preview · solo catálogo» con el aviso: «La portada del coche será el primer fotograma (segundo 0) de este vídeo».
- Al elegir el archivo: se valida tipo y tamaño en el cliente, se extrae el fotograma 0 (`<video>` → `canvas` → JPEG, lado mayor ≤ 2400 px), se suben vídeo y portada como staged y se muestra la previsualización del vídeo junto a su portada.
- Acciones: cambiar y quitar. Estados de subida y error con los mismos patrones que `ImageUploader`.
- Textos en `adminCopy.ts` (es/en).

## Catálogo (`VehicleCard`)

- Se muestra la portada como hoy. El `<video>` (`muted`, `playsInline`, `loop`, `preload="none"`) no recibe `src` hasta que va a reproducirse; aparece sobre la portada cuando puede reproducirse, así que no hay salto visual.
- Escritorio (`hover: hover`): reproduce al pasar el ratón o al recibir foco de teclado; al salir, pausa, vuelve al segundo 0 y se ve de nuevo la portada.
- Móvil (`hover: none`): un controlador compartido (`IntersectionObserver`) reproduce solo la tarjeta más cercana al centro de la pantalla y visible al menos al 60 %. Una a la vez.
- No se reproduce nunca con `prefers-reduced-motion` ni con ahorro de datos (`navigator.connection.saveData`): se queda la portada.
- Si el vídeo falla al cargar, se queda la portada sin aviso.

## Página del coche (`VehicleGallery`)

- Con `videoUrl`, la primera diapositiva es el vídeo con `images[0]` como póster. Las demás son las fotos (`images[1..]`).
- La diapositiva de vídeo se reproduce silenciada y en bucle mientras está activa y visible, con un botón de pausa/reproducir (WCAG 2.2.2). Con reduced-motion empieza en pausa.
- La miniatura muestra la portada con un icono de play. En la vista ampliada (`dialog`) el vídeo lleva controles nativos.

## Reparto del trabajo

- **Claude Code (Opus):** backend, migración, contrato, conexión del frontend con el API, tests y revisión final.
- **Astra:** diseño visual del recuadro del Admin, la transición portada → vídeo en la tarjeta y la diapositiva/miniatura de vídeo en la galería, con QA en navegador a 1440 y 390.

## Tests

- Unitarios de dominio: regla de portada con y sin vídeo, la portada del vídeo no cuenta en el límite de 30, publicar con solo vídeo, quitar el vídeo devuelve la portada a la primera foto, archivado = solo lectura.
- Integración: intent/subida/complete; firma falsa → rechazo; guardar publica vídeo y portada; sustituir y quitar; `Range` → 206 con `Content-Range` correcto; vídeo staged no es público.
- Frontend: cuerpo del guardado con `video`; mapeo de `videoUrl` en `services/vehicles.ts`.
- Navegador: hover en escritorio, centrado en móvil (una a la vez), reduced-motion, galería con vídeo primero, Admin de principio a fin.

## Fuera de alcance

Transcodificación, recorte, validación de duración, audio, más de un vídeo por coche, WebM.
