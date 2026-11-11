#!/usr/bin/env node
/* Watten Tracker – Akzeptanztests
 *
 * Spielt die Anforderungen als echte Nutzerabläufe im Browser durch
 * (iPhone-Profil, Touch-Eingabe). Startet dafür selbst einen kleinen
 * statischen Server – es muss nichts gebaut oder konfiguriert werden.
 *
 *   npm install        (einmalig, installiert Playwright)
 *   npm test
 *
 * Exit-Code 0 = alle Kriterien erfüllt.
 */
"use strict";
const http = require("http");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { chromium, devices } = require("playwright");

const ROOT = path.resolve(__dirname, "..");
const MIME = { ".html":"text/html; charset=utf-8", ".js":"application/javascript; charset=utf-8",
  ".json":"application/json", ".png":"image/png", ".svg":"image/svg+xml" };

function startServer(){
  const server = http.createServer((req,res)=>{
    let p = decodeURIComponent(req.url.split("?")[0]);
    if(p.endsWith("/")) p += "index.html";
    const file = path.join(ROOT, path.normalize(p));
    if(!file.startsWith(ROOT)){ res.writeHead(403); return res.end(); }
    fs.readFile(file,(err,buf)=>{
      if(err){ res.writeHead(404); return res.end("not found"); }
      res.writeHead(200, {"Content-Type": MIME[path.extname(file)] || "application/octet-stream"});
      res.end(buf);
    });
  });
  return new Promise(r=>server.listen(0,"127.0.0.1",()=>r(server)));
}

// ── kleines Test-Gerüst ─────────────────────────────────────────
const tests = [];
const test = (id, title, fn) => tests.push({id, title, fn});
function expect(cond, msg){ if(!cond) throw new Error(msg); }
function eq(actual, expected, msg){
  if(JSON.stringify(actual)!==JSON.stringify(expected))
    throw new Error(`${msg}: erwartet ${JSON.stringify(expected)}, war ${JSON.stringify(actual)}`);
}

// ── Helfer: Bedienung wie ein Nutzer ────────────────────────────
const SETTLE = 330;                       // Sheet-/Dialog-Animation abwarten
const store   = (p)=> p.evaluate(()=>JSON.parse(localStorage.getItem("watten_store_v3")||'{"sessions":[]}'));
const session = async (p)=> (await store(p)).sessions[0];
const curMd   = (s)=> s.matchdays[s.currentMatchdayIndex];
const curRound= (s)=> { const md=curMd(s); return md.rounds[md.rounds.length-1]; };
const text    = (p,sel)=> p.locator(sel).first().innerText();
const toast   = (p)=> p.locator("#toast").innerText();
const tap     = async (p,sel,n=1)=>{ for(let i=0;i<n;i++) await p.tap(sel); };
const confirm = async (p)=>{ await p.tap(".alert .ok"); await p.waitForTimeout(SETTLE); };

async function newGame(p, {name="", players=[], quick=false}={}){
  await p.tap('.topbar [data-act="new"]'); await p.waitForTimeout(SETTLE);
  if(name) await p.fill("#ng-name", name);
  for(let i=0;i<players.length;i++) await p.fill(`#ng-names [data-name="${i}"]`, players[i]);
  if(quick){ await p.locator("#ng-quick").scrollIntoViewIfNeeded(); await p.tap("#ng-quick"); }
  await p.tap("#ng-create"); await p.waitForTimeout(SETTLE);
}
const hand = (p,team)=> tap(p, `[data-trick="${team}"]`, 3);           // ein Spiel = 3 Stiche
async function openSheet(p,kind){ await p.tap(`[data-open="${kind}"]`); await p.waitForTimeout(SETTLE); }

