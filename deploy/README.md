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

## Requisitos

- Un servidor Linux con Docker y el plugin `docker compose`. Con 2 GB de RAM basta: la API tiene un límite de 1 GB porque procesar una foto muy grande ocupa unos 0,7 GB.
- Un dominio con un registro DNS **A** apuntando al servidor (`gpselect.es`).
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
- **Fuera del servidor:** las copias que se quedan en el mismo servidor no protegen si se pierde el servidor. Hay que copiar `deploy/backups/` a otro sitio con regularidad, por ejemplo con `rclone` a otro almacenamiento.
- **Restaurar la base de datos** (se sobrescribe el contenido actual):

```bash
docker compose stop api
docker compose exec backup sh -c 'pg_restore --clean --if-exists -d gpselect /backups/<archivo>.dump'
docker compose start api
```

## Formulario de contacto

Viene desactivado (`ENQUIRIES_ENABLED=false`) hasta tener tres cosas: los datos legales en `frontend/src/config/legal.ts`, el proveedor de email y el buzón (`ENQUIRIES_NOTIFICATION_EMAIL`). Para activarlo se pone `true` y se ejecuta `docker compose up -d --build`: hay que recompilar la web.

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
