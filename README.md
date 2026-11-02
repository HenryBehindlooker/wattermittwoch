# Watten Tracker

Kartenspiel-Zähler für **Watten** (Watten / Ladinisch / Kritisch) – Stich-Tracking,
Gebotssystem, Spieltage, Undo, Statistiken und Diagramme. Läuft komplett im
Browser: kein Framework, kein Build-Step, kein Backend.

## Spielregeln in der App

- **Zählweise:** pro Spiel wählbar – *Mit Stichen* (Spiel endet bei 3 Stichen) oder
  *Schnellmodus* (ohne Stiche, das Spiel wird mit dem aktuellen Gebot direkt einem Team gegeben).
- **Gehen:** nach einem Gebot kann ein Team gehen → der Gegner bekommt den Wert vor der
  Erhöhung (bei 3 → 2 Punkte).
- **Gestrichen:** fehlen einem Team nur noch 2 Punkte oder weniger, wird das angezeigt.
- **Schneider:** gewinnt ein Team die Runde, während der Gegner 0 Punkte hat, zählt sie doppelt (2 Buammaln).
- Während ein Spiel offen ist, bleibt der Bildschirm an (Screen Wake Lock).

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
