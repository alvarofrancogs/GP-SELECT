# Backend hardening (auditorías de Astra) — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corregir los hallazgos de las dos auditorías de Astra que afectan a datos reales, seguridad o privacidad, y dejar el resto registrado como deuda en `docs/CURRENT-STATE.md`.

**Architecture:** Cambios pequeños y localizados sobre el backend .NET 8 existente. El procesado de imagen sale del worker a una clase estática testeable (`ImagePipeline`). Las reglas nuevas viven en el dominio (`VehicleRules`, `VehicleGallery`, `VehicleUnit`) y los controladores solo las llaman. Sin migraciones y sin paquetes nuevos.

**Tech Stack:** .NET 8, ASP.NET Core, EF Core + Npgsql, SixLabors.ImageSharp 3.1.11, xUnit, Testcontainers (PostgreSQL).

**Spec:** los dos informes de Astra, resumidos en la conversación del 02-10-2026. Hallazgo comprobado por Opus antes de escribir este plan: en .NET 8, `JsonStringEnumConverter(allowIntegerValues:false)` acepta `"7"`, `"6"` y `"Sold, ComingSoon"` (→ `Archived`), y serializar `(VehicleStatus)7` lanza `JsonException`.

## Global Constraints

- Sin migraciones de EF ni paquetes NuGet nuevos.
- Contrato HTTP sin cambios para el frontend actual: mismas rutas, mismos DTO, mismo formato de problem details (`code`, `field`, `correlationId`).
- Errores de dominio con `DomainException(code, message, field)` y mapeados por `DomainProblems` (archived → 409, el resto → 400 salvo los ya definidos).
- Límites de imagen sin cambiar: 20 MiB, 10000 px por lado, 40 000 000 px en total, 30 fotos por vehículo.
- El frontend solo cambia en `frontend/src/i18n/adminCopy.ts` (dos códigos de error nuevos).
- Estilo: el de los archivos de alrededor. Código sencillo, comentarios solo donde expliquen un porqué.
- Los tests de integración necesitan Docker en marcha.

## Review Focus

1. **Almacenamiento S3 real:** ningún test usa S3; el stream de respuesta no es rebobinable. Lo cubre el test con stream no rebobinable de la Task 3. Al desplegar, prueba de humo de subida contra el bucket real (MinIO o S3).
2. **Foto de móvil con orientación EXIF:** quitar el EXIF no puede perder la rotación. Test en la Task 3.
3. **Fotos en staging abandonadas en una sesión anterior:** el editor las muestra como «sin guardar» y las manda en `order`; al guardar deben publicarse. Test en la Task 6.
4. **Intent de consulta con número como texto (`"intent":"1"`):** el convertidor compartido lo debe rechazar con 400. Test en la Task 2.
5. **Datos ya guardados:** estados fuera de rango o slugs con `/` en la base de datos de desarrollo. Comprobación SQL en la Task 9.

---

### Task 1: Reformatear `ImageController` y `UploadsController` sin cambiar comportamiento

Los dos están escritos en líneas de cientos de caracteres. Las Tasks 3, 5 y 6 los tocan; reformatearlos antes deja esos diffs legibles.

**Files:**
- Modify: `src/GpSelect.Api/ImageController.cs`
- Modify: `src/GpSelect.Api/UploadsController.cs`

- [ ] **Step 1: Reescribir con el estilo de `VehiclesController.cs`:** un `using` por línea, un método por bloque, una sentencia por línea, mismos nombres, mismos códigos de estado y el mismo orden de comprobaciones. Sin cambios de lógica.
- [ ] **Step 2: Compilar.** Run: `dotnet build GpSelect.sln`. Expected: `0 Warning(s)`, `0 Error(s)`.
- [ ] **Step 3: Tests.** Run: `dotnet test tests/GpSelect.IntegrationTests`. Expected: todos PASS (52 a fecha del último registro).
- [ ] **Step 4: Commit.** `git commit -m "refactor: one statement per line in image and upload controllers"`

---

### Task 2: Estados y enums solo por nombre (P1, 2.ª pasada)

