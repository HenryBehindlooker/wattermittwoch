#!/usr/bin/env node
/* Watten Tracker – Zwei-Geräte-Test für „Gemeinsam nutzen“
 *
 * Zwei getrennte Browser-Profile (= zwei Handys) teilen sich eine Liste.
 * Der Test startet einen eigenen Server, der die App ausliefert und Supabase
 * (wt_get / wt_save, siehe supabase.sql) im Speicher nachbildet.
 *
 *   npm run test:e2e
 */
"use strict";
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const { chromium, devices } = require("playwright");

const ROOT = path.join(__dirname, "..");
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "application/javascript; charset=utf-8",
  ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml" };
const KEY = "test-anon-key-123";
const rooms = new Map();                 // Raumcode → { data, version }
const calls = { get: 0, save: 0, conflicts: 0 };

function serve(req, res) {
  if (req.method === "POST" && req.url.startsWith("/rest/v1/rpc/")) {
    let body = "";
    req.on("data", (c) => { body += c; });
    req.on("end", () => {
      if (req.headers.apikey !== KEY) { res.writeHead(401); return res.end('{"message":"Invalid API key"}'); }
      const b = JSON.parse(body || "{}");
      const fn = req.url.split("/").pop();
      let out;
      if (fn === "wt_get") {
        calls.get++;
        const r = rooms.get(b.p_code);
        out = r ? [{ data: r.data, version: r.version }] : [];
      } else if (fn === "wt_save") {
        calls.save++;
        const r = rooms.get(b.p_code);
        if (!/^[A-Za-z0-9]{24,64}$/.test(b.p_code || "")) { res.writeHead(400); return res.end('{"message":"Raumcode ungültig"}'); }
        if (b.p_version === 0) {
          if (r) out = -1; else { rooms.set(b.p_code, { data: b.p_data, version: 1 }); out = 1; }
        } else if (r && r.version === b.p_version) {
          r.data = b.p_data; r.version += 1; out = r.version;
        } else out = -1;
        if (out === -1) calls.conflicts++;
      } else { res.writeHead(404); return res.end("{}"); }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(out));
    });
    return;
  }
  let p = decodeURIComponent(req.url.split("?")[0]);
  if (p.endsWith("/")) p += "index.html";
  const file = path.join(ROOT, path.normalize(p));
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
}

const SETTLE = 330;
const steps = [];
const step = (title, fn) => steps.push({ title, fn });

