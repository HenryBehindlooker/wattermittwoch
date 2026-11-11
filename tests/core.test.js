// Unit-Tests für den Datenkern (core.js): Prüfung eingehender Daten und
// Zusammenführen der Änderungen mehrerer Geräte.   Ausführen:  npm test
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const Core = require("../core.js");

// ── Helfer: ein Spiel aufbauen und "spielen" wie die App ────────────────
let seq = 0;
const T0 = Date.UTC(2026, 10, 4, 19, 0, 0);
const tick = () => T0 + (++seq) * 1000;

function game(name = "Mittwoch", target = 15) {
  const s = Core.newSession(name, "ladinisch", true, ["Anna", "Bert", "Cora", "Dirk"]);
  s.targetPoints = target;
  return s;
}
const md = (s) => s.matchdays[s.matchdays.length - 1];
const round = (s) => md(s).rounds[md(s).rounds.length - 1];
const played = (s) => md(s).rounds.filter((r) => r.hands.length > 0);

/** Ein gewonnenes Spiel eintragen – wie Game._award in der App, inkl. Rundenende. */
function award(s, team, pts = 2, id = `h${++seq}`) {
  const m = md(s), r = round(s), ts = tick();
  r.hands.push({ id, winnerTeam: team, pointsAwarded: pts, timestamp: ts });
  if (team === 0) r.teamAPoints += pts; else r.teamBPoints += pts;
  s.tricksA = 0; s.tricksB = 0; s.currentBid = 2; s.updatedAt = ts;
  if (r.teamAPoints >= s.targetPoints || r.teamBPoints >= s.targetPoints) {
    r.winnerTeam = r.teamAPoints >= s.targetPoints ? 0 : 1;
    r.endedAt = ts;
    if ((r.winnerTeam === 0 ? r.teamBPoints : r.teamAPoints) === 0) r.schneider = true;
    r.teams = { teamA: m.teams.teamA.slice(), teamB: m.teams.teamB.slice() };
    m.rounds.push(Core.newRound());
  }
  return id;
}
const doc = (...sessions) => Core.docOf(sessions);
const copy = (x) => JSON.parse(JSON.stringify(x));
const merge = (b, l, r, opts) => Core.mergeDoc(b, l, r, opts);
const only = (d) => { assert.equal(d.sessions.length, 1); return d.sessions[0]; };

// Ausgangslage vieler Tests: ein Spiel, das alle Geräte kennen, Stand 4:2
function shared() {
  const s = game();
  award(s, 0); award(s, 0); award(s, 1);
  return s;
}

// ════════════════════════════════════════════════════════════════
// Prüfung
// ════════════════════════════════════════════════════════════════
test("Prüfung: ein normales Spiel bleibt inhaltlich unverändert", () => {
  const s = shared();
  const n = Core.normalizeSession(copy(s));
  assert.deepEqual(n, copy(s));
  assert.deepEqual(Core.normalizeSession(copy(n)), n, "zweimal prüfen ändert nichts mehr");
});

test("Prüfung: unbekannte Felder und fremde Typen fallen weg", () => {
  const s = copy(shared());
  s.evil = "<script>alert(1)</script>";
  s.matchdays[0].extra = { a: 1 };
  s.matchdays[0].rounds[0].onclick = "x";
  s.matchdays[0].rounds[0].hands[0].html = "<img>";
  s.targetPoints = "15<script>";
  s.name = { toString: 1 };
  s.createdAt = "gestern";
  s.players[1].name = ["Bert"];
  const n = Core.normalizeSession(s);
  assert.equal(n.evil, undefined);
  assert.equal(n.matchdays[0].extra, undefined);
  assert.equal(n.matchdays[0].rounds[0].onclick, undefined);
  assert.equal(n.matchdays[0].rounds[0].hands[0].html, undefined);
  assert.equal(n.targetPoints, 15);
  assert.equal(n.name, "Spiel");
  assert.equal(n.players[1].name, "Spieler 2");
  assert.ok(Number.isFinite(n.createdAt));
});

