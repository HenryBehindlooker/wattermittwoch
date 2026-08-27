# Watten Tracker – PWA

Kartenspiel-Zähler für **Watten** (Watten / Ladinisch / Kritisch) – Stich-Tracking, Gebotssystem, Spieltage, Undo, Statistiken und Diagramme. Portiert aus der originalen SwiftUI-App zu einer **Progressive Web App** ohne Framework, ohne Build-Step, ohne Backend.

Läuft im Browser, lässt sich aufs iPhone/Android als App „installieren", funktioniert offline – und kostet keine 99 € Apple-Gebühr.

---

## Warum PWA statt Swift?

SwiftUI wird von Xcode für Apple-Geräte kompiliert und lässt sich nicht „hosten". Um ohne Apple Developer Program (99 USD/Jahr), ohne Mac und ohne Store-Review auf dem Handy zu landen, ist die PWA der direkte Weg: eine Handvoll statischer Dateien, die du überall ausliefern kannst.

Die komplette Spiellogik aus `WattenTracker.swift` (`GameViewModel`) ist 1:1 in Vanilla JS nachgebaut – gleiche Regeln, gleiche Rotation, gleiches Farb-/Layout-System.

---

## Dateien

| Datei | Zweck |
|---|---|
| `index.html` | App-Shell + komplettes CSS (Design-Tokens aus dem Swift-`WT`-Struct) |
| `app.js` | Models, Spiellogik, Rendering, SVG-Charts, Persistenz |
| `manifest.json` | „Zum Home-Bildschirm hinzufügen", App-Icon, Standalone-Modus |
| `service-worker.js` | Offline-Caching (cache-first) |
| `icons/` | App-Icons (aus deinem Original-PNG generiert) |
| `Dockerfile` · `nginx.conf` · `docker-compose.yml` | Selbst-Hosting per Docker |
| `.github/workflows/deploy.yml` | Auto-Deploy auf GitHub Pages |

---

## Hosting-Weg 1 – Docker (self-hosted)

Am besten für deinen Home-Lab / hinter deinem Reverse-Proxy.

```bash
cd watten-pwa
docker compose up -d --build
# → http://localhost:8088
```

Port in `docker-compose.yml` anpassen (`8088:80`). Das Image ist ein winziges `nginx:alpine` mit den statischen Dateien drin.

> [!TIP]
> Wenn du nicht bauen willst, kannst du in `docker-compose.yml` den auskommentierten `volumes`-Block nutzen und das Verzeichnis direkt read-only ins Standard-`nginx:alpine` mounten – kein eigenes Image nötig.

Hinter deinem bestehenden Reverse-Proxy (Traefik/Caddy/nginx) einfach auf den Container-Port routen. Für „installierbar" auf dem iPhone brauchst du **HTTPS** – über deinen Proxy mit gültigem Zertifikat kein Problem.

---

## Hosting-Weg 2 – GitHub Pages (kostenlos, öffentlich)

**Wichtig:** Der Inhalt von `watten-pwa/` muss im **Repo-Root** liegen (also `index.html` direkt im Repo, nicht in einem Unterordner). Alle Pfade sind relativ, damit läuft es auch unter `…github.io/repo-name/` out of the box.

```bash
cd watten-pwa
git init && git add -A && git commit -m "Watten PWA"
git branch -M main
git remote add origin https://github.com/DEIN-USER/watten.git
git push -u origin main
```

Dann **eine** der beiden Varianten wählen:

**A) Deploy from branch (am einfachsten, kein Workflow nötig)**
Settings → Pages → Source: **„Deploy from a branch"** → Branch `main` → Ordner `/ (root)` → Save.
> [!TIP]
> Wenn du diese Variante nimmst, lösche den Ordner `.github/`, sonst läuft der Actions-Workflow ins Leere und schickt dir eine Fehler-Mail.

**B) GitHub Actions (mitgeliefert, robuster)**
Settings → Pages → Source: **„GitHub Actions"**. Der Workflow `deploy.yml` deployt dann bei jedem Push automatisch.

URL danach: `https://DEIN-USER.github.io/watten/`

> [!NOTE]
> GitHub Pages liefert automatisch HTTPS – damit ist die PWA sofort installierbar. `.nojekyll` verhindert, dass Pages die Dateien durch Jekyll schickt.

---

## Aufs iPhone / Android „installieren"

- **iPhone (Safari):** Seite öffnen → Teilen-Symbol → **„Zum Home-Bildschirm"** → eigenes Icon, Vollbild, offline.
- **Android (Chrome):** Menü → **„App installieren"** / „Zum Startbildschirm hinzufügen".

Nach dem ersten Laden funktioniert alles auch **ohne Internet** (Service Worker).

---

## Datenspeicherung & Aufzeichnung

> [!IMPORTANT]
> Es gibt **kein Backend, keine Accounts, kein Tracking, keine externen Requests** – keine Fonts oder Skripte von CDNs. Alle Spieldaten bleiben ausschließlich auf dem Gerät.

**Was aufgezeichnet wird:** Es wird bereits *alles* protokolliert. Das Datenmodell hält lückenlos jede Ebene fest:

