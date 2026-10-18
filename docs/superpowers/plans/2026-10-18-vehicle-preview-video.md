# Vídeo por vehículo — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Un vídeo MP4 opcional por coche: los 10 primeros segundos se reproducen en la tarjeta del catálogo, el vídeo completo es lo primero de la galería y su fotograma 0 es la portada del coche.

**Architecture:** El fotograma 0 es una `VehicleImage` de tipo `VideoPoster` que pasa por el pipeline de imágenes actual y gana la portada en `VehicleGallery.EnsureCover`. El vídeo es una entidad nueva, `VehicleVideo`. No se procesa: se sube directamente a su clave definitiva y se sirve por rangos. Vídeo y portada siguen el staging del editor y se publican en el mismo `POST /save`.

**Tech Stack:** ASP.NET Core + EF Core (PostgreSQL), xUnit + Testcontainers, React + TypeScript + Vitest, Caddy.

**Spec:** `docs/superpowers/specs/2026-10-18-vehicle-preview-video-design.md`

## Global Constraints

- Tipo único: `video/mp4`. Firma: bytes 4–7 = `ftyp`.
- Tamaño máximo: `VideoRules.MaxUploadBytes = 100 * 1024 * 1024` (104 857 600). Las fotos siguen en 20 MiB.
- Clave del vídeo: `vehicles/{vehicleId}/videos/{videoId}.mp4`.
- Un vídeo publicado (no staged, no borrado) por coche.
- La portada del vídeo no cuenta para el límite de 30 fotos.
- Servir el vídeo: `Accept-Ranges: bytes`, 206 + `Content-Range` con `Range`, 416 fuera de rango, `Content-Type: video/mp4`, público con `Cache-Control: public,max-age=86400`.
- Caddy `{$S3_SITE}`: `max_size 110MB`.
- Frontend: `PREVIEW_SECONDS = 10`; aviso por tasa de bits > 10 Mbps; portada JPEG con lado mayor ≤ 2400 px y calidad 0.9; móvil: tarjeta visible ≥ 60 % y la más cercana al centro.
- Nunca autoplay con `prefers-reduced-motion: reduce` ni con `navigator.connection.saveData`.
- Tarjeta siempre `muted`. Galería: empieza `muted` y tiene controles nativos.
- Textos del Admin en `frontend/src/i18n/adminCopy.ts`. Comentarios y estilo como el código vecino.
- Tasks 1–9: Claude Code (Opus). Tasks 10–11: Astra (`codex -m gpt-6-astra -c windows.sandbox="unelevated"`). Task 12: Opus.

## Review Focus

1. **La portada del vídeo falla al procesarse:** el coche no debe publicar `videoUrl` con una portada que no existe. Guardar → 409 `video_poster_failed`; el público omite `videoUrl` mientras la portada no esté `Ready` (Tasks 4 y 5).
2. **Rangos de Safari:** `bytes=0-1`, `bytes=500-` abierto, sufijo `bytes=-500` y rango fuera del archivo (→ 416) (Task 3).
3. **Sustituir un vídeo publicado:** al guardar B, A y su portada se borran, la portada pasa a la de B y la tienda borra la clave de A (Task 4).
4. **Coche publicado cuya única imagen es la portada del vídeo:** quitar el vídeo → 409 `last_public_image`, igual que con la última foto (Task 4).
5. **El ratón sale antes de que el vídeo pueda reproducirse:** no debe quedar reproduciéndose ni descargando (Task 9).

---

### Task 1: Dominio — tipo de imagen, `VehicleVideo` y regla de portada

**Files:**
- Modify: `src/GpSelect.Domain/Vehicle.cs` (`VehicleImage`, `VehicleGallery`)
- Create: `src/GpSelect.Domain/VehicleVideo.cs`
- Test: `tests/GpSelect.Tests/VehicleVideoTests.cs`

