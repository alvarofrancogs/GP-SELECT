#!/bin/sh
set -u

# The failing step is reported by name only: provider output can contain signed URLs or credentials.
step=config
run_backup() {
  step=config
  case "$OFFSITE_KEEP_DAYS" in ''|*[!0-9]*) return 1 ;; esac
  [ "$OFFSITE_KEEP_DAYS" -gt 0 ] || return 1
  [ -n "$OFFSITE_BUCKET" ] && [ -n "$RCLONE_CONFIG_OFFSITE_ENDPOINT" ] &&
    [ -n "$RCLONE_CONFIG_OFFSITE_ACCESS_KEY_ID" ] && [ -n "$RCLONE_CONFIG_OFFSITE_SECRET_ACCESS_KEY" ] || return 1
  # Backing the photo bucket up into itself would nest a copy inside every copy.
  [ "$OFFSITE_BUCKET" != "$S3_BUCKET" ] || return 1
  # A missing mount or first dump must not be reported as a successful database backup.
  step=dumps
  find /backups -maxdepth 1 -name '*.dump' | grep -q . || return 1
  step=db-copy
  rclone copy /backups "offsite:$OFFSITE_BUCKET/db" --include '*.dump' --max-depth 1 || return 1
  step=db-retention
  rclone delete "offsite:$OFFSITE_BUCKET/db" --include '*.dump' --min-age "${OFFSITE_KEEP_DAYS}d" || return 1
  case ",$COMPOSE_PROFILES," in
    *,self-hosted-storage,*)
      step=photos
      rclone sync "source:$S3_BUCKET" "offsite:$OFFSITE_BUCKET/photos" \
        --backup-dir "offsite:$OFFSITE_BUCKET/photos-history/$(date -u +%Y%m%dT%H%M%SZ)" || return 1
      ;;
  esac
}

# Start after the daily dump (backup.sh runs when the stack starts) so the first pass has something to copy.
sleep "${OFFSITE_START_DELAY:-900}"
while true; do
  if run_backup >/dev/null 2>&1; then
    echo "offsite: SUCCESS $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  else
    echo "offsite: FAILED at step $step $(date -u +%Y-%m-%dT%H:%M:%SZ)" >&2
  fi
  sleep 86400
done