**Files:**
- Create: `src/GpSelect.Application/NamedEnumConverter.cs`
- Modify: `src/GpSelect.Api/Program.cs` (las dos llamadas que añaden `JsonStringEnumConverter`)
- Modify: `src/GpSelect.Domain/Vehicle.cs` (`VehicleUnit.ChangeStatus`)
- Modify: `tests/GpSelect.Tests/VehicleContractTests.cs` (`ApiJson`, línea ~406)
- Test: `tests/GpSelect.Tests/VehicleContractTests.cs`, `tests/GpSelect.IntegrationTests/AdminApiTests.cs`, `tests/GpSelect.IntegrationTests/EnquiryApiTests.cs`

**Interfaces:**
- Produces: `public sealed class NamedEnumConverterFactory : JsonConverterFactory` y `public static class ApiJsonOptions { public static void Configure(JsonSerializerOptions options); }` (añade `NamedEnumConverterFactory` y `OptionalJsonConverterFactory`).

- [ ] **Step 1: Tests que fallan.**

```csharp
// VehicleContractTests: cambiar ApiJson para que use la política de producción.
private static readonly JsonSerializerOptions ApiJson = Configured();
private static JsonSerializerOptions Configured() { var o = new JsonSerializerOptions(JsonSerializerDefaults.Web); ApiJsonOptions.Configure(o); return o; }

[Theory]
[InlineData("\"7\"")] [InlineData("\"6\"")] [InlineData("\"Sold, ComingSoon\"")] [InlineData("7")] [InlineData("\"\"")]
public void Status_is_read_only_from_a_declared_name(string status) =>
    Assert.Throws<JsonException>(() => JsonSerializer.Deserialize<StatusChangeRequest>($$"""{"status":{{status}}}""", ApiJson));

[Fact]
public void Status_names_are_case_insensitive_and_written_as_names()
{
    Assert.Equal(VehicleStatus.Sold, JsonSerializer.Deserialize<StatusChangeRequest>("""{"status":"sold"}""", ApiJson)!.Status);
    Assert.Contains("\"status\":\"Available\"", JsonSerializer.Serialize(new StatusChangeRequest(VehicleStatus.Available), ApiJson));
}

[Fact]
public void ChangeStatus_rejects_an_undefined_status() =>
    Assert.Equal("invalid_transition", Fails(() => NewVehicle().ChangeStatus((VehicleStatus)7, [])).Code);
```

```csharp
// AdminApiTests
[Fact]
public async Task Status_endpoint_rejects_numeric_strings_and_the_list_keeps_working()
{
    var (id, _) = await CreateVehicle();
    await Problem(await SetStatus(id, "7"), HttpStatusCode.BadRequest);
    Assert.Equal("Draft", (await Json(await admin.GetAsync($"/api/admin/vehicles/{id}"))).GetProperty("status").GetString());
    await Json(await admin.GetAsync("/api/admin/vehicles"));
}
```

```csharp
// EnquiryApiTests: mismo cuerpo válido que el resto de tests del archivo, con "intent":"1" → 400.
```

- [ ] **Step 2: Comprobar que fallan.** Run: `dotnet test tests/GpSelect.Tests --filter "FullyQualifiedName~VehicleContractTests"`. Expected: FAIL (no existe `ApiJsonOptions`). Tras crear una versión vacía de la clase, los `InlineData` con `"7"`, `"6"` y la lista con coma deben fallar por no lanzar.
- [ ] **Step 3: Implementar `NamedEnumConverterFactory`.** `CanConvert` = `type.IsEnum`. Lectura: solo `JsonTokenType.String`; el texto tiene que coincidir con un nombre de `Enum.GetNames` sin distinguir mayúsculas; cualquier otra cosa → `JsonException`. Escritura: el nombre; un valor no definido → `JsonException`. Los `Nullable<T>` los envuelve System.Text.Json solo.
- [ ] **Step 4: `ApiJsonOptions.Configure` en `Program.cs`** para `AddJsonOptions` y `ConfigureHttpJsonOptions`, en lugar de los dos `JsonStringEnumConverter`.
- [ ] **Step 5: Guarda en el dominio.** En `ChangeStatus`, tras la comprobación de archivado: `if (!Enum.IsDefined(next)) throw new DomainException("invalid_transition", "Unknown status", "status");`
- [ ] **Step 6: Tests.** Run: `dotnet test tests/GpSelect.Tests` y `dotnet test tests/GpSelect.IntegrationTests`. Expected: PASS.
- [ ] **Step 7: Commit.** `git commit -m "fix: accept enum values only by declared name"`

