#!/bin/sh
# One dump a day (pg_dump custom format, restorable with pg_restore). A dump counts only once it reads back.
# Dumps older than BACKUP_KEEP_DAYS (exactly, in minutes) are removed, manual ones included, except the newest one:
# a run of failures never leaves no copy, and keeps only that last good one beyond the limit.
# BACKUP_PING_URL (optional, healthchecks.io style): pinged after each good dump, with /fail after a failed one.
set -u
ping() { [ -z "${BACKUP_PING_URL:-}" ] || wget -q -T 10 -O /dev/null "$BACKUP_PING_URL$1" 2>/dev/null || true; }
while true; do
  file="/backups/gpselect-$(date +%Y%m%d-%H%M).dump"
  if pg_dump -Fc -f "$file.part" && pg_restore --list "$file.part" >/dev/null && mv "$file.part" "$file"; then
    echo "backup: $file ($(du -h "$file" | cut -f1))"
    ping ""
  else
    rm -f "$file.part"
    echo "backup: FAILED at $(date), the newest dump is kept" >&2
    ping /fail
  fi
  newest=$(ls -1t /backups/gpselect-*.dump 2>/dev/null | head -n 1)
  find /backups -name 'gpselect-*.dump' -mmin +$((BACKUP_KEEP_DAYS * 1440)) ! -path "$newest" -delete
  sleep 86400
done