test("Prüfung: gefährliche Kennungen kommen nie durch", () => {
  const X = `"><img src=x onerror=alert(1)>`;
  for (const bad of [X, "__proto__", "constructor", "prototype", "a b", "", 7, null, "x".repeat(65)]) {
    const s = copy(shared());
    s.matchdays[0].id = bad;
    s.matchdays[0].rounds[0].id = bad;
    s.matchdays[0].rounds[0].hands[0].id = bad;
    s.players[0].id = bad;
    for (const strict of [false, true]) {
      const n = Core.normalizeSession(copy(s), { strict });
      const ids = [n.id, ...n.players.map((p) => p.id)];
      for (const m of n.matchdays) { ids.push(m.id); for (const r of m.rounds) { ids.push(r.id); for (const h of r.hands) ids.push(h.id); } }
      for (const id of ids) assert.ok(Core.okId(id), `ungültige Kennung durchgelassen: ${JSON.stringify(id)}`);
    }
    s.id = bad;
    assert.equal(Core.normalizeSession(copy(s), { strict: true }), null, "Spiel mit ungültiger Kennung von außen wird verworfen");
  }
  assert.equal({}.polluted, undefined);
});

test("Prüfung: Daten von außen werden nicht „repariert“, sondern verworfen (auf jedem Gerät gleich)", () => {
  const s = copy(shared());
  s.matchdays[0].rounds[0].hands.push({ id: "bad id", winnerTeam: 0, pointsAwarded: 2, timestamp: T0 });
  s.matchdays[0].rounds[0].hands.push({ id: "ok1", winnerTeam: 5, pointsAwarded: 2, timestamp: T0 });
  s.matchdays[0].rounds[0].hands.push({ id: "ok2", winnerTeam: 0, pointsAwarded: 1e9, timestamp: T0 });
  const a = Core.sharedOf(copy(s)), b = Core.sharedOf(copy(s));
  assert.deepEqual(a, b, "zwei Geräte kommen zum selben Ergebnis");
  assert.equal(a.matchdays[0].rounds[0].hands.filter((h) => !h.rest).length, 3, "nur die drei gültigen Einträge bleiben");
});

test("Prüfung: älterer Stand ohne Einzelspiele behält seinen Punktestand", () => {
  // so sahen Runden aus, bevor jedes gewonnene Spiel einzeln gezählt wurde
  const old = {
    id: "alt1", name: "Alt", variant: "watten", targetPoints: 15, createdAt: T0,
    players: [1, 2, 3, 4].map((i) => ({ id: `p${i}`, name: `P${i}` })),
    matchdays: [{ id: "m1", rotationIndex: 0, date: T0, teamARoundsWon: 1, teamBRoundsWon: 0, rounds: [
      { id: "r1", teamAPoints: 15, teamBPoints: 7, winnerTeam: 0, startedAt: T0, endedAt: T0 + 5 },
      { id: "r2", teamAPoints: 4, teamBPoints: 6, winnerTeam: null, startedAt: T0 + 6 },
    ] }],
    currentMatchdayIndex: 0, tricksA: 1, tricksB: 0, currentBid: 3,
  };
  const n = Core.normalizeSession(copy(old));
  const [r1, r2] = n.matchdays[0].rounds;
  assert.deepEqual([r1.teamAPoints, r1.teamBPoints, r1.winnerTeam], [15, 7, 0]);
  assert.deepEqual([r2.teamAPoints, r2.teamBPoints, r2.winnerTeam], [4, 6, null]);
  assert.equal(n.matchdays[0].teamARoundsWon, 1);
  assert.deepEqual([n.tricksA, n.currentBid], [1, 3], "laufendes Spiel bleibt");
  assert.deepEqual(n.matchdays[0].teams.teamA, [0, 1], "Teams des Spieltags ergänzt");
  // … und der Stand überlebt auch den Weg durch die gemeinsame Liste
  const viaCloud = only(merge(null, doc(n), doc(n)));
  assert.deepEqual(viaCloud.matchdays[0].rounds.map((r) => [r.teamAPoints, r.teamBPoints]), [[15, 7], [4, 6]]);
});