---

### Task 3: Procesado de imagen seguro (P1 descompresión, P1 S3, P2 EXIF, P2 tamaño tras la URL firmada)

**Files:**
- Create: `src/GpSelect.Infrastructure/ImagePipeline.cs`
- Modify: `src/GpSelect.Infrastructure/ImageProcessing.cs` (líneas 33–40 y `IsSupported`, que se mueve)
- Modify: `src/GpSelect.Api/ImageController.cs`, `src/GpSelect.Api/UploadsController.cs` (usar `ImagePipeline.MaxUploadBytes` en lugar de su `Max` propio)
- Modify: `tests/GpSelect.Tests/GpSelect.Tests.csproj` (añadir `ProjectReference` a `GpSelect.Infrastructure`)
- Test: `tests/GpSelect.Tests/ImagePipelineTests.cs`

**Interfaces:**
- Produces, en `public static class ImagePipeline`:
  - `public const long MaxUploadBytes = 20 * 1024 * 1024;`
  - `Task<MemoryStream> ReadBoundedAsync(Stream source, long maxBytes, CancellationToken ct)`: copia a memoria y deja `Position = 0`; si hay más de `maxBytes` bytes, `InvalidDataException("Image exceeds size policy")`.
  - `Task<Image> DecodeAsync(MemoryStream input, string mimeType, CancellationToken ct)`: firma del formato, después `Image.IdentifyAsync` y la política de dimensiones (antes de decodificar), luego `LoadAsync` con `MaxFrames = 1`, `AutoOrient()`, y por último `ExifProfile`, `IptcProfile` y `XmpProfile` a `null`. El perfil ICC se conserva.
  - `Task<(MemoryStream Card, MemoryStream Detail)> RenderAsync(Image source, CancellationToken ct)`: 800×600 y 2400×1800 `ResizeMode.Max`, JPEG calidad 84, ambos con `Position = 0`.

- [ ] **Step 1: Tests que fallan** (`ImagePipelineTests`):
  - `ReadBounded_copies_a_non_seekable_stream_into_a_rewound_buffer`: un `Stream` de test con `CanSeek == false` sobre 100 bytes; el resultado tiene `Length == 100` y `Position == 0`.
  - `ReadBounded_rejects_more_than_the_limit`: 11 bytes con límite 10 → `InvalidDataException`.
  - `Decode_rejects_oversized_dimensions_from_the_header_alone`: PNG construido a mano (firma + IHDR 20000×20000, 8 bits, tipo 6, CRC correcto + IEND, **sin IDAT**) → `InvalidDataException` con `"dimensions"` en el mensaje. El test lleva su propio CRC32 (polinomio `0xEDB88320`). Hoy falla porque `LoadAsync` lanza otro error al no encontrar datos.
  - `Decode_strips_metadata_and_keeps_the_orientation`: JPEG de 40×20 con `ExifProfile` que tiene `ExifTag.Orientation = 6` y `ExifTag.GPSLatitude`. El resultado mide 20×40 y su `Metadata.ExifProfile` es `null`; tras `RenderAsync`, `Image.Identify` del card tampoco tiene EXIF.
  - `Decode_rejects_a_signature_that_does_not_match`: bytes PNG declarados como `image/jpeg` → `InvalidDataException`.
- [ ] **Step 2: Comprobar que fallan.** Run: `dotnet test tests/GpSelect.Tests --filter "FullyQualifiedName~ImagePipelineTests"`. Expected: FAIL (no existe `ImagePipeline`).
- [ ] **Step 3: Implementar `ImagePipeline`** con las firmas de arriba. Mensajes de la política: los mismos de hoy (`"File signature does not match an allowed image format"`, `"Image dimensions exceed policy"`).
- [ ] **Step 4: Usarlo en el worker.** `OpenReadAsync` → `ReadBoundedAsync(original, ImagePipeline.MaxUploadBytes, ct)` → `DecodeAsync` → `RenderAsync`. Se elimina `input.Position = 0` sobre el stream del almacenamiento. El resto de `ProcessOne` no cambia.
- [ ] **Step 5: Tests.** Run: `dotnet test tests/GpSelect.Tests` y `dotnet test tests/GpSelect.IntegrationTests`. Expected: PASS (las subidas reales de `AdminApiTests` siguen llegando a `Ready`).
- [ ] **Step 6: Commit.** `git commit -m "fix: bounded image read, header check before decode, strip photo metadata"`

