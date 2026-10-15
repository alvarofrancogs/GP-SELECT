#!/bin/sh
# One dump a day (pg_dump custom format, restorable with pg_restore). A dump counts only once it reads back.
# Dumps older than BACKUP_KEEP_DAYS are removed, except the newest one: a run of failures never leaves no copy,
# and keeps only that last good one beyond the limit.
set -u
while true; do
  file="/backups/gpselect-$(date +%Y%m%d-%H%M).dump"
  if pg_dump -Fc -f "$file.part" && pg_restore --list "$file.part" >/dev/null && mv "$file.part" "$file"; then
    echo "backup: $file ($(du -h "$file" | cut -f1))"
  else
    rm -f "$file.part"
    echo "backup: FAILED at $(date), the newest dump is kept" >&2
  fi
  newest=$(ls -1 /backups/gpselect-*.dump 2>/dev/null | sort | tail -n 1)
  find /backups -name 'gpselect-*.dump' -mtime +"$BACKUP_KEEP_DAYS" ! -path "$newest" -delete
  sleep 86400
done
