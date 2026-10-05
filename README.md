# GP SELECT — Backend

Copia independiente del backend de GP SELECT. El proyecto está construido con **.NET 8**, **ASP.NET Core Web API**, **Entity Framework Core** y **PostgreSQL**.

## Estructura

- `src/GpSelect.Api`: aplicación HTTP, configuración, autenticación y controladores.
- `src/GpSelect.Application`: contratos/DTOs y servicios de aplicación.
- `src/GpSelect.Domain`: entidades, estados y reglas de dominio de vehículos e imágenes.
- `src/GpSelect.Infrastructure`: persistencia EF Core, PostgreSQL, almacenamiento de objetos, procesamiento de imágenes y migraciones.
- `tests/GpSelect.Tests`: pruebas automatizadas del dominio.
- `GpSelect.sln`: solución de Visual Studio/.NET.

## APIs disponibles

La API utiliza respuestas de error con formato `ProblemDetails`. Las rutas administrativas requieren autenticación mediante cookie y rol `Admin`.

### Autenticación administrativa

| Método | Ruta | Función |
|---|---|---|
| `POST` | `/api/admin/auth/login` | Inicia sesión con el email y contraseña configurados. Aplica limitación de intentos. |
| `POST` | `/api/admin/auth/logout` | Cierra la sesión administrativa. |
| `GET` | `/api/admin/auth/me` | Comprueba la sesión actual y devuelve la identidad administrativa. |

### Gestión de vehículos — requiere Admin

| Método | Ruta | Función |
|---|---|---|
| `GET` | `/api/admin/vehicles` | Lista los vehículos del catálogo, incluidos estados e imágenes administrativas. |
| `GET` | `/api/admin/vehicles/{id}` | Obtiene el detalle completo de un vehículo por UUID. |
| `POST` | `/api/admin/vehicles` | Crea un vehículo y genera su slug público. |
| `PATCH` | `/api/admin/vehicles/{id}` | Actualiza los datos del vehículo. |
| `POST` | `/api/admin/vehicles/{id}/publish` | Publica o cambia el estado del vehículo después de validar sus requisitos. |
| `POST` | `/api/admin/vehicles/{id}/archive` | Archiva el vehículo; el estado archivado es terminal. |
| `GET` | `/api/admin/vehicles/{id}/preview` | Devuelve la vista previa administrativa del vehículo. |

Los datos internos como UUID, VIN, coste, margen, notas, proveedor y metadatos de carga no se exponen en las APIs públicas.

### Imágenes — requiere Admin

| Método | Ruta | Función |
|---|---|---|
| `POST` | `/api/admin/vehicles/{vehicleId}/images/intent` | Registra la intención de subida y devuelve una URL de carga. Requiere `Idempotency-Key`. |
| `PUT` | `/api/admin/vehicles/{vehicleId}/images/{imageId}/upload` | Sube una imagen al almacenamiento configurado. |
| `POST` | `/api/admin/vehicles/{vehicleId}/images/{imageId}/complete` | Confirma la subida y encola el procesamiento. Requiere `Idempotency-Key`. |
| `GET` | `/api/admin/vehicles/{vehicleId}/images/{imageId}/status` | Consulta el estado del procesamiento. |
| `GET` | `/api/admin/vehicles/{vehicleId}/images/{imageId}/card` | Obtiene la variante card procesada. |
| `GET` | `/api/admin/vehicles/{vehicleId}/images/{imageId}/detail` | Obtiene la variante detail procesada. |
| `POST` | `/api/admin/vehicles/{vehicleId}/images/{imageId}/cover` | Marca una imagen preparada como portada. |
| `POST` | `/api/admin/vehicles/{vehicleId}/images/{imageId}/remove` | Elimina lógicamente la imagen y limpia sus objetos. |
| `POST` | `/api/admin/vehicles/{vehicleId}/images/reorder` | Reordena las imágenes activas del vehículo. |
| `PUT` | `/api/admin/uploads/{key}` | Endpoint de subida usado por el almacenamiento local `File` en desarrollo. |

Formatos aceptados: JPEG, PNG y WebP. El tamaño máximo es de 20 MiB por imagen y hay un máximo de 30 imágenes activas por vehículo. HEIC/HEIF no está soportado.

### Catálogo público — anónimo

| Método | Ruta | Función |
|---|---|---|
| `GET` | `/api/public/vehicles` | Lista hasta 100 vehículos en estado `ComingSoon` o `Available`. |
| `GET` | `/api/public/vehicles/{slug}` | Devuelve el detalle público de un vehículo mediante su slug. `images` lleva las URLs detail y `cardImages` las card de las mismas fotos, en el mismo orden. |
| `GET` | `/api/public/vehicles/{slug}/images/{imageId}/card` | Sirve la imagen card pública preparada. |
| `GET` | `/api/public/vehicles/{slug}/images/{imageId}/detail` | Sirve la imagen detail pública preparada. |

La API pública solo expone información de catálogo, precio, slug y URLs de imágenes preparadas.

## Configuración

Configura las siguientes variables o sus equivalentes en `appsettings.json`:

- `ConnectionStrings__Default`: cadena de conexión PostgreSQL.
- `Admin__Email`: email del administrador.
- `Admin__PasswordHash`: hash de contraseña ASP.NET Identity; no se acepta contraseña en texto plano.
- `Security__AllowedOrigin`: origen exacto permitido para CORS.
- `Storage__Provider`: `File` para desarrollo o `S3` para producción.
- `Storage__Endpoint`, `Storage__AccessKey`, `Storage__SecretKey`, `Storage__Bucket`: necesarios para S3.
- `Seo__TemplateUrl`: URL del `spa.html` del frontend desplegado (p. ej. `http://web/spa.html`). Activa las fichas de vehículo para buscadores.
- `Seo__SiteUrl`: origen público (`https://dominio`, sin ruta). Activa canonical absolutos y `/seo/sitemap.xml`.

En producción se exige almacenamiento S3-compatible y se aplican las migraciones EF Core al iniciar. El proveedor `File` está destinado a desarrollo/no producción.

## Ejecutar

Requisitos: .NET 8 SDK y PostgreSQL 14+.

```powershell
dotnet restore
dotnet build
dotnet test
dotnet ef database update --project src/GpSelect.Infrastructure --startup-project src/GpSelect.Api
dotnet run --project src/GpSelect.Api
```

Swagger queda disponible durante el desarrollo en `/swagger` si la configuración de la aplicación lo habilita.

## Seguridad y comportamiento

- Cookies HTTP-only, `SameSite=Strict` y `Secure` en producción.
- CORS limitado a un origen explícito.
- Protección CSRF para operaciones mutables.
- Rate limit para el inicio de sesión.
- Cabecera de correlación `X-Correlation-ID` en las respuestas.
- Idempotencia para operaciones de intención y finalización de imágenes.
- Las imágenes originales permanecen privadas; las variantes públicas preparadas son cacheables.