**Interfaces:**
- Produces:
  - `enum ImageKind { Photo, VideoPoster }`; `VehicleImage.Kind` (por defecto `Photo`) y `VehicleImage.VideoId: Guid?`.
  - `VehicleImage.CreatePoster(Guid vehicle, Guid videoId, string key, string mime, long size) → VehicleImage`: siempre staged.
  - `enum VideoState { PendingUpload, Ready, Deleted }`.
  - `VehicleVideo`: `Id`, `VehicleUnitId`, `Key`, `MimeType`, `SizeBytes`, `State`, `IsStaged`, `CreatedAt`, `StorageCleanedAt`. Métodos: `static Create(Guid vehicle, long size)`, que genera `Id` y `Key = $"vehicles/{vehicle}/videos/{Id:N}.mp4"` (staged, `video/mp4`); `MarkReady()`, `Publish()` y `Delete()`.
  - `static class VideoRules { const long MaxUploadBytes; const string MimeType = "video/mp4"; static bool HasMp4Signature(ReadOnlySpan<byte> first8) }`.
  - `VehicleGallery.EnsureCover`: el primero de (portada `Ready`, no staged, `Kind == VideoPoster`) y (la primera foto `Ready` no staged, como hoy).
  - `VehicleGallery.Reorder`: valida y ordena solo `Kind == Photo`; las portadas no aparecen en `order` y no hacen fallar la validación.
  - `VehicleGallery.Photos(IEnumerable<VehicleImage>)`: ayuda que filtra `Kind == Photo`.

- [ ] **Step 1: Write the failing tests** en `VehicleVideoTests.cs`:
  - `Ready_published_poster_takes_the_cover_from_the_first_photo`: una foto `Ready` portada y una portada de vídeo `Ready` publicada → `EnsureCover` devuelve la portada del vídeo, que queda `IsCover`, y la foto deja de serlo.
  - `Staged_or_processing_poster_never_takes_the_cover`: la foto sigue siendo la portada.
  - `Removing_the_poster_gives_the_cover_back_to_the_first_photo`: `Delete()` en la portada y `EnsureCover` → la foto es la portada.
  - `Reorder_ignores_posters`: `Reorder(images, [photoB, photoA])` con una portada presente no lanza excepción, y la portada sigue `IsCover`.
  - `Poster_satisfies_the_publication_cover_rule`: un coche con solo una portada de vídeo `Ready` publicada → `ChangeStatus(Available, …)` con precio no lanza excepción.
  - `Mp4_signature`: `HasMp4Signature` es `true` para `00 00 00 18 66 74 79 70` y `false` para bytes PNG y para menos de 8 bytes.
  - `Video_key_is_under_the_vehicle`: `VehicleVideo.Create(v, 10).Key == $"vehicles/{v}/videos/{id:N}.mp4"`, staged y `PendingUpload`.
- [ ] **Step 2: Run** `dotnet test tests/GpSelect.Tests --filter VehicleVideoTests`. Expected: FAIL (no compila).
- [ ] **Step 3: Implement** lo listado en Interfaces. `Delete()` en `VehicleVideo` es idempotente. `MarkReady()` lanza `DomainException("invalid_video_state")` si no está `PendingUpload` o ya está `Ready`.
- [ ] **Step 4: Run** `dotnet test tests/GpSelect.Tests`. Expected: PASS, incluidos los tests existentes.
- [ ] **Step 5: Commit** `feat(domain): video poster cover rule and VehicleVideo`

### Task 2: Persistencia — migración `AddVehicleVideo`

**Files:**
- Modify: `src/GpSelect.Infrastructure/Persistence.cs` (`DbSet<VehicleVideo> Videos`, mapeo)
- Create: `src/GpSelect.Infrastructure/Migrations/<timestamp>_AddVehicleVideo.cs` (+ Designer y snapshot)
- Test: `tests/GpSelect.Tests/MigrationModelTests.cs`

**Interfaces:**
- Produces: `db.Videos`; columnas `Images.Kind` (string, default `'Photo'`) e `Images.VideoId` (nullable); tabla `Videos` con FK a `Vehicles`; índice único `IX_Videos_VehicleUnitId_Published` filtrado `"IsStaged" = FALSE AND "State" <> 'Deleted'`; índice `Videos(Key)`.

- [ ] **Step 1: Write the failing test** en `MigrationModelTests`, siguiendo el patrón del archivo: el modelo tiene la entidad `VehicleVideo` con el índice único filtrado anterior, e `Images.Kind` tiene valor por defecto `Photo`.
- [ ] **Step 2: Run** `dotnet test tests/GpSelect.Tests --filter MigrationModelTests`. Expected: FAIL.
- [ ] **Step 3: Implement** el mapeo en `OnModelCreating` y genera la migración con `dotnet ef migrations add AddVehicleVideo -p src/GpSelect.Infrastructure -s src/GpSelect.Api`. `State` y `Kind` se guardan como string, como el resto de enums.
- [ ] **Step 4: Run** `dotnet test tests/GpSelect.Tests` y `dotnet build` (0 warnings nuevos). Expected: PASS.
- [ ] **Step 5: Commit** `feat(db): AddVehicleVideo migration`

