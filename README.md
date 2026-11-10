# Watten Tracker

Kartenspiel-Zähler für **Watten** (Watten / Ladinisch / Kritisch) – Stich-Tracking,
Gebotssystem, Spieltage, Undo, Statistiken und Diagramme. Läuft komplett im
Browser: kein Framework, kein Build-Step, kein Backend.

## Spielregeln in der App

- **Zählweise:** pro Spiel wählbar – *mit Stichen* (Spiel endet bei 3 Stichen) oder
  *Schnellmodus* (ohne Stiche, das Spiel wird mit dem aktuellen Gebot direkt einem Team gegeben).
- **Gehen:** nach einem Gebot kann ein Team gehen → der Gegner bekommt den Wert vor der
  Erhöhung (bei 3 → 2 Punkte).
- **Gestrichen:** fehlen einem Team nur noch 2 Punkte oder weniger, wird das angezeigt.
- **Schneider:** gewinnt ein Team die Runde, während der Gegner 0 Punkte hat, zählt sie doppelt (2 Buammaln).
- **Teams:** rotieren pro Spieltag automatisch (1 & 2 → 1 & 3 → 1 & 4); eigene Teams gelten ab dem
  aktuellen Spieltag.
- Während ein Spiel offen ist, bleibt der Bildschirm an (Screen Wake Lock).

## Bedienung

Die Oberfläche folgt den iOS-/SwiftUI-Konventionen: Sheets mit Greifer (herunterziehen oder
daneben tippen schließt), Schalter, gruppierte Listen, Bestätigungsdialoge vor allem, was Daten
löscht. Die Zurück-Taste bzw. Wischgeste schließt erst Dialog und Sheet, dann das Spiel.

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
| `tests/acceptance.js` · `package.json` | Akzeptanztests (nur für die Entwicklung) |

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

## Tests

```bash
npm install   # einmalig – installiert Playwright (nur für die Tests)
npm test
```

`tests/acceptance.js` spielt die Anforderungen als Nutzerabläufe im Browser durch (iPhone-Profil,
Touch): Spiel anlegen, Zählen, Schnellmodus, Gehen, Gestrichen, Schneider, Spieltage/Teams,
Bedienung sowie Backup und Sicherheit. Einzelne Gruppen: `npm test -- C` oder `npm test -- F3`.

## Sicherheit

- Alles, was aus Backups oder dem Speicher kommt, wird beim Laden geprüft und beim Anzeigen
  maskiert; ein manipuliertes Backup kann keinen Code ausführen.
- Eine Content-Security-Policy erlaubt nur eigene Skripte (keine Inline-Skripte, keine Fremdquellen).
- Der Sync-Token verlässt das Gerät nur über https und nur an die selbst eingetragene Adresse.
- Hinweis zu GitHub Pages: Alle Seiten unter `<name>.github.io` teilen sich den Browser-Speicher.
  Wer dort weitere Projekte betreibt, sollte für die App eine eigene (Sub-)Domain verwenden.

## Technik

```
Sprache:      HTML + CSS + Vanilla JS
Persistenz:   localStorage (JSON)
Charts:       reines SVG
Offline:      Service Worker (cache-first)
Abhängigkeiten: keine
```
