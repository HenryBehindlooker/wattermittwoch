# Watten Tracker

Kartenspiel-Zähler für **Watten** (Watten / Ladinisch / Kritisch) – Stich-Tracking,
Gebotssystem, Spieltage, Undo, Statistiken und Diagramme. Läuft komplett im
Browser: kein Framework, kein Build-Step, kein Backend.

## Dateien

| Datei | Zweck |
|---|---|
| `index.html` | App-Shell + CSS |
| `app.js` | Spiellogik, Rendering, Charts, Persistenz |
| `manifest.json` | Installierbar als App (Standalone-Modus) |
| `service-worker.js` | Offline-Caching |
| `icons/` | App-Icons |
| `Dockerfile` · `nginx.conf` · `docker-compose.yml` | Optionales Self-Hosting per Docker |
| `.github/workflows/deploy.yml` | Auto-Deploy bei jedem Push |

## Lokal testen

```bash
python3 -m http.server 8000   # → http://localhost:8000
```

> `file://` direkt öffnen funktioniert nicht vollständig – der Service Worker
> braucht `http(s)://`.

## Installieren

- **iPhone (Safari):** Seite öffnen → Teilen-Symbol → „Zum Home-Bildschirm"
- **Android (Chrome):** Menü → „App installieren"

Danach läuft alles auch offline.

## Daten

Kein Backend, keine Accounts, kein Tracking. Alle Spieldaten liegen nur lokal
im Browser (`localStorage`), pro Gerät getrennt. Über das Archiv-Symbol
(**Daten & Backup**) lassen sich Spielstände als JSON exportieren/importieren,
als CSV exportieren, und optional automatisch an einen selbst gehosteten
Sync-Endpunkt sichern.

> Browser-Daten löschen = Spielstände weg, wenn kein Backup existiert.

## Technik

```
Sprache:      HTML + CSS + Vanilla JS
Persistenz:   localStorage (JSON)
Charts:       reines SVG
Offline:      Service Worker (cache-first)
Abhängigkeiten: keine
```