// ════════════════════════════════════════════════════════════════
// A · Spiel anlegen
// ════════════════════════════════════════════════════════════════
test("A1","Leerer Start zeigt einen Einstieg zum ersten Spiel", async p=>{
  expect(await p.locator(".empty .btn-primary").isVisible(), "Button „Neues Spiel“ fehlt im Leerzustand");
});
test("A2","Spiel mit Namen und vier Spielern anlegen → man landet direkt im Spiel", async p=>{
  await newGame(p,{name:"Mittwochsrunde", players:["Anna","Bert","Cora","Dirk"]});
  eq(await text(p,".topbar .title"), "Mittwochsrunde", "Titel");
  eq(await text(p,".score-col.a .tn"), "Anna & Bert", "Team A");
  eq(await text(p,".score-col.b .tn"), "Cora & Dirk", "Team B");
});
test("A3","Ohne Eingaben entstehen sinnvolle Standardnamen", async p=>{
  await newGame(p);
  const s=await session(p);
  eq(s.name, "Spiel 1", "Spielname");
  eq(s.players.map(x=>x.name), ["Spieler 1","Spieler 2","Spieler 3","Spieler 4"], "Spieler");
});
test("A4","Spielstand übersteht einen Neustart der App", async p=>{
  await newGame(p,{players:["Anna","Bert","Cora","Dirk"]});
  await hand(p,0);
  await p.reload(); await p.waitForTimeout(200);
  await p.tap("[data-sess]"); await p.waitForTimeout(200);
  eq(await text(p,".score-col.a .pts"), "2", "Punkte nach Neustart");
});

// ════════════════════════════════════════════════════════════════
// B · Zählen mit Stichen
// ════════════════════════════════════════════════════════════════
test("B1","Drei Stiche beenden das Spiel und geben 2 Punkte", async p=>{
  await newGame(p);
  await tap(p,'[data-trick="0"]',2);
  eq(await text(p,".trick-col.a .cnt"), "2/3", "Stichanzeige");
  await tap(p,'[data-trick="0"]');
  const s=await session(p);
  eq([curRound(s).teamAPoints, s.tricksA, s.tricksB], [2,0,0], "Punkte / Stiche zurückgesetzt");
});
test("B2","Bieten erhöht den Wert des laufenden Spiels", async p=>{
  await newGame(p);
  await tap(p,"[data-bid]",2);                         // 2 → 4
  await hand(p,1);
  const s=await session(p);
  eq([curRound(s).teamBPoints, s.currentBid], [4,2], "Punkte / Gebot wieder 2");
});
test("B3","Rückgängig nimmt genau die letzte Aktion zurück", async p=>{
  await newGame(p);
  await hand(p,0); await tap(p,'[data-trick="1"]');
  await tap(p,"[data-undo]");
  let s=await session(p); eq([curRound(s).teamAPoints, s.tricksB],[2,0],"nach 1× Rückgängig");
  await tap(p,"[data-undo]");
  s=await session(p); eq([curRound(s).teamAPoints, s.tricksA],[0,2],"nach 2× Rückgängig");
});

// ════════════════════════════════════════════════════════════════
// C · Anforderungen aus der Notiz
// ════════════════════════════════════════════════════════════════
test("C1","Schnellmodus: ohne Stiche, Spiel wird mit dem Gebot direkt vergeben", async p=>{
  await newGame(p,{quick:true});
  eq(await p.locator("[data-trick]").count(), 0, "Stich-Buttons im Schnellmodus");
  await tap(p,'[data-win="0"]');
  await tap(p,"[data-bid]"); await tap(p,'[data-win="1"]');
  const r=curRound(await session(p));
  eq([r.teamAPoints, r.teamBPoints], [2,3], "Punkte");
});
test("C1b","Schnellmodus lässt sich im laufenden Spiel umschalten", async p=>{
  await newGame(p);
  await openSheet(p,"settings");
  await p.locator("#st-quick").scrollIntoViewIfNeeded(); await p.tap("#st-quick");
  await p.tap("#st-done"); await p.waitForTimeout(SETTLE);
  eq(await p.locator("[data-win]").count(), 2, "Punkte-Buttons nach Umschalten");
});
test("C2","Bildschirm bleibt an: Wake Lock im Spiel, Freigabe beim Verlassen", async p=>{
  await newGame(p); await p.waitForTimeout(50);
  eq((await p.evaluate(()=>window.__wl)).req, 1, "Wake Lock angefordert");
  await p.tap("[data-back]"); await p.waitForTimeout(50);
  eq((await p.evaluate(()=>window.__wl)).rel, 1, "Wake Lock freigegeben");
});
test("C3","„Gestrichen“ erscheint, sobald ≤ 2 Punkte zum Ziel fehlen", async p=>{
  await newGame(p,{quick:true});
  await tap(p,'[data-win="0"]',6);                     // 12 von 15
  eq(await p.locator(".score-col.a .gestrichen").count(), 0, "bei 12 noch nicht gestrichen");
  await tap(p,"[data-bid]"); await tap(p,'[data-fold="1"]');   // B geht → A +2 = 14
  eq(await p.locator(".score-col.a .gestrichen").count(), 1, "bei 14 gestrichen");
  eq(await p.locator(".score-col.b .gestrichen").count(), 0, "Team B nicht gestrichen");
});
test("C4","Gschneidert (Gegner 0 Punkte) zählt 2 Runden, sonst 1", async p=>{
  await newGame(p,{quick:true});
  await tap(p,'[data-win="0"]',8);                     // 16:0
  let s=await session(p);
  eq([curMd(s).teamARoundsWon, !!curMd(s).rounds[0].schneider], [2,true], "Schneider");
  expect((await toast(p)).includes("Gschneidert"), "Hinweis „Gschneidert“ fehlt");
  await tap(p,'[data-win="1"]'); await tap(p,'[data-win="0"]',8);   // 16:2
  s=await session(p);
  eq([curMd(s).teamARoundsWon, !!curMd(s).rounds[1].schneider], [3,false], "normale Runde");
});
test("C5","Gehen: erst nach einem Gebot möglich, Gegner bekommt Gebot − 1", async p=>{
  await newGame(p);
  eq(await p.locator("[data-fold]").count(), 0, "„Geht“ ohne Gebot sichtbar");
  await tap(p,"[data-bid]");                           // 3
  await tap(p,'[data-fold="0"]');                      // A geht → B bekommt 2
  let r=curRound(await session(p)); eq([r.teamAPoints,r.teamBPoints],[0,2],"Gehen bei 3");
  await tap(p,"[data-bid]",2);                         // 4
  await tap(p,'[data-fold="1"]');                      // B geht → A bekommt 3
  r=curRound(await session(p)); eq([r.teamAPoints,r.teamBPoints],[3,2],"Gehen bei 4");
});

