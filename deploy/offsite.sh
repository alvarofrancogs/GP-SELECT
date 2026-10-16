#!/bin/sh
set -u

# The failing step is reported by name only: provider output can contain signed URLs or credentials.
# OFFSITE_PING_URL (optional, healthchecks.io style): pinged after each good pass, with /fail after a failed one.
ping() { [ -z "${OFFSITE_PING_URL:-}" ] || wget -q -T 10 -O /dev/null "$OFFSITE_PING_URL$1" 2>/dev/null || true; }
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
  # Copies keep the dump's own date, so if local dumps stop, every remote one ages out: the newest always stays.
  step=db-retention
  remote=$(rclone lsf "offsite:$OFFSITE_BUCKET/db" --include '*.dump' --format tp --separator '|') || return 1
  newest=$(printf '%s\n' "$remote" | sort | tail -n 1 | cut -d '|' -f 2)
  [ -n "$newest" ] || return 1
  rclone delete "offsite:$OFFSITE_BUCKET/db" --filter "- /$newest" --filter '+ *.dump' --filter '- *' \
    --min-age "${OFFSITE_KEEP_DAYS}d" || return 1
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
    ping ""
  else
    echo "offsite: FAILED at step $step $(date -u +%Y-%m-%dT%H:%M:%SZ)" >&2
    ping /fail
  fi
  sleep 86400
done