test("Prüfung: Schneider wird bei alten, bereits beendeten Runden nicht nachträglich vergeben", () => {
  const s = copy(shared());
  const r = s.matchdays[0].rounds[0];
  Object.assign(r, { teamAPoints: 15, teamBPoints: 0, winnerTeam: 0, endedAt: T0 + 9, hands: [] });
  s.matchdays[0].rounds.push(Core.newRound());
  const n = Core.normalizeSession(s);
  assert.equal(n.matchdays[0].rounds[0].schneider, undefined);
  assert.equal(n.matchdays[0].teamARoundsWon, 1);
});

test("Prüfung: unlesbare gemeinsame Liste wird abgelehnt statt als leer behandelt", () => {
  for (const bad of [null, "text", 5, [], {}, { sessions: "x" }]) assert.throws(() => Core.sanitizeDoc(bad));
  assert.throws(() => Core.sanitizeDoc({ v: Core.DOC_VERSION + 1, sessions: [] }), /neueren App-Version/);
  assert.deepEqual(Core.sanitizeDoc({ sessions: [] }), { v: Core.DOC_VERSION, sessions: [] });
  // kaputte Einträge reißen die übrigen nicht mit
  const d = Core.sanitizeDoc({ v: 1, sessions: [null, "x", { bogus: 1 }, copy(shared()), { id: "a", matchdays: [null, 5] }] });
  assert.equal(d.sessions.length, 2);
});

test("Prüfung: der Rückgängig-Verlauf verlässt das Gerät nicht", () => {
  const s = shared();
  s.undoStack.push({ action: "addTrick", timestamp: T0, mds: { 0: copy(s.matchdays[0]) }, mdCount: 1 });
  const d = doc(s);
  assert.equal(JSON.stringify(d).includes("undoStack"), false);
  assert.equal(s.undoStack.length, 1, "bleibt auf dem Gerät erhalten");
});

// ════════════════════════════════════════════════════════════════
// Zusammenführen
// ════════════════════════════════════════════════════════════════
test("Merge: nur eine Seite hat geändert → deren Stand gilt, ohne Rest", () => {
  const base = doc(shared());
  const changed = copy(base.sessions[0]); award(changed, 1, 3);
  const other = doc(changed);
  assert.ok(Core.same(merge(base, base, other), other), "nur die Cloud hat geändert");
  assert.ok(Core.same(merge(base, other, base), other), "nur dieses Gerät hat geändert");
  assert.ok(Core.same(merge(base, base, base), base), "niemand hat geändert");
});

test("Merge: Punkte von zwei Geräten werden addiert, auch offline gemachte", () => {
  const base = doc(shared());                       // 4:2
  const a = copy(base.sessions[0]); award(a, 0, 2); award(a, 0, 3);   // Gerät A: +5 für Team A
  const b = copy(base.sessions[0]); award(b, 1, 2);                   // Gerät B offline: +2 für Team B
  const m = only(merge(base, doc(a), doc(b)));
  assert.deepEqual([round(m).teamAPoints, round(m).teamBPoints], [9, 4]);
  assert.equal(round(m).hands.length, 6, "alle sechs gewonnenen Spiele sind einzeln erhalten");
});

test("Merge: beide Geräte tragen für dasselbe Team ein → beide Einträge zählen", () => {
  const base = doc(shared());
  const a = copy(base.sessions[0]); award(a, 0, 2);
  const b = copy(base.sessions[0]); award(b, 0, 2);
  assert.equal(round(only(merge(base, doc(a), doc(b)))).teamAPoints, 8);
});

test("Merge: Reihenfolge der Geräte ist für das Ergebnis egal", () => {
  const base = doc(shared());
  const a = copy(base.sessions[0]); award(a, 0, 3);
  const b = copy(base.sessions[0]); award(b, 1, 2); award(b, 0, 2);
  const x = only(merge(base, doc(a), doc(b))), y = only(merge(base, doc(b), doc(a)));
  assert.deepEqual([round(x).teamAPoints, round(x).teamBPoints], [9, 4]);
  assert.deepEqual([round(y).teamAPoints, round(y).teamBPoints], [9, 4]);
  assert.deepEqual(round(x).hands.map((h) => h.id).sort(), round(y).hands.map((h) => h.id).sort());
});

