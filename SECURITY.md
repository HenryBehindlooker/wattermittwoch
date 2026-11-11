# Security-Review

Geprüft: `index.html`, `core.js`, `app.js`, `sync.js`, `service-worker.js`, `supabase.sql`,
`nginx.conf`, GitHub-Workflows. Die Entscheidungen folgen dem Review der Schwester-App
„Bierrechnung“, deren Abgleich hier übernommen wurde.

## Wie die App aufgebaut ist

- Statische Seite ohne eigenen Server, ohne Login, ohne Abhängigkeiten von Dritten, ohne Tracking.
- Daten liegen im Gerätespeicher des Browsers (`localStorage`).
- Optional: gemeinsame Liste über Supabase. Die Tabelle ist gesperrt, Zugriff gibt es nur über
  zwei Funktionen mit einem geheimen 32-stelligen Raumcode (rund 186 Bit).
- Daten von außen kommen an vier Stellen herein: **Backup importieren**, **gemeinsame Liste**,
  **Einladungslink** und der ältere **Home-Lab-Sync**.

## Befunde und Entscheidungen

| # | Schwere | Befund | Status |
| --- | --- | --- | --- |
| 1 | Hoch | **Eingeschleuster Code (XSS) über Backup oder gemeinsame Liste.** Ein Mitglied der Liste oder eine präparierte Datei könnte Kennungen und Texte liefern, die als HTML in der Seite landen, und so Code auf allen Geräten ausführen. | **Behoben.** Alle Daten laufen vor Anzeige und Verrechnung durch eine strenge Prüfung (`Core.normalizeSession`, `Core.sanitizeDoc`): feste Formate für Kennungen, Typ- und Wertebereiche für jedes Feld, nur bekannte Felder werden übernommen. Gilt für Laden, Import, Abgleich und Rückgängig. Zusätzlich wird bei der Ausgabe maskiert. Tests: Unit „Prüfung“, Akzeptanz F3, Zwei-Geräte-Test „Präparierte Daten“. |
| 2 | Mittel | **Keine Content-Security-Policy.** Ein einzelner Fehler beim Maskieren würde sofort zur Codeausführung führen. | **Behoben.** CSP erlaubt nur eigene Skripte, keine Inline-Skripte und keine Inline-Handler; Verbindungen nur zur eigenen Seite und über `https`. Test: Akzeptanz F6. |
| 3 | Mittel | **Einladungslinks könnten auf beliebige Server zeigen**, auch unverschlüsselt (`http`). | **Behoben.** Nur `https`, Format von Schlüssel und Raumcode wird geprüft, der Dialog nennt den Server, ohne Bestätigung passiert nichts. Die Zugangsdaten verschwinden sofort aus der Adresszeile. Test: Zwei-Geräte-Test „Einladungslinks“. |
| 4 | Mittel | **Unlesbare oder leere Cloud-Daten** könnten als „alles gelöscht“ gedeutet werden und die Spiele auf allen Geräten entfernen. | **Behoben.** Ein Stand, der kein gültiges Listenformat hat oder von einer neueren App-Version stammt, bricht den Abgleich mit einer Fehlermeldung ab; das Gerät bleibt unverändert. Test: Zwei-Geräte-Test „Unlesbare Cloud-Daten“. |
| 5 | Niedrig | **Kennungen wie `__proto__`** könnten interne Objekte verändern (Prototype Pollution). | **Behoben** durch die Prüfung aus Befund 1. |
| 6 | Niedrig | **Rückgängig könnte fremde Einträge löschen**, weil der Verlauf mit Momentaufnahmen arbeitet. | **Behoben.** Der Verlauf bleibt auf dem Gerät und wird für ein Spiel geleert, sobald dafür etwas von einem anderen Gerät ankommt. |
| 7 | Niedrig | **Formeln im CSV-Export.** Ein Name wie `=HYPERLINK(…)` würde in Excel als Formel ausgeführt. | **Behoben.** Solche Zellen bekommen ein vorangestelltes `'`. Test: Akzeptanz F4. |
| 8 | Niedrig | **Sicherheitskopien im Gerätespeicher** könnten unbegrenzt wachsen. | **Entschieden:** je ein fester Platz für „unlesbarer Speicher“ und „vor dem Beitritt“, der überschrieben wird. |
| 9 | Niedrig | **GitHub-Workflow mit Standardrechten.** | **Behoben.** Der Test-Workflow läuft nur mit Leserechten (`contents: read`). |

## Bekannte Grenzen (bewusst akzeptiert)

- **Gemeinsame Liste = gemeinsames Vertrauen.** Wer den Einladungslink hat, kann alles lesen,
  ändern und löschen. Es gibt kein Login pro Person und keine Änderungshistorie auf dem Server.
  Deshalb: Link nur in der eigenen Runde teilen und regelmäßig ein Backup exportieren. Bei
  Verdacht: *Verbindung trennen* und eine neue Liste erstellen, dann gilt ein neuer Raumcode.
- **Daten liegen unverschlüsselt auf dem Gerät**, auch der Zugang zur gemeinsamen Liste. Wer das
  entsperrte Handy in der Hand hat, hat auch die Daten.
- **Der öffentliche Supabase-Key** erlaubt jedem, der ihn kennt, neue Listen anzulegen (je
  höchstens 5 MB). Fremde Listen lassen sich damit nicht lesen. Die Nutzung im
  Supabase-Dashboard gelegentlich ansehen.
- **Gleiche Adresse, gleicher Speicher.** Alle Seiten unter `<name>.github.io` teilen sich den
  Browser-Speicher. Andere eigene Projekte dort (auch die Bierrechnung) könnten die Watten-Daten
  und Zugangsdaten lesen und umgekehrt. Wer das trennen will, braucht eine eigene (Sub-)Domain.
- **Einbetten in fremde Seiten** lässt sich auf GitHub Pages nicht per Header verbieten (beim
  Self-Hosting setzt `nginx.conf` den Header). Das Risiko ist gering, weil Browser den Speicher
  eingebetteter Seiten getrennt halten.
- **Doppelt Eingetragenes zählt doppelt.** Die App kann nicht erkennen, ob zwei Geräte dasselbe
  Spiel meinen. Das ist kein Sicherheits-, aber ein Bedienrisiko.

## Nicht geprüft

- Der Abgleich gegen ein **echtes Supabase-Projekt**. `supabase.sql` wurde auf einem lokalen
  PostgreSQL 16 mit den Rollen `anon` und `authenticated` ausgeführt und geprüft (Anlegen, Laden,
  Versionskonflikt, Eingabeprüfung, gesperrter Tabellenzugriff), und die App lief gegen diese
  Funktionen – aber über eine nachgebaute Schnittstelle, nicht über Supabase selbst.
- Verhalten auf einem **echten iPhone** und in der installierten App (Tests laufen in Chromium).

## Tests

```sh
npm test                  # Datenkern inkl. Prüfung und Zusammenführen
npm run test:acceptance   # Akzeptanztests, Sicherheit: F3 bis F6
npm run test:e2e          # Abgleich zweier Geräte, Einladungslinks, präparierte Daten
```

Eine Schwachstelle gefunden? Bitte als Issue im Repository melden, ohne echte Zugangsdaten oder
Einladungslinks anzuhängen.
