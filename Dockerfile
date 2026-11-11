# Watten Tracker – statische PWA hinter nginx (winziges Image, ~50 MB)
FROM nginx:1.27-alpine

# App-Dateien ins Webroot
COPY index.html core.js sync.js app.js manifest.json service-worker.js /usr/share/nginx/html/
COPY icons/ /usr/share/nginx/html/icons/
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost/ >/dev/null || exit 1