// ════════════════════════════════════════════════════════════════
// D · Runden, Spieltage, Teams
// ════════════════════════════════════════════════════════════════
test("D1","Runde endet beim Ziel: Rundenzähler +1, neue Runde bei 0:0, Hinweis", async p=>{
  await newGame(p,{quick:true, players:["Anna","Bert","Cora","Dirk"]});
  await tap(p,'[data-win="1"]'); await tap(p,'[data-win="0"]',8);
  eq(await text(p,".score-col.a .rwon"), "1 Runde", "Rundenzähler");
  eq([await text(p,".score-col.a .pts"), await text(p,".score-col.b .pts")], ["0","0"], "neue Runde");
  expect((await toast(p)).includes("Anna & Bert gewinnt die Runde 16:2"), "Hinweis zum Rundensieg fehlt: "+await toast(p));
});
test("D2","Runde vorzeitig beenden fragt nach; der Führende bekommt die Runde", async p=>{
  await newGame(p,{quick:true});
  await tap(p,"[data-next]");
  expect((await toast(p)).includes("noch keine Punkte"), "Hinweis bei leerer Runde fehlt");
  await tap(p,'[data-win="1"]'); await tap(p,"[data-next]"); await p.waitForTimeout(SETTLE);
  expect(await p.locator(".alert").isVisible(), "Rückfrage fehlt");
  await confirm(p);
  eq(curMd(await session(p)).teamBRoundsWon, 1, "Runde für Team B");
});
test("D3","Neuer Spieltag rotiert die Teams (1&2 → 1&3 → 1&4)", async p=>{
  await newGame(p,{players:["Anna","Bert","Cora","Dirk"]});
  await tap(p,"[data-newmd]"); await p.waitForTimeout(SETTLE); await confirm(p);
  eq(await text(p,".score-col.a .tn"), "Anna & Cora", "Team A an Spieltag 2");
  await tap(p,"[data-newmd]"); await p.waitForTimeout(SETTLE); await confirm(p);
  eq(await text(p,".score-col.a .tn"), "Anna & Dirk", "Team A an Spieltag 3");
  expect((await text(p,".gh-day .d")).includes("Spieltag 3"), "Spieltag-Anzeige");
});
test("D4","Eigene Teams gelten ab dem aktuellen Spieltag, nicht rückwirkend", async p=>{
  await newGame(p,{quick:true, players:["Anna","Bert","Cora","Dirk"]});
  await tap(p,'[data-win="0"]',8);                     // Runde für Anna & Bert (Schneider = 2)
  await tap(p,"[data-newmd]"); await p.waitForTimeout(SETTLE); await confirm(p);
  await openSheet(p,"teams");
  eq(await p.locator(".team-edit.a .pn").allInnerTexts(), ["Anna","Cora"], "Sheet zeigt aktuelle Aufstellung");
  await p.tap('.team-edit.a [data-swap="0"]');         // 3 gegen 1 → nicht erlaubt
  await p.tap("#te-apply");
  expect((await toast(p)).includes("genau 2"), "3:1-Aufstellung wurde nicht abgelehnt");
  await p.tap('.team-edit.b [data-swap="3"]');         // Dirk rüber → Cora & Dirk vs Bert & Anna
  await p.fill("#te-nameA","Die Blauen");
  await p.tap("#te-apply"); await p.waitForTimeout(SETTLE);
  eq(await text(p,".score-col.a .tn"), "Die Blauen", "Teamname");
  const s=await session(p);
  eq(s.matchdays[0].teams.teamA, [0,1], "Spieltag 1 unverändert");
  await openSheet(p,"stats"); await p.tap('[data-tab="1"]');
  const rows=await p.locator(".panel:has-text('Spieler-Statistik') .row-line").allInnerTexts();
  expect(rows[0].includes("2 Runden") && rows[1].includes("2 Runden") && rows[2].includes("0 Runden"),
    "Spielerstatistik rechnet alte Runden falsch zu: "+JSON.stringify(rows));
});
test("D5","Runde im Verlauf löschen zieht sie ab; Rückgängig stellt sie wieder her", async p=>{
  await newGame(p,{quick:true});
  await tap(p,'[data-win="1"]'); await tap(p,'[data-win="0"]',8);
  await openSheet(p,"stats");
  await p.tap("[data-delr]"); await p.waitForTimeout(SETTLE); await confirm(p);
  eq(curMd(await session(p)).teamARoundsWon, 0, "nach Löschen");
  await p.tap("#stat-done"); await p.waitForTimeout(SETTLE);
  eq(await text(p,".score-col.a .rwon"), "0 Runden", "Spielansicht aktualisiert");
  await tap(p,"[data-undo]");
  eq(curMd(await session(p)).teamARoundsWon, 1, "nach Rückgängig");
});
test("D6","Laufende Runde löschen: es wird nicht in die gelöschte weitergezählt", async p=>{
  await newGame(p,{quick:true});
  await tap(p,'[data-win="0"]',2);
  await openSheet(p,"stats");
  await p.tap("[data-delr]"); await p.waitForTimeout(SETTLE); await confirm(p);
  await p.tap("#stat-done"); await p.waitForTimeout(SETTLE);
  await tap(p,'[data-win="0"]');
  const md=curMd(await session(p));
  eq([md.rounds.length, md.rounds[0].isDeleted, md.rounds[0].teamAPoints, md.rounds[1].teamAPoints], [2,true,4,2], "Runden");
});