test("Merge: Geräte kommen zum selben Stand, ein weiterer Abgleich ändert nichts mehr", () => {
  const base = doc(shared());
  const a = copy(base.sessions[0]); award(a, 0, 3);
  const b = copy(base.sessions[0]); award(b, 1, 2);
  const cloud1 = merge(base, doc(a), base);             // A gleicht zuerst ab und speichert
  const atB = merge(base, doc(b), cloud1);              // B holt A's Stand und speichert
  const atA = merge(cloud1, cloud1, atB);               // A holt B's Stand
  assert.ok(Core.same(atA, atB), "beide Geräte sehen dasselbe");
  assert.ok(Core.same(merge(atB, atB, atB), atB), "Fixpunkt: nichts mehr zu speichern");
  assert.ok(Core.same(Core.sanitizeDoc(copy(atB)), atB), "der gespeicherte Stand ist bereits geprüft");
});

test("Merge: erreicht die Summe das Ziel, ist die Runde gewonnen und eine neue beginnt", () => {
  const s = game("Ziel", 15);
  for (let i = 0; i < 6; i++) award(s, 0);              // 12:0
  award(s, 1);                                          // 12:2
  const base = doc(s);
  const a = copy(base.sessions[0]); award(a, 0, 2);     // 14:2
  const b = copy(base.sessions[0]); award(b, 0, 2);     // 14:2
  const m = only(merge(base, doc(a), doc(b)));          // zusammen 16:2
  const [won, next] = md(m).rounds;
  assert.deepEqual([won.teamAPoints, won.teamBPoints, won.winnerTeam], [16, 2, 0]);
  assert.equal(md(m).teamARoundsWon, 1);
  assert.equal(won.schneider, undefined, "Gegner hat Punkte → kein Schneider");
  assert.deepEqual([md(m).rounds.length, next.teamAPoints, next.winnerTeam], [2, 0, null]);
});

test("Merge: Schneider nach dem Zusammenzählen zählt doppelt – aber nur ohne Gegenpunkte", () => {
  const s = game("Schneider", 15);
  for (let i = 0; i < 6; i++) award(s, 0);              // 12:0
  const base = doc(s);
  const a = copy(base.sessions[0]); award(a, 0, 3);     // A beendet die Runde 15:0 → Schneider
  assert.equal(md(a).rounds[0].schneider, true);
  const same0 = copy(base.sessions[0]); award(same0, 0, 2);            // B: 14:0
  const m1 = only(merge(base, doc(a), doc(same0)));
  assert.deepEqual([md(m1).rounds[0].schneider, md(m1).teamARoundsWon], [true, 2]);
  const b = copy(base.sessions[0]); award(b, 1, 2);     // B offline: Gegner macht doch 2 Punkte
  const m2 = only(merge(base, doc(a), doc(b)));
  assert.deepEqual([md(m2).rounds[0].teamBPoints, md(m2).rounds[0].schneider, md(m2).teamARoundsWon], [2, undefined, 1]);
});

test("Merge: beenden beide Geräte dieselbe Runde, gibt es danach genau eine neue leere", () => {
  const s = game("Doppelt", 15);
  for (let i = 0; i < 6; i++) award(s, 0);
  award(s, 1);                                          // 12:2
  const base = doc(s);
  const a = copy(base.sessions[0]); award(a, 0, 3);     // beide beenden die Runde …
  const b = copy(base.sessions[0]); award(b, 0, 3);     // … und legen je eine neue an
  assert.notEqual(round(a).id, round(b).id);
  const m = only(merge(base, doc(a), doc(b)));
  assert.equal(md(m).rounds.length, 2, "eine gewonnene, eine offene – keine Geisterrunde");
  assert.equal(md(m).rounds[0].teamAPoints, 18);
  assert.equal(md(m).teamARoundsWon, 1);
  const again = only(merge(base, doc(b), doc(a)));
  assert.equal(round(again).id, round(m).id, "beide Geräte wählen dieselbe neue Runde");
});

