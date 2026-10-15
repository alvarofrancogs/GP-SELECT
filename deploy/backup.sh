#!/bin/sh
# One dump a day (pg_dump custom format, restorable with pg_restore). Dumps older than BACKUP_KEEP_DAYS are removed
# only after a new dump has succeeded and reads back, so a run of failures never deletes the last good copies.
set -u
while true; do
  file="/backups/gpselect-$(date +%Y%m%d-%H%M).dump"
  if pg_dump -Fc -f "$file.part" && pg_restore --list "$file.part" >/dev/null && mv "$file.part" "$file"; then
    echo "backup: $file ($(du -h "$file" | cut -f1))"
    find /backups -name 'gpselect-*.dump' -mtime +"$BACKUP_KEEP_DAYS" -delete
  else
    rm -f "$file.part"
    echo "backup: FAILED at $(date), older dumps kept" >&2
  fi
  sleep 86400
done
