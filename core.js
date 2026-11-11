/* ------------------------------------------------------------------
 * Watten Tracker – Datenkern
 * Reine Logik ohne DOM: Datenmodell, Prüfung geladener/eingehender Daten,
 * Übernahme älterer Stände und das Zusammenführen bei gemeinsamer Nutzung.
 * Läuft im Browser (window.Core) und in Node (Tests).
 * ------------------------------------------------------------------ */
(function (root, factory) {
  const Core = factory();
  if (typeof module === "object" && module.exports) module.exports = Core;
  else root.Core = Core;
}(typeof self !== "undefined" ? self : this, () => {
  "use strict";

  const DOC_VERSION = 1;          // Format der gemeinsamen Liste

  // ─────────────────────────────────────────────────────────────
  // Spielvarianten & Konstanten
  // ─────────────────────────────────────────────────────────────
  const VARIANTS = {
    watten:    { key:"watten",    name:"Watten",             defaultTarget:15, desc:"Klassisches Watten · bis 15 Punkte" },
    ladinisch: { key:"ladinisch", name:"Watten – Ladinisch", defaultTarget:15, desc:"Ladinische Variante · bis 15 Punkte" },
    kritisch:  { key:"kritisch",  name:"Watten Kritisch",    defaultTarget:11, desc:"Kritisch · bis 11 Punkte" },
  };
  const VARIANT_ORDER = ["watten","ladinisch","kritisch"];
  const TRICKS_TO_WIN = 3;
  const UNDO_LABEL = {
    addTrick:"Stich hinzugefügt", increaseBid:"Gebot erhöht", nextRound:"Nächste Runde",
    nextMatchday:"Neuer Spieltag", teamChange:"Teams geändert", deleteRound:"Runde gelöscht",
    deleteMatchday:"Spieltag gelöscht", winHand:"Spiel gewonnen", fold:"Gegangen", other:"Aktion",
  };
  const UNDO_MAX = 30;
  const LIMITS = { sessions:500, matchdays:2000, rounds:500, hands:500 };

  const uuid = () => (globalThis.crypto && globalThis.crypto.randomUUID ? globalThis.crypto.randomUUID()
    : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g,c=>{const r=Math.random()*16|0;return (c==="x"?r:(r&0x3|0x8)).toString(16);}));
  const clone = (o) => (typeof structuredClone==="function" ? structuredClone(o) : JSON.parse(JSON.stringify(o)));
  const has = (o,k) => Object.prototype.hasOwnProperty.call(o,k);
  const isObj = (x) => !!x && typeof x==="object" && !Array.isArray(x);

  // ─────────────────────────────────────────────────────────────
  // Modell
  // ─────────────────────────────────────────────────────────────
  function newPlayer(name){ return {id:uuid(), name}; }
  function newRound(){
    return {id:uuid(), teamAPoints:0, teamBPoints:0, hands:[], winnerTeam:null,
            startedAt:Date.now(), endedAt:null, isDeleted:false, deletedAt:null};
  }
  function defaultTeams(rotationIndex){
    switch(((rotationIndex%3)+3)%3){
      case 0:  return {teamA:[0,1], teamB:[2,3]};
      case 1:  return {teamA:[0,2], teamB:[1,3]};
      default: return {teamA:[0,3], teamB:[1,2]};
    }
  }
  // Teamaufstellung eines Spieltags: {teamA:[i,i], teamB:[i,i], nameA, nameB}
  function makeTeams(teamA, teamB, nameA, nameB){
    return {teamA:teamA.slice(), teamB:teamB.slice(), nameA:nameA||null, nameB:nameB||null};
  }
  function newMatchday(rotationIndex, teams){
    const d=defaultTeams(rotationIndex);
    return {id:uuid(), rotationIndex, date:Date.now(), rounds:[newRound()],
            teamARoundsWon:0, teamBRoundsWon:0, isDeleted:false, deletedAt:null,
            teams: teams || makeTeams(d.teamA, d.teamB)};
  }
  function newSession(name, variantKey, quickMode, playerNames){
    const v = VARIANTS[variantKey] || VARIANTS.ladinisch;
    const pn = playerNames || [];
    return {
      id:uuid(), name, variant:v.key, targetPoints:v.defaultTarget, quickMode:!!quickMode,
      players:[1,2,3,4].map(i=>newPlayer(cleanStr(pn[i-1]||"",MAXLEN.player) || `Spieler ${i}`)),
      matchdays:[newMatchday(0)], currentMatchdayIndex:0,
      tricksA:0, tricksB:0, currentBid:2,
      customTeamA:null, customTeamB:null, customTeamNameA:null, customTeamNameB:null,
      undoStack:[], createdAt:Date.now(), updatedAt:Date.now(),
    };
  }

  // ─────────────────────────────────────────────────────────────
  // Prüfung
  // ─────────────────────────────────────────────────────────────
  // Daten kommen auch aus Sicherungsdateien und von anderen Geräten. Bevor sie
  // angezeigt oder verrechnet werden, wird jedes Feld auf Typ und Form geprüft.
  // Es werden nur bekannte Felder übernommen – alles andere fällt weg. Das
  // verhindert, dass präparierte Daten Code in die Seite schleusen oder die App
  // zerlegen. IDs landen in HTML-Attributen, Zeitstempel in Datumsformatierern.
  const MAXLEN = {session:40, player:20, team:30};
  const SAFE_ID = /^[A-Za-z0-9_-]{1,64}$/;
  const RESERVED = new Set(["__proto__","constructor","prototype"]);
  const okId     = (v)=> typeof v==="string" && SAFE_ID.test(v) && !RESERVED.has(v);
  const safeId   = (v)=> okId(v) ? v : uuid();
  const safeTs   = (v,fallback)=> (Number.isFinite(v) && v>0 && v<8.64e15) ? v : fallback;
  const safeInt  = (v,min,max,fallback)=> (Number.isFinite(v) && v>=min) ? Math.min(max,Math.floor(v)) : fallback;
  // nur echte Texte/Zahlen übernehmen – Objekte könnten beim Umwandeln eine Exception werfen
  const cleanStr = (v,max)=> (typeof v==="string" ? v : typeof v==="number" ? String(v) : "").replace(/[\u0000-\u001f\u007f]/g," ").trim().slice(0,max);
  const isTeamIdx = (t)=> Array.isArray(t) && t.length===2 && t[0]!==t[1] && t.every(i=>Number.isInteger(i) && i>=0 && i<4);
  const roundWorth = (r)=> r.schneider ? 2 : 1;
  // Fester Ersatz-Zeitstempel für eingehende Daten ohne gültiges Datum (statt "jetzt",
  // damit alle Geräte zum selben Ergebnis kommen)
  const EPOCH = Date.UTC(2020,0,1);

  // Liste prüfen: nur Objekte, IDs eindeutig, höchstens `max` Einträge.
  // strict (Daten von außen): ungültige IDs fallen weg. Sonst (eigener Speicher,
  // Sicherungsdatei): der Eintrag bekommt eine neue ID, damit nichts verloren geht.
  function cleanList(list, max, strict, fn){
    const seen=new Set(), out=[];
    for(const x of Array.isArray(list)?list:[]){
      if(out.length>=max) break;
      if(!isObj(x)) continue;
      let id=x.id;
      if(!okId(id) || seen.has(id)){ if(strict) continue; id=uuid(); }
      const item=fn(x,id);
      if(!item) continue;
      seen.add(id); out.push(item);
    }
    return out;
  }

  const restHandId = (roundId,team)=> `${roundId.slice(0,58)}_r${team===0?"A":"B"}`;
  const handSum = (r,team)=> r.hands.reduce((a,h)=>a+(h.winnerTeam===team?h.pointsAwarded:0),0);

  function normHands(list, strict){
    return cleanList(list, LIMITS.hands, strict, (h,id)=>{
      if(h.winnerTeam!==0 && h.winnerTeam!==1) return null;
      if(!Number.isInteger(h.pointsAwarded) || Math.abs(h.pointsAwarded)>9999) return null;
      const o={id, winnerTeam:h.winnerTeam, pointsAwarded:h.pointsAwarded, timestamp:safeTs(h.timestamp, EPOCH)};
      if(h.foldedBy===0 || h.foldedBy===1) o.foldedBy=h.foldedBy;
      if(h.rest) o.rest=true;
      return o;
    });
  }

  // Der Punktestand einer Runde ist die Summe ihrer gewonnenen Spiele ("hands").
  // Stimmt das bei älteren oder importierten Daten nicht, gleicht ein Ausgleichs-
  // Eintrag mit fester ID die Differenz aus – so bleibt der angezeigte Stand erhalten.
  function reconcileHands(r){
    for(const team of [0,1]){
      const rid=restHandId(r.id,team);
      const want= team===0 ? r.teamAPoints : r.teamBPoints;
      const others=r.hands.reduce((a,h)=>a+(h.winnerTeam===team && h.id!==rid ? h.pointsAwarded : 0),0);
      const diff=want-others;
      const i=r.hands.findIndex(h=>h.id===rid);
      if(diff===0){ if(i>=0) r.hands.splice(i,1); }
      else if(i>=0){ r.hands[i]={id:rid, winnerTeam:team, pointsAwarded:diff, timestamp:r.hands[i].timestamp, rest:true}; }
      else r.hands.unshift({id:rid, winnerTeam:team, pointsAwarded:diff, timestamp:r.startedAt, rest:true});
    }
  }

  function normRound(r, id, md, strict){
    const o={
      id,
      teamAPoints:safeInt(+r.teamAPoints, 0, 9999, 0), teamBPoints:safeInt(+r.teamBPoints, 0, 9999, 0),
      hands:normHands(r.hands, strict),
      winnerTeam:(r.winnerTeam===0 || r.winnerTeam===1) ? r.winnerTeam : null,
      startedAt:safeTs(r.startedAt, md.date), endedAt:safeTs(r.endedAt, null),
      isDeleted:!!r.isDeleted, deletedAt:safeTs(r.deletedAt, null),
    };
    if(r.schneider) o.schneider=true;
    if(r.closed) o.closed=true;
    if(isObj(r.teams) && isTeamIdx(r.teams.teamA) && isTeamIdx(r.teams.teamB)) o.teams={teamA:r.teams.teamA.slice(), teamB:r.teams.teamB.slice()};
    reconcileHands(o);
    return o;
  }

  function normMatchday(md, id, s, strict){
    const o={
      id,
      rotationIndex:safeInt(md.rotationIndex, 0, 1e6, 0),
      date:safeTs(md.date, s.createdAt),
      rounds:[], teamARoundsWon:0, teamBRoundsWon:0,
      isDeleted:!!md.isDeleted, deletedAt:safeTs(md.deletedAt, null),
    };
    o.rounds=cleanList(md.rounds, LIMITS.rounds, strict, (r,rid)=>normRound(r,rid,o,strict));
    // Ältere Versionen kannten keine Teams pro Spieltag → so einfrieren, wie sie bisher angezeigt wurden
    if(isObj(md.teams) && isTeamIdx(md.teams.teamA) && isTeamIdx(md.teams.teamB)){
      o.teams=makeTeams(md.teams.teamA, md.teams.teamB, cleanStr(md.teams.nameA,MAXLEN.team), cleanStr(md.teams.nameB,MAXLEN.team));
    }else{
      o.teams = (s.customTeamA && s.customTeamB)
        ? makeTeams(s.customTeamA, s.customTeamB, s.customTeamNameA, s.customTeamNameB)
        : (d=>makeTeams(d.teamA,d.teamB))(defaultTeams(o.rotationIndex));
    }
    return o;
  }

  const isOpen = (r)=> !r.isDeleted && r.winnerTeam===null && !r.closed;
  const byStart = (a,b)=> (a.startedAt-b.startedAt) || (a.id<b.id?-1:a.id>b.id?1:0);

  // Wer hat das Ziel zuerst erreicht? (Spiele in zeitlicher Reihenfolge nachspielen)
  function decideWinner(r, target){
    let a=0, b=0;
    for(const h of r.hands.slice().sort((x,y)=>(x.timestamp-y.timestamp) || (x.id<y.id?-1:1))){
      if(h.winnerTeam===0) a+=h.pointsAwarded; else b+=h.pointsAwarded;
      if(a>=target) return {winner:0, at:h.timestamp};
      if(b>=target) return {winner:1, at:h.timestamp};
    }
    const at=r.hands.reduce((m,h)=>Math.max(m,h.timestamp), r.startedAt);
    return {winner:r.teamAPoints>=r.teamBPoints?0:1, at};
  }

  // Bringt ein Spiel in einen spielbaren, eindeutigen Zustand. Nötig nach dem Laden
  // alter Stände und nach dem Zusammenführen, wenn z.B. beide Geräte dieselbe Runde
  // beendet oder weitergespielt haben. Alles hier ist aus den Daten ableitbar, damit
  // jedes Gerät zum selben Ergebnis kommt.
  function settle(s){
    for(const md of s.matchdays){
      for(const r of md.rounds){
        // Ziel durch zusammengezählte Punkte erreicht → Runde ist gewonnen
        if(isOpen(r) && (r.teamAPoints>=s.targetPoints || r.teamBPoints>=s.targetPoints)){
          const d=decideWinner(r, s.targetPoints);
          r.winnerTeam=d.winner; r.endedAt=d.at;
          if((d.winner===0 ? r.teamBPoints : r.teamAPoints)===0) r.schneider=true;
          r.teams={teamA:md.teams.teamA.slice(), teamB:md.teams.teamB.slice()};
        }
        // Schneider gilt nur, solange der Gegner wirklich keinen Punkt hat
        if(r.schneider && r.winnerTeam!==null && (r.winnerTeam===0 ? r.teamBPoints : r.teamAPoints)>0) delete r.schneider;
      }
    }
    // Gespielt wird immer im letzten Spieltag; ist der gelöscht, beginnt ein neuer
    let cur=s.matchdays[s.matchdays.length-1];
    if(cur.isDeleted){
      cur=newMatchday(cur.rotationIndex, makeTeams(cur.teams.teamA,cur.teams.teamB,cur.teams.nameA,cur.teams.nameB));
      s.matchdays.push(cur);
    }
    s.currentMatchdayIndex=s.matchdays.length-1;
    // Im laufenden Spieltag gibt es genau eine offene Runde, und sie steht am Ende.
    const open=cur.rounds.filter(isOpen);
    const played=open.filter(r=>r.hands.length>0);
    let current = played.length ? played[played.length-1] : (open.length ? open.slice().sort(byStart)[0] : null);
    if(open.length>1){
      // Mehrere offene Runden entstehen nur, wenn zwei Geräte gleichzeitig weitergemacht
      // haben: leere fallen weg, angefangene werden ohne Sieger abgeschlossen.
      cur.rounds=cur.rounds.filter(r=>!isOpen(r) || r===current || r.hands.length>0);
      for(const r of cur.rounds) if(isOpen(r) && r!==current) r.closed=true;
    }
    if(!current){ current=newRound(); s.tricksA=0; s.tricksB=0; s.currentBid=2; }
    cur.rounds=cur.rounds.filter(r=>r!==current); cur.rounds.push(current);
    // Rundenzähler immer aus den Runden ableiten
    for(const md of s.matchdays){
      md.teamARoundsWon=0; md.teamBRoundsWon=0;
      for(const r of md.rounds){
        if(r.isDeleted || r.winnerTeam===null) continue;
        if(r.winnerTeam===0) md.teamARoundsWon+=roundWorth(r); else md.teamBRoundsWon+=roundWorth(r);
      }
    }
  }

  // Liefert eine geprüfte Kopie auf dem aktuellen Stand oder null, wenn unbrauchbar.
  // Repariert Inkonsistenzen aus älteren Versionen. `strict` gilt für Daten von
  // anderen Geräten: dort wird nichts "repariert", was auf jedem Gerät anders ausfiele.
  function normalizeSession(s, opts){
    const strict=!!(opts && opts.strict);
    if(!isObj(s) || !s.id || !Array.isArray(s.matchdays)) return null;
    if(strict && !okId(s.id)) return null;
    const o={ id:safeId(s.id), name:cleanStr(s.name, MAXLEN.session) || "Spiel" };
    o.variant = (typeof s.variant==="string" && has(VARIANTS, s.variant)) ? s.variant : "ladinisch";
    o.targetPoints=safeInt(s.targetPoints, 1, 99, VARIANTS[o.variant].defaultTarget);
    o.quickMode=!!s.quickMode;
    o.createdAt=safeTs(s.createdAt, strict ? EPOCH : Date.now());
    // Änderungszeitpunkt festhalten, bevor unten repariert wird (sonst wirken alte Backups "neu")
    o.updatedAt=safeTs(s.updatedAt, null) || safeTs(sessionUpdatedAt(s), o.createdAt);
    const ps=(Array.isArray(s.players)?s.players:[]).filter(isObj);
    const seen=new Set();
    o.players=[0,1,2,3].map(i=>{
      const p=ps[i]||{};
      const id=(okId(p.id) && !seen.has(p.id)) ? p.id : (strict ? `spieler${i+1}` : uuid());
      seen.add(id);
      return {id, name:cleanStr(p.name, MAXLEN.player) || `Spieler ${i+1}`};
    });
    o.tricksA=safeInt(s.tricksA, 0, TRICKS_TO_WIN-1, 0);
    o.tricksB=safeInt(s.tricksB, 0, TRICKS_TO_WIN-1, 0);
    o.currentBid=safeInt(s.currentBid, 2, 99, 2);
    const custom=isTeamIdx(s.customTeamA) && isTeamIdx(s.customTeamB);
    o.customTeamA=custom ? s.customTeamA.slice() : null;
    o.customTeamB=custom ? s.customTeamB.slice() : null;
    o.customTeamNameA=cleanStr(s.customTeamNameA, MAXLEN.team)||null;
    o.customTeamNameB=cleanStr(s.customTeamNameB, MAXLEN.team)||null;
    // Undo-Einträge bleiben auf dem Gerät: nur bekannte Aktionen und gültige Zeitstempel
    // (der Inhalt wird beim Zurückspielen erneut geprüft)
    o.undoStack = strict ? [] : (Array.isArray(s.undoStack)?s.undoStack:[]).filter(isObj).slice(-UNDO_MAX);
    o.undoStack.forEach(u=>{
      if(typeof u.action!=="string" || !has(UNDO_LABEL, u.action)) u.action="other";
      u.timestamp=safeTs(u.timestamp, o.updatedAt);
    });
    o.matchdays=cleanList(s.matchdays, LIMITS.matchdays, strict, (md,id)=>normMatchday(md,id,o,strict));
    if(!o.matchdays.length){
      const md=newMatchday(0);
      if(strict){ md.id=`${o.id.slice(0,58)}_md1`; md.date=o.createdAt; md.rounds=[]; }
      o.matchdays.push(md);
    }
    settle(o);
    return o;
  }

  // Wie normalizeSession, aber ein einzelner kaputter Eintrag reißt nie alle anderen mit
  function safeNormalize(s, opts){
    try{ return normalizeSession(s, opts); }catch(e){ return null; }
  }

  // Zeitpunkt der letzten Änderung – für das Zusammenführen von Backups
  function sessionUpdatedAt(s){
    if(Number.isFinite(s.updatedAt)) return s.updatedAt;
    const num=(x)=> Number.isFinite(x) ? x : 0;
    let t=num(s.createdAt);
    for(const md of Array.isArray(s.matchdays)?s.matchdays:[]){
      if(!isObj(md)) continue;
      t=Math.max(t, num(md.date), num(md.deletedAt));
      for(const r of Array.isArray(md.rounds)?md.rounds:[]){
        if(!isObj(r)) continue;
        t=Math.max(t, num(r.startedAt), num(r.endedAt), num(r.deletedAt));
        for(const h of Array.isArray(r.hands)?r.hands:[]) if(isObj(h)) t=Math.max(t, num(h.timestamp));
      }
    }
    for(const u of Array.isArray(s.undoStack)?s.undoStack:[]) if(isObj(u)) t=Math.max(t, num(u.timestamp));
    return t;
  }

  // Sicherungsdatei einspielen: Spiele zusammenführen; bei gleicher ID gewinnt der neuere Stand
  function mergeSessions(local, incoming){
    const byId=new Map(local.map(s=>[s.id,s]));
    const res={added:0, updated:0, kept:0};
    for(const s of incoming){
      const ex=byId.get(s.id);
      if(!ex){ byId.set(s.id,s); res.added++; }
      else if(sessionUpdatedAt(s) > sessionUpdatedAt(ex)){ byId.set(s.id,s); res.updated++; }
      else res.kept++;
    }
    return {sessions:[...byId.values()], ...res};
  }

  // ─────────────────────────────────────────────────────────────
  // Gemeinsame Liste: Format
  // ─────────────────────────────────────────────────────────────
  // Geteilt wird die Liste der Spiele. Der Rückgängig-Verlauf bleibt auf dem Gerät.

  /** Geprüfte, geräteunabhängige Fassung eines Spiels (ohne Rückgängig-Verlauf). */
  function sharedOf(session){
    const s=safeNormalize(session, {strict:true});   // baut eine neue, geprüfte Kopie
    if(s) delete s.undoStack;
    return s;
  }
  /** Gemeinsame Liste aus den Spielen dieses Geräts. */
  function docOf(sessions){
    return {v:DOC_VERSION, sessions:sessions.map(sharedOf).filter(Boolean)};
  }
  /** Prüft eine eingehende gemeinsame Liste. Wirft, wenn sie gar nicht lesbar ist. */
  function sanitizeDoc(doc){
    if(!isObj(doc) || !Array.isArray(doc.sessions)) throw new Error("Die gemeinsame Liste hat ein unbekanntes Format.");
    if(Number.isFinite(doc.v) && doc.v>DOC_VERSION) throw new Error("Die gemeinsame Liste stammt von einer neueren App-Version. Bitte die App aktualisieren.");
    const seen=new Set(), sessions=[];
    for(const raw of doc.sessions){
      if(sessions.length>=LIMITS.sessions) break;
      const s=isObj(raw) ? sharedOf(raw) : null;
      if(!s || seen.has(s.id)) continue;
      seen.add(s.id); sessions.push(s);
    }
    return {v:DOC_VERSION, sessions};
  }

  // ─────────────────────────────────────────────────────────────
  // Zusammenführen (Sync)
  // ─────────────────────────────────────────────────────────────
  function stable(v){
    if(Array.isArray(v)) return `[${v.map(stable).join(",")}]`;
    if(v && typeof v==="object") return `{${Object.keys(v).sort().filter(k=>v[k]!==undefined).map(k=>`${JSON.stringify(k)}:${stable(v[k])}`).join(",")}}`;
    return JSON.stringify(v);
  }
  const same = (a,b)=> stable(a)===stable(b);

  // Einzelwert: hat nur eine Seite geändert, gilt deren Wert. Haben beide
  // unterschiedlich geändert, gewinnt dieses Gerät (bzw. beim Beitritt die Liste).
  function mergeValue(b,l,r,prefer){
    if(same(l,r)) return l;
    if(same(l,b)) return r;
    if(same(r,b)) return l;
    return prefer==="remote" ? r : l;
  }
  function mergeFields(out,b,l,r,keys,prefer){
    for(const k of keys){
      const v=mergeValue(b?b[k]:undefined, l[k], r[k], prefer);
      if(v!==undefined) out[k]=v;
    }
  }

  // Listen nach ID vereinigen. Was eine Seite neu hat, bleibt. Was eine Seite
  // gelöscht hat, bleibt gelöscht – außer die andere Seite hat den Eintrag
  // inzwischen geändert (keepChanged): dann geht die Änderung vor.
  function mergeList(b,l,r,mergeItem,keepChanged){
    const B=new Map((b||[]).map(x=>[x.id,x])), L=new Map(l.map(x=>[x.id,x])), R=new Map(r.map(x=>[x.id,x]));
    const out=[];
    for(const id of new Set([...r,...l].map(x=>x.id))){
      const inB=B.has(id), inL=L.has(id), inR=R.has(id);
      if(inL && inR) out.push(mergeItem(B.get(id), L.get(id), R.get(id)));
      else if(inL && !inB) out.push(L.get(id));                                        // hier neu
      else if(inR && !inB) out.push(R.get(id));                                        // dort neu
      else if(keepChanged && inL && !same(L.get(id), B.get(id))) out.push(L.get(id));  // dort gelöscht, hier geändert
      else if(keepChanged && inR && !same(R.get(id), B.get(id))) out.push(R.get(id));  // hier gelöscht, dort geändert
    }
    return out;
  }

  function mergeRound(b,l,r,prefer){
    const o={id:l.id};
    mergeFields(o,b,l,r,["winnerTeam","startedAt","endedAt","isDeleted","deletedAt","schneider","closed","teams"],prefer);
    // Gewonnene Spiele beider Geräte bleiben erhalten – der Punktestand ist ihre Summe.
    o.hands=mergeList(b?b.hands:[], l.hands, r.hands, (hb,hl,hr)=>mergeValue(hb,hl,hr,prefer), false);
    o.teamAPoints=Math.min(9999, Math.max(0, handSum(o,0)));
    o.teamBPoints=Math.min(9999, Math.max(0, handSum(o,1)));
    return o;
  }
  function mergeMatchday(b,l,r,prefer){
    const o={id:l.id};
    mergeFields(o,b,l,r,["rotationIndex","date","isDeleted","deletedAt","teams"],prefer);
    o.rounds=mergeList(b?b.rounds:[], l.rounds, r.rounds, (rb,rl,rr)=>mergeRound(rb,rl,rr,prefer), true);
    return o;
  }

  // Die Stiche und das Gebot gehören zu genau einem laufenden Spiel. Woran man es erkennt:
  const handKey = (s)=>{
    const md=s.matchdays[s.matchdays.length-1], r=md.rounds[md.rounds.length-1];
    return `${md.id}|${r.id}|${r.hands.map(h=>h.id).sort().join(",")}`;
  };

  function mergeSession(b,l,r,prefer){
    const o={id:l.id};
    mergeFields(o,b,l,r,["name","variant","targetPoints","quickMode","createdAt",
      "customTeamA","customTeamB","customTeamNameA","customTeamNameB"],prefer);
    o.players=[0,1,2,3].map(i=>({
      id:mergeValue(b?b.players[i].id:undefined, l.players[i].id, r.players[i].id, prefer),
      name:mergeValue(b?b.players[i].name:undefined, l.players[i].name, r.players[i].name, prefer),
    }));
    o.updatedAt=Math.max(l.updatedAt, r.updatedAt);
    o.matchdays=mergeList(b?b.matchdays:[], l.matchdays, r.matchdays, (mb,ml,mr)=>mergeMatchday(mb,ml,mr,prefer), true);
    const m=sharedOf(o);
    if(!m) return l;
    // Stiche/Gebot: nur zusammenzählen, wenn beide Geräte am selben Spiel waren.
    const km=handKey(m), kl=handKey(l), kr=handKey(r);
    let live={tricksA:0, tricksB:0, currentBid:2};
    if(kl===km && kr===km){
      for(const k of ["tricksA","tricksB","currentBid"]){
        if(b && handKey(b)===km) live[k]=b[k]+(l[k]-b[k])+(r[k]-b[k]);
        else live[k]=mergeValue(undefined, l[k], r[k], prefer);
      }
    }
    else if(kl===km) live=l;
    else if(kr===km) live=r;
    // Mehr als zwei Stiche hieße: Spiel gewonnen. Das entscheidet kein Abgleich, sondern ein Tipp.
    m.tricksA=m.quickMode ? 0 : Math.min(TRICKS_TO_WIN-1, Math.max(0, live.tricksA));
    m.tricksB=m.quickMode ? 0 : Math.min(TRICKS_TO_WIN-1, Math.max(0, live.tricksB));
    m.currentBid=Math.min(99, Math.max(2, live.currentBid));
    return m;
  }

  /**
   * Dreiwege-Zusammenführung der gemeinsamen Liste: `base` ist der zuletzt
   * gemeinsame Stand, `local` dieses Gerät, `remote` der Stand in der Cloud.
   * Spiele, Spieltage, Runden und gewonnene Spiele werden nach ID vereinigt,
   * Punkte dadurch addiert. Ohne `base` (erster Abgleich, Beitritt) wird
   * vereinigt; bei Widersprüchen gewinnt `opts.prefer` ("local" | "remote").
   */
  function mergeDoc(base, local, remote, opts){
    const prefer=(opts && opts.prefer) || "local";
    const b=base ? sanitizeDoc(base) : null;
    const l=sanitizeDoc(local), r=sanitizeDoc(remote);
    return {v:DOC_VERSION, sessions:mergeList(b?b.sessions:[], l.sessions, r.sessions, (sb,sl,sr)=>mergeSession(sb,sl,sr,prefer), true)};
  }

  return {
    DOC_VERSION, VARIANTS, VARIANT_ORDER, TRICKS_TO_WIN, UNDO_LABEL, UNDO_MAX, MAXLEN, LIMITS,
    uuid, clone, newPlayer, newRound, defaultTeams, makeTeams, newMatchday, newSession,
    okId, safeId, safeTs, safeInt, cleanStr, isTeamIdx, roundWorth,
    normalizeSession, safeNormalize, sessionUpdatedAt, mergeSessions,
    sharedOf, docOf, sanitizeDoc, stable, same, mergeDoc,
  };
}));