(async () => {
  const server = http.createServer(serve);
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch();
  const problems = [];

  /** Ein „Handy“: eigenes Profil, eigener Speicher. */
  async function device(name) {
    const ctx = await browser.newContext({ ...devices["iPhone 13"], locale: "de-DE" });
    const page = await ctx.newPage();
    page.on("pageerror", (e) => problems.push(`${name}: ${e.message}`));
    page.on("console", (m) => { if (m.type() === "error" && /Content Security Policy/i.test(m.text())) problems.push(`${name}: CSP ${m.text()}`); });
    await page.goto(`${base}/`);
    const d = {
      name, ctx, page,
      tap: async (sel, n = 1) => { for (let i = 0; i < n; i++) await page.tap(sel); },
      wait: (ms = SETTLE) => page.waitForTimeout(ms),
      toast: () => page.locator("#toast").innerText(),
      confirm: async () => { await page.tap(".alert .ok"); await page.waitForTimeout(SETTLE); },
      cancel: async () => { await page.tap(".alert .cancel"); await page.waitForTimeout(SETTLE); },
      sync: () => page.evaluate(() => Sync.run().then(() => true, (e) => String(e.message || e))),
      connected: () => page.evaluate(() => Sync.configured()),
      status: () => page.evaluate(() => Sync.status),
      games: () => page.evaluate(() => JSON.parse(localStorage.getItem("watten_store_v3") || '{"sessions":[]}').sessions.map((s) => s.name).sort()),
      score: async () => [await page.locator(".score-col.a .pts").innerText(), await page.locator(".score-col.b .pts").innerText()].join(":"),
      rounds: async () => [await page.locator(".score-col.a .rwon").innerText(), await page.locator(".score-col.b .rwon").innerText()].join(" / "),
      async newGame(title, players) {
        await page.tap('.topbar [data-act="new"]'); await page.waitForTimeout(SETTLE);
        await page.fill("#ng-name", title);
        for (let i = 0; i < (players || []).length; i++) await page.fill(`#ng-names [data-name="${i}"]`, players[i]);
        await page.locator("#ng-quick").scrollIntoViewIfNeeded(); await page.tap("#ng-quick");   // Schnellmodus: ein Tipp = ein Spiel
        await page.tap("#ng-create"); await page.waitForTimeout(SETTLE);
      },
      async open(title) { await page.tap(`[data-sess] >> text=${title}`); await page.waitForTimeout(150); },
      async home() { if (await page.locator("[data-back]").count()) { await page.tap("[data-back]"); await page.waitForTimeout(150); } },
      async dataSheet() { await d.home(); await page.tap('[data-act="data"]'); await page.waitForTimeout(SETTLE); },
      async closeSheet() { await page.tap("#d-done"); await page.waitForTimeout(SETTLE); },
    };
    return d;
  }
  // beide Geräte abgleichen, bis nichts mehr zu tun ist
  async function settle(...ds) {
    for (let i = 0; i < 3; i++) for (const d of ds) assert.equal(await d.sync(), true, `Abgleich auf ${d.name}`);
  }

  const A = await device("Gerät A");
  const B = await device("Gerät B");
  let invite = "";

  step("Ohne Verbindung läuft die App wie bisher – kein Aufruf an einen Server", async () => {
    await A.newGame("Mittwoch", ["Anna", "Bert", "Cora", "Dirk"]);
    await A.tap('[data-win="0"]');
    assert.equal(await A.score(), "2:0");
    assert.equal(await A.connected(), false);
    assert.deepEqual(calls, { get: 0, save: 0, conflicts: 0 });
  });

  step("Einrichten: falsche Eingaben werden abgelehnt, nichts wird gespeichert", async () => {
    await A.dataSheet();
    await A.page.locator("#sh-url").scrollIntoViewIfNeeded();
    await A.page.fill("#sh-url", "http://unverschluesselt.example"); await A.page.fill("#sh-key", KEY);
    await A.tap("#sh-create");
    assert.match(await A.toast(), /https/);
    await A.page.fill("#sh-url", base); await A.page.fill("#sh-key", "falscher-key-000");
    await A.tap("#sh-create"); await A.wait(600);
    assert.match(await A.page.locator(".alert .at").innerText(), /Verbindung fehlgeschlagen/);
    await A.confirm();
    assert.equal(await A.connected(), false);
    assert.equal(rooms.size, 0);
  });

  step("Gemeinsame Liste erstellen lädt die bisherigen Spiele hoch", async () => {
    await A.page.fill("#sh-url", base); await A.page.fill("#sh-key", KEY);
    await A.tap("#sh-create"); await A.wait(600);
    assert.equal(await A.connected(), true);
    assert.equal(rooms.size, 1);
    const [code, room] = [...rooms.entries()][0];
    assert.match(code, /^[A-Za-z0-9]{32}$/, "Raumcode hat 32 Zeichen");
    assert.deepEqual(room.data.sessions.map((s) => s.name), ["Mittwoch"]);
    assert.equal(JSON.stringify(room.data).includes("undoStack"), false, "Rückgängig-Verlauf bleibt auf dem Gerät");
    assert.match(await A.page.locator("#share-status").innerText(), /Abgeglichen|Verbunden/);
    invite = await A.page.evaluate(() => Sync.inviteLink());
    assert.ok(invite.startsWith(`${base}/#join=`));
    await A.closeSheet();
  });

  step("Einladungslink: ohne Bestätigung passiert nichts, die Zugangsdaten verschwinden aus der Adresszeile", async () => {
    await B.newGame("Nur auf B");
    await B.home();
    await B.page.goto(invite); await B.wait();
    assert.equal(new URL(B.page.url()).hash, "", "Adresszeile ist bereinigt");
    const msg = await B.page.locator(".alert .am").innerText();
    assert.ok(msg.includes(new URL(base).host), "Dialog nennt den Server");
    assert.match(msg, /Spiel auf diesem Gerät kommt zur gemeinsamen Liste dazu/);
    await B.cancel();
    assert.equal(await B.connected(), false);
    assert.deepEqual(await B.games(), ["Nur auf B"]);
  });

  step("Beitreten nach Bestätigung: beide Geräte haben danach alle Spiele, nichts geht verloren", async () => {
    await B.page.evaluate((l) => { location.hash = new URL(l).hash; }, invite); await B.wait();   // Link in der offenen App
    await B.confirm(); await B.wait(600);
    assert.equal(await B.connected(), true);
    assert.match(await B.toast(), /Beigetreten/);
    await settle(A, B);
    assert.deepEqual(await B.games(), ["Mittwoch", "Nur auf B"]);
    assert.deepEqual(await A.games(), ["Mittwoch", "Nur auf B"]);
    assert.ok(await B.page.evaluate(() => !!localStorage.getItem("watten_store_v3_vor_beitritt")), "Kopie vor dem Beitritt liegt bereit");
  });

  step("Beide zählen im selben Spiel: die Punkte werden addiert", async () => {
    await A.home(); await A.open("Mittwoch"); await B.open("Mittwoch");
    assert.equal(await B.score(), "2:0", "B sieht den Stand von A");
    await A.tap('[data-win="0"]');                               // A: +2 für Team A
    await B.tap("[data-bid]"); await B.tap('[data-win="1"]');    // B: +3 für Team B
    await settle(A, B);
    assert.equal(await A.score(), "4:3");
    assert.equal(await B.score(), "4:3");
    const saves = calls.save;
    await settle(A, B);
    assert.equal(calls.save, saves, "ist alles abgeglichen, wird nichts mehr gespeichert (kein Ping-Pong)");
  });

  step("Änderungen kommen von selbst an (ohne manuellen Abgleich)", async () => {
    await A.tap('[data-win="1"]');                               // 4:5 – A gleicht kurz darauf automatisch ab
    await A.wait(2200);
    await B.page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));   // B kommt in den Vordergrund
    await B.page.waitForFunction(() => document.querySelector(".score-col.b .pts")?.textContent === "5", null, { timeout: 5000 });
    assert.equal(await B.score(), "4:5");
  });

  step("Kam etwas von einem anderen Gerät, nimmt Rückgängig keine fremden Einträge zurück", async () => {
    assert.equal(await B.page.locator("[data-undo]").isDisabled(), true, "Verlauf auf B ist geleert");
    assert.equal(await A.page.locator("[data-undo]").isDisabled(), false, "A kann den eigenen letzten Eintrag zurücknehmen");
  });

  step("Offline weiterzählen: nach dem Wiederverbinden ist nichts überschrieben", async () => {
    await B.ctx.setOffline(true);
    await B.tap('[data-win="1"]', 2);                            // B offline: +4 für Team B → 4:9
    await B.wait(1600);
    assert.equal(await B.status(), "offline");
    assert.equal(await B.score(), "4:9", "B zählt offline normal weiter");
    await A.tap('[data-win="0"]', 2);                            // A online: +4 für Team A → 8:5
    assert.equal(await A.sync(), true);
    await B.ctx.setOffline(false);                               // Browser meldet „online“ → Abgleich startet von selbst
    await B.page.waitForFunction(() => Sync.status === "ok" && document.querySelector(".score-col.a .pts")?.textContent === "8", null, { timeout: 8000 });
    await settle(A, B);
    assert.equal(await A.score(), "8:9");
    assert.equal(await B.score(), "8:9");
  });

  step("Gleichzeitig gespeichert: der Server meldet einen Konflikt, das Gerät mischt neu statt zu überschreiben", async () => {
    const before = calls.conflicts;
    await A.tap('[data-win="0"]'); await B.tap('[data-win="1"]');
    // B schiebt sich zwischen Laden und Speichern von A
    await A.page.evaluate(() => { const rpc = Sync.rpc.bind(Sync); let once = true;
      Sync.rpc = async (fn, body) => { if (fn === "wt_save" && once) { once = false; await window.__gap(); } return rpc(fn, body); }; });
    await A.page.exposeFunction("__gap", async () => { assert.equal(await B.sync(), true); });
    assert.equal(await A.sync(), true);
    assert.ok(calls.conflicts > before, "es gab wirklich einen Versionskonflikt");
    await settle(A, B);
    assert.equal(await A.score(), "10:11");
    assert.equal(await B.score(), "10:11");
  });

  step("Erreicht die Summe das Ziel, ist die Runde auf beiden Geräten gewonnen", async () => {
    await A.tap('[data-win="0"]', 2); await B.tap('[data-win="0"]');        // A sieht 14:11, B sieht 12:11 – zusammen 16:11
    await settle(A, B);
    assert.equal(await A.rounds(), "1 Runde / 0 Runden");
    assert.equal(await B.rounds(), "1 Runde / 0 Runden");
    assert.equal(await A.score(), "0:0");
    assert.equal(await B.score(), "0:0");
    const room = [...rooms.values()][0].data.sessions.find((s) => s.name === "Mittwoch");
    assert.equal(room.matchdays[0].rounds.length, 2, "eine gewonnene und eine offene Runde – keine Geisterrunde");
  });

  step("Neues Spiel und Einstellungen eines Geräts erscheinen auf dem anderen", async () => {
    await B.home(); await B.newGame("Von B angelegt"); await B.home();
    await A.tap('[data-open="settings"]'); await A.wait();
    await A.page.fill('#st-names [data-name="0"]', "Anni"); await A.tap("#st-done"); await A.wait();
    await settle(A, B);
    await A.home();
    assert.deepEqual(await A.games(), ["Mittwoch", "Nur auf B", "Von B angelegt"]);
    await B.open("Mittwoch");
    assert.match(await B.page.locator(".score-col.a .tn").innerText(), /Anni/);
  });

  step("Nach einem Neustart ist das Gerät weiter verbunden", async () => {
    await A.page.reload(); await A.wait();
    assert.equal(await A.connected(), true);
    await A.open("Mittwoch");
    assert.equal(await A.rounds(), "1 Runde / 0 Runden");
  });

  step("Präparierte Daten in der Cloud: kein eingeschleuster Code, die App bleibt bedienbar", async () => {
    const room = [...rooms.values()][0];
    const X = `"><img src=x onerror="window.__xss=1"><script>window.__xss=1</script>`;
    const evil = JSON.parse(JSON.stringify(room.data));
    evil.sessions.push({ id: X, name: X, matchdays: [] }, { id: "boese1", name: X, variant: "__proto__", targetPoints: X,
      players: [{ id: X, name: X }], matchdays: [{ id: X, rounds: [] }, { id: "m1", date: X, teams: { teamA: [0, 1], teamB: [2, 3], nameA: X },
        rounds: [{ id: "r1", teamAPoints: 3, startedAt: X, hands: [{ id: X, winnerTeam: 0, pointsAwarded: 2 }] }] }] });
    evil.sessions[0].extra = X;
    room.data = evil; room.version += 1;
    await settle(A, B);
    await A.home();
    for (const d of [A, B]) {
      assert.equal(await d.page.evaluate(() => window.__xss), undefined, `${d.name}: eingeschleustes Skript lief`);
      assert.equal(await d.page.locator("#app img, #app script").count(), 0, `${d.name}: eingeschleuste Elemente`);
    }
    assert.ok((await A.games()).length >= 3);
    await A.open("Mittwoch"); await A.tap('[data-win="0"]');
    assert.equal(await A.score(), "2:0", "weiter bedienbar");
  });

  step("Unlesbare Cloud-Daten: Abgleich meldet einen Fehler, die Spiele auf dem Gerät bleiben", async () => {
    const room = [...rooms.values()][0];
    const good = room.data;
    const before = await A.games();
    room.data = { kaputt: true }; room.version += 1;
    assert.notEqual(await A.sync(), true);
    assert.equal(await A.status(), "error");
    assert.deepEqual(await A.games(), before);
    room.data = good; room.version += 1;
    await settle(A, B);
    assert.equal(await A.status(), "ok");
  });

  step("Einladungslinks auf unverschlüsselte oder kaputte Ziele werden abgelehnt", async () => {
    const C = await device("Gerät C");
    const mk = (o) => `${base}/#join=${Buffer.from(JSON.stringify(o)).toString("base64url")}`;
    const code = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefgh";
    for (const bad of [mk({ u: "http://boese.example", k: KEY, c: code }), mk({ u: "https://user:pw@x.example", k: KEY, c: code }),
      mk({ u: base, k: KEY, c: "zu-kurz" }), mk({ u: base, k: "<script>", c: code }), `${base}/#join=%%%`, `${base}/#join=e30`]) {
      await C.page.goto(bad); await C.wait();
      assert.match(await C.page.locator(".alert .at").innerText(), /ungültig/, bad);
      assert.equal(new URL(C.page.url()).hash, "");
      await C.confirm();
      assert.equal(await C.connected(), false);
    }
    // gültiger Link, aber die Liste gibt es nicht
    await C.page.goto(mk({ u: base, k: KEY, c: code })); await C.wait();
    await C.confirm(); await C.wait(600);
    assert.match(await C.page.locator(".alert .at").innerText(), /Beitreten fehlgeschlagen/);
    await C.confirm();
    assert.equal(await C.connected(), false);
    // Beitritt per Einfügen in den Einstellungen (für die App vom Home-Bildschirm)
    await C.dataSheet();
    await C.page.locator("#sh-link").scrollIntoViewIfNeeded();
    await C.page.fill("#sh-link", `Zähl mit beim Watten!\n${invite}`); await C.tap("#sh-join"); await C.wait();
    await C.confirm(); await C.wait(600);
    assert.equal(await C.connected(), true);
    assert.ok((await C.games()).includes("Mittwoch"));
    await C.ctx.close();
  });

  step("Verbindung trennen: die Spiele bleiben, es wird nichts mehr abgeglichen", async () => {
    await B.dataSheet();
    await B.page.locator("#sh-leave").scrollIntoViewIfNeeded(); await B.tap("#sh-leave"); await B.wait();
    await B.confirm();
    assert.equal(await B.connected(), false);
    assert.equal(await B.page.locator("#sh-create").count(), 1, "Einrichtung wird wieder angeboten");
    await B.closeSheet();
    const kept = await B.games();
    assert.ok(kept.includes("Mittwoch") && kept.includes("Nur auf B"));
    const gets = calls.get;
    await B.open("Mittwoch"); await B.tap('[data-win="1"]'); await B.wait(1800);
    assert.equal(calls.get, gets, "B ruft den Server nicht mehr auf");
    assert.equal(await B.page.evaluate(() => localStorage.getItem("watten_shared_cfg")), null, "Zugangsdaten sind vom Gerät gelöscht");
  });

  step("Spielstand der Vorversion: wird beim Erstellen der Liste hochgeladen und kommt auf dem zweiten Gerät identisch an", async () => {
    const facts = require("./facts.js");
    const OLD = fs.readFileSync(path.join(__dirname, "fixtures", "store-vorversion.json"), "utf8");
    const D = await device("Gerät D"), E = await device("Gerät E");
    await D.page.evaluate((raw) => localStorage.setItem("watten_store_v3", raw), OLD);
    await D.page.reload(); await D.wait();
    await D.dataSheet();
    await D.page.locator("#sh-url").scrollIntoViewIfNeeded();
    await D.page.fill("#sh-url", base); await D.page.fill("#sh-key", KEY); await D.tap("#sh-create"); await D.wait(700);
    assert.equal(await D.connected(), true);
    await E.page.goto(await D.page.evaluate(() => Sync.inviteLink())); await E.wait();
    await E.confirm(); await E.wait(700);
    await settle(D, E);
    const read = (d) => d.page.evaluate(() => JSON.parse(localStorage.getItem("watten_store_v3")));
    assert.deepEqual(facts(await read(D)), facts(JSON.parse(OLD)), "auf dem Gerät selbst unverändert");
    assert.deepEqual(facts(await read(E)), facts(JSON.parse(OLD)), "auf dem beigetretenen Gerät identisch");
    await D.ctx.close(); await E.ctx.close();
  });

  let failed = 0;
  for (const s of steps) {
    try { await s.fn(); console.log(`  ✓ ${s.title}`); }
    catch (e) { failed++; console.log(`  ✗ ${s.title}\n      → ${String(e.message).split("\n").slice(0, 3).join(" ")}`); break; }
  }
  if (problems.length) { failed++; console.log(`  ✗ Laufzeitfehler / CSP-Verstöße:\n      ${problems.join("\n      ")}`); }
  await browser.close(); server.close();
  console.log(failed ? "\nZwei-Geräte-Test FEHLGESCHLAGEN" : `\nZwei-Geräte-Test bestanden (${steps.length} Schritte)`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