// ════════════════════════════════════════════════════════════════
// E · Bedienung
// ════════════════════════════════════════════════════════════════
test("E1","Zurück (Android-Taste/Wischgeste) schließt Dialog → Sheet → Spiel, verlässt nicht die App", async p=>{
  await newGame(p);
  await openSheet(p,"settings");
  await p.locator("#st-delete").scrollIntoViewIfNeeded(); await p.tap("#st-delete"); await p.waitForTimeout(SETTLE);
  const state=()=>p.evaluate(()=>[document.querySelectorAll(".alert-back.open").length,
    document.querySelectorAll(".sheet.open").length, !!document.querySelector(".topbar.game")]);
  eq(await state(), [1,1,true], "Ausgangslage");
  await p.goBack(); await p.waitForTimeout(SETTLE); eq(await state(), [0,1,true], "1× Zurück schließt Dialog");
  await p.goBack(); await p.waitForTimeout(SETTLE); eq(await state(), [0,0,true], "2× Zurück schließt Sheet");
  await p.goBack(); await p.waitForTimeout(SETTLE); eq(await state(), [0,0,false], "3× Zurück führt zur Übersicht");
  expect(p.url().startsWith("http"), "App wurde verlassen");
  eq((await store(p)).sessions.length, 1, "Spiel noch vorhanden");
});
test("E2","Einstellungen wegtippen übernimmt Änderungen; „Neues Spiel“ wegtippen verwirft", async p=>{
  await newGame(p);
  await openSheet(p,"settings");
  await p.fill("#st-name","Umbenannt"); await p.fill('#st-names [data-name="0"]',"Anna");
  await p.touchscreen.tap(195, 30); await p.waitForTimeout(SETTLE);      // Tipp auf den abgedunkelten Hintergrund
  eq(await p.locator(".sheet.open").count(), 0, "Sheet geschlossen");
  const s=await session(p); eq([s.name, s.players[0].name], ["Umbenannt","Anna"], "Änderungen übernommen");
  await p.tap("[data-back]");
  await p.tap('.topbar [data-act="new"]'); await p.waitForTimeout(SETTLE);
  await p.fill("#ng-name","Verworfen");
  await p.touchscreen.tap(195, 30); await p.waitForTimeout(SETTLE);
  eq((await store(p)).sessions.length, 1, "kein zweites Spiel angelegt");
});
test("E3","Spiel löschen: über Einstellungen, mit Bestätigung, zurück zur Übersicht", async p=>{
  await newGame(p,{name:"Weg damit"});
  await openSheet(p,"settings");
  await p.locator("#st-delete").scrollIntoViewIfNeeded(); await p.tap("#st-delete"); await p.waitForTimeout(SETTLE);
  expect((await text(p,".alert .at")).includes("Weg damit"), "Dialog nennt das Spiel nicht");
  await confirm(p);
  eq((await store(p)).sessions.length, 0, "Spiel gelöscht");
  expect(await p.locator(".empty").isVisible(), "nicht zurück in der Übersicht");
});
test("E4","iOS-Konventionen: Eingabefelder ≥ 16px (kein Zoom), Tippflächen ≥ 40px, Sheet-Titel einzeilig", async p=>{
  await newGame(p);
  const small=async()=>p.evaluate(()=>[...document.querySelectorAll("input:not([type=checkbox]):not([type=file])")]
    .filter(i=>parseFloat(getComputedStyle(i).fontSize)<16).map(i=>i.id||i.dataset.name||i.className));
  const titleLines=async()=>p.evaluate(()=>{ const t=document.querySelector(".sheet.open .sheet-title");
    return Math.round(t.getBoundingClientRect().height/parseFloat(getComputedStyle(t).lineHeight)||1); });
  for(const kind of ["settings","teams","undo","stats"]){
    await openSheet(p,kind);
    eq(await small(), [], `zu kleine Eingabefelder in „${kind}“`);
    expect(await titleLines()<=1, `Titel in „${kind}“ bricht um`);
    await p.goBack(); await p.waitForTimeout(SETTLE);
  }
  const tooSmall=await p.evaluate(()=>[...document.querySelectorAll(".bigbtn,.undo-btn,.iconbtn,.gh-share")]
    .filter(b=>{ const r=b.getBoundingClientRect(); return r.height<40 || r.width<40; }).map(b=>b.className));
  eq(tooSmall, [], "zu kleine Tippflächen");
});
test("E5","Mehrere Spiele: das zuletzt gespielte steht vorn, Namen sind nicht abgeschnitten", async p=>{
  await newGame(p,{name:"Alt", players:["Anna","Bert","Cora","Dirk"]}); await p.tap("[data-back]");
  await newGame(p,{name:"Neu"}); await p.tap("[data-back]");
  await p.tap('[data-sess] >> text=Alt'); await p.waitForTimeout(100); await hand(p,0); await p.tap("[data-back]");
  eq((await p.locator(".sc-name").allInnerTexts())[0], "Alt", "Reihenfolge");
  const clipped=await p.evaluate(()=>[...document.querySelectorAll(".sess-card .sc-team")]
    .filter(e=>e.textContent.startsWith("Anna")||e.textContent.startsWith("Cora")).filter(e=>e.scrollWidth>e.clientWidth).length);
  eq(clipped, 0, "abgeschnittene Teamnamen");
  const w=await p.evaluate(()=>[...document.querySelectorAll(".grid > *")].map(e=>Math.round(e.getBoundingClientRect().width)));
  expect(Math.max(...w)-Math.min(...w)<=1, "Karten ungleich breit: "+w);
});