---

### Task 4: El worker no resucita imágenes borradas (P1, 1.ª pasada)

Hoy el `catch` de `ProcessOne` llama a `image.Fail()` y `job.Retry()` sobre entidades cargadas antes. Si el admin borró la foto mientras se procesaba, se guarda `Failed` encima de `Deleted` y el job cancelado vuelve a `Queued`.

**Files:**
- Modify: `src/GpSelect.Infrastructure/ImageProcessing.cs`
- Test: `tests/GpSelect.IntegrationTests/ImageWorkerTests.cs` (nuevo, `IClassFixture<ApiFactory>`)

**Interfaces:**
- Produces: `public static async Task ImageProcessingWorker.FailAsync(GpSelectDbContext db, Guid imageId, Guid jobId, string reason, CancellationToken ct)`.

- [ ] **Step 1: Tests que fallan.** Los datos se siembran con un scope de `api.Services` y los métodos del dominio (`VehicleUnit.Create` con slug único, `VehicleImage.Create`, `StartProcessing`, `Delete`, `ImageProcessingJob.Create`, `Claim`, `Cancel`).
  - `Failure_does_not_revive_a_removed_image_or_its_cancelled_job`: imagen `Deleted` y job cancelado (`Failed`, `Error == "Cancelled"`). Tras `FailAsync`, una lectura nueva sigue dando `Deleted` y `Failed`/`"Cancelled"`.
  - `Failure_marks_a_processing_image_failed_and_requeues_its_job`: imagen `Processing` y job reclamado. Tras `FailAsync`: imagen `Failed` con `FailureReason == reason` y job `Queued`. La espera de reintento (≥ 10 s) impide que el worker real lo coja durante el test.
- [ ] **Step 2: Comprobar que fallan.** Run: `dotnet test tests/GpSelect.IntegrationTests --filter "FullyQualifiedName~ImageWorkerTests"`. Expected: FAIL (no existe `FailAsync`).
- [ ] **Step 3: Implementar `FailAsync`.** `db.ChangeTracker.Clear()`. La imagen se actualiza con `ExecuteUpdateAsync` condicionado a `State == Processing` (`State = Failed`, `FailureReason` = los 500 primeros caracteres). El job se recarga y, solo si sigue en `Processing`, `job.Retry(reason)` y `SaveChangesAsync`.
- [ ] **Step 4: Usarlo en `ProcessOne`.** El `catch` llama a `FailAsync(db, image.Id, job.Id, ex.Message, ct)`. Además, al cargar la imagen, `image is null || image.State == ImageState.Deleted` → `job.Complete()` y salir (hoy una imagen borrada gasta 5 reintentos).
- [ ] **Step 5: Tests.** Run: `dotnet test tests/GpSelect.IntegrationTests`. Expected: PASS.
- [ ] **Step 6: Commit.** `git commit -m "fix: image worker failure never overwrites a removed image or cancelled job"`

---

### Task 5: Archivado = galería de solo lectura; caché pública de un día (P2)

**Files:**
- Modify: `src/GpSelect.Domain/Vehicle.cs` (`VehicleGallery`)
- Modify: `src/GpSelect.Api/ImageController.cs` (`Intent`, `Complete`, `Cover`, `Remove`, `Reorder`)
- Modify: `src/GpSelect.Api/VehiclesController.cs` (`Save`)
- Modify: `src/GpSelect.Api/PublicVehiclesController.cs:53`
- Test: `tests/GpSelect.IntegrationTests/AdminApiTests.cs`

**Interfaces:**
- Produces: `public static void VehicleGallery.EnsureEditable(VehicleUnit vehicle)`, que lanza `DomainException("archived", "Restore the vehicle before changing its photos")`.