### Task 3: Lectura por rangos en `IObjectStorage` y respuesta 206

**Files:**
- Modify: `src/GpSelect.Infrastructure/Persistence.cs` (`IObjectStorage`, `FileObjectStorage`, `S3ObjectStorage`)
- Create: `src/GpSelect.Api/StoredVideos.cs`
- Test: `tests/GpSelect.IntegrationTests/FileObjectStorageTests.cs`, `tests/GpSelect.IntegrationTests/VideoRangeTests.cs`

**Interfaces:**
- Produces:
  - `Task<Stream?> IObjectStorage.OpenRangeAsync(string key, long from, long length, CancellationToken ct)`. En `FileObjectStorage`: `FileStream` con `Seek` y un stream limitado a `length`. En S3: `GetObjectRequest.ByteRange = new(from, from + length - 1)`.
  - `FileObjectStorage.PathFor` sigue aceptando solo `quarantine/` y `vehicles/`; los vídeos ya viven bajo `vehicles/`.
  - `static Task<IActionResult> StoredVideos.Serve(ControllerBase c, IObjectStorage storage, string key, long size, string? cacheControl)`. Parsea un único rango (`bytes=a-b`, `bytes=a-` y `bytes=-n`). Responde 206 + `Content-Range: bytes a-b/size`; 200 con el archivo entero si no hay `Range`; 416 + `Content-Range: bytes */size` si el rango no es satisfacible. Siempre añade `Accept-Ranges: bytes` y `Content-Type: video/mp4`. Usa el `size` de la fila: no hace `HEAD`.

- [ ] **Step 1: Write the failing tests:**
  - `FileObjectStorageTests.Open_range_reads_only_the_requested_bytes`: guardar 0..99 y `OpenRangeAsync(key, 10, 5)` → `[10,11,12,13,14]`.
  - `VideoRangeTests`: un endpoint de prueba no hace falta; se prueba en Task 5 contra el endpoint real. Aquí, tests unitarios del parser `StoredVideos.TryParseRange(string? header, long size, out long from, out long length) → RangeResult { Full, Partial, Unsatisfiable }`:
    - `bytes=0-1` y size 100 → Partial (0, 2).
    - `bytes=500-` y size 1000 → Partial (500, 500).
    - `bytes=-500` y size 1000 → Partial (500, 500).
    - `bytes=0-999999` y size 1000 → Partial (0, 1000).
    - `bytes=1000-` y size 1000 → Unsatisfiable.
    - `null` → Full.
    - `bytes=0-1,5-6` (multirango) → Full.
- [ ] **Step 2: Run** `dotnet test --filter "FileObjectStorageTests|VideoRangeTests"`. Expected: FAIL.
- [ ] **Step 3: Implement** lo listado. Copia del stream a `Response.Body` con `CopyToAsync` y `RequestAborted`: nunca se carga en memoria.
- [ ] **Step 4: Run** los mismos tests. Expected: PASS.
- [ ] **Step 5: Commit** `feat(storage): ranged reads for videos`

### Task 4: API del Admin — subir, completar, guardar y quitar el vídeo

**Files:**
- Create: `src/GpSelect.Api/VideoController.cs` (`api/admin/vehicles/{vehicleId}/video`)
- Modify: `src/GpSelect.Api/UploadsController.cs`, `src/GpSelect.Api/ImageController.cs` (intent con `kind`), `src/GpSelect.Api/VehiclesController.cs` (`Save`, `Map`), `src/GpSelect.Application/Contracts.cs`
- Test: `tests/GpSelect.IntegrationTests/VideoApiTests.cs`

