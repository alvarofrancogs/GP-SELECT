#!/bin/sh
# One dump a day (pg_dump custom format, restorable with pg_restore), the oldest beyond BACKUP_KEEP_DAYS removed.
set -u
while true; do
  file="/backups/gpselect-$(date +%Y%m%d-%H%M).dump"
  if pg_dump -Fc -f "$file.part" && mv "$file.part" "$file"; then
    echo "backup: $file ($(du -h "$file" | cut -f1))"
  else
    rm -f "$file.part"
    echo "backup: FAILED at $(date)" >&2
  fi
  find /backups -name 'gpselect-*.dump' -mtime +"$BACKUP_KEEP_DAYS" -delete
  sleep 86400
done
