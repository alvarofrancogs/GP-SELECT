# GP SELECT — backend: puesta en marcha y contrato

Backend .NET 8 (`src/`), EF Core y PostgreSQL. No hay `appsettings*.json` en `GpSelect.Api`: toda la configuración entra por variables de entorno (o user-secrets). Verificado el 30-09-2026 con Postgres 16 en Docker, la API y el proxy de Vite.

## Configuración

| Clave (variable de entorno) | Desarrollo | Producción |
|---|---|---|
| `ASPNETCORE_ENVIRONMENT` | `Development` | `Production` |
| `ASPNETCORE_URLS` | `http://localhost:5000` (destino del proxy de Vite) | según despliegue |
| `ConnectionStrings__Default` | `Host=localhost;Port=55432;Database=gpselect;Username=postgres;Password=postgres` | obligatoria |
| `Security__AllowedOrigin` | `http://127.0.0.1:5173` | el origen público exacto, p. ej. `https://gpselect.es` |
| `Admin__Email` | cualquier email | el del administrador |
| `Admin__PasswordHash` | hash generado (ver abajo) | hash generado |
| `Storage__Provider` | vacío → `File` automático en Development | `S3` (obligatorio) |
| `Storage__Root` | opcional (por defecto `uploads/` junto al binario) | — |
| `Storage__Endpoint`, `__AccessKey`, `__SecretKey`, `__Bucket` | — | obligatorias con S3 |

### `Security__AllowedOrigin` (importante)

El middleware CSRF de `Program.cs` rechaza con **403 `csrf_failed`** cualquier `POST`/`PUT`/`PATCH`/`DELETE` a `/api/admin/*` que lleve la cookie de sesión y cuyo `Origin` (o, si falta, `Referer`) no sea **exactamente** `Security:AllowedOrigin`.

- **Si la clave no está configurada, todas las mutaciones del Admin con sesión devuelven 403.** El login funciona (todavía no hay cookie), pero nada más.
- En desarrollo el navegador habla con Vite (`http://127.0.0.1:5173`) y Vite reenvía `/api` a `http://localhost:5000` con `changeOrigin: false`: el `Origin` que llega a la API es `http://127.0.0.1:5173`. Abrir el frontend como `http://localhost:5173` cambia el origen y provoca 403: usar siempre `127.0.0.1` o ajustar la variable.
- Sin `Origin` ni `Referer` también es 403 (clientes de línea de comandos: añadir `-H "Origin: http://127.0.0.1:5173"`).
- La misma clave configura CORS con credenciales para ese único origen.

### Cookie de sesión

`HttpOnly`, `SameSite=Strict`; `Secure` siempre fuera de Development (en Development, igual que la petición). Sin duración configurada: rige la predeterminada de ASP.NET Core. Las rutas `/api` sin sesión devuelven 401 (no redirigen). Un único administrador (`Admin__Email` + `Admin__PasswordHash`), rol `Admin`.

### Generar `Admin__PasswordHash`

Formato `PasswordHasher` de ASP.NET Core Identity. Con el SDK de .NET 10 (ya instalado) basta un script de un archivo, sin proyecto:

```csharp
// hash-password.cs — guárdalo fuera del repositorio
#:package Microsoft.Extensions.Identity.Core@8.0.20
using Microsoft.AspNetCore.Identity;
var password = args.Length > 0 ? args[0] : throw new ArgumentException("Usage: dotnet run hash-password.cs -- <password>");
Console.WriteLine(new PasswordHasher<object>().HashPassword(null!, password));
```

```bash
dotnet run hash-password.cs -- "tu-contraseña"
```

El resultado (`AQAAAAIAAYagAAAAE…`) va en `Admin__PasswordHash`. Entre comillas simples en bash: contiene `/` y `+`.

## Desarrollo local, paso a paso

```bash
# 1. PostgreSQL
docker run -d --name gpselect-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=gpselect -p 55432:5432 postgres:16-alpine

# 2. Migraciones (en Development no se aplican solas)
ConnectionStrings__Default="Host=localhost;Port=55432;Database=gpselect;Username=postgres;Password=postgres" \
  dotnet ef database update --project src/GpSelect.Infrastructure --startup-project src/GpSelect.Infrastructure

# 3. API
ASPNETCORE_ENVIRONMENT=Development ASPNETCORE_URLS=http://localhost:5000 \
ConnectionStrings__Default="Host=localhost;Port=55432;Database=gpselect;Username=postgres;Password=postgres" \
Security__AllowedOrigin="http://127.0.0.1:5173" \
Admin__Email="admin@gpselect.local" Admin__PasswordHash='<hash>' \
  dotnet run --project src/GpSelect.Api --no-launch-profile

# 4. Frontend (otra terminal) y abrir http://127.0.0.1:5173
cd frontend && npm run dev
```