**Interfaces:**
- Consumes: Task 1 (`VehicleVideo`, `VideoRules`, `CreatePoster`), Task 2 (`db.Videos`), Task 3 (`StoredVideos.Serve`).
- Produces:
  - `POST intent` `VideoIntentRequest(string MimeType, long SizeBytes)` + `Idempotency-Key` → `{ videoId, uploadUrl, expiresInSeconds: 900 }`. 415 si no es `video/mp4`; 413 si supera `MaxUploadBytes`; 409 `archived`. Siempre staged.
  - `POST {videoId}/complete` + `Idempotency-Key` → `{ videoId, state: "Ready" }`. Antes: `HEAD` (tamaño y tipo iguales al intent) y `OpenRangeAsync(key, 0, 8)` con `HasMp4Signature`. Si falla → 409 `invalid_video` y la fila sigue `PendingUpload`.
  - `GET {videoId}` → `StoredVideos.Serve` sin caché (`no-store`), también para staged.
  - `UploadsController.Put`: una clave `vehicles/…/videos/…` se busca en `db.Videos` por `Key`, con su propio límite. `[RequestSizeLimit(VideoRules.MaxUploadBytes)]` en la acción y comprobación por tipo dentro (las imágenes siguen limitadas a 20 MiB).
  - `ImageIntentRequest` añade `string? Kind` y `Guid? VideoId`. Con `kind == "videoPoster"`: el vídeo debe existir en este coche y no estar borrado (si no, 404); se crea con `CreatePoster`; no cuenta para el límite de 30 (que pasa a contar solo `Kind == Photo`).
  - `SaveVehicleRequest` añade `VideoChanges? Video`, con `sealed record VideoChanges(Guid? Keep)`. Ausente = sin cambios. `Keep = id`: el vídeo debe ser de este coche y estar `Ready` (si no, 409 `invalid_video`), y su portada no puede estar `Failed` (si no, 409 `video_poster_failed`). Se publican vídeo y portada, y se borran el vídeo publicado anterior y su portada. `Keep = null`: se borran el vídeo publicado y su portada, aplicando la regla `last_public_image` de `VehicleGallery.Remove` a la portada. Se aplica antes de `EnsureCover` y de la entrada al catálogo. Las claves borradas se eliminan de la tienda después del commit, como las fotos.
  - `gallery.removed` con el id de una portada → 400 `invalid_gallery`.
  - `VehicleAdminDto` añade `IReadOnlyList<VideoAdminDto> Videos` (no borrados). `sealed record VideoAdminDto(Guid Id, VideoState State, bool IsStaged, long SizeBytes, string Url, Guid? PosterImageId)`. `ImageAdminDto` añade `ImageKind Kind`.
  - `VehicleAdminListDto.ImageCount`/`ReadyImageCount`: solo fotos.

- [ ] **Step 1: Write the failing tests** en `VideoApiTests.cs`. Usa los ayudantes de `AdminApiTests` (`CreateVehicle`, `UploadImage`, `Json`, `Problem`) copiándolos o extrayéndolos a una clase compartida si ya se repiten. Añade `UploadVideo(Guid vehicleId, byte[]? bytes = null) → Guid`, con un MP4 mínimo cuyos bytes 4–7 sean `ftyp`, y `UploadPoster(Guid vehicleId, Guid videoId) → Guid`.
  - `Intent_rejects_non_mp4_and_oversized`: `video/webm` → 415; `SizeBytes = MaxUploadBytes + 1` → 413.
  - `Complete_rejects_a_file_without_mp4_signature`: subir PNG declarado como `video/mp4` → 409 `invalid_video`.
  - `Save_publishes_video_and_poster_and_the_poster_becomes_cover`: el GET del admin da un vídeo `IsStaged = false` y la imagen `Kind = VideoPoster` `IsCover`.
  - `Replacing_a_video_deletes_the_old_one_and_its_storage` (Review Focus 3): el archivo de A ya no existe en `Storage:Root`.
  - `Removing_the_video_returns_the_cover_to_the_first_photo`.
  - `Removing_the_only_image_of_a_listed_vehicle_is_refused` (Review Focus 4): coche `Available` con solo vídeo; `video: { keep: null }` → 409 `last_public_image`.
  - `Save_refuses_a_video_whose_poster_failed` (Review Focus 1): forzar la portada a `Failed` en la base → 409 `video_poster_failed`.
  - `Poster_is_not_counted_in_the_30_photo_limit`.
  - `Archived_vehicle_refuses_video_intent`: 409 `archived`.
- [ ] **Step 2: Run** `dotnet test tests/GpSelect.IntegrationTests --filter VideoApiTests` (requiere Docker). Expected: FAIL.
- [ ] **Step 3: Implement** lo listado en Interfaces, siguiendo `ImageController` (idempotencia con `IdempotencyRecords`, `RefuseUnlessEditable`, transacción con `LockVehicleAsync`).
- [ ] **Step 4: Run** `dotnet test tests/GpSelect.IntegrationTests`. Expected: PASS todo, incluidos los 63 existentes.
- [ ] **Step 5: Commit** `feat(api): admin video upload and editor save`

### Task 5: Público, vista previa, mantenimiento y Caddy