test("E6","Sheet lässt sich am Kopf nach unten wegziehen (wie in iOS)", async p=>{
  await newGame(p); await openSheet(p,"stats");
  const drag=async(dist)=>{
    const box=await p.locator(".sheet.open .sheet-title").boundingBox();
    const x=box.x+box.width/2, y=box.y+box.height/2;
    const cdp=await p.context().newCDPSession(p);
    const pt=(yy)=>[{x, y:yy, id:1}];
    await cdp.send("Input.dispatchTouchEvent",{type:"touchStart",touchPoints:pt(y)});
    for(let d=20; d<=dist; d+=20) await cdp.send("Input.dispatchTouchEvent",{type:"touchMove",touchPoints:pt(y+d)});
    await cdp.send("Input.dispatchTouchEvent",{type:"touchEnd",touchPoints:[]});
    await p.waitForTimeout(SETTLE);
  };
  await drag(40);  eq(await p.locator(".sheet.open").count(), 1, "kurzes Ziehen schließt nicht");
  await drag(200); eq(await p.locator(".sheet.open").count(), 0, "weites Ziehen schließt");
  eq(await p.evaluate(()=>document.body.classList.contains("modal-open")), false, "Hintergrund wieder scrollbar");
});

// ════════════════════════════════════════════════════════════════
// F · Daten & Sicherheit
// ════════════════════════════════════════════════════════════════
test("F1","Backup exportieren und auf einem anderen Gerät zusammenführen", async (p,ctx)=>{
  await newGame(p,{name:"Export", quick:true}); await tap(p,'[data-win="0"]',8); await p.tap("[data-back]");
  await p.tap('[data-act="data"]'); await p.waitForTimeout(SETTLE);
  const [dl]=await Promise.all([p.waitForEvent("download"), p.tap("#d-export")]);
  const file=path.join(os.tmpdir(), `watten-test-${Date.now()}.json`); await dl.saveAs(file);
  const p2=await ctx.browser().newContext(ctx._opts).then(c=>c.newPage());
  await p2.goto(p.url());
  await p2.tap('[data-act="data"]'); await p2.waitForTimeout(SETTLE);
  await p2.setInputFiles("#d-file", file); await p2.waitForTimeout(400);
  const s=(await store(p2)).sessions;
  eq([s.length, s[0].name, s[0].matchdays[0].teamARoundsWon], [1,"Export",2], "importierter Stand");
  await p2.context().close(); fs.unlinkSync(file);
});
test("F2","Älteres Backup überschreibt keinen neueren Stand", async p=>{
  await newGame(p,{quick:true}); await tap(p,'[data-win="0"]'); await p.tap("[data-back]");
  const old=await session(p);
  await p.tap("[data-sess]"); await tap(p,'[data-win="0"]'); await p.tap("[data-back]");
  const file=path.join(os.tmpdir(), `watten-old-${Date.now()}.json`);
  fs.writeFileSync(file, JSON.stringify({app:"watten-tracker", store:{sessions:[old]}}));
  await p.tap('[data-act="data"]'); await p.waitForTimeout(SETTLE);
  await p.setInputFiles("#d-file", file); await p.waitForTimeout(400); fs.unlinkSync(file);
  eq(curRound(await session(p)).teamAPoints, 4, "neuerer Stand bleibt");
  expect((await toast(p)).includes("lokal neuer"), "Hinweis fehlt: "+await toast(p));
});
test("F3","Manipuliertes Backup führt keinen Code aus und lässt die App bedienbar", async (p,ctx,errors)=>{
  const X=`"><img src=x onerror="window.__xss=1"><script>window.__xss=1</script>`;
  const evil={sessions:[{ id:X, name:X, variant:"__proto__", targetPoints:"15<script>", createdAt:X, updatedAt:{},
    players:[{id:X,name:X},{id:"__proto__",name:{toString:1}},null,{name:X}],
    matchdays:[{ id:X, rotationIndex:X, date:X, teams:{teamA:[0,1],teamB:[2,3],nameA:X,nameB:X},
      rounds:[{id:X, teamAPoints:X, teamBPoints:"7", winnerTeam:0, startedAt:X, endedAt:X, hands:X},
              {id:X, teamAPoints:3, teamBPoints:1, winnerTeam:null}]}],
    currentMatchdayIndex:X, tricksA:X, currentBid:X, customTeamA:X,
    undoStack:[{action:"__proto__", timestamp:X, mds:{"__proto__":{}}, mdCount:X},{action:"constructor"}] },
    {bogus:true}, null, "text" ]};
  const file=path.join(os.tmpdir(), `watten-evil-${Date.now()}.json`);
  fs.writeFileSync(file, JSON.stringify({store:evil}));
  await p.tap('[data-act="data"]'); await p.waitForTimeout(SETTLE);
  await p.setInputFiles("#d-file", file); await p.waitForTimeout(400); fs.unlinkSync(file);
  eq((await store(p)).sessions.length, 1, "nur der eine verwertbare Eintrag wird übernommen");
  // gleicher Inhalt direkt im Speicher (z.B. durch eine andere Seite auf derselben Origin) + Neustart
  await p.evaluate(e=>localStorage.setItem("watten_store_v3", JSON.stringify(e)), evil);
  await p.reload(); await p.waitForTimeout(200);
  await p.tap("[data-sess]"); await p.waitForTimeout(200);
  for(const kind of ["stats","undo","teams","settings"]){
    await openSheet(p,kind);
    if(kind==="stats"){ await p.tap('[data-tab="1"]'); await p.tap('[data-tab="2"]'); }
    await p.goBack(); await p.waitForTimeout(SETTLE);
  }
  await hand(p,0); await tap(p,"[data-undo]",2);
  eq(await p.evaluate(()=>window.__xss), undefined, "eingeschleustes Skript wurde ausgeführt");
  eq(await p.evaluate(()=>({}).polluted), undefined, "Prototype Pollution");
  eq(await p.locator("#app img, #modal-root img, #app script").count(), 0, "eingeschleuste Elemente im DOM");
  eq(errors, [], "Laufzeitfehler");
});
test("F3b","Unlesbarer Speicher wird beiseitegelegt statt überschrieben", async p=>{
  await p.evaluate(()=>localStorage.setItem("watten_store_v3", '{"sessions":[{"id":"a","matchd'));
  await p.reload(); await p.waitForTimeout(200);
  expect(await p.locator(".empty").isVisible(), "App startet nicht");
  expect((await toast(p)).includes("unlesbar"), "Hinweis fehlt");
  await newGame(p);
  eq(await p.evaluate(()=>localStorage.getItem("watten_store_v3_defekt")), '{"sessions":[{"id":"a","matchd', "Rohdaten gesichert");
});
test("F4","CSV-Export entschärft Formeln (Excel-Injection)", async p=>{
  await newGame(p,{name:'=HYPERLINK("http://x")', players:["+Anna","-Bert","@Cora","Dirk"], quick:true});
  await tap(p,'[data-win="0"]',8); await p.tap("[data-back]");
  await p.tap('[data-act="data"]'); await p.waitForTimeout(SETTLE);
  const [dl]=await Promise.all([p.waitForEvent("download"), p.tap("#d-csv")]);
  const csv=fs.readFileSync(await dl.path(),"utf8");
  const cells=csv.split("\n")[1].split(";");
  expect(cells[0].startsWith(`"'=`) || cells[0].startsWith(`'=`), "Spielname nicht entschärft: "+cells[0]);
  expect(!csv.split("\n").slice(1).some(l=>l.split(";").some(c=>/^"?[=+\-@]/.test(c))), "Zelle beginnt mit Formelzeichen");
});
test("F5","Sync akzeptiert nur https-Adressen (Token nie im Klartext)", async p=>{
  await p.tap('[data-act="data"]'); await p.waitForTimeout(SETTLE);
  const cfg=()=>p.evaluate(()=>JSON.parse(localStorage.getItem("watten_sync_cfg")||"null"));
  await p.locator("#sy-url").scrollIntoViewIfNeeded();
  for(const bad of ["http://mein-server.example","javascript:alert(1)","https://user:pw@server.example","ftp://x"]){
    await p.fill("#sy-url",bad); await p.fill("#sy-token","geheim"); await p.tap("#sy-save");
    eq(await cfg(), null, `„${bad}“ wurde gespeichert`);
  }
  await p.fill("#sy-url","https://mein-server.example"); await p.tap("#sy-save");
  eq((await cfg()).url, "https://mein-server.example", "https-Adresse");
});
test("F6","Content-Security-Policy aktiv: Inline-Skripte werden blockiert, App läuft ohne Verstöße", async (p,ctx,errors,csp)=>{
  await newGame(p); await hand(p,0); await openSheet(p,"stats"); await p.tap('[data-tab="2"]');
  eq(csp, [], "CSP-Verstöße im Normalbetrieb");
  await p.evaluate(()=>{ const s=document.createElement("script"); s.textContent="window.__inline=1"; document.body.appendChild(s); });
  eq(await p.evaluate(()=>window.__inline), undefined, "Inline-Skript wurde ausgeführt");
});

// ════════════════════════════════════════════════════════════════
// G · Bestehende Daten
// ════════════════════════════════════════════════════════════════
// tests/fixtures/store-vorversion.json wurde mit der vorherigen App-Version erspielt
// (zwei Spieltage, Schneider, vorzeitig beendete und gelöschte Runde, eigene Teams, laufendes Spiel).
const facts = require("./facts.js");
const OLD = fs.readFileSync(path.join(__dirname, "fixtures", "store-vorversion.json"), "utf8");
async function loadOld(p){
  await p.evaluate(raw=>localStorage.setItem("watten_store_v3", raw), OLD);
  await p.reload(); await p.waitForTimeout(200);
}
test("G1","Spielstand der Vorversion wird beim Laden vollständig und unverändert übernommen", async p=>{
  await loadOld(p);
  await newGame(p,{name:"Danach"}); await p.tap("[data-back]");          // löst ein Speichern im neuen Format aus
  const now=(await store(p)).sessions.filter(s=>s.name!=="Danach");
  eq(facts({sessions:now}), facts(JSON.parse(OLD)), "Spiele, Spieltage, Runden, Punkte, Teams, laufendes Spiel");
  eq(await p.evaluate(()=>localStorage.getItem("watten_store_v3_defekt")), null, "nichts wurde als unlesbar beiseitegelegt");
});
test("G2","Die Vorversion-Daten sind normal weiter bespielbar, inkl. Rückgängig aus dem alten Verlauf", async p=>{
  await loadOld(p);
  await p.tap('[data-sess] >> text=Stammtisch'); await p.waitForTimeout(150);
  eq([await text(p,".score-col.a .pts"), await text(p,".score-col.b .pts"), await text(p,".score-col.a .tn")], ["6","2","Die Blauen"], "Anzeige");
  eq([await text(p,".trick-col.a .cnt"), await text(p,".trick-col.b .cnt"), (await text(p,".bid")).trim()], ["2/3","1/3","Gebot: 3"], "laufendes Spiel");
  await tap(p,"[data-undo]");                                              // letzter Schritt der Vorversion: Stich für B
  eq(await text(p,".trick-col.b .cnt"), "0/3", "Rückgängig mit altem Verlauf");
  await tap(p,'[data-trick="0"]');                                         // dritter Stich → Spiel mit Gebot 3 gewonnen
  eq([await text(p,".score-col.a .pts"), await text(p,".score-col.b .pts")], ["9","2"], "weiterzählen");
});

// ── Ausführung ──────────────────────────────────────────────────
(async()=>{
  const only=process.argv.slice(2);
  const server=await startServer();
  const url=`http://127.0.0.1:${server.address().port}/`;
  const browser=await chromium.launch();
  const opts={...devices["iPhone 13"], locale:"de-DE", acceptDownloads:true};
  let failed=0, ran=0, group="";
  const GROUPS={A:"Spiel anlegen",B:"Zählen mit Stichen",C:"Anforderungen aus der Notiz",D:"Runden, Spieltage, Teams",E:"Bedienung",F:"Daten & Sicherheit",G:"Bestehende Daten"};
  for(const t of tests){
    if(only.length && !only.some(o=>t.id.startsWith(o))) continue;
    if(t.id[0]!==group){ group=t.id[0]; console.log(`\n${group} · ${GROUPS[group]}`); }
    const ctx=await browser.newContext(opts); ctx._opts=opts;
    const page=await ctx.newPage();
    const errors=[], csp=[];
    page.on("pageerror",e=>errors.push(e.message));
    page.on("console",m=>{ if(m.type()==="error" && /Content Security Policy/i.test(m.text())) csp.push(m.text()); });
    // Wake-Lock-Attrappe zum Mitzählen (Headless-Browser haben keinen Bildschirm)
    await page.addInitScript(()=>{
      window.__wl={req:0,rel:0};
      Object.defineProperty(navigator,"wakeLock",{configurable:true,value:{request:async()=>{
        window.__wl.req++; return {release:async()=>{ window.__wl.rel++; }, addEventListener(){}};
      }}});
    });
    ran++;
    try{
      await page.goto(url); await page.waitForTimeout(100);
      await t.fn(page, ctx, errors, csp);
      if(errors.length && t.id!=="F3") throw new Error("Laufzeitfehler: "+errors.join(" | "));
      console.log(`  ✓ ${t.id}  ${t.title}`);
    }catch(e){
      failed++;
      console.log(`  ✗ ${t.id}  ${t.title}\n      → ${String(e.message).split("\n")[0]}`);
    }
    await ctx.close();
  }
  await browser.close(); server.close();
  console.log(`\n${ran-failed} von ${ran} Akzeptanzkriterien erfüllt${failed?` – ${failed} FEHLGESCHLAGEN`:""}`);
  process.exit(failed?1:0);
})().catch(e=>{ console.error(e); process.exit(1); });