El Admin está en `http://127.0.0.1:5173/admin`. Hay que abrirlo con la misma dirección que `Security__AllowedOrigin`: desde `http://localhost:5173` el login funciona, pero cualquier cambio devuelve 403, y el Admin avisa de que el origen no coincide.

## Producción

- Frontend y API bajo el **mismo origen**; `Security__AllowedOrigin` = ese origen exacto (esquema + host + puerto, sin barra final).
- `Storage__Provider=S3`. La subida es un `PUT` firmado desde el navegador: el bucket necesita CORS que permita `PUT` con `Content-Type` desde `AllowedOrigin`.
- Las migraciones se aplican al arrancar en Production.

## Tests

```bash
dotnet test tests/GpSelect.Tests               # unitarios: dominio y contratos, sin Docker
dotnet test tests/GpSelect.IntegrationTests    # API real + PostgreSQL con Testcontainers: requiere Docker en marcha
```

Los tests de integración levantan Postgres 16 efímero, aplican las migraciones sobre base limpia y cubren login y cookie, CSRF, enums como texto, PATCH, estados, visibilidad pública, portada con subida real de imágenes y ausencia de N+1 en el listado del Admin.

## Contrato (2F-C.1)

- **Enums como texto** (`"Available"`, `"Ready"`); los números se rechazan (400).
- **`PATCH /api/admin/vehicles/{id}` = merge-patch.** Propiedad ausente → se conserva. Presente con `null` o texto vacío → se borra. Presente con valor → se valida. `make`, `model` y `firstRegistrationYear` no se pueden borrar. El Admin debe enviar solo los campos modificados.
- **`POST /api/admin/vehicles/{id}/status {"status": …}`** con `Draft` (retirado), `ComingSoon`, `Available`, `Reserved` o `Sold`. Archivar sigue siendo `POST …/archive` (terminal). Entrar en un estado listado exige marca, modelo, año, una imagen Ready y la portada Ready, y precio distinto de 0. `publishedAt` se fija la primera vez. `/publish` se mantiene como alias (`ComingSoon`/`Available`).
- **Visibilidad pública** (`VehicleVisibility`): el catálogo lista `ComingSoon`, `Available` y `Reserved`; el detalle por slug sirve además `Sold` si llegó a publicarse. `Draft` y `Archived` nunca son públicos.
- **Portada = imagen principal:** va primera en card y detalle; la primera imagen Ready pasa a portada si no hay; al borrar la portada, se promueve la siguiente; un vehículo listado no puede perder su última imagen Ready (409 `last_public_image`). Las imágenes nuevas se añaden al final del orden.
- **Equipamiento** `string[]` y **especificaciones** `{label, value}[]` tipados en el API; se guardan como JSON en las columnas de texto existentes.
- **Errores de dominio**: problem details con `code` y, si aplica, `field` (camelCase).
- **Límites**: marca y modelo 1–60 · variante ≤ 80 · textos cortos (combustible, transmisión, carrocería, tracción, colores, referencia interna) ≤ 120 · mes 1–12 · km 0–2.000.000 · precio 0–10.000.000 (`null` = sin precio público; un vehículo listado no puede tener 0 €) · potencia 1–2000 CV · procedencia ≤ 300 · historial ≤ 4.000 · descripción ≤ 10.000 · equipamiento ≤ 100 elementos de 1–120 (se recortan espacios, se quitan vacíos y duplicados) · especificaciones ≤ 50 filas, nombre 1–80 y valor 1–120.
- **Nunca públicos**: `InternalReference`, `Vin`, `InternalNotes`, `PurchaseCostEur` (protegido por test).

## Notas de verificación

- En Windows, `curl.exe` desde Git Bash puede enviar los argumentos `-d` en la página de códigos ANSI: los JSON con acentos o «–» llegan como UTF-8 inválido (400). Para probar a mano, usar `--data-binary @archivo.json` con el archivo en UTF-8.
- El limitador del login (5 por minuto) responde **503** al rechazar, no 429, y agrupa por IP más la cabecera `X-Login-Email` que envía el cliente. No se ha modificado (fuera del alcance de 2F-C.1).