**Files:**
- Modify: `src/GpSelect.Application/Contracts.cs` (`PublicMapping`), `src/GpSelect.Api/PublicVehiclesController.cs`, `src/GpSelect.Api/VehiclesController.cs` (`Preview`), `src/GpSelect.Infrastructure/BackendMaintenance.cs`, `deploy/Caddyfile`
- Test: `tests/GpSelect.IntegrationTests/VideoApiTests.cs`, `tests/GpSelect.IntegrationTests/BackendMaintenanceTests.cs`, `tests/GpSelect.Tests/VehicleTests.cs`

**Interfaces:**
- Consumes: Tasks 1–4.
- Produces:
  - `VehiclePublicCardDto` y `VehiclePublicDto` añaden `string? VideoUrl` (último parámetro). `PublicMapping.Map/MapCard(v, images, VehicleVideo? video)`: `VideoUrl = $"/api/public/vehicles/{slug}/video/{video.Id}"` solo si el vídeo está publicado y `Ready` y su portada es la portada actual `Ready`. Si no, `null`.
  - `GET /api/public/vehicles/{slug}/video/{videoId:guid}`: con `WithPublicDetail`; solo un vídeo publicado `Ready` → `StoredVideos.Serve(..., "public,max-age=86400")`; si no, 404.
  - `Preview` del Admin: `VideoUrl` reescrito a `/api/admin/vehicles/{id}/video/{videoId}`.
  - `Cards()`: una consulta más para los vídeos publicados de los coches listados (sin N+1).
  - Mantenimiento: vídeos `Deleted` → borrar `Key` y marcar `StorageCleanedAt`, con la misma ventana de 24 h que las imágenes. Vídeos `PendingUpload` de más de 24 h → borrar clave y fila. `SweepOrphansAsync` añade las claves de los vídeos no borrados a `keys`.
  - `deploy/Caddyfile`: `max_size 25MB` → `max_size 110MB` en `{$S3_SITE}`.

- [ ] **Step 1: Write the failing tests:**
  - `VehicleTests.Public_card_has_video_url_only_with_a_ready_poster_cover`: vídeo publicado `Ready` y portada `Processing` → `VideoUrl == null`. Con la portada `Ready` y como portada actual → URL esperada, e `Images[0]` es la portada.
  - `VideoApiTests.Public_video_supports_ranges` (Review Focus 2): `Range: bytes=0-1` → 206, `Content-Range: bytes 0-1/{size}` y 2 bytes. `bytes={size}-` → 416. Sin `Range` → 200 + `Accept-Ranges: bytes`.
  - `VideoApiTests.Staged_video_is_not_public`: 404 en el endpoint público y `videoUrl` null en `GET /api/public/vehicles/{slug}`.
  - `BackendMaintenanceTests.Deleted_video_storage_is_cleaned` y `Sweep_keeps_live_video_keys`.