- [ ] **Step 1: Test que falla:** `Archived_vehicle_gallery_is_read_only`. Vehículo con una foto subida y un intent pendiente creado **antes** de archivar. Tras `POST …/archive`, todas estas llamadas → 409 con `code == "archived"`: `intent` nuevo, `complete` del pendiente, `cover`, `remove`, `reorder` y `save` con solo `gallery`. Tras `POST …/restore`, un `intent` nuevo → 200. En el mismo test (otro vehículo, ya publicado), la imagen pública responde con `Cache-Control` `MaxAge == TimeSpan.FromDays(1)`.
- [ ] **Step 2: Comprobar que falla.** Run: `dotnet test tests/GpSelect.IntegrationTests --filter "FullyQualifiedName~Archived_vehicle_gallery"`. Expected: FAIL (el intent sobre el archivado da 200).
- [ ] **Step 3: Implementar.** `EnsureEditable` en el dominio. En `ImageController`, un helper privado `Task<IActionResult?> RefuseUnlessEditable(Guid vehicleId)` que carga el vehículo (404 si no existe, problem `archived` si lo está, `null` si se puede editar), y que llaman los cinco endpoints antes de tocar nada. En `Save`, `VehicleGallery.EnsureEditable(v)` como primera línea del `try`. Caché pública: `"public,max-age=86400"`, sin `immutable`.
- [ ] **Step 4: Tests.** Run: `dotnet test tests/GpSelect.IntegrationTests`. Expected: PASS.
- [ ] **Step 5: Commit.** `git commit -m "fix: archived vehicles keep their photos read-only; public images cached one day"`

---

### Task 6: Guardado único: publica solo las fotos en staging que lista y retira antes de validar el precio (P2)

Hoy `Save` publica **todas** las fotos en staging (las de otra pestaña incluidas) y, si `order` no las lista, devuelve `invalid_order`. Además aplica los campos antes de retirar, así que pasar a `Draft` y poner precio 0 en el mismo guardado da `price_zero`.

**Files:**
- Modify: `src/GpSelect.Domain/Vehicle.cs` (`VehicleGallery.Reorder`)
- Modify: `src/GpSelect.Api/VehiclesController.cs` (`Save`, líneas 65–86)
- Modify: `src/GpSelect.Application/Contracts.cs:11` (comentario de `GalleryChanges`)
- Test: `tests/GpSelect.Tests/VehicleContractTests.cs`, `tests/GpSelect.IntegrationTests/AdminApiTests.cs`

**Interfaces:**
- Changes: `VehicleGallery.Reorder(images, order)`. `order` tiene que listar una vez cada imagen activa **no staged** y puede incluir imágenes staged. Las staged que no aparecen conservan su orden relativo y van detrás. La firma no cambia.

- [ ] **Step 1: Tests que fallan.**
  - Unitario `Reorder_may_leave_out_staged_images_but_not_saved_ones`: `a` (portada), `b` y `staged` (lista y `IsStaged`). `Reorder([a,b,staged], [b.Id, a.Id])` funciona: `b.IsCover` y `staged.SortOrder > a.SortOrder`. `Reorder([a,b,staged], [a.Id])` → `invalid_order`.
  - Integración `Save_publishes_only_the_staged_photos_it_lists`: foto guardada `A`, staged `B` y staged `C` (la «otra pestaña»). `save` con `order [A,B]` → 200: `B` deja de estar en staging, `C` sigue en staging y fuera del público. Después, `save` con `gallery { removed: [] }` sin `order` → `C` sigue en staging.
  - Integración `Save_publishes_staged_photos_left_from_an_earlier_session` (Review Focus 3): staged `B` subida antes de abrir el editor; `save` con `order [A,B]` → `B` publicada. Ya pasa hoy: es un test de regresión para que el cambio no lo rompa.
  - Integración `Save_can_withdraw_and_zero_the_price_together`: vehículo `Available` con precio y foto. `save { changes: { priceEur: 0 }, status: { status: "Draft" } }` → 200, `Draft` y precio `0`.
