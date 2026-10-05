# Build context: the repository root (see docker-compose.yml).
FROM node:22-alpine AS build
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
# The public origin (canonical, og:url, sitemap) and whether the contact form really sends.
ARG VITE_SITE_URL
ARG VITE_ENQUIRIES_ENABLED=false
ENV VITE_SITE_URL=$VITE_SITE_URL VITE_ENQUIRIES_ENABLED=$VITE_ENQUIRIES_ENABLED
RUN npm run build

FROM caddy:2-alpine
COPY --from=build /app/dist /srv
COPY deploy/Caddyfile /etc/caddy/Caddyfile