- [ ] **Step 2: Run** `dotnet test --filter "VehicleTests|VideoApiTests|BackendMaintenanceTests"`. Expected: FAIL.
- [ ] **Step 3: Implement** lo listado. Si `VehicleSeoParityTests` o `tests/fixtures/*.json` comparan el contrato público, actualiza el fixture con `videoUrl: null`.
- [ ] **Step 4: Run** `dotnet build` (0 warnings nuevos), `dotnet test tests/GpSelect.Tests` y `dotnet test tests/GpSelect.IntegrationTests`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(api): public video with ranges, cleanup and upload limit`

### Task 6: Frontend — tipos, mapeo y cliente del Admin

**Files:**
- Modify: `frontend/src/types/inventory.ts`, `frontend/src/types/vehicle.ts`, `frontend/src/types/admin.ts`, `frontend/src/services/vehicles.ts`, `frontend/src/services/adminApi.ts`
- Test: `frontend/src/services/vehicles.test.tsx`

**Interfaces:**
- Produces:
  - `VehiclePublicCardDto.videoUrl?: string | null`, opcional para que una respuesta de un API antiguo siga funcionando. `VehicleSummary.video: string | null`, mapeado en `fromPublicCard` y heredado en `fromPublicDetail`.
  - `AdminImage.kind: 'Photo' | 'VideoPoster'`; `AdminVideo { id; state: 'PendingUpload' | 'Ready' | 'Deleted'; isStaged; sizeBytes; url; posterImageId: string | null }`; `AdminVehicle.videos: AdminVideo[]`; `VehiclePreview.videoUrl: string | null`; `VehicleSaveRequest.video?: { keep: string | null }`.
  - `adminApi.videoIntent(vehicleId, file, idempotencyKey) → Promise<{ videoId; uploadUrl; expiresInSeconds }>`, `adminApi.completeVideo(vehicleId, videoId, idempotencyKey)` y `adminApi.imageIntent(..., staged, poster?: { videoId: string })`, que envía `kind: 'videoPoster'` y `videoId`.
  - `uploadImage` pasa a llamarse `uploadFile` (mismo comportamiento); se actualizan sus usos.

- [ ] **Step 1: Write the failing test** `maps videoUrl to video and defaults to null`: un DTO con `videoUrl: '/api/public/vehicles/x/video/1'` → `summary.video` igual; sin la propiedad → `null`.
- [ ] **Step 2: Run** `cd frontend && npx vitest run src/services/vehicles.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implement** lo listado.
- [ ] **Step 4: Run** `npm run typecheck && npx vitest run`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(frontend): video in the public and admin contracts`

### Task 7: Frontend — utilidades del archivo de vídeo

**Files:**
- Create: `frontend/src/lib/videoFile.ts`
- Test: `frontend/src/lib/videoFile.test.ts`

**Interfaces:**
- Produces:
  - `MAX_VIDEO_BYTES = 100 * 1024 * 1024`, `VIDEO_TYPE = 'video/mp4'` y `BITRATE_WARNING_MBPS = 10`.
  - `isFastStart(file: Blob): Promise<boolean | null>`: recorre las cabeceras de los bloques de primer nivel con `file.slice`. Cada bloque tiene tamaño de 32 bits + tipo de 4 bytes; tamaño `1` significa tamaño de 64 bits en los 8 bytes siguientes; tamaño `0` significa hasta el final. Devuelve `true` si encuentra `moov` antes que `mdat`, `false` si encuentra `mdat` antes, y `null` si no es interpretable. Máximo 64 bloques.
  - `bitrateMbps(sizeBytes: number, durationSeconds: number): number | null`: `null` si la duración no es finita o es ≤ 0.
  - `extractPoster(file: File): Promise<{ blob: Blob; durationSeconds: number }>`: `<video muted playsInline preload="auto">` con `URL.createObjectURL`; espera `loadeddata`, fija `currentTime = 0`, espera `seeked`, dibuja en un `canvas` escalado a lado mayor ≤ 2400 y hace `toBlob('image/jpeg', 0.9)`. Revoca la URL en `finally`. Rechaza si no hay `videoWidth`.

- [ ] **Step 1: Write the failing tests:**
  - `fast start when moov comes before mdat`: blob `[ftyp 24][moov 16][mdat 16]` → `true`.
  - `not fast start when mdat comes first`: `[ftyp][mdat][moov]` → `false`.
  - `reads 64-bit box sizes`: `mdat` con tamaño 1 y largesize correcto, seguido de `moov` → `false`.
  - `null for a non-MP4 blob`.
  - `bitrate`: `bitrateMbps(12_500_000, 10) === 10`; `bitrateMbps(1, 0) === null`.
  - `extractPoster` no se prueba en jsdom: se cubre en la QA de navegador de Task 12.
- [ ] **Step 2: Run** `npx vitest run src/lib/videoFile.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** lo listado.
- [ ] **Step 4: Run** el mismo comando. Expected: PASS.
- [ ] **Step 5: Commit** `feat(admin): MP4 fast start check, bitrate and poster extraction`

### Task 8: Admin — `VideoUploader` funcional y guardado

**Files:**
- Create: `frontend/src/components/admin/VideoUploader.tsx`
- Modify: `frontend/src/pages/admin/AdminVehicleEditor.tsx`, `frontend/src/i18n/adminCopy.ts`
- Test: `frontend/src/pages/admin/AdminVehicleEditor.test.tsx`

