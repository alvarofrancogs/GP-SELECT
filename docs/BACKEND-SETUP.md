# GP SELECT — backend: puesta en marcha y contrato

Backend .NET 8 (`src/`), EF Core y PostgreSQL. No hay `appsettings*.json` en `GpSelect.Api`: toda la configuración entra por variables de entorno (o user-secrets). Verificado el 30-09-2026 con Postgres 16 en Docker, la API y el proxy de Vite.

## Configuración

| Clave (variable de entorno) | Desarrollo | Producción |
|---|---|---|
| `ASPNETCORE_ENVIRONMENT` | `Development` | `Production` |
| `ASPNETCORE_URLS` | `http://localhost:5000` (destino del proxy de Vite) | según despliegue |
| `ConnectionStrings__Default` | `Host=localhost;Port=55432;Database=gpselect;Username=postgres;Password=postgres` | obligatoria |
| `Security__AllowedOrigin` | `http://127.0.0.1:5173` | **obligatoria**: el origen público exacto, `https://<dominio>` (dominio final pendiente de definir) |
| `Security__TrustedProxies` | vacío | IP del proxy inverso, si lo hay (lista separada por comas) |
| `Admin__Email` | cualquier email | **obligatoria**: el del administrador |
| `Admin__PasswordHash` | hash generado (ver abajo) | **obligatoria**: hash generado |
| `Enquiries__Enabled` | `true` para probar el formulario | `false` (o vacío) **hasta tener los textos legales**; después `true` |
| `Enquiries__NotificationEmail` | opcional | buzón que recibe el aviso de cada consulta (pendiente de definir) |
| `Storage__Provider` | vacío → `File` automático en Development | `S3` (obligatorio) |
| `Storage__Root` | opcional (por defecto `uploads/` junto al binario) | — |
| `Storage__Endpoint`, `__AccessKey`, `__SecretKey`, `__Bucket` | — | obligatorias con S3 |

### `Security__AllowedOrigin` (importante)

El middleware CSRF de `Program.cs` rechaza con **403 `csrf_failed`** cualquier `POST`/`PUT`/`PATCH`/`DELETE` a `/api/admin/*` que lleve la cookie de sesión y cuyo `Origin` (o, si falta, `Referer`) no sea **exactamente** `Security:AllowedOrigin`.

- **Si la clave no está configurada, todas las mutaciones del Admin con sesión devuelven 403.** El login funciona (todavía no hay cookie), pero nada más.
- En desarrollo el navegador habla con Vite (`http://127.0.0.1:5173`) y Vite reenvía `/api` a `http://localhost:5000` con `changeOrigin: false`: el `Origin` que llega a la API es `http://127.0.0.1:5173`. Abrir el frontend como `http://localhost:5173` cambia el origen y provoca 403: usar siempre `127.0.0.1` o ajustar la variable.
- Sin `Origin` ni `Referer` también es 403 (clientes de línea de comandos: añadir `-H "Origin: http://127.0.0.1:5173"`).
- La misma clave configura CORS con credenciales para ese único origen.
- Formato exacto: esquema + host + puerto opcional, sin ruta, sin barra final y sin comodines. En Production la API **no arranca** si falta, si no es `https` o si apunta a `localhost` o a una IP de loopback. Tampoco arranca sin `Admin__Email` y `Admin__PasswordHash`.

### Límite del login y proxy inverso

`POST /api/admin/auth/login` admite 5 intentos por minuto **por cliente** (ventana fija). La clave es la dirección IP; en IPv6, el prefijo /64. Ningún valor que envíe el cliente cambia la clave. Al superarlo, **429** `rate_limited` (problem+json con `correlationId`) y `Retry-After` en segundos, sin cookie. El Admin muestra «Demasiados intentos».

- Sin proxy, la IP es la de la conexión y `X-Forwarded-For` se ignora.
- **Con proxy inverso** (nginx, Caddy, balanceador…), la conexión llega desde el proxy y todos los clientes compartirían un único cupo: alguien podría bloquear el login del administrador. Hay que poner la IP del proxy en `Security__TrustedProxies`. Solo entonces se usa `X-Forwarded-For` (la última entrada, la que añade el proxy), y nunca si llega de otra dirección. Solo direcciones literales; los rangos CIDR no se aceptan.
- Estado en memoria: con varias instancias de la API, cada una tiene su propio cupo. Con una sola instancia, que es el caso previsto, es suficiente.

### Consultas del formulario de Contacto (enquiries)

Flujo: formulario → `POST /api/public/enquiries` → la consulta se guarda en PostgreSQL (tabla `Enquiries`, **fuente de verdad**) → **202** `{"received":true}` → un worker intenta avisar por email después. Un fallo del email nunca hace perder la consulta.

