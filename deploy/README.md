# GP SELECT — despliegue en producción

Un servidor con Docker y un solo comando. Todo se ha probado en local en modo producción (05-10-2026). Se probaron el HTTPS, el login del admin, la subida de fotos al almacenamiento S3, el procesado, la publicación, la ficha generada por el servidor, el sitemap, el reinicio sin perder la sesión y la restauración de una copia.

## Qué se levanta

| Servicio | Qué hace |
|---|---|
| `web` | Caddy: HTTPS automático (Let's Encrypt), la web compilada y el proxy a la API. También sirve el subdominio de subida de fotos. |
| `api` | API .NET en `Production`. Aplica las migraciones al arrancar. Guarda sus claves de sesión en un volumen, así que un reinicio no cierra la sesión del admin. |
| `db` | PostgreSQL 16. |
| `seaweedfs` + `storage-setup` | Almacenamiento S3 propio (opcional, perfil `self-hosted-storage`). Crea el bucket privado y una clave para la API limitada a ese bucket. |
| `backup` | Un volcado diario de la base de datos en `deploy/backups/`. Conserva 14 días. |
| `offsite` | Copia diaria a un bucket externo independiente (perfil `offsite-backup`): dumps y, con SeaweedFS, fotos con historial. |

## Requisitos

- Un servidor Linux con Docker y el plugin `docker compose`. Con 2 GB de RAM basta: la API tiene un límite de 1 GB porque procesar una foto muy grande ocupa unos 0,7 GB.
- Un dominio con un registro DNS **A** apuntando al servidor (`gpselect.es`).
- Dominios secundarios: `REDIRECT_DOMAINS=gpselect.es, www.gpselect.es, www.gpselect.com` si `DOMAIN=gpselect.com`. Cada nombre necesita un registro **A** al servidor; Caddy obtiene sus certificados y redirige con 308, conservando ruta y query. No incluir el dominio principal ni el de S3. Vacío desactiva estas redirecciones.
- Si usas el almacenamiento propio, un segundo registro **A** para las subidas (`s3.gpselect.es`).
- Los puertos 80 y 443 abiertos.

## Primera puesta en marcha

```bash
git clone <repo> gpselect && cd gpselect/deploy
cp .env.example .env
nano .env        # rellenar todo (ver abajo)
docker compose up -d --build
docker compose ps        # storage-setup aparece «Exited (0)»: es normal
```

Rellenar `.env`:
- **Dominio y certificados:** `DOMAIN` y `ACME_EMAIL`.
- **Contraseñas aleatorias:** `DB_PASSWORD`, `S3_ACCESS_KEY` y `S3_SECRET_KEY`. Se pueden generar con `openssl rand -base64 32 | tr -d '/+='`.
- **Administrador:** `ADMIN_EMAIL` y `ADMIN_PASSWORD_HASH`. El hash se genera como explica `docs/BACKEND-SETUP.md` («Generar Admin__PasswordHash»); nunca se pone la contraseña en claro.
- **Almacenamiento de fotos:** se elige una de las dos opciones de abajo.

La primera vez Caddy tarda unos segundos en obtener los certificados. Después: `https://<DOMAIN>` y `https://<DOMAIN>/admin`.

## Almacenamiento de las fotos (S3)

En producción la API exige un almacenamiento compatible con S3. El navegador del admin sube cada original directamente al bucket con una URL firmada. La API lo procesa y sirve las fotos públicas.

- **A. Propio, en el mismo servidor (por defecto en `.env.example`).** Hay que dejar `COMPOSE_PROFILES=self-hosted-storage` y dar a `S3_DOMAIN` su registro DNS. Las fotos viven en el volumen `gpselect_storage-data`. No cuesta nada, pero las copias de las fotos corren de tu cuenta (ver «Copias de seguridad»).
- **B. Un proveedor externo** (Cloudflare R2, Backblaze B2, Scaleway…). Hay que quitar las cuatro líneas de la opción A y poner `S3_ENDPOINT` con la dirección del proveedor. En el proveedor se crea el bucket, unas claves limitadas a él y una regla CORS que permita `PUT` desde `https://<DOMAIN>` con la cabecera `Content-Type`. El proveedor se ocupa de la durabilidad.

MinIO ya no publica imágenes de Docker: por eso la opción propia usa SeaweedFS.

## Actualizar

```bash
cd gpselect && git pull
cd deploy && docker compose up -d --build
```

La API aplica sola las migraciones nuevas. Los volúmenes (base de datos, fotos, claves y certificados) se conservan.

## Copias de seguridad

- **Base de datos:** se vuelca todos los días en `deploy/backups/gpselect-AAAAMMDD-HHMM.dump`. Para hacer una copia en el momento:
  `docker compose exec backup sh -c 'pg_dump -Fc -f /backups/manual-$(date +%Y%m%d-%H%M).dump'`
- **Fotos con la opción A:**
  `docker run --rm -v gpselect_storage-data:/data -v "$PWD/backups:/b" alpine tar czf /b/fotos-$(date +%Y%m%d).tgz -C /data .`
- **Fuera del servidor:** activar la copia opcional de abajo; los volúmenes y dumps locales no sobreviven a la pérdida del servidor.
- **Restaurar la base de datos** (se sobrescribe el contenido actual):

```bash
docker compose stop api
docker compose exec backup sh -c 'pg_restore --clean --if-exists -d gpselect /backups/<archivo>.dump'
docker compose start api
```

### Copia externa opcional (R2)

1. Crear en Cloudflare R2 un bucket privado **separado** del de fotos, por ejemplo `gpselect-backups`. Crear un [token R2](https://developers.cloudflare.com/r2/api/tokens/) con **Object Read & Write**, limitado solo a ese bucket. No reutilizar las claves de la API.
2. Rellenar `OFFSITE_BUCKET` y `RCLONE_CONFIG_OFFSITE_ENDPOINT` (`https://<account-id>.r2.cloudflarestorage.com`), `RCLONE_CONFIG_OFFSITE_ACCESS_KEY_ID` y `RCLONE_CONFIG_OFFSITE_SECRET_ACCESS_KEY`. `RCLONE_CONFIG_OFFSITE_PROVIDER` vale `Cloudflare` por defecto; admite otro proveedor S3 compatible. No hay archivo `rclone.conf`.
3. En `.env`, usar `COMPOSE_PROFILES=self-hosted-storage,offsite-backup` con SeaweedFS, o `COMPOSE_PROFILES=offsite-backup` con fotos externas. Usar esta variable también al ejecutar los comandos de abajo: el script la lee para decidir si copia las fotos.
4. Ejecutar `docker compose up -d offsite`. Empieza 15 minutos después de arrancar (`OFFSITE_START_DELAY`, en segundos), detrás del dump diario, y después cada 24 h. `OFFSITE_KEEP_DAYS` conserva 30 días de dumps por defecto. Si falla, el log indica el paso (`config`, `dumps`, `db-copy`, `db-retention` o `photos`); `docker compose restart offsite` lo reintenta tras el retraso. `OFFSITE_BUCKET` no puede ser el bucket de las fotos.

Los dumps van a `db/` (solo `.dump`, nunca `.part`); las fotos propias a `photos/`. El [sync con backup-dir](https://rclone.org/docs/#backup-dir-dir) mueve versiones sustituidas o borradas a `photos-history/<fecha-UTC>/`, fuera del espejo. Ese historial no se purga automáticamente. Con fotos externas se omite esta copia: las conserva el proveedor fuera del servidor; configurar allí su protección frente a borrados accidentales.

Comprobar un `SUCCESS` por ejecución y los objetos remotos; un `FAILED` no expone respuestas del proveedor ni credenciales. Si falla, revisar endpoint, token, bucket y conectividad. Restaurar periódicamente en un entorno de prueba. Todos los servicios rotan sus logs (`json-file`, 10 MB × 3).

```bash
docker compose logs --tail=5 offsite
docker compose exec offsite sh -c 'rclone lsf "offsite:$OFFSITE_BUCKET/db"'
docker compose exec offsite sh -c 'rclone check /backups "offsite:$OFFSITE_BUCKET/db" --include "*.dump" --one-way'
# Solo con SeaweedFS:
docker compose exec offsite sh -c 'rclone check "source:$S3_BUCKET" "offsite:$OFFSITE_BUCKET/photos" --one-way'
```

Para recuperar una BD, descargar el dump (el montaje del servicio habitual es de solo lectura) y ejecutar el `pg_restore` de arriba. Los comandos se ejecutan desde `deploy/`; sustituir `<archivo>.dump` por el nombre elegido:

```bash
docker compose run --rm --no-deps -v "$PWD/backups:/restore" --entrypoint /bin/sh offsite \
  -c 'rclone copyto "offsite:$OFFSITE_BUCKET/db/<archivo>.dump" "/restore/<archivo>.dump"'
```

Para recuperar fotos en una instalación SeaweedFS ya inicializada, parar API y copia externa mientras se restaura. El espejo es la última copia correcta; el historial contiene solo versiones retiradas, no snapshots completos. Para deshacer un borrado, copiar su clave concreta desde la carpeta fechada elegida (conservar la ruta relativa a `photos/`):

```bash
docker compose stop api offsite
docker compose run --rm --no-deps --entrypoint /bin/sh offsite \
  -c 'rclone copy "offsite:$OFFSITE_BUCKET/photos" "source:$S3_BUCKET"'
# Opcional: recuperar un objeto retirado o sustituido, después de copiar el espejo.
docker compose run --rm --no-deps --entrypoint /bin/sh offsite \
  -c 'rclone copyto "offsite:$OFFSITE_BUCKET/photos-history/<fecha-UTC>/<clave>" "source:$S3_BUCKET/<clave>"'
docker compose start api offsite
```

Elegir un dump compatible con las fotos recuperadas: restaurar solo el objeto no revierte una eliminación en la BD. La copia diaria de fotos y el dump no forman un snapshot atómico.

## Formulario de contacto

Viene desactivado (`ENQUIRIES_ENABLED=false`). Completar los datos legales y configurar un proveedor SMTP (Brevo, Zoho, Google Workspace, etc.) con estos valores en `.env`:

| Variable | Valor |
|---|---|
| `SMTP_HOST`, `SMTP_FROM` | servidor SMTP y dirección remitente autorizada |
| `SMTP_PORT` | `587` por defecto; usar el puerto del proveedor |
| `SMTP_USERNAME`, `SMTP_PASSWORD` | credenciales SMTP del proveedor |
| `SMTP_SECURITY` | `StartTls` por defecto, o `SslOnConnect` (normalmente `465`) |
| `ENQUIRIES_NOTIFICATION_EMAIL` | buzón receptor; Reply-To será el cliente |
| `ENQUIRIES_RETENTION_DAYS` | `30` por defecto, mínimo `1`; afecta a PostgreSQL, no al buzón ni a backups |

Después poner `ENQUIRIES_ENABLED=true` y ejecutar `docker compose up -d --build` para recompilar la web. En Production el API rechaza el arranque del formulario activo sin Host, From o destinatario. El mantenimiento borra consultas caducadas cada hora, incluso si su aviso no se entregó.

## Comprobaciones rápidas

```bash
docker compose ps
docker compose logs -f api
curl -I https://<DOMAIN>/servicios     # 308 → /importacion
```

## Prueba local (sin dominio)

Se puede probar en un PC con Docker sin tocar DNS:
- **Dominios:** `DOMAIN=gpselect.127.0.0.1.nip.io` y `S3_DOMAIN=s3.gpselect.127.0.0.1.nip.io`; `S3_PUBLIC_ENDPOINT` con ese mismo host.
- **Certificados:** `CADDY_EXTRA_GLOBAL=local_certs`, que hace que Caddy use certificados propios. El navegador avisará del certificado.

Al terminar: `docker compose down -v`. Esto borra también los datos de la prueba.