- [ ] **Step 2: Comprobar que fallan.** Run: `dotnet test tests/GpSelect.Tests --filter "FullyQualifiedName~Reorder_may_leave_out"` y `dotnet test tests/GpSelect.IntegrationTests --filter "FullyQualifiedName~Save_"`. Expected: FAIL (`invalid_order` en el primero, `C` publicada o 400, `price_zero`).
- [ ] **Step 3: Implementar `Reorder`** con la regla de arriba.
- [ ] **Step 4: Implementar `Save`.** Orden de operaciones: (1) si `leaves`, `ChangeStatus` **antes** de `Apply`; (2) `Apply` de los campos; (3) publicar solo las staged cuyo id está en `Gallery.Order`; si `Order` es null, no se publica ninguna; (4) quitar; (5) reordenar; (6) `EnsureCover`; (7) si entra al catálogo, `ChangeStatus` al final, como hoy. Actualizar el comentario de `GalleryChanges`.
- [ ] **Step 5: Tests.** Run: `dotnet test tests/GpSelect.Tests` y `dotnet test tests/GpSelect.IntegrationTests`. Expected: PASS, incluido `Editor_save_applies_everything_at_once_and_nothing_before` sin cambios.
- [ ] **Step 6: Commit.** `git commit -m "fix: editor save publishes only the staged photos it lists and withdraws before validating price"`

---

### Task 7: Textos sin caracteres de control y precio con dos decimales como máximo (P2)

`\u0000` llega a PostgreSQL y da 500. `0.001` pasa como positivo y se guarda como `0.00`, saltándose `price_zero`.

**Files:**
- Modify: `src/GpSelect.Domain/VehicleRules.cs` (`ShortText`, `LongText`, `Price`)
- Modify: `src/GpSelect.Domain/Enquiry.cs` (sus `Line`/`Text` dejan de llamar a su `RejectControl`, que se mueve a `VehicleRules`)
- Modify: `frontend/src/i18n/adminCopy.ts` (`codes`)
- Test: `tests/GpSelect.Tests/VehicleContractTests.cs`, `tests/GpSelect.IntegrationTests/AdminApiTests.cs`

**Interfaces:**
- Produces: `public static void VehicleRules.RejectControl(string? value, string field)`, la misma regla que hoy tiene `Enquiry`: cualquier `char.IsControl` salvo `\n`, `\r` y `\t` → `DomainException("invalid_text", …, field)`. Precio con más de dos decimales → `DomainException("invalid_precision", "priceEur allows at most 2 decimals", "priceEur")`.

- [ ] **Step 1: Tests que fallan.**
  - `Text_fields_reject_control_characters`: `Apply` con `Model = "M4\0"` → `invalid_text`/`model`; `Description = "a\u0000b"` → `invalid_text`/`description`; `Equipment = ["Navi\0"]` → `invalid_text`/`equipment`; `Description = "uno\ndos\ttres"` se acepta.
  - `Price_allows_at_most_two_decimals`: `0.001m` → `invalid_precision`; `86900.5m` y `86900.50m` se aceptan.
  - Integración `Patch_with_a_nul_character_is_a_400_not_a_500`: `PATCH { model: "M4\u0000" }` → 400 con `field == "model"`.
- [ ] **Step 2: Comprobar que fallan.** Run: `dotnet test tests/GpSelect.Tests --filter "FullyQualifiedName~Text_fields|FullyQualifiedName~Price_allows"`. Expected: FAIL.
- [ ] **Step 3: Implementar.** `ShortText` y `LongText` llaman a `RejectControl` antes de limpiar. `Price` comprueba `decimal.Round(value, 2) != value`. `Enquiry` usa la regla compartida. Los `EnquiryTests` existentes siguen pasando sin cambios.
- [ ] **Step 4: Copy del Admin.** En `codes`: `invalid_text: 'El texto contiene caracteres no válidos.'` y `invalid_precision: 'El precio admite como máximo 2 decimales.'`. Run: `cd frontend && npm run typecheck && npm run lint`. Expected: OK.
- [ ] **Step 5: Tests.** Run: `dotnet test tests/GpSelect.Tests` y `dotnet test tests/GpSelect.IntegrationTests`. Expected: PASS.
- [ ] **Step 6: Commit.** `git commit -m "fix: reject control characters in vehicle text and prices below one cent"`

---

### Task 8: Slugs seguros para URL (P2)

`SlugGenerator` usa la marca y el modelo en bruto: «911/992» crea un slug con `/` (la ficha y sus fotos quedan inaccesibles) y los espacios de los extremos se convierten en guiones.

**Files:**
- Create: `src/GpSelect.Infrastructure/SlugGenerator.cs` (sale de `Persistence.cs:5`)
- Modify: `src/GpSelect.Infrastructure/Persistence.cs` (quitar la clase)
- Test: `tests/GpSelect.Tests/SlugGeneratorTests.cs`