```
Spiel (Session)
 └─ Spieltag (Matchday)  · Datum, Rotation, Runden gewonnen, Soft-Delete-Tombstone
     └─ Runde (Round)    · startedAt, endedAt, Punkte A/B, Gewinner, Soft-Delete
         └─ Stich-Gewinn (HandRecord) · Gewinner-Team, Gebot, Zeitstempel
```

Nichts wird hart gelöscht – gelöschte Spieltage/Runden bleiben als Tombstone erhalten. Jede Runde und jedes Spiel ist damit dauerhaft im Modell hinterlegt.

**Wo es liegt:** live im **`localStorage`** unter dem Schlüssel `watten_store_v3` (gleiches JSON-Schema wie die Swift-App über `UserDefaults`). Das ist bequem, aber gerätegebunden:

- Daten liegen **pro Browser und pro Gerät** – kein automatischer Sync zwischen Handys.
- **Website-Daten löschen ⇒ Spielstände weg.**

**Deshalb: Backup.** Über das Archiv-Symbol oben auf der Startseite (**Daten & Backup**):

| Aktion | Ergebnis |
|---|---|
| **Backup exportieren (JSON)** | Vollständiger, wiederherstellbarer Dump aller Spiele → `watten-backup_DATUM.json` |
| **Alle Runden als CSV** | Eine Zeile pro Runde (Zeitstempel, Punkte, Gewinner) → für Tabellen / Obsidian |
| **Zusammenführen** | Backup importieren, Spiele hinzufügen/aktualisieren (per ID) |
| **Alles ersetzen** | Gerät-Datenstand komplett aus Backup wiederherstellen |

> [!TIP]
> Empfehlung fürs Home-Lab: Backup-JSON regelmäßig auf dein NAS oder in den Obsidian-Vault legen (ggf. per Git versionieren). „Zusammenführen" macht das Zurückspielen auf einem neuen Gerät verlustfrei.

### Optionaler nächster Schritt: automatischer Sync (self-hosted)

Wenn du echten geräteübergreifenden, automatischen Sync willst, ohne die „kein-Backend"-Linie in der App aufzugeben, ist der sauberste Weg für dein Setup ein **outbound-only Push** des Backups an deine eigene Infrastruktur:

- **WebDAV-PUT** auf dein NAS (viele NAS können WebDAV nativ), oder
- ein **winziger POST-Endpoint** (paar Zeilen Node/PHP) hinter deinem Reverse-Proxy, der das JSON entgegennimmt und ablegt/versioniert.

Die App würde nach jedem abgeschlossenen Spieltag denselben JSON-Dump per `fetch(..., {method:'PUT'})` rausschicken – stateless, outbound-only, kein Datenabfluss an Dritte. Sag Bescheid, dann ergänze ich einen kleinen Sync-Layer plus passenden Endpoint-Container.

---

## Bekannte Unterschiede zur Swift-App (ehrlich)

| Thema | Verhalten in der PWA |
|---|---|
| **Haptik** | Nur wo die Vibration-API existiert (v. a. Android). iOS-Safari unterstützt `navigator.vibrate` **nicht** → dort kein haptisches Feedback. |
| **Teilen/Export** | Web Share API auf Mobile (natives Share-Sheet); am Desktop Fallback auf „in Zwischenablage kopiert". |
| **Home-Screen-Widget** | Entfällt – Widgets sind ein iOS-natives Konzept ohne Web-Pendant. |
| **Persistenz** | `localStorage` statt `UserDefaults`; funktional identisch, aber an die Website-Daten des Browsers gebunden. Dafür gibt es Backup/Restore (JSON) + CSV-Export (siehe oben). |
| **Optik** | „SF Pro Rounded" ist im Web nicht garantiert; die großen Punktezahlen nutzen einen gerundeten System-Font-Stack mit Fallback. |

Voll erhalten sind: alle 3 Varianten, frei einstellbare Zielpunkte (5–30), Stich-/Gebotssystem, automatische Rundenerkennung, Teamrotation über Spieltage, manuelle Teams + Würfeln + Teamnamen, Undo-History (30 Schritte, benannt, mit Zeitstempel), Soft-Delete für Spieltage/Runden, Streak, Fortschrittsbalken, Verlauf, Team-/Spieler-Statistik, Durchschnitte sowie Balken-, Linien- und Donut-Diagramm.

---

## Technik

```
Sprache:      HTML + CSS + Vanilla JS (ES2020)
Architektur:  Ein State-Objekt (store) → render() → localStorage
Charts:       reines SVG (kein Chart-Framework)
Persistenz:   localStorage (JSON, Key watten_store_v3)
Offline:      Service Worker (cache-first)
Abhängigkeiten: keine
```

Kein npm, kein Bundler. Zum lokalen Testen reicht ein statischer Server:

```bash
python3 -m http.server 8000   # → http://localhost:8000
```

> [!WARNING]
> Direkt per `file://` öffnen funktioniert **nicht** vollständig (Service Worker braucht `http(s)://`). Immer über einen Server oder Container laufen lassen.