**Interfaces:**
- Consumes: Task 6 (`adminApi.videoIntent`, `completeVideo`, `imageIntent(..., { videoId })`, `uploadFile`) y Task 7.
- Produces:
  - `VideoUploader({ vehicleId, videos, images, disabled, onBusyChange, onChange })`, con `onChange(keep: string | null | undefined)`: `undefined` = sin cambios, `null` = quitar, `id` = el vídeo staged a publicar.
  - Flujo al elegir un archivo: validar tipo y tamaño (mensajes en `adminCopy.video`); `extractPoster`; `isFastStart` y `bitrateMbps` para los avisos; intent → `uploadFile` con progreso → complete del vídeo; después intent, subida y complete de la portada. Reintento con la misma `Idempotency-Key`, como `ImageUploader`.
  - Muestra: rótulo, los dos avisos y el texto de ayuda del spec (copia literal), la previsualización `<video controls muted>` con `url` del Admin, la miniatura de la portada, «Cambiar», «Quitar», el progreso y los errores. Estilos mínimos con las clases existentes de `admin.css`: el diseño visual final lo hace Astra en Task 10.
  - Editor: `visibleImages` excluye `kind === 'VideoPoster'` (no salen en `ImageUploader` ni en `gallery.order`); el estado `videoKeep` entra en `dirty` y en el cuerpo (`body.video = { keep }`); tras guardar, `resetDraft` lo limpia. Mientras se sube un vídeo, `uploading` es `true` (bloquea guardar y archivar).
  - `adminCopy.video` (es/en): `title`, `coverNote` («La portada del coche será el primer fotograma (segundo 0) de este vídeo»), `previewNote` («En el catálogo se verán los 10 primeros segundos; en la página del coche, el vídeo completo»), `help` («Recomendado: 1080p, MP4 optimizado para web, 5–8 Mbps. Máximo 100 MB»), `bitrateWarning`, `fastStartWarning`, `wrongType`, `tooLarge`, `change`, `remove`, y los códigos `invalid_video` y `video_poster_failed` en el mapa de errores.

- [ ] **Step 1: Write the failing tests** en `AdminVehicleEditor.test.tsx`, con el patrón actual de mocks de `adminApi`:
  - `poster images are not listed among the photos`: un `AdminVehicle` con una imagen `VideoPoster` no la muestra en la lista de fotos, y guardar no la incluye en `gallery.order`.
  - `removing the video sends keep null`: con un vídeo publicado, pulsar «Quitar» y guardar → `saveVehicle` recibe `video: { keep: null }`.
  - `an untouched video is not sent`: guardar tras cambiar solo un campo → el cuerpo no tiene `video`.
- [ ] **Step 2: Run** `npx vitest run src/pages/admin/AdminVehicleEditor.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implement** lo listado.
- [ ] **Step 4: Run** `npm run typecheck && npm run lint && npx vitest run`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(admin): video uploader and save`

### Task 9: Reproducción — hooks de la tarjeta y de la galería

**Files:**
- Create: `frontend/src/hooks/usePreviewVideo.ts`, `frontend/src/lib/previewPlayback.ts`
- Test: `frontend/src/lib/previewPlayback.test.ts`, `frontend/src/hooks/usePreviewVideo.test.tsx`

**Interfaces:**
- Produces:
  - `previewPlayback.ts`:
    - `PREVIEW_SECONDS = 10`.
    - `canAutoplay(): boolean`: `false` con `matchMedia('(prefers-reduced-motion: reduce)')` o `navigator.connection?.saveData`.
    - `pickCentered(candidates: { id: string; ratio: number; rect: DOMRect }[], viewportHeight: number): string | null`: entre los de `ratio ≥ 0.6`, el de centro más cercano a `viewportHeight / 2`.
    - `createCenteredController()`: un único `IntersectionObserver` compartido (umbrales `[0, 0.6, 1]`), con `register(id, element, { play, stop }) → unregister`. Llama a `play` en el elegido y a `stop` en el anterior. Escucha también `scroll` pasivo con `requestAnimationFrame`.
  - `usePreviewVideo(src: string | null) → { videoRef, active, bind }`:
    - `active` es `true` cuando el vídeo tiene `src`, ha llegado `playing` y debe verse sobre la portada.
    - `bind` son props para la tarjeta: `onPointerEnter`, `onPointerLeave`, `onFocus` y `onBlur`, solo con `(hover: hover)`. Con `(hover: none)`, se registra en el controlador compartido.
    - Al empezar, asigna `src`, `muted = true` y `playsInline`, y llama a `play()`. En `timeupdate`, si `currentTime ≥ PREVIEW_SECONDS`, vuelve a 0; en `ended`, también vuelve a 0 y sigue.
    - Al parar: `pause()`, `currentTime = 0`, quitar `src` + `load()` para cortar la descarga, y `active = false`. Una promesa de `play()` rechazada (`AbortError`) se ignora.
    - Sin `src` o con `!canAutoplay()`, no hace nada.
  - `useGalleryVideo(active: boolean) → { videoRef }`: con la diapositiva activa y `canAutoplay()`, `muted = true` y `play()`; al desactivarse, `pause()`. No fuerza `muted` después de que el usuario active el sonido.