**Interfaces:**
- Unchanged: `ISlugGenerator.Generate(string make, string model)`. Resultado: `<base>-<guid N>`, donde `<base>` es `make model` en minúsculas, sin diacríticos (`NormalizationForm.FormD` y sin `NonSpacingMark`), con cada tramo fuera de `[a-z0-9]` cambiado por un `-` y sin guiones en los extremos. Si `<base>` queda vacío, se usa `vehicle`.

- [ ] **Step 1: Tests que fallan.**
  - `("Porsche", "911/992")` → `^porsche-911-992-[0-9a-f]{32}$`
  - `("  Citroën ", "DS 3  Crossback")` → `^citroen-ds-3-crossback-[0-9a-f]{32}$`
  - `("日本", "車")` → `^vehicle-[0-9a-f]{32}$`
  - Para todos: `^[a-z0-9-]+$`.
- [ ] **Step 2: Comprobar que fallan.** Run: `dotnet test tests/GpSelect.Tests --filter "FullyQualifiedName~SlugGeneratorTests"`. Expected: FAIL en los dos primeros.
- [ ] **Step 3: Implementar** en el archivo nuevo, con un `Regex` compilado o `[GeneratedRegex]`, como en `SecurityConfig`.
- [ ] **Step 4: Tests.** Run: `dotnet test tests/GpSelect.Tests`. Expected: PASS.
- [ ] **Step 5: Commit.** `git commit -m "fix: url-safe vehicle slugs"`

---

### Task 9: Verificación final y registro en `CURRENT-STATE.md`

**Files:**
- Modify: `docs/CURRENT-STATE.md`

- [ ] **Step 1: Verificación completa** (Docker en marcha). Run: `dotnet build GpSelect.sln` → `0 Warning(s)`; `dotnet test tests/GpSelect.Tests` → todos PASS; `dotnet test tests/GpSelect.IntegrationTests` → todos PASS; `cd frontend && npm run typecheck && npm run lint && npm run build` → OK. Anotar los recuentos reales.
- [ ] **Step 2: Datos existentes (Review Focus 5).** Contra la base de datos de desarrollo: `SELECT "Id","Status","PublicSlug" FROM "Vehicles" WHERE "Status" NOT IN ('Draft','ComingSoon','Available','Reserved','Sold','Archived') OR "PublicSlug" !~ '^[a-z0-9-]+$';` Si sale alguna fila, avisar al usuario antes de tocarla. Este plan no incluye migraciones de datos.
- [ ] **Step 3: QA del Admin en el navegador** (1440 y 390): subir fotos, guardar, descartar, portada, archivar y recuperar (las acciones de galería de un archivado muestran «El vehículo está archivado…»), un texto con carácter de control pegado y precio con tres decimales.
- [ ] **Step 4: Registrar en `CURRENT-STATE.md`** un bloque corto «Backend hardening — fecha» con lo corregido y los recuentos de tests, y la deuda que queda abierta:
  - **Concurrencia:** `complete` puede crear dos jobs; publicar mientras se borra la portada; superar las 30 fotos con intents simultáneos.
  - **S3:** la URL firmada no limita el tamaño (el worker ya rechaza más de 20 MiB, pero el objeto se queda en el bucket); no hay limpieza de huérfanos, de intents abandonados (bloquean cupo) ni de registros de idempotencia.
  - **Sesiones:** no se revocan al cambiar contraseña o email; claves de Data Protection sin persistencia definida (**decidirlo antes del despliegue**).
  - **Login:** sin límite agregado entre IP; un hash de contraseña mal formado solo falla al hacer login.
  - **Listados sin paginar:** el catálogo se trunca a 100.
  - **Índices:** faltan `Images(VehicleUnitId)` completo e `Images(OriginalKey)`.
  - **Jobs:** la recuperación de jobs caducados consume intentos; el outbox puede reenviar un aviso; la cancelación del futuro proveedor de email.
  - **Otros:** objeto ausente → 500 en vez de 404; equipamiento con validación cuadrática; aviso ICC de ImageSharp 3.1.11 sin CVE; SSH.NET solo en los tests.
- [ ] **Step 5: Commit.** `git commit -m "docs: record backend hardening and remaining backend debt"`