test("Merge: spielt ein Gerät in der neuen Runde weiter, geht das nicht verloren", () => {
  const s = game("Weiter", 15);
  for (let i = 0; i < 6; i++) award(s, 0);
  award(s, 1);
  const base = doc(s);
  const a = copy(base.sessions[0]); award(a, 0, 3);                    // A beendet
  const b = copy(base.sessions[0]); award(b, 0, 3); award(b, 1, 2);    // B beendet und spielt weiter
  const m = only(merge(base, doc(a), doc(b)));
  assert.deepEqual([round(m).id, round(m).teamBPoints], [round(b).id, 2]);
  assert.equal(md(m).rounds.length, 2);
});

test("Merge: Rückgängig auf einem Gerät nimmt nur dessen Eintrag zurück", () => {
  const s = shared();
  const undone = award(s, 0, 3);                        // 7:2, alle kennen den Stand
  const base = doc(s);
  const a = copy(base.sessions[0]);                     // A macht das letzte Spiel rückgängig
  round(a).hands = round(a).hands.filter((h) => h.id !== undone); round(a).teamAPoints -= 3;
  const b = copy(base.sessions[0]); award(b, 1, 2);     // B trägt gleichzeitig ein
  const m = only(merge(base, doc(a), doc(b)));
  assert.deepEqual([round(m).teamAPoints, round(m).teamBPoints], [4, 4]);
});

test("Merge: neue Spiele beider Geräte bleiben, gelöschte bleiben gelöscht", () => {
  const s = shared(), gone = game("Weg");
  const base = doc(s, gone);
  const fromA = game("Neu von A"), fromB = game("Neu von B");
  const l = doc(s, fromA);                              // A löscht „Weg“, legt eines an
  const r = doc(s, gone, fromB);                        // B legt eines an
  const names = merge(base, l, r).sessions.map((x) => x.name).sort();
  assert.deepEqual(names, ["Mittwoch", "Neu von A", "Neu von B"]);
});

test("Merge: wurde ein gelöschtes Spiel woanders weitergespielt, bleibt es erhalten", () => {
  const s = shared(), other = game("Anderes");
  const base = doc(s, other);
  const l = doc(other);                                 // A löscht „Mittwoch“
  const b = copy(base.sessions[0]); award(b, 1, 3);     // B hat offline weitergespielt
  const m = merge(base, l, doc(b, other));
  const kept = m.sessions.find((x) => x.name === "Mittwoch");
  assert.ok(kept, "nichts geht verloren");
  assert.equal(round(kept).teamBPoints, 5);
  assert.equal(merge(base, doc(b, other), l).sessions.length, 2, "gilt in beide Richtungen");
});

test("Merge: gelöschte Runde zählt auf allen Geräten nicht mehr", () => {
  const s = game("Löschen", 15);
  for (let i = 0; i < 7; i++) award(s, 0);
  award(s, 1);
  for (let i = 0; i < 8; i++) award(s, 0);              // Runde 1: 14:2 → 16:2 gewonnen
  assert.equal(md(s).rounds[0].winnerTeam, 0);
  const base = doc(s);
  const a = copy(base.sessions[0]);
  Object.assign(md(a).rounds[0], { isDeleted: true, deletedAt: tick() });
  const b = copy(base.sessions[0]); award(b, 1, 2);
  const m = only(merge(base, doc(a), doc(b)));
  assert.deepEqual([md(m).rounds[0].isDeleted, md(m).teamARoundsWon, round(m).teamBPoints], [true, 0, 2]);
});

test("Merge: Einstellungen – verschiedene Felder ergänzen sich, bei Widerspruch gewinnt dieses Gerät", () => {
  const base = doc(shared());
  const a = copy(base.sessions[0]); a.name = "Stammtisch"; a.players[0].name = "Anni";
  const b = copy(base.sessions[0]); b.targetPoints = 11; b.players[3].name = "Didi";
  const m = only(merge(base, doc(a), doc(b)));
  assert.deepEqual([m.name, m.targetPoints, m.players[0].name, m.players[3].name], ["Stammtisch", 11, "Anni", "Didi"]);
  const c = copy(base.sessions[0]); c.name = "Kartenrunde";
  assert.equal(only(merge(base, doc(a), doc(c))).name, "Stammtisch");
  assert.equal(only(merge(base, doc(c), doc(a))).name, "Kartenrunde");
});