- [ ] **Step 1: Write the failing tests:**
  - `pickCentered` elige el más centrado entre dos ≥ 0.6, ignora uno de ratio 0.5 aunque esté centrado y devuelve `null` sin candidatos.
  - `canAutoplay` es `false` con reduced-motion (mock de `matchMedia`) y con `saveData`.
  - `usePreviewVideo`: `onPointerEnter` y después `onPointerLeave` antes del evento `playing` (Review Focus 5) → `pause` llamado, `src` vacío y `active` `false`; un `playing` que llega tarde no pone `active` a `true`.
  - `usePreviewVideo`: un `timeupdate` con `currentTime = 10.2` → `currentTime` vuelve a 0.
- [ ] **Step 2: Run** `npx vitest run src/lib/previewPlayback.test.ts src/hooks/usePreviewVideo.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implement** lo listado.
- [ ] **Step 4: Run** `npm run typecheck && npm run lint && npx vitest run`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(catalogue): preview playback hooks`

### Task 10: Astra — diseño del recuadro del Admin

**Files:**
- Modify: `frontend/src/components/admin/VideoUploader.tsx` (solo marcado y clases), `frontend/src/styles/admin.css`

**Interfaces:**
- Consumes: Task 8. No cambia props, flujo ni textos.

- [ ] **Step 1:** Encargo a Astra: recuadro claramente distinto de la galería de fotos, coherente con el Admin actual, con estados vacío, subiendo, listo, aviso y error, a 1440 y 390.
- [ ] **Step 2:** QA en navegador: subir un MP4 optimizado y otro sin optimizar (aparece el aviso de fast start), cambiar, quitar y guardar.
- [ ] **Step 3:** `npm run typecheck && npm run lint && npx vitest run` → PASS.
- [ ] **Step 4: Commit** `style(admin): video box`

### Task 11: Astra — tarjeta del catálogo y galería

**Files:**
- Modify: `frontend/src/components/VehicleCard.tsx`, `frontend/src/components/VehicleGallery.tsx`, `frontend/src/styles/vehicles.css`

**Interfaces:**
- Consumes: Task 6 (`VehicleSummary.video`) y Task 9 (`usePreviewVideo`, `useGalleryVideo`).
- Requirements del spec:
  - Tarjeta: `<video>` dentro de `vehicle-card__media`, sobre la portada, `aria-hidden`, `preload="none"`, `muted`, `playsInline`. Visible solo con `active` y con transición de opacidad; la portada no se mueve (CLS 0).
  - Galería: con `video`, la diapositiva 0 es `<video controls muted playsInline loop poster={images[0].src}>` y las fotos van después con la numeración actual. La miniatura 0 muestra la portada con un icono de play. El `dialog` muestra el vídeo con controles y sigue en el mismo `currentTime`. Las flechas y el deslizamiento en móvil funcionan igual.

- [ ] **Step 1:** Encargo a Astra con el spec y estas Interfaces. QA a 1440 y 390: hover y foco con bucle de 10 s, centrado en móvil (una a la vez), reduced-motion, galería con vídeo primero y sonido activable, coche sin vídeo idéntico a hoy.
- [ ] **Step 2:** `npm run typecheck && npm run lint && npx vitest run && npm run build` → PASS.
- [ ] **Step 3: Commit** `feat(catalogue): preview video in cards and gallery`

### Task 12: Verificación final

- [ ] **Step 1:** `dotnet build` (0 warnings nuevos); `dotnet test tests/GpSelect.Tests`; `dotnet test tests/GpSelect.IntegrationTests` (Docker encendido). Expected: todo PASS.
- [ ] **Step 2:** `cd frontend && npm run typecheck && npm run lint && npx vitest run && npm run build`. Expected: PASS.
- [ ] **Step 3:** Navegador, de principio a fin con API y frontend locales:
  - crear un coche y subir fotos y vídeo;
  - comprobar que la portada es el fotograma 0 en el listado del Admin, el catálogo, la home destacada y el `og:image` de la ficha;
  - comprobar la preview de 10 s y la galería;
  - en Safari/iOS si es posible (o WebKit de Playwright): comprobar la reproducción por rangos.
- [ ] **Step 4:** Actualizar `docs/CURRENT-STATE.md` con un apartado breve: qué hay, verificación y deuda.
- [ ] **Step 5: Commit** `docs: record the vehicle video`
