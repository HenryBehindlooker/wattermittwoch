# Watten Tracker

Kartenspiel-Zähler für **Watten** (Watten / Ladinisch / Kritisch) – Stich-Tracking,
Gebotssystem, Spieltage, Undo, Statistiken und Diagramme. Läuft komplett im
Browser: kein Framework, kein Build-Step, kein Backend. Optional lassen sich die
Spiele über Supabase auf mehreren Geräten gemeinsam nutzen.

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
| `core.js` | Datenkern: Modell, Prüfung geladener/eingehender Daten, Zusammenführen |
| `app.js` | Spiellogik, Rendering, Charts, Persistenz |
| `sync.js` | Abgleich mit Supabase, Einladungslink („Gemeinsam nutzen“) |
| `supabase.sql` | Einmaliges Setup für „Gemeinsam nutzen“ |
| `manifest.json` | Installierbar als App (Standalone-Modus) |
| `service-worker.js` | Offline-Caching |
| `icons/` | App-Icons |
| `Dockerfile` · `nginx.conf` · `docker-compose.yml` | Optionales Self-Hosting per Docker |
| `.github/workflows/deploy.yml` | Auto-Deploy bei jedem Push auf `main` |
| `.github/workflows/test.yml` | Alle Tests bei jedem Push und Pull Request |
| `tests/` · `package.json` | Unit-Tests, Akzeptanztests, Zwei-Geräte-Test (nur für die Entwicklung) |

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

Kein Login, kein Tracking. Ohne weitere Einrichtung liegen alle Spieldaten nur lokal
im Browser (`localStorage`), pro Gerät getrennt. Über das Archiv-Symbol
(**Daten & Backup**) lassen sich Spielstände als JSON exportieren/importieren,
als CSV exportieren, und optional automatisch an einen selbst gehosteten
Sync-Endpunkt sichern.

> Browser-Daten löschen = Spielstände weg, wenn kein Backup existiert.

## Gemeinsam nutzen (optional)

Damit alle in der Runde auf dem eigenen Handy mitzählen und denselben Stand sehen. Die App
funktioniert ohne diese Einrichtung unverändert weiter – und auch danach offline.

**Einmalig einrichten (eine Person):**

1. Auf [supabase.com](https://supabase.com) ein kostenloses Projekt anlegen.
2. Im Dashboard unter *SQL Editor* den Inhalt von [`supabase.sql`](supabase.sql) einfügen und ausführen.
3. Unter *Project Settings → API* die **Project URL** und den **anon / publishable key** kopieren.
4. In der App *Daten & Backup → Gemeinsam nutzen*: beides eintragen und
   **„Gemeinsame Liste erstellen“** tippen. Die bisherigen Spiele werden hochgeladen.
5. **„Einladungslink teilen“** an die anderen schicken.

**Beitreten (alle anderen):** Link öffnen und „Beitreten“ bestätigen. Der Dialog nennt den
Server; ohne Bestätigung passiert nichts. Spiele, die schon auf dem Gerät liegen, kommen zur
gemeinsamen Liste dazu. Läuft die App vom Home-Bildschirm, den Link stattdessen unter
*Daten & Backup → Einladungslink einfügen* eintragen – auf dem iPhone hat die installierte App
einen eigenen Speicher, getrennt von Safari.

**So funktioniert der Abgleich:** Jedes Gerät merkt sich den letzten gemeinsamen Stand und führt
Änderungen zusammen, statt sie zu überschreiben.

- Jedes gewonnene Spiel ist ein eigener Eintrag. Einträge von mehreren Handys bleiben alle
  erhalten, der Punktestand ist ihre Summe – auch für offline Gezähltes, sobald das Gerät wieder
  online ist.
- Erreicht die Summe das Ziel, gilt die Runde als gewonnen (Schneider nur ohne Gegenpunkte).
- Neue Spiele, Spieltage und Runden von allen Seiten bleiben. Gelöschtes bleibt gelöscht – außer
  jemand hat es inzwischen weitergespielt, dann geht das Weiterspielen vor.
- Bei widersprüchlichen Einstellungen (z.B. zwei verschiedene neue Namen) gewinnt das Gerät, das
  zuletzt abgleicht.
- Der Rückgängig-Verlauf bleibt auf dem Gerät. Kommt für ein Spiel etwas von einem anderen Gerät,
  wird er für dieses Spiel geleert, damit „Rückgängig“ keine fremden Einträge zurücknimmt.

Zu beachten: Tragen zwei Handys **dasselbe** Spiel ein, zählt es doppelt. Am Tisch sollte also
einer zählen; die anderen sehen mit.

Abgeglichen wird nach jeder Änderung, beim Öffnen der App und alle 30 Sekunden, solange sie im
Vordergrund ist. Den Status zeigt *Daten & Backup → Gemeinsam nutzen*. **„Verbindung trennen“**
beendet den Abgleich; die Spiele bleiben auf dem Gerät.

## Tests

```bash
npm test                  # Unit-Tests des Datenkerns: Prüfung und Zusammenführen (nur Node ≥ 20)
npm install               # einmalig – installiert Playwright für die Browser-Tests
npx playwright install chromium
npm run test:acceptance   # Akzeptanztests im Browser
npm run test:e2e          # „Gemeinsam nutzen“ mit zwei Geräten
```

Alle drei Läufe starten bei jedem Push und Pull Request automatisch (GitHub Actions).

- `tests/core.test.js` – Prüfung eingehender Daten (unbekannte Felder, gefährliche Kennungen,
  ältere Stände) und Zusammenführen (Addieren, offline, Rundenende, Löschen, Rückgängig, Beitritt).
- `tests/acceptance.js` – die Anforderungen als Nutzerabläufe (iPhone-Profil, Touch): Spiel anlegen,
  Zählen, Schnellmodus, Gehen, Gestrichen, Schneider, Spieltage/Teams, Bedienung, Backup und
  Sicherheit, Übernahme eines Spielstands der Vorversion. Einzelne Gruppen:
  `npm run test:acceptance -- C` oder `-- F3`.
- `tests/e2e.js` – zwei getrennte Browser-Profile teilen eine Liste über einen nachgebauten
  Supabase-Server: einrichten, einladen, beitreten, gleichzeitig und offline zählen,
  Versionskonflikt, präparierte Daten, trennen.

## Sicherheit

- Alles, was aus Backups, dem Speicher oder der gemeinsamen Liste kommt, wird geprüft, bevor es
  angezeigt oder verrechnet wird; Unbekanntes fällt weg. Präparierte Daten können keinen Code
  ausführen.
- Eine Content-Security-Policy erlaubt nur eigene Skripte (keine Inline-Skripte, keine Fremdquellen).
- Verbindungen nach außen nur über https. Einladungslinks auf andere Ziele werden abgelehnt.
- Zugangsdaten (Supabase-URL, Key, Raumcode, Sync-Token) stehen nie im Code, sondern nur im
  Speicher des Geräts, und sind nicht Teil von Backups.

Befunde, Entscheidungen und bekannte Grenzen stehen in [`SECURITY.md`](SECURITY.md).

## Technik

```
Sprache:      HTML + CSS + Vanilla JS
Persistenz:   localStorage (JSON), optional gemeinsam über Supabase
Charts:       reines SVG
Offline:      Service Worker (cache-first)
Abhängigkeiten: keine
```