test("Merge: Stiche im selben laufenden Spiel werden addiert, höchstens bis kurz vor dem Sieg", () => {
  const s = shared(); s.quickMode = false;
  const base = doc(s);
  const a = copy(base.sessions[0]); a.tricksA = 1;
  const b = copy(base.sessions[0]); b.tricksB = 1; b.currentBid = 3;
  const m = only(merge(base, doc(a), doc(b)));
  assert.deepEqual([m.tricksA, m.tricksB, m.currentBid], [1, 1, 3]);
  const a2 = copy(base.sessions[0]); a2.tricksA = 2;
  const b2 = copy(base.sessions[0]); b2.tricksA = 2;
  assert.equal(only(merge(base, doc(a2), doc(b2))).tricksA, 2, "das Spiel wird nicht vom Abgleich entschieden");
});

test("Merge: hat ein Gerät das Spiel schon gewertet, verfallen die Stiche des anderen", () => {
  const s = shared(); s.quickMode = false; s.tricksA = 2; s.tricksB = 1;
  const base = doc(s);
  const a = copy(base.sessions[0]); award(a, 0, 2);     // A: dritter Stich → Spiel gewertet, Stiche auf 0
  const b = copy(base.sessions[0]); b.tricksB = 2;      // B offline: noch ein Stich im alten Spiel
  const m = only(merge(base, doc(a), doc(b)));
  assert.deepEqual([round(m).teamAPoints, m.tricksA, m.tricksB], [6, 0, 0]);
});

test("Merge: neuer Spieltag auf einem Gerät, Punkte auf dem anderen – beides bleibt", () => {
  const base = doc(shared());
  const a = copy(base.sessions[0]);                     // A startet einen neuen Spieltag (angefangene Runde bleibt stehen)
  a.matchdays.push(Core.newMatchday(1)); a.currentMatchdayIndex = 1;
  const b = copy(base.sessions[0]); award(b, 1, 3);
  const m = only(merge(base, doc(a), doc(b)));
  assert.equal(m.matchdays.length, 2);
  assert.equal(m.currentMatchdayIndex, 1, "gespielt wird im neuen Spieltag");
  assert.deepEqual(m.matchdays[1].teams.teamA, [0, 2], "mit rotierten Teams");
  assert.equal(m.matchdays[0].rounds[0].teamBPoints, 5, "die Punkte vom anderen Gerät stehen im alten");
});

test("Merge: Beitritt ohne gemeinsamen Stand vereinigt, ohne etwas zu verdoppeln", () => {
  const s = shared();
  const mine = game("Nur bei mir");
  const local = doc(copy(s), mine);                     // dasselbe Spiel lag schon auf beiden Geräten (z.B. per Backup)
  const theirs = copy(s); theirs.name = "Name aus der Liste"; award(theirs, 1, 2);
  const m = merge(null, local, doc(theirs, game("Nur dort")), { prefer: "remote" });
  assert.deepEqual(m.sessions.map((x) => x.name).sort(), ["Name aus der Liste", "Nur bei mir", "Nur dort"]);
  const both = m.sessions.find((x) => x.id === s.id);
  assert.deepEqual([round(both).teamAPoints, round(both).teamBPoints], [4, 4], "gleiche Einträge zählen nur einmal");
});

test("Merge: präparierte Daten in der Cloud landen nicht im Ergebnis", () => {
  const base = doc(shared());
  const evil = copy(base);
  const X = `"><img src=x onerror=alert(1)>`;
  evil.sessions[0].matchdays[0].rounds[0].hands.push({ id: X, winnerTeam: 0, pointsAwarded: 2, timestamp: T0 });
  evil.sessions[0].matchdays.push({ id: X, rounds: [] });
  evil.sessions.push({ id: X, name: "x", matchdays: [] }, { id: "__proto__", matchdays: [] });
  evil.sessions[0].injected = X;
  const m = merge(base, base, evil);
  assert.equal(JSON.stringify(m).includes("onerror"), false);
  assert.ok(Core.same(m, base), "außer dem Müll hat sich nichts geändert");
});
