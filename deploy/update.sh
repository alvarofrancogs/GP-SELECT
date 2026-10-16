#!/bin/sh
# First start and every update (run it at least once a month for security patches, even without code changes).
# Pulls fresh base images and builds one image at a time: building the API and the web together can run a
# 2 GB server out of memory. Volumes (database, photos, keys, certificates) are kept.
set -eu
cd "$(dirname "$0")"
docker compose pull --ignore-buildable
docker compose build --pull api
docker compose build --pull web
docker compose up -d
docker image prune -f