- **Campos:** exactamente los del formulario: `intent` (`Vehicle` | `Search`), `name` (2–200), `email` (≤ 200), `phone` (opcional, 7–15 dígitos, ≤ 30), `vehicle` (obligatorio con `Vehicle`, ≤ 200) y `message` (10–5000). Se rechazan los caracteres de control. No se guardan IP ni otros datos. Además: `CreatedAt` (indexado, para aplicar una retención) y el estado técnico del aviso (`NotificationStatus` `Pending`/`Sent`/`Failed`, intentos, próximo intento y `NotifiedAt`). No hay estado comercial ni CRM.
- **Errores:** 400 con `code` y `field`; 413 si el cuerpo pasa de 32 KB; 415 si no es JSON; **503 `enquiries_unavailable`** si `Enquiries__Enabled` no es `true`; 429 `rate_limited` al pasar de 5 envíos por 10 minutos por cliente (misma clave que el login, con `Security__TrustedProxies`).
- **Email desacoplado:** el puerto es `IEnquiryNotifier` (Infrastructure). **No hay ningún adaptador implementado: el proveedor está por decidir.** Sin adaptador, las consultas quedan `Pending` y la API avisa al arrancar; en cuanto se registre uno, el worker envía también las pendientes. Reintentos a 1 min, 5 min, 30 min, 2 h y 12 h; al sexto intento, `Failed` (la consulta sigue guardada). Los logs solo llevan el id de la consulta y el tipo de error. Supone una sola instancia de la API.
- **Leer las consultas hoy** (sin pantalla en el Admin): `SELECT "CreatedAt","Intent","Name","Email","Phone","Vehicle","Message" FROM "Enquiries" ORDER BY "CreatedAt" DESC;`
- **Frontend:** envía solo si se ha compilado con `VITE_ENQUIRIES_ENABLED=true`. Por defecto no: el build de producción ni siquiera incluye la llamada, y el formulario avisa de que la consulta no se envía. En desarrollo siempre envía.
- **LEGAL/PRIVACY DECISION REQUIRED BEFORE PUBLIC RELEASE:** responsable del tratamiento, base jurídica, texto informativo o de consentimiento junto al formulario y plazo de conservación. Nada de esto está definido ni inventado. Hasta entonces, `Enquiries__Enabled` y `VITE_ENQUIRIES_ENABLED` deben quedarse sin activar en producción. La retención se podrá aplicar con un borrado por `CreatedAt`, sin rehacer nada.

`X-Correlation-ID` del cliente solo se reutiliza si tiene como máximo 64 caracteres `[A-Za-z0-9._-]`; si no, se genera uno nuevo.

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
Enquiries__Enabled=true \
  dotnet run --project src/GpSelect.Api --no-launch-profile

# 4. Frontend (otra terminal) y abrir http://127.0.0.1:5173
cd frontend && npm run dev
```

El Admin está en `http://127.0.0.1:5173/admin`. Hay que abrirlo con la misma dirección que `Security__AllowedOrigin`: desde `http://localhost:5173` el login funciona, pero cualquier cambio devuelve 403, y el Admin avisa de que el origen no coincide.

## Producción

- Frontend y API bajo el **mismo origen**; `Security__AllowedOrigin` = ese origen exacto (esquema + host + puerto, sin barra final).
- `Storage__Provider=S3`. La subida es un `PUT` firmado desde el navegador: el bucket necesita CORS que permita `PUT` con `Content-Type` desde `AllowedOrigin`.
- Las migraciones se aplican al arrancar en Production.
- HTTPS: la API no redirige ni envía HSTS. TLS, la redirección de HTTP a HTTPS y HSTS corresponden al proxy o al hosting. La cookie ya lleva `Secure` fuera de Development.
- Sin Swagger expuesto; los errores 500 son problem details sin traza (la página de excepción detallada solo existe en Development).
- `DesignTimeDbContextFactory` tiene un fallback a `localhost` que solo usa `dotnet ef` en desarrollo; la API en ejecución exige `ConnectionStrings__Default`.
- No hay usuarios ni credenciales sembrados: el administrador sale solo de `Admin__Email` y `Admin__PasswordHash`.

## Tests

```bash
dotnet test tests/GpSelect.Tests               # unitarios: dominio y contratos, sin Docker
dotnet test tests/GpSelect.IntegrationTests    # API real + PostgreSQL con Testcontainers: requiere Docker en marcha
```

Los tests de integración levantan Postgres 16 efímero, aplican las migraciones sobre base limpia y cubren login, logout y cookie, CSRF (Origin y Referer), límite del login (429, bypass por cabecera, IPv6 /64, proxy de confianza), arranque en Production con configuración insegura, consultas (202 y persistencia, 400 por campo, 503 desactivado, 429, CORS, reintentos del aviso con un notificador falso), 413 en lugar de 500, validación del contenedor de dependencias en Development, enums como texto, PATCH, estados, visibilidad pública, portada con subida real de imágenes y ausencia de N+1 en el listado del Admin.

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
- Hasta 3A el limitador del login respondía 503 y agrupaba por IP más la cabecera `X-Login-Email` que enviaba el cliente, así que se podía esquivar. Corregido en 3A (ver «Límite del login y proxy inverso»).
