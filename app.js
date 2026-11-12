/* Watten Tracker – PWA Port von WattenTracker.swift
 * Vanilla JS, keine Abhängigkeiten. Persistenz via localStorage.
 * Dates werden als Millisekunden (Number) gespeichert (JSON-safe).
 */
"use strict";

// ─────────────────────────────────────────────────────────────
// Design-Tokens (nur für JS-Zugriff; Farben leben im CSS)
// ─────────────────────────────────────────────────────────────
const COL = {
  teamA:"var(--teamA)", teamB:"var(--teamB)", gold:"var(--gold)", border:"var(--border)",
  danger:"var(--danger)", muted:"var(--muted)", chart4:"var(--chart4)", neutral:"var(--btn-neutral)",
};

// ─────────────────────────────────────────────────────────────
// Icons (inline SVG statt SF Symbols)
// ─────────────────────────────────────────────────────────────
const IC = {
  plus:'<svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor"><path d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z"/></svg>',
  plusCircle:'<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/></svg>',
  club:'<svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor"><path d="M12 2a3.2 3.2 0 0 0-2.7 4.9A3.2 3.2 0 1 0 10.6 13c-.3 1.6-1 2.9-2.1 3.8V18h7v-1.2c-1.1-.9-1.8-2.2-2.1-3.8a3.2 3.2 0 1 0 1.3-6.1A3.2 3.2 0 0 0 12 2z"/><path d="M10.5 17h3l.6 4h-4.2z"/></svg>',
  hand:'<svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor"><path d="M12 2a1.5 1.5 0 0 1 1.5 1.5V11h1V5a1.5 1.5 0 0 1 3 0v6.2l.9.2c1.4.4 2.1 1 2.1 2.6 0 3.9-2.4 8-6.5 8H11c-2.2 0-3.4-1-4.7-3.2l-2-3.4a1.5 1.5 0 0 1 2.5-1.6l1.2 1.7V6a1.5 1.5 0 0 1 3 0v5h.5V3.5A1.5 1.5 0 0 1 12 2z"/></svg>',
  arrowUp:'<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 16V8m0 0l-3 3m3-3l3 3"/></svg>',
  arrowRight:'<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M8 12h8m0 0l-3-3m3 3l-3 3"/></svg>',
  undo:'<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14L4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/></svg>',
  flag:'<svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor"><path d="M5 3v18h2v-7h4v2h8V5h-6V3H5zm2 2h4v2H7V5zm6 0h4v4h-4V5zM7 9h4v3H7V9zm6 0h4v3h-4V9z"/></svg>',
  gear:'<svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor"><path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm0 2a2 2 0 1 1 0 4 2 2 0 0 1 0-4z"/><path d="M19.4 13a7.5 7.5 0 0 0 0-2l2-1.6-2-3.4-2.4 1a7.6 7.6 0 0 0-1.7-1L14.9 2h-4l-.4 2.5a7.6 7.6 0 0 0-1.7 1l-2.4-1-2 3.4L4.6 11a7.5 7.5 0 0 0 0 2l-2 1.6 2 3.4 2.4-1c.5.4 1.1.7 1.7 1l.4 2.5h4l.4-2.5c.6-.3 1.2-.6 1.7-1l2.4 1 2-3.4-2-1.6z" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>',
  chart:'<svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor"><rect x="3" y="12" width="4" height="8" rx="1"/><rect x="10" y="7" width="4" height="13" rx="1"/><rect x="17" y="4" width="4" height="16" rx="1"/></svg>',
  shuffle:'<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 3h5v5"/><path d="M4 20L21 3"/><path d="M21 16v5h-5"/><path d="M15 15l6 6"/><path d="M4 4l5 5"/></svg>',
  history:'<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v5h5"/><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"/><path d="M12 7v5l3 2"/></svg>',
  share:'<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15V4m0 0L8 8m4-4l4 4"/><path d="M5 12v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/></svg>',
  trophy:'<svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor"><path d="M7 4h10v3a5 5 0 0 1-10 0V4zM5 5H2v2a4 4 0 0 0 4 4V9a2 2 0 0 1-2-2V5h1zm14 0h1v2a2 2 0 0 1-2 2v2a4 4 0 0 0 4-4V5h-3zM10 13h4v3h2v2H8v-2h2v-3z"/></svg>',
  crown:'<svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor"><path d="M3 7l4 4 5-6 5 6 4-4v11H3V7z"/></svg>',
  flame:'<svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor"><path d="M12 2s5 4 5 9a5 5 0 0 1-10 0c0-1.5.5-2.5 1-3 0 1 .5 2 1.5 2 .8 0 1-.7 1-1.5C10.5 8 12 5 12 2z"/></svg>',
  trash:'<svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor"><path d="M9 3h6l1 2h4v2H4V5h4l1-2zM6 8h12l-1 13H7L6 8z"/></svg>',
  dice:'<svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="3"/><circle cx="9" cy="9" r="1.4" fill="var(--gold)"/><circle cx="15" cy="15" r="1.4" fill="var(--gold)"/><circle cx="15" cy="9" r="1.4" fill="var(--gold)"/><circle cx="9" cy="15" r="1.4" fill="var(--gold)"/></svg>',
  person:'<svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-6 8-6s8 2 8 6v1H4z"/></svg>',
  swap:'<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 4l4 4-4 4"/><path d="M21 8H3"/><path d="M7 20l-4-4 4-4"/><path d="M3 16h18"/></svg>',
  info:'<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 11v5" stroke-linecap="round"/><circle cx="12" cy="8" r="1" fill="currentColor" stroke="none"/></svg>',
  check:'<svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm-1.2 14.4l-4-4 1.4-1.4 2.6 2.6 5.6-5.6L17.8 8l-7 8.4z"/></svg>',
  clock:'<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2" stroke-linecap="round"/></svg>',
  trendline:'<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17l5-5 4 4 8-9"/><path d="M15 7h6v6"/></svg>',
  equal:'<svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor"><rect x="5" y="9" width="14" height="2.2" rx="1"/><rect x="5" y="13" width="14" height="2.2" rx="1"/></svg>',
  pencil:'<svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor"><path d="M3 17.2V21h3.8L18 9.8 14.2 6 3 17.2zM20.7 6.6a1 1 0 0 0 0-1.4l-1.9-1.9a1 1 0 0 0-1.4 0L15.6 5l3.8 3.8 1.3-1.2z"/></svg>',
  archive:'<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="4" rx="1"/><path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8"/><path d="M10 12h4"/></svg>',
  download:'<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12m0 0l-4-4m4 4l4-4"/><path d="M5 21h14"/></svg>',
  upload:'<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15V3m0 0L8 7m4-4l4 4"/><path d="M5 21h14"/></svg>',
  table:'<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M9 4v16"/></svg>',
  shield:'<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z"/></svg>',
  chevron:'<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>',
  palette:'<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a9 9 0 0 0 0 18c1.1 0 1.8-.8 1.8-1.8 0-.5-.2-.9-.5-1.2-.3-.3-.5-.7-.5-1.2 0-1 .8-1.8 1.8-1.8H17a4 4 0 0 0 4-4C21 6.6 17 3 12 3z"/><circle cx="7.5" cy="11.5" r="1.2" fill="currentColor" stroke="none"/><circle cx="10.5" cy="7.5" r="1.2" fill="currentColor" stroke="none"/><circle cx="15" cy="7.5" r="1.2" fill="currentColor" stroke="none"/></svg>',
  cloud:'<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 18a4 4 0 0 1-1-7.9A5 5 0 0 1 15.9 8 4.5 4.5 0 0 1 17 18H7z"/></svg>',
};

// ─────────────────────────────────────────────────────────────
// Datenkern (core.js): Modell, Prüfung, Zusammenführen
// ─────────────────────────────────────────────────────────────
const { VARIANTS, VARIANT_ORDER, TRICKS_TO_WIN, UNDO_LABEL, UNDO_MAX, MAXLEN,
        uuid, clone, newRound, defaultTeams, makeTeams, newMatchday, newSession,
        safeTs, cleanStr, roundWorth, normalizeSession, safeNormalize,
        sessionUpdatedAt, mergeSessions } = Core;
// Ab so vielen fehlenden Punkten ist ein Team "gestrichen" (kann das Spiel mit dem Grundwert beenden)
const GESTRICHEN_DIFF = 2;

// ─────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────
const $ = (sel,root=document) => root.querySelector(sel);

const fmt = {
  dateMedium:(ms)=>new Intl.DateTimeFormat('de',{day:'numeric',month:'long',year:'numeric'}).format(new Date(ms)),
  dateShort: (ms)=>new Intl.DateTimeFormat('de',{day:'2-digit',month:'2-digit',year:'2-digit'}).format(new Date(ms)),
  timeShort: (ms)=>new Intl.DateTimeFormat('de',{hour:'2-digit',minute:'2-digit'}).format(new Date(ms)),
  timeMedium:(ms)=>new Intl.DateTimeFormat('de',{hour:'2-digit',minute:'2-digit',second:'2-digit'}).format(new Date(ms)),
};
const roundWord = (n) => n===1 ? "Runde" : "Runden";
const roundLabel = (n) => n===1 ? "1 Runde" : `${n} Runden`;
const esc = (s) => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// Haptics (best effort – nur auf Geräten mit Vibration-API)
const Haptics = {
  light:  ()=>navigator.vibrate&&navigator.vibrate(10),
  medium: ()=>navigator.vibrate&&navigator.vibrate(20),
  heavy:  ()=>navigator.vibrate&&navigator.vibrate(35),
  success:()=>navigator.vibrate&&navigator.vibrate([12,30,12]),
  warning:()=>navigator.vibrate&&navigator.vibrate([25,40,25]),
};

// Inhalt eines Objekts ersetzen, ohne seine Identität zu ändern – offene Sheets
// und Dialoge halten Verweise auf das Spiel, die gültig bleiben müssen.
function replaceInPlace(target, src){
  if(target===src) return target;
  for(const k of Object.keys(target)) delete target[k];
  return Object.assign(target, src);
}

// ─────────────────────────────────────────────────────────────
// Persistence
// ─────────────────────────────────────────────────────────────
const STORE_KEY = "watten_store_v3";
let loadWarning=null;
function loadStore(){
  let raw=null;
  try{
    raw = localStorage.getItem(STORE_KEY);
    if(!raw) return {sessions:[]};
    const s = JSON.parse(raw);
    if(!s || !Array.isArray(s.sessions)) throw new Error("unerwartetes Format");
    return {sessions: s.sessions.map(x=>safeNormalize(x)).filter(Boolean)};
  }catch(e){
    // Unlesbarer Speicher: Rohdaten beiseitelegen, statt sie beim nächsten Speichern
    // kommentarlos mit einem leeren Stand zu überschreiben.
    if(raw){
      try{ localStorage.setItem(STORE_KEY+"_defekt", raw); }catch(_){}
      loadWarning="Gespeicherte Daten waren unlesbar und wurden beiseitegelegt.";
    }
    return {sessions:[]};
  }
}
function saveStore(){
  try{ localStorage.setItem(STORE_KEY, JSON.stringify(store)); return true; }
  catch(e){
    // Speicher voll → Undo-Verläufe kürzen (die sind verzichtbar) und nochmal versuchen
    store.sessions.forEach(s=>{ if(s.undoStack.length>5) s.undoStack.splice(0, s.undoStack.length-5); });
    try{ localStorage.setItem(STORE_KEY, JSON.stringify(store)); return true; }
    catch(e2){
      console.warn("Speichern fehlgeschlagen", e2);
      toast("⚠ Speichern fehlgeschlagen – bitte Backup exportieren!");
      return false;
    }
  }
}

// ─────────────────────────────────────────────────────────────
// Game logic – arbeitet direkt auf einer Session
// ─────────────────────────────────────────────────────────────
const Game = {
  lastRoundEvent: null,
  currentMatchday: (s)=> s.matchdays[s.currentMatchdayIndex],
  currentRound:    (s)=> { const md=Game.currentMatchday(s); return md.rounds[md.rounds.length-1]; },
  isRoundOver:     (s)=> Game.currentRound(s).winnerTeam !== null,
  roundNumber:     (s)=> Game.currentMatchday(s).rounds.filter(r=>!r.isDeleted).length,
  canUndo:         (s)=> s.undoStack.length>0,
  lastUndoAction:  (s)=> s.undoStack.length ? s.undoStack[s.undoStack.length-1].action : null,
  undoHistory:     (s)=> s.undoStack.slice().reverse(),
  matchdayNumber:  (s)=> s.currentMatchdayIndex+1,

  teams:(s)=> Game.currentMatchday(s).teams,
  // Name eines Teams (0 = A, 1 = B) an einem bestimmten Spieltag
  teamNameOf:(s,md,side)=>{
    const t=md.teams; const custom = side===0 ? t.nameA : t.nameB;
    if(custom) return custom;
    return (side===0?t.teamA:t.teamB).map(i=>s.players[i].name).join(" & ");
  },
  teamAName:(s)=> Game.teamNameOf(s,Game.currentMatchday(s),0),
  teamBName:(s)=> Game.teamNameOf(s,Game.currentMatchday(s),1),
  matchdayDate:(s)=> fmt.dateMedium(Game.currentMatchday(s).date),

  totalRoundsA:(s)=> s.matchdays.filter(m=>!m.isDeleted).reduce((a,m)=>a+m.teamARoundsWon,0),
  totalRoundsB:(s)=> s.matchdays.filter(m=>!m.isDeleted).reduce((a,m)=>a+m.teamBRoundsWon,0),

  // Pro Runde mit der Aufstellung, die beim Rundenende galt
  playerStats:(s)=>{
    const wins = {}; s.players.forEach(p=>wins[p.id]=0);
    for(const md of s.matchdays){
      if(md.isDeleted) continue;
      for(const r of md.rounds){
        if(r.isDeleted || r.winnerTeam===null) continue;
        const comp = r.teams || md.teams;
        (r.winnerTeam===0?comp.teamA:comp.teamB).forEach(i=>wins[s.players[i].id]+=roundWorth(r));
      }
    }
    return s.players.map(p=>({player:p, roundsWon:wins[p.id]||0}));
  },

  currentStreak:(s)=>{
    const finished = s.matchdays.filter(m=>!m.isDeleted)
      .flatMap(m=>m.rounds).filter(r=>!r.isDeleted && r.winnerTeam!==null);
    if(!finished.length) return null;
    const last = finished[finished.length-1].winnerTeam;
    let streak=0;
    for(let i=finished.length-1;i>=0;i--){
      if(finished[i].winnerTeam===last) streak++; else break;
    }
    return streak>=2 ? {team:last, length:streak} : null;
  },
  averageRoundDuration:(s)=>{
    const durs = s.matchdays.filter(m=>!m.isDeleted).flatMap(m=>m.rounds)
      .filter(r=>!r.isDeleted && r.endedAt!=null).map(r=>r.endedAt-r.startedAt);
    if(!durs.length) return null;
    return durs.reduce((a,b)=>a+b,0)/durs.length;
  },
  averagePointsPerMatchday:(s)=>{
    const active = s.matchdays.filter(m=>!m.isDeleted);
    if(!active.length) return {a:0,b:0};
    const sumA=active.reduce((a,m)=>a+m.rounds.filter(r=>!r.isDeleted).reduce((x,r)=>x+r.teamAPoints,0),0);
    const sumB=active.reduce((a,m)=>a+m.rounds.filter(r=>!r.isDeleted).reduce((x,r)=>x+r.teamBPoints,0),0);
    return {a:sumA/active.length, b:sumB/active.length};
  },
  roundWorth,
  isGestrichen:(s,pts)=> pts < s.targetPoints && s.targetPoints-pts <= GESTRICHEN_DIFF,

  // ── Undo ──
  // Gesichert werden nur die betroffenen Spieltage (nicht alle), damit der
  // Undo-Verlauf bei langen Sessions den Browser-Speicher nicht sprengt.
  snapshot:(s,action,extraIdx=[])=>{
    const mds={};
    new Set([s.currentMatchdayIndex, ...extraIdx]).forEach(i=>{ if(s.matchdays[i]) mds[i]=clone(s.matchdays[i]); });
    s.undoStack.push({
      mdCount:s.matchdays.length, mds, currentMatchdayIndex:s.currentMatchdayIndex,
      tricksA:s.tricksA, tricksB:s.tricksB, currentBid:s.currentBid,
      customTeamA:s.customTeamA?s.customTeamA.slice():null, customTeamB:s.customTeamB?s.customTeamB.slice():null,
      customTeamNameA:s.customTeamNameA, customTeamNameB:s.customTeamNameB,
      name:s.name, variant:s.variant, targetPoints:s.targetPoints, quickMode:s.quickMode, players:clone(s.players),
      action, timestamp:Date.now(),
    });
    if(s.undoStack.length>UNDO_MAX) s.undoStack.splice(0, s.undoStack.length-UNDO_MAX);
  },
  undo:(s)=>{
    const snap=s.undoStack.pop(); if(!snap) return;
    if(Array.isArray(snap.matchdays) && snap.matchdays.length) s.matchdays=snap.matchdays;   // altes Format (komplette Kopie)
    else if(snap.mds && typeof snap.mds==="object" && Number.isInteger(snap.mdCount) && snap.mdCount>=1){
      s.matchdays.length=Math.min(s.matchdays.length, snap.mdCount);
      for(const k of Object.keys(snap.mds)){
        const i=Number(k);
        if(Number.isInteger(i) && i>=0 && i<s.matchdays.length) s.matchdays[i]=snap.mds[k];
      }
    }
    else return;                                              // unbrauchbarer Eintrag → ignorieren
    s.currentMatchdayIndex=snap.currentMatchdayIndex;
    s.tricksA=snap.tricksA; s.tricksB=snap.tricksB; s.currentBid=snap.currentBid;
    s.customTeamA=snap.customTeamA; s.customTeamB=snap.customTeamB;
    s.customTeamNameA=snap.customTeamNameA; s.customTeamNameB=snap.customTeamNameB;
    if(snap.variant!==undefined){
      s.name=snap.name; s.variant=snap.variant; s.targetPoints=snap.targetPoints; s.quickMode=snap.quickMode;
    }
    if(snap.players) s.players=snap.players;
    replaceInPlace(s, normalizeSession(s) || s);
    Haptics.warning();
  },

  // ── Spielablauf ──
  resetHand:(s)=>{ s.tricksA=0; s.tricksB=0; s.currentBid=2; },
  startNewRound:(s)=>{ Game.currentMatchday(s).rounds.push(newRound()); Game.resetHand(s); },

  addTrick:(s,team)=>{
    if(Game.isRoundOver(s)) return;
    Game.snapshot(s,"addTrick");
    if(team===0) s.tricksA++; else s.tricksB++;
    Haptics.light();
    if(s.tricksA>=TRICKS_TO_WIN) Game._award(s,0);
    else if(s.tricksB>=TRICKS_TO_WIN) Game._award(s,1);
  },
  // Schnellmodus: Spiel direkt einem Team gutschreiben (ohne Stiche)
  winHand:(s,team)=>{
    if(Game.isRoundOver(s)) return;
    Game.snapshot(s,"winHand"); Haptics.light();
    Game._award(s,team);
  },
  // "Gehen": Team gibt nach einem Gebot auf → Gegner bekommt den Wert vor der Erhöhung
  fold:(s,team)=>{
    if(Game.isRoundOver(s) || s.currentBid<=2) return;
    Game.snapshot(s,"fold"); Haptics.medium();
    Game._award(s, team===0?1:0, s.currentBid-1, team);
  },
  _award:(s,team,points,foldedBy)=>{
    const pts = points!=null ? points : s.currentBid;
    const r=Game.currentRound(s);
    const hand={id:uuid(), winnerTeam:team, pointsAwarded:pts, timestamp:Date.now()};
    if(foldedBy!=null) hand.foldedBy=foldedBy;
    r.hands.push(hand);
    if(team===0) r.teamAPoints+=pts; else r.teamBPoints+=pts;
    Game.resetHand(s);
    Game._checkRoundEnd(s, team);
  },
  // Beendet die Runde, wenn ein Team das Ziel erreicht hat
  _checkRoundEnd:(s,lastScorer)=>{
    const r=Game.currentRound(s), tgt=s.targetPoints;
    const aDone=r.teamAPoints>=tgt, bDone=r.teamBPoints>=tgt;
    if(!aDone && !bDone) return;
    let w;
    if(aDone && bDone) w = lastScorer!=null ? lastScorer : (r.teamAPoints>=r.teamBPoints?0:1); // nur nach Ziel-Senkung möglich
    else w = aDone ? 0 : 1;
    Game._finishRound(s, w, true);
  },
  _finishRound:(s,w,natural)=>{
    const md=Game.currentMatchday(s), r=Game.currentRound(s);
    r.winnerTeam=w;
    r.teams={teamA:md.teams.teamA.slice(), teamB:md.teams.teamB.slice()};
    if(natural){
      r.endedAt=Date.now();
      r.schneider = (w===0 ? r.teamBPoints : r.teamAPoints)===0;   // Gschneidert → zählt 2 Buammaln
    }
    // Manuell beendete Runden: endedAt bleibt null → zählen nicht in die Ø-Rundendauer
    if(w===0) md.teamARoundsWon+=roundWorth(r); else md.teamBRoundsWon+=roundWorth(r);
    Haptics.success();
    Game.lastRoundEvent={winner:w, schneider:!!r.schneider, a:r.teamAPoints, b:r.teamBPoints};
    Game.startNewRound(s);
  },
  increaseBid:(s)=>{
    if(Game.isRoundOver(s)) return;
    Game.snapshot(s,"increaseBid"); s.currentBid++; Haptics.medium();
  },
  canEndRound:(s)=>{ const r=Game.currentRound(s); return r.teamAPoints>0 || r.teamBPoints>0; },
  // Runde vorzeitig beenden: wer führt, gewinnt; bei Gleichstand ohne Sieger
  nextRound:(s)=>{
    if(!Game.canEndRound(s)) return;
    Game.snapshot(s,"nextRound");
    const r=Game.currentRound(s);
    if(r.teamAPoints===r.teamBPoints){ r.closed=true; Game.startNewRound(s); }
    else Game._finishRound(s, r.teamAPoints>r.teamBPoints?0:1, false);
  },
  _pushMatchday:(s,rotationIndex)=>{
    const d=defaultTeams(rotationIndex);
    const teams = (s.customTeamA && s.customTeamB)
      ? makeTeams(s.customTeamA, s.customTeamB, s.customTeamNameA, s.customTeamNameB)
      : makeTeams(d.teamA, d.teamB);
    s.matchdays.push(newMatchday(rotationIndex, teams));
    s.currentMatchdayIndex=s.matchdays.length-1;
    Game.resetHand(s);
  },
  nextMatchday:(s)=>{
    Game.snapshot(s,"nextMatchday");
    const md=Game.currentMatchday(s);
    // leere, nie gespielte Runde am Ende nicht mitschleppen
    const last=md.rounds[md.rounds.length-1];
    if(last && !last.hands.length && last.winnerTeam===null && !last.teamAPoints && !last.teamBPoints) md.rounds.pop();
    Game._pushMatchday(s, md.rotationIndex+1);
    Haptics.heavy();
  },
  deleteMatchday:(s,id)=>{
    const idx=s.matchdays.findIndex(m=>m.id===id); if(idx<0) return;
    Game.snapshot(s,"deleteMatchday",[idx]);
    const md=s.matchdays[idx];
    md.isDeleted=true; md.deletedAt=Date.now();
    // Laufender Spieltag gelöscht → mit gleicher Aufstellung neu anfangen
    if(idx===s.currentMatchdayIndex) Game._pushMatchday(s, md.rotationIndex);
    Haptics.warning();
  },
  deleteRound:(s,id)=>{
    const mi=s.matchdays.findIndex(m=>m.rounds.some(r=>r.id===id)); if(mi<0) return;
    Game.snapshot(s,"deleteRound",[mi]);
    const md=s.matchdays[mi], r=md.rounds.find(x=>x.id===id);
    if(r.winnerTeam!==null){
      const worth=roundWorth(r);
      if(r.winnerTeam===0) md.teamARoundsWon=Math.max(0,md.teamARoundsWon-worth);
      else                 md.teamBRoundsWon=Math.max(0,md.teamBRoundsWon-worth);
    }
    r.isDeleted=true; r.deletedAt=Date.now();
    // Laufende Runde gelöscht → neue Runde beginnen, sonst würde weiter in die gelöschte gezählt
    if(mi===s.currentMatchdayIndex && r===md.rounds[md.rounds.length-1]) Game.startNewRound(s);
    Haptics.warning();
  },
  // Gilt ab dem aktuellen Spieltag (und für folgende), frühere bleiben unverändert
  setCustomTeams:(s,teamA,teamB,nameA,nameB)=>{
    Game.snapshot(s,"teamChange");
    s.customTeamA=teamA.slice(); s.customTeamB=teamB.slice();
    s.customTeamNameA=nameA||null; s.customTeamNameB=nameB||null;
    Game.currentMatchday(s).teams=makeTeams(teamA,teamB,nameA,nameB);
  },
  // Einstellungen übernehmen – nur wenn sich etwas geändert hat (ein Undo-Schritt)
  applySettings:(s,{name,variant,target,quick,names})=>{
    name=(name||"").trim() || s.name;
    names=names.map((n,i)=>(n||"").trim() || s.players[i].name);
    const changed = name!==s.name || variant!==s.variant || target!==s.targetPoints || !!quick!==!!s.quickMode
      || names.some((n,i)=>n!==s.players[i].name);
    if(!changed) return false;
    Game.snapshot(s,"other");
    s.name=name; s.variant=variant; s.targetPoints=target;
    if(!!quick!==!!s.quickMode){ s.quickMode=!!quick; s.tricksA=0; s.tricksB=0; }
    names.forEach((n,i)=>s.players[i].name=n);
    Game._checkRoundEnd(s, null);   // Ziel gesenkt → Runde ggf. schon gewonnen
    return true;
  },

  exportText:(s)=>{
    const dt=(ms)=>fmt.dateMedium(ms);
    const tA=Game.teamAName(s), tB=Game.teamBName(s);
    const lines=[
      `🃏 ${s.name} (${VARIANTS[s.variant].name}${s.quickMode?', Schnellmodus':''})`,
      `Erstellt: ${dt(s.createdAt)}`,
      `Ziel: ${s.targetPoints} Punkte`, "",
      "═══ GESAMT ═══",
      `${tA}:  ${Game.totalRoundsA(s)} ${roundWord(Game.totalRoundsA(s))}`,
      `${tB}: ${Game.totalRoundsB(s)} ${roundWord(Game.totalRoundsB(s))}`, "",
    ];
    s.matchdays.forEach((md,i)=>{
      if(md.isDeleted) return;
      const mA=Game.teamNameOf(s,md,0), mB=Game.teamNameOf(s,md,1);
      lines.push(`── Spieltag ${i+1} · ${dt(md.date)} ──`);
      lines.push(`  ${mA} ${md.teamARoundsWon} : ${md.teamBRoundsWon} ${mB}`);
      md.rounds.forEach((r,j)=>{
        if(r.isDeleted) return;
        if(r.winnerTeam===null && !r.hands.length && !r.teamAPoints && !r.teamBPoints) return; // leere Runde
        let row=`  Runde ${j+1}: ${r.teamAPoints}:${r.teamBPoints}`;
        if(r.winnerTeam!==null) row+=` → ${r.winnerTeam===0?mA:mB} ✓${r.schneider?' (Schneider ×2)':''}`;
        else if(r.closed) row+=` (unentschieden abgebrochen)`;
        else row+=` (läuft)`;
        if(r.endedAt!=null){ const d=(r.endedAt-r.startedAt)/1000; row+=`  (${Math.floor(d/60)}min ${Math.floor(d)%60}s)`; }
        lines.push(row);
      });
      lines.push("");
    });
    const avg=Game.averageRoundDuration(s);
    if(avg!=null){ const d=avg/1000; lines.push(`Ø Rundendauer: ${Math.floor(d/60)}min ${Math.floor(d)%60}s`); }
    return lines.join("\n");
  },
};

// ─────────────────────────────────────────────────────────────
// App state + persistence helpers
// ─────────────────────────────────────────────────────────────
let store = loadStore();
let view = { screen:"home", sessionId:null, statsTab:0 };

function currentSession(){ return store.sessions.find(x=>x.id===view.sessionId); }
function commit(){
  const s=view.screen==="game" ? currentSession() : null; if(s) s.updatedAt=Date.now();
  saveStore(); renderScreen(); scheduleSync();
}

// ─────────────────────────────────────────────────────────────
// Rendering: screens
// ─────────────────────────────────────────────────────────────
const app = $("#app");

function renderScreen(){
  if(view.screen==="home") renderHome();
  else renderGame();
}

// ── HOME ──
function renderHome(){
  const sessions = store.sessions.slice().sort((a,b)=>sessionUpdatedAt(b)-sessionUpdatedAt(a)); // zuletzt gespielt zuerst
  let body;
  if(sessions.length===0){
    body = `<div class="empty">
      <div class="big">${IC.club}</div>
      <h2>Noch kein Spiel</h2>
      <p>Lege ein Spiel an, trag die vier Spieler ein und zähl los.</p>
      <button class="btn-primary" data-act="new">${IC.plus}<span>Neues Spiel</span></button>
    </div>`;
  } else {
    body = `<div class="scroll"><div class="grid">
      ${sessions.map(sessionCard).join("")}
      <button class="new-card" data-act="new">
        <span class="plus">${IC.plusCircle}</span><span class="lbl">Neues Spiel</span>
      </button>
    </div></div>`;
  }
  app.innerHTML = `
    <div class="topbar">
      <div class="title">Watten</div>
      <div class="tb-actions">
        <button class="iconbtn muted" data-act="skin" aria-label="Darstellung">${IC.palette}</button>
        <button class="iconbtn muted" data-act="data" aria-label="Daten & Backup">${IC.archive}</button>
        <button class="iconbtn" data-act="new" aria-label="Neues Spiel">${IC.plusCircle}</button>
      </div>
    </div>${body}`;
  app.querySelectorAll('[data-act="new"]').forEach(b=>b.onclick=openNewGame);
  app.querySelectorAll('[data-act="data"]').forEach(b=>b.onclick=openDataSheet);
  app.querySelectorAll('[data-act="skin"]').forEach(b=>b.onclick=openSkinSheet);
  let longPressed=false;
  app.querySelectorAll('[data-sess]').forEach(c=>{
    c.onclick=(e)=>{
      if(longPressed){ longPressed=false; return; }   // Long-Press hat schon den Lösch-Dialog geöffnet
      if(e.target.closest('[data-del]')) return;
      openSession(c.dataset.sess);
    };
  });
  app.querySelectorAll('[data-del]').forEach(b=>{
    b.onclick=(e)=>{ e.stopPropagation(); confirmDeleteSession(b.dataset.del); };
    // long-press / context menu on card
  });
  app.querySelectorAll('[data-sess]').forEach(c=>{
    c.oncontextmenu=(e)=>{ e.preventDefault(); confirmDeleteSession(c.dataset.sess); };
    let t; c.addEventListener('touchstart',()=>{ longPressed=false;
      t=setTimeout(()=>{ longPressed=true; confirmDeleteSession(c.dataset.sess); },600); },{passive:true});
    ['touchend','touchmove','touchcancel'].forEach(ev=>c.addEventListener(ev,()=>clearTimeout(t),{passive:true}));
  });
}

function sessionCard(s){
  const totalA=s.matchdays.filter(m=>!m.isDeleted).reduce((a,m)=>a+m.teamARoundsWon,0);
  const totalB=s.matchdays.filter(m=>!m.isDeleted).reduce((a,m)=>a+m.teamBRoundsWon,0);
  const nameA = Game.teamAName(s), nameB = Game.teamBName(s);
  const md=Game.currentMatchday(s);
  const ar=md.rounds.filter(r=>!r.isDeleted).length;
  return `<button class="sess-card" data-sess="${esc(s.id)}" aria-label="${esc(s.name)} öffnen">
    <div class="ctx-del" data-del="${esc(s.id)}">${IC.trash}</div>
    <div class="sc-top">
      <div class="sc-name">${esc(s.name)}</div>
      <div class="sc-date">${fmt.dateShort(s.createdAt)}</div>
    </div>
    <div class="variant-badge">${esc(VARIANTS[s.variant].name)}</div>
    <hr class="divider">
    <div class="sc-rows">
      <div class="sc-row"><span class="sc-team a">${esc(nameA)}</span><span class="sc-score">${totalA}</span></div>
      <div class="sc-row"><span class="sc-team b">${esc(nameB)}</span><span class="sc-score">${totalB}</span></div>
    </div>
    <div class="sc-foot">Spieltag ${s.currentMatchdayIndex+1} · ${roundLabel(ar)}</div>
  </button>`;
}

// ── GAME ──
function renderGame(){
  const s=currentSession();
  if(!s) return leaveGame();
  const streak=Game.currentStreak(s);
  const over=Game.isRoundOver(s);
  const r=Game.currentRound(s);
  const canUndo=Game.canUndo(s);
  const tgt=s.targetPoints;

  const scoreCol=(side,name,pts,won)=>{
    const frac=Math.min(1,pts/tgt);
    const dots=Array.from({length:Math.max(1,won+1)},(_,i)=>`<i class="${i<won?'on':''}"></i>`).join("");
    const gestrichen=!over && Game.isGestrichen(s,pts);
    return `<div class="score-col ${side}">
      <div class="tn">${esc(name)}</div>
      <div class="pts">${pts}</div>
      <div class="progress"><span style="width:${(frac*100).toFixed(1)}%"></span></div>
      <div class="tgt">${gestrichen?`<span class="gestrichen">Gestrichen</span>`:`/ ${tgt}`}</div>
      <div class="rdots">${dots}</div>
      <div class="rwon">${roundLabel(won)}</div>
    </div>`;
  };
  const trickCol=(side,name,tricks)=>{
    const dots=[0,1,2].map(i=>`<i class="${i<tricks?'on':''}"></i>`).join("");
    return `<div class="trick-col ${side}">
      <div class="tn">${esc(name)}</div>
      <div class="trick-dots">${dots}</div>
      <div class="cnt">${tricks}/3</div>
    </div>`;
  };

  const tA=Game.teamAName(s), tB=Game.teamBName(s);
  const quick=!!s.quickMode;
  const canFold=!over && s.currentBid>2;
  const foldRow = canFold ? `
      <div class="fold-row">
        <button class="fold-btn a" data-fold="0" aria-label="${esc(tA)} geht"><span class="fg">Geht</span><span class="fn">${esc(tA)}</span></button>
        <button class="fold-btn b" data-fold="1" aria-label="${esc(tB)} geht"><span class="fg">Geht</span><span class="fn">${esc(tB)}</span></button>
      </div>
      <div class="fold-hint">Gehen → Gegner bekommt ${s.currentBid-1} ${s.currentBid-1===1?'Punkt':'Punkte'}</div>` : '';
  const handPanel = quick ? `
    <div class="panel">
      <div class="hand-top">
        <span class="lbl">Aktuelles Spiel · Schnellmodus</span>
        <span class="bid">${IC.trophy}Gebot: ${s.currentBid}</span>
      </div>
      <div class="quick-worth">Spiel zählt <b>${s.currentBid}</b> ${s.currentBid===1?'Punkt':'Punkte'}</div>
      ${foldRow}
    </div>` : `
    <div class="panel">
      <div class="hand-top">
        <span class="lbl">Aktuelles Spiel</span>
        <span class="bid">${IC.trophy}Gebot: ${s.currentBid}</span>
      </div>
      <div class="trick-row">
        ${trickCol('a',tA,s.tricksA)}
        <div class="trick-vs">vs</div>
        ${trickCol('b',tB,s.tricksB)}
      </div>
      ${over&&r.winnerTeam!==null?`<div class="roundover ${r.winnerTeam===0?'a':'b'}"><span class="crown">${IC.crown}</span>${esc(r.winnerTeam===0?tA:tB)} gewinnt die Runde!</div>`:''}
      ${foldRow}
    </div>`;
  const winButtons = quick ? `
    <div>
      <div class="row2">
        <button class="bigbtn btn-a" data-win="0" aria-label="${s.currentBid} Punkte für ${esc(tA)}"><span class="ic">${IC.plus}</span>${s.currentBid} Punkte</button>
        <button class="bigbtn btn-b" data-win="1" aria-label="${s.currentBid} Punkte für ${esc(tB)}"><span class="ic">${IC.plus}</span>${s.currentBid} Punkte</button>
      </div>
      <div class="trick-labels"><span class="a">${esc(tA)}</span><span class="b">${esc(tB)}</span></div>
    </div>` : `
    <div>
      <div class="row2">
        <button class="bigbtn btn-a" data-trick="0" aria-label="Stich für ${esc(tA)}"><span class="ic">${IC.hand}</span>+ Stich</button>
        <button class="bigbtn btn-b" data-trick="1" aria-label="Stich für ${esc(tB)}"><span class="ic">${IC.hand}</span>+ Stich</button>
      </div>
      <div class="trick-labels"><span class="a">${esc(tA)}</span><span class="b">${esc(tB)}</span></div>
    </div>`;

  app.innerHTML = `
  <div class="topbar game">
    <button class="iconbtn muted" data-back aria-label="Zurück" style="color:var(--gold)">
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
    </button>
    <div class="title">${esc(s.name)}</div>
    <div class="tb-actions">
      <button class="iconbtn ${canUndo?'':'muted'}" data-open="undo" aria-label="Verlauf der Aktionen">${IC.history}</button>
      <button class="iconbtn" data-open="teams" aria-label="Teams einstellen">${IC.shuffle}</button>
      <button class="iconbtn" data-open="stats" aria-label="Statistik">${IC.chart}</button>
      <button class="iconbtn muted" data-open="settings" aria-label="Einstellungen">${IC.gear}</button>
    </div>
  </div>
  <div class="scroll"><div class="stack">
    <div class="gheader">
      <div>
        <div class="gh-variant">${esc(VARIANTS[s.variant].name)}</div>
        <div class="gh-day"><span class="d">Spieltag ${Game.matchdayNumber(s)}</span><span class="sep">·</span><span class="dt">${Game.matchdayDate(s)}</span></div>
        <div class="gh-sub"><span class="rl">${roundLabel(Game.roundNumber(s))}</span><span class="sep">·</span><span class="tg">Ziel: ${tgt} Punkte</span></div>
      </div>
      <button class="gh-share" data-share aria-label="Teilen">${IC.share}</button>
    </div>

    ${streak?`<div class="streak ${streak.team===0?'a':'b'}">${IC.flame}<span>${esc(streak.team===0?tA:tB)} · ${streak.length}er-Serie!</span></div>`:''}

    <div class="panel">
      <div class="score-row">
        ${scoreCol('a',tA,r.teamAPoints,Game.currentMatchday(s).teamARoundsWon)}
        <div class="score-div"></div>
        ${scoreCol('b',tB,r.teamBPoints,Game.currentMatchday(s).teamBRoundsWon)}
      </div>
    </div>

    ${handPanel}

    ${!over?winButtons:''}

    <div class="row2">
      ${!over?`<button class="bigbtn btn-gold" data-bid><span class="ic">${IC.arrowUp}</span>Bieten (${s.currentBid+1})</button>`:''}
      <button class="undo-btn ${canUndo?'':'dim'}" data-undo ${canUndo?'':'disabled'}>
        ${IC.undo}<span class="txt"><span class="t1">Rückgängig</span>${canUndo?`<span class="t2">${esc(UNDO_LABEL[Game.lastUndoAction(s)])}</span>`:''}</span>
      </button>
    </div>

    <hr class="divider">
    <div class="row2">
      <button class="bigbtn btn-border ${Game.canEndRound(s)?'':'dim'}" data-next><span class="ic">${IC.arrowRight}</span>Runde beenden</button>
      <button class="bigbtn btn-danger" data-newmd><span class="ic">${IC.flag}</span>Neuer Spieltag</button>
    </div>
  </div></div>`;

  $('[data-back]',app).onclick=leaveGame;
  const act=(fn)=>{
    Game.lastRoundEvent=null; fn(); commit();
    const ev=Game.lastRoundEvent; Game.lastRoundEvent=null;
    if(ev) toastRoundWon(ev,tA,tB);
  };
  app.querySelectorAll('[data-trick]').forEach(b=>b.onclick=()=>act(()=>Game.addTrick(s,+b.dataset.trick)));
  app.querySelectorAll('[data-win]').forEach(b=>b.onclick=()=>act(()=>Game.winHand(s,+b.dataset.win)));
  app.querySelectorAll('[data-fold]').forEach(b=>b.onclick=()=>act(()=>Game.fold(s,+b.dataset.fold)));
  const bid=$('[data-bid]',app); if(bid) bid.onclick=()=>{ Game.increaseBid(s); commit(); };
  $('[data-undo]',app).onclick=()=>{ if(!canUndo)return; Game.undo(s); commit(); };
  $('[data-next]',app).onclick=()=>confirmNextRound(s,tA,tB);
  $('[data-newmd]',app).onclick=()=>confirmNewMatchday(s);
  $('[data-share]',app).onclick=()=>shareSession(s);
  app.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>openSheet(b.dataset.open,s));
}

function toastRoundWon(ev,tA,tB){
  const name=ev.winner===0?tA:tB;
  toast(ev.schneider ? `Gschneidert! ${name} gewinnt ${ev.a}:${ev.b} – zählt 2 Runden`
                     : `${name} gewinnt die Runde ${ev.a}:${ev.b}`);
}
function openSession(id){
  const s=store.sessions.find(x=>x.id===id);
  // Sicherung wie Swift ensureRound(): aktueller Spieltag hat immer >=1 Runde
  if(s){ const md=Game.currentMatchday(s);
    if(md && md.rounds.length===0){ md.rounds.push(newRound()); saveStore(); } }
  if(!s) return;
  view.sessionId=id; view.screen="game"; renderGame(); requestWakeLock();
  window.scrollTo(0,0);
  if(!gameNav) gameNav=Nav.push(()=>{ gameNav=null; showHome(); });
}
let gameNav=null;
function showHome(){ view.screen="home"; releaseWakeLock(); renderHome(); window.scrollTo(0,0); }
function leaveGame(){
  if(gameNav){ const e=gameNav; gameNav=null; Nav.drop(e); }
  showHome();
}

// ─────────────────────────────────────────────────────────────
// Bildschirm wach halten, solange ein Spiel offen ist (Screen Wake Lock API)
// ─────────────────────────────────────────────────────────────
let wakeLock=null;
async function requestWakeLock(){
  if(!('wakeLock' in navigator) || wakeLock || document.visibilityState!=='visible') return;
  try{
    wakeLock=await navigator.wakeLock.request('screen');
    wakeLock.addEventListener('release',()=>{ wakeLock=null; });
  }catch(e){ wakeLock=null; }
}
function releaseWakeLock(){
  if(wakeLock){ wakeLock.release().catch(()=>{}); wakeLock=null; }
}
// Lock wird vom Browser beim Verlassen der App freigegeben → beim Zurückkommen neu holen
document.addEventListener('visibilitychange',()=>{
  if(document.visibilityState==='visible' && view.screen==='game') requestWakeLock();
});

// ─────────────────────────────────────────────────────────────
// Sheets / Modals
// ─────────────────────────────────────────────────────────────
const modalRoot=$("#modal-root");

// Zurück-Navigation: Android-Zurück-Taste, Wischgeste und Esc schließen erst
// Dialog/Sheet, dann das Spiel – statt die App zu verlassen.
// Muster: EIN "Wächter"-Eintrag in der History, solange etwas offen ist. Drückt
// der Nutzer Zurück, verbraucht das den Wächter (popstate) → oberste Ebene
// schließen und, falls noch etwas offen ist, den Wächter neu setzen. Es wird
// bewusst nie programmatisch history.back() aufgerufen: das läuft asynchron und
// kollidiert mit direkt folgenden pushState-Aufrufen (Sheet zu → Spiel auf).
const Nav={
  stack:[],
  guard: !!(history.state && history.state.watten),
  arm(){
    if(this.guard) return;
    try{ history.pushState({watten:1}, ""); this.guard=true; }catch(_){}
  },
  push(closeFn, modal){
    const e={closeFn, modal:!!modal}; this.stack.push(e); this.arm(); return e;
  },
  drop(e){ const i=this.stack.indexOf(e); if(i>=0) this.stack.splice(i,1); },
  closeTop(){ const e=this.stack.pop(); if(e) e.closeFn(); },
};
window.addEventListener('popstate',()=>{
  Nav.guard=false;
  Nav.closeTop();
  if(Nav.stack.length) Nav.arm();
});
document.addEventListener('keydown',(e)=>{
  if(e.key!=='Escape') return;
  const top=Nav.stack[Nav.stack.length-1];
  if(top && top.modal){ e.preventDefault(); Nav.closeTop(); }
});

// Hintergrund nicht mitscrollen lassen, solange ein Sheet/Dialog offen ist
let modalCount=0;
function lockScroll(on){
  modalCount=Math.max(0, modalCount+(on?1:-1));
  document.body.classList.toggle('modal-open', modalCount>0);
}

// Sheet im iOS-Stil. onDismiss wird aufgerufen, wenn das Sheet "weggewischt"
// wird (Hintergrund-Tipp, Herunterziehen, Zurück) – nicht bei close().
function sheetShell({title, lead, trail, body, wide, onDismiss}){
  const el=document.createElement('div');
  el.innerHTML=`
  <div class="sheet-back"></div>
  <div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(title)}">
    <div class="sheet-bar"><div class="grip"></div>
      <div class="sheet-lead">${lead||''}</div>
      <div class="sheet-title">${esc(title)}</div>
      <div class="sheet-trail">${trail||''}</div>
    </div>
    <div class="sheet-body ${wide?'wide':''}">${body}</div>
  </div>`;
  modalRoot.appendChild(el); lockScroll(true);
  const back=$('.sheet-back',el), sheet=$('.sheet',el), bar=$('.sheet-bar',el);
  requestAnimationFrame(()=>{ back.classList.add('open'); sheet.classList.add('open'); });
  let closed=false;
  const finish=()=>{
    if(closed) return false; closed=true;
    if(document.activeElement && el.contains(document.activeElement)) document.activeElement.blur(); // Tastatur einfahren
    back.classList.remove('open'); sheet.classList.remove('open'); sheet.style.transform='';
    setTimeout(()=>{ el.remove(); lockScroll(false); },280);
    return true;
  };
  const nav=Nav.push(()=>{ if(closed) return; if(onDismiss) onDismiss(); finish(); }, true);
  const close=()=>{ if(finish()) Nav.drop(nav); };
  const dismiss=()=>{ if(closed) return; if(onDismiss) onDismiss(); close(); };
  back.onclick=dismiss;

  // Am Kopf herunterziehen zum Schließen
  let y0=null, dy=0;
  bar.addEventListener('touchstart',(e)=>{
    if(e.target.closest('button')) return;
    y0=e.touches[0].clientY; dy=0; sheet.style.transition='none';
  },{passive:true});
  bar.addEventListener('touchmove',(e)=>{
    if(y0===null) return;
    dy=Math.max(0, e.touches[0].clientY-y0); sheet.style.transform=`translateY(${dy}px)`;
  },{passive:true});
  const endDrag=()=>{
    if(y0===null) return; y0=null; sheet.style.transition='';
    if(dy>110) dismiss(); else sheet.style.transform='';
  };
  bar.addEventListener('touchend',endDrag); bar.addEventListener('touchcancel',endDrag);
  return {el, close};
}

function openSheet(kind,s){
  if(kind==="settings") return openSettings(s);
  if(kind==="stats")    return openStats(s);
  if(kind==="teams")    return openTeams(s);
  if(kind==="undo")     return openUndo(s);
}

// ── Darstellung (Skins) ──
// Farben stecken komplett in CSS-Tokens (index.html); skin.js setzt den Skin vor dem
// ersten Zeichnen. Die Kacheln tragen selbst data-skin und zeigen sich so in ihren Farben.
const SKIN_INFO = {
  filz:     ["Filz",      "Grüner Spieltisch – wie bisher"],
  nacht:    ["Nacht",     "Schwarz wie iOS im Dunkelmodus"],
  hell:     ["Hell",      "Weiß und Grau wie iOS im Hellmodus"],
  zirbe:    ["Zirbe",     "Helles Holz, wie eine Tiroler Stube"],
  wirtshaus:["Wirtshaus", "Dunkles Holz und warmes Licht"],
  kontrast: ["Kontrast",  "Maximale Lesbarkeit"],
};
// Mini-Spielstand für die Vorschau; die Farben kommen vom umgebenden data-skin
const SKIN_MINI=`<span class="sp-card"><b class="a">12</b><i>:</i><b class="b">7</b></span>
    <span class="sp-row"><span class="sp-pill">Gebot 3</span><span class="sp-btn a"></span><span class="sp-btn b"></span></span>`;
function skinOptions(){
  const cur=window.Skin ? Skin.get() : "filz";
  const opt=(key,name,desc,prev,wide)=>`<button type="button" class="skin-opt ${wide?'wide':''} ${cur===key?'sel':''}" data-pick="${key}" role="radio" aria-checked="${cur===key}">
      <span class="skin-frame">${prev}</span>
      <span class="skin-name">${esc(name)}${cur===key?`<span class="ok">${IC.check}</span>`:''}</span>
      <span class="skin-desc">${esc(desc)}</span>
    </button>`;
  const auto=opt("auto","Automatisch","Filz bei dunkler, Hell bei heller Einstellung des Geräts",
    `<span class="skin-prev split"><span data-skin="filz">${SKIN_MINI}</span><span data-skin="hell">${SKIN_MINI}</span></span>`, true);
  return auto + Object.entries(SKIN_INFO).map(([k,[n,d]])=>
    opt(k,n,d,`<span class="skin-prev" data-skin="${k}">${SKIN_MINI}</span>`)).join("");
}
const FONT_INFO = {
  system:"Standard", kreide:"Kreide", tafel:"Anzeigetafel", digital:"Digital", klassisch:"Klassisch", schreibmaschine:"Schreibmaschine",
};
function fontOptions(){
  const cur=window.Skin ? Skin.getFont() : "system";
  return Object.entries(FONT_INFO).map(([k,n])=>`<button type="button" class="font-opt ${cur===k?'sel':''}" data-font="${k}" role="radio" aria-checked="${cur===k}">
      <span class="skin-frame"><span class="font-prev" ${k==="system"?'':`data-numfont="${k}"`}><b class="a">12</b><i>:</i><b class="b">7</b></span></span>
      <span class="skin-name">${esc(n)}${cur===k?`<span class="ok">${IC.check}</span>`:''}</span>
    </button>`).join("");
}
function openSkinSheet(){
  if(!window.Skin) return;
  const body=`<div class="section"><p class="field-lbl">Farben</p>
      <div class="skin-grid" id="sk-grid" role="radiogroup" aria-label="Farbschema">${skinOptions()}</div></div>
    <div class="section"><p class="field-lbl">Zahlen</p>
      <div class="font-grid" id="ft-grid" role="radiogroup" aria-label="Schrift der Zahlen">${fontOptions()}</div>
      <p class="hint">Gilt nur für dieses Gerät. Spielstände und gemeinsame Liste bleiben unberührt.</p></div>`;
  const {el,close}=sheetShell({ title:"Darstellung", trail:`<button id="sk-done">Fertig</button>`, body });
  const grid=$('#sk-grid',el);
  const wire=()=>grid.querySelectorAll('[data-pick]').forEach(b=>b.onclick=()=>{
    Skin.set(b.dataset.pick); Haptics.light();
    grid.innerHTML=skinOptions(); wire();
  });
  wire();
  const fgrid=$('#ft-grid',el);
  const wireF=()=>fgrid.querySelectorAll('[data-font]').forEach(b=>b.onclick=()=>{
    Skin.setFont(b.dataset.font); Haptics.light();
    fgrid.innerHTML=fontOptions(); wireF();
  });
  wireF();
  $('#sk-done',el).onclick=close;
}

// ── Formular-Bausteine ──
function variantOptsHtml(variant){
  return VARIANT_ORDER.map(k=>{
    const v=VARIANTS[k];
    return `<button type="button" class="variant-opt ${k===variant?'sel':''}" data-v="${k}" role="radio" aria-checked="${k===variant}">
      <div class="vo-txt"><div class="vo-name">${esc(v.name)}</div><div class="vo-desc">${esc(v.desc)}</div></div>
      ${k===variant?`<span class="vo-check">${IC.check}</span>`:''}
    </button>`;
  }).join("");
}
// Schalter im iOS-Stil (Toggle) für die Zählweise
function quickToggleHtml(id, on){
  return `<label class="toggle-row" for="${id}">
      <span class="tr-txt"><span class="tr-title">Schnellmodus</span>
        <span class="tr-sub">Ohne Stiche – das Spiel wird mit dem aktuellen Gebot direkt einem Team gegeben.</span></span>
      <input type="checkbox" class="switch" id="${id}" role="switch" ${on?'checked':''}>
    </label>`;
}
function playerRowsHtml(names){
  return names.map((n,i)=>`
    <div class="name-row"><span class="num">${i+1}.</span>
      <input data-name="${i}" value="${esc(n)}" placeholder="Spieler ${i+1}" maxlength="${MAXLEN.player}"
        autocomplete="off" autocapitalize="words" enterkeyhint="${i<3?'next':'done'}" aria-label="Name Spieler ${i+1}"></div>`).join("");
}
// Enter springt zum nächsten Feld bzw. führt beim letzten die Hauptaktion aus
function chainInputs(inputs, onDone){
  inputs.forEach((inp,i)=>inp.addEventListener('keydown',(e)=>{
    if(e.key!=='Enter') return; e.preventDefault();
    if(i<inputs.length-1) inputs[i+1].focus(); else { inp.blur(); onDone&&onDone(); }
  }));
}

// ── New game ──
function openNewGame(){
  let variant="ladinisch";
  const names=["","","",""];
  const body=`
    <div class="section">
      <p class="field-lbl">Spielname</p>
      <input class="txtfield" id="ng-name" placeholder="z.B. Stammtisch Mittwoch" maxlength="${MAXLEN.session}" autocomplete="off" enterkeyhint="next" aria-label="Spielname">
    </div>
    <div class="section">
      <p class="field-lbl">Spieler</p>
      <div id="ng-names">${playerRowsHtml(names)}</div>
      <p class="hint">Die Teams rotieren pro Spieltag automatisch: 1 &amp; 2, dann 1 &amp; 3, dann 1 &amp; 4. Eigene Teams lassen sich im Spiel jederzeit festlegen.</p>
    </div>
    <div class="section">
      <p class="field-lbl">Spielvariante</p>
      <div id="ng-variants" role="radiogroup" aria-label="Spielvariante">${variantOptsHtml(variant)}</div>
    </div>
    <div class="section">
      <p class="field-lbl">Zählweise</p>
      ${quickToggleHtml("ng-quick", false)}
    </div>`;
  const {el,close}=sheetShell({
    title:"Neues Spiel",
    lead:`<button id="ng-cancel">Abbrechen</button>`,
    trail:`<button id="ng-create">Erstellen</button>`,
    body,
  });
  const nameInput=$('#ng-name',el);
  const rewire=()=>$('#ng-variants',el).querySelectorAll('[data-v]').forEach(b=>b.onclick=()=>{
    variant=b.dataset.v; $('#ng-variants',el).innerHTML=variantOptsHtml(variant); rewire(); });
  rewire();
  const nameInputs=[...$('#ng-names',el).querySelectorAll('[data-name]')];
  nameInputs.forEach(inp=>inp.oninput=()=>names[+inp.dataset.name]=inp.value);
  const create=()=>{
    const nm = cleanStr(nameInput.value, MAXLEN.session) || `Spiel ${store.sessions.length+1}`;
    const s=newSession(nm, variant, $('#ng-quick',el).checked, names);
    store.sessions.push(s); saveStore(); scheduleSync();
    close(); openSession(s.id);
  };
  chainInputs([nameInput, ...nameInputs], create);
  $('#ng-cancel',el).onclick=close;
  $('#ng-create',el).onclick=create;
}

// ── Settings ──
function openSettings(s){
  let names=s.players.map(p=>p.name);
  let variant=s.variant, target=s.targetPoints;
  const body=`
    <div class="section"><p class="field-lbl">Spielname</p>
      <input class="txtfield" id="st-name" value="${esc(s.name)}" maxlength="${MAXLEN.session}" autocomplete="off" enterkeyhint="done" aria-label="Spielname"></div>
    <div class="section"><p class="field-lbl">Spielernamen</p><div id="st-names">${playerRowsHtml(names)}</div></div>
    <div class="section"><p class="field-lbl">Spielvariante</p><div id="st-variants" role="radiogroup" aria-label="Spielvariante">${variantOptsHtml(variant)}</div></div>
    <div class="section"><p class="field-lbl">Zielpunkte</p>
      <div class="stepper"><span class="val" id="st-target">Bis ${target} Punkte</span>
        <div class="ctrls"><button type="button" id="st-minus" aria-label="Weniger Punkte">−</button><span class="sepv"></span><button type="button" id="st-plus" aria-label="Mehr Punkte">+</button></div></div>
      <p class="hint" id="st-hint">Standard für ${esc(VARIANTS[variant].name)}: ${VARIANTS[variant].defaultTarget} Punkte</p>
    </div>
    <div class="section"><p class="field-lbl">Zählweise</p>${quickToggleHtml("st-quick", !!s.quickMode)}</div>
    <div class="section"><button type="button" class="destructive-row" id="st-delete">${IC.trash}Spiel löschen</button></div>`;
  // Wie ein SwiftUI-Formular: Änderungen gelten auch beim Wegwischen, nicht nur über "Fertig"
  const save=()=>{
    Game.lastRoundEvent=null;
    const changed=Game.applySettings(s,{name:$('#st-name',el).value, variant, target, quick:$('#st-quick',el).checked, names});
    if(changed) commit();
    const ev=Game.lastRoundEvent; Game.lastRoundEvent=null;
    if(ev) toast(`${ev.winner===0?Game.teamAName(s):Game.teamBName(s)} hat das neue Ziel erreicht und gewinnt die Runde`);
  };
  const {el,close}=sheetShell({ title:"Einstellungen", trail:`<button id="st-done">Fertig</button>`, body, onDismiss:save });

  const showTarget=()=>{ $('#st-target',el).textContent=`Bis ${target} Punkte`; };
  const rewireV=()=>$('#st-variants',el).querySelectorAll('[data-v]').forEach(b=>b.onclick=()=>{
    if(b.dataset.v===variant) return;
    variant=b.dataset.v; target=VARIANTS[variant].defaultTarget;
    $('#st-variants',el).innerHTML=variantOptsHtml(variant); rewireV(); showTarget();
    $('#st-hint',el).textContent=`Standard für ${VARIANTS[variant].name}: ${VARIANTS[variant].defaultTarget} Punkte`;
  });
  rewireV();
  const setT=(d)=>{ target=Math.min(30,Math.max(5,target+d)); showTarget(); Haptics.light(); };
  $('#st-minus',el).onclick=()=>setT(-1); $('#st-plus',el).onclick=()=>setT(1);
  const nameInputs=[...$('#st-names',el).querySelectorAll('[data-name]')];
  nameInputs.forEach(inp=>inp.oninput=()=>names[+inp.dataset.name]=inp.value);
  chainInputs(nameInputs);
  $('#st-done',el).onclick=()=>{ save(); close(); };
  $('#st-delete',el).onclick=()=>confirmDeleteSession(s.id, close);
}

// ── Team setup ──
function openTeams(s){
  const cur=Game.teams(s);
  let teamA=cur.teamA.slice(), teamB=cur.teamB.slice();
  let nameA=cur.nameA||"", nameB=cur.nameB||"";
  const editor=(side,team,other)=>{
    const rows=team.map(idx=>`
      <div class="player-row ${side}"><span class="pi">${IC.person}</span>
        <span class="pn">${esc(s.players[idx].name)}</span>
        <button class="swap" data-swap="${idx}" data-side="${side}" aria-label="${esc(s.players[idx].name)} ins andere Team">${IC.swap}</button></div>`).join("");
    return `<div class="team-edit ${side}"><div class="te-lbl">${side==='a'?'Team A':'Team B'}</div>${rows}</div>`;
  };
  const renderEditors=()=>editor('a',teamA,teamB)+editor('b',teamB,teamA);
  const body=`
    <div class="info-box"><span class="i">${IC.info}</span>Tippe auf ⇄ um einen Spieler zu wechseln. Gilt ab dem aktuellen Spieltag.</div>
    <div id="te-editors">${renderEditors()}</div>
    <div class="section" style="margin-top:0"><p class="field-lbl">Teamnamen (optional)</p>
      <div class="names2">
        <input class="a" id="te-nameA" value="${esc(nameA)}" placeholder="Team A" maxlength="${MAXLEN.team}" autocomplete="off" aria-label="Name Team A">
        <input class="b" id="te-nameB" value="${esc(nameB)}" placeholder="Team B" maxlength="${MAXLEN.team}" autocomplete="off" aria-label="Name Team B"></div></div>
    <button class="dice-btn" id="te-dice">${IC.dice}Zufällig auswürfeln</button>`;
  const {el,close}=sheetShell({
    title:"Teams", wide:true,
    lead:`<button id="te-cancel">Abbrechen</button>`,
    trail:`<button id="te-apply">Übernehmen</button>`, body,
  });
  const rewire=()=>{
    $('#te-editors',el).querySelectorAll('[data-swap]').forEach(b=>b.onclick=()=>{
      const idx=+b.dataset.swap, side=b.dataset.side;
      const from = side==='a'?teamA:teamB, to = side==='a'?teamB:teamA;
      if(to.length<3){ const p=from.indexOf(idx); if(p>-1)from.splice(p,1); to.push(idx); Haptics.light(); }
      $('#te-editors',el).innerHTML=renderEditors(); rewire();
    });
  };
  rewire();
  $('#te-nameA',el).oninput=e=>nameA=e.target.value;
  $('#te-nameB',el).oninput=e=>nameB=e.target.value;
  $('#te-dice',el).onclick=()=>{
    const i=[0,1,2,3];
    for(let k=i.length-1;k>0;k--){ const j=Math.floor(Math.random()*(k+1)); [i[k],i[j]]=[i[j],i[k]]; } // Fisher-Yates
    teamA=[i[0],i[1]]; teamB=[i[2],i[3]];
    Haptics.medium(); $('#te-editors',el).innerHTML=renderEditors(); rewire();
  };
  $('#te-cancel',el).onclick=close;
  $('#te-apply',el).onclick=()=>{
    if(teamA.length!==2 || teamB.length!==2){ toast("Jedes Team braucht genau 2 Spieler"); return; }
    Game.setCustomTeams(s,teamA,teamB,nameA.trim(),nameB.trim());
    close(); commit();
  };
}

// ── Undo history ──
function openUndo(s){
  const undoIcon={addTrick:IC.hand,increaseBid:IC.arrowUp,nextRound:IC.arrowRight,
    nextMatchday:IC.flag,teamChange:IC.shuffle,deleteRound:IC.trash,deleteMatchday:IC.trash,other:IC.pencil,
    winHand:IC.plus,fold:IC.flag};
  const undoColor={addTrick:COL.teamA,increaseBid:COL.gold,nextRound:COL.neutral,
    nextMatchday:COL.danger,teamChange:COL.muted,deleteRound:COL.danger,deleteMatchday:COL.danger,other:COL.muted,
    winHand:COL.teamA,fold:COL.gold};
  const undoInk=(a)=> a==="nextRound" ? "var(--on-neutral)" : "var(--on-team)";
  const hist=Game.undoHistory(s);
  const body = hist.length===0
    ? `<div class="empty-mini"><span class="big">${IC.clock}</span><span>Keine Aktionen</span></div>`
    : `<div style="padding-top:8px">${hist.map((snap,idx)=>`
        <div class="undo-item">
          <span class="ci" style="background:${undoColor[snap.action]||undoColor.other};color:${undoInk(snap.action)}">${undoIcon[snap.action]||undoIcon.other}</span>
          <div class="ut"><div class="u1">${esc(UNDO_LABEL[snap.action]||UNDO_LABEL.other)}</div><div class="u2">${fmt.timeMedium(snap.timestamp)}</div></div>
          ${idx===0?'<span class="now">Aktuell</span>':''}
        </div>`).join("")}</div>`;
  const {el,close}=sheetShell({
    title:"Verlauf",
    lead:`<button id="uh-close">Schließen</button>`,
    trail: Game.canUndo(s)?`<button id="uh-undo">Rückgängig</button>`:'',
    body,
  });
  $('#uh-close',el).onclick=close;
  const u=$('#uh-undo',el); if(u) u.onclick=()=>{ Game.undo(s); close(); commit(); };
}

// ── Stats ──
function openStats(s){
  view.statsTab=0; // wie Swift: Stats öffnet immer auf "Verlauf"
  const body=`<div class="seg" id="stat-seg">
      <button data-tab="0" class="${view.statsTab===0?'on':''}">Verlauf</button>
      <button data-tab="1" class="${view.statsTab===1?'on':''}">Statistik</button>
      <button data-tab="2" class="${view.statsTab===2?'on':''}">Diagramme</button>
    </div><div id="stat-content"></div>`;
  const {el,close}=sheetShell({ title:"Statistiken", wide:true, trail:`<button id="stat-done">Fertig</button>`, body });
  $('#stat-done',el).onclick=close;
  const content=$('#stat-content',el);
  const paint=()=>{
    content.innerHTML = view.statsTab===0 ? statsHistory(s) : view.statsTab===1 ? statsSummary(s) : statsCharts(s);
    // wire delete buttons
    content.querySelectorAll('[data-delmd]').forEach(b=>b.onclick=()=>confirmDeleteMatchday(s,b.dataset.delmd,()=>{paint();rewireTabs();}));
    content.querySelectorAll('[data-delr]').forEach(b=>b.onclick=()=>confirmDeleteRound(s,b.dataset.delr,()=>{paint();rewireTabs();}));
  };
  const rewireTabs=()=>$('#stat-seg',el).querySelectorAll('[data-tab]').forEach(b=>{
    b.onclick=()=>{ view.statsTab=+b.dataset.tab;
      $('#stat-seg',el).querySelectorAll('button').forEach(x=>x.classList.toggle('on',+x.dataset.tab===view.statsTab));
      paint(); };
  });
  rewireTabs(); paint();
}

function statsHistory(s){
  return s.matchdays.map((md,idx)=>matchdayCard(s,idx,md)).join("") || `<p class="muted-note">Noch keine Daten</p>`;
}
function matchdayCard(s,idx,md){
  const nA = Game.teamNameOf(s,md,0), nB = Game.teamNameOf(s,md,1);
  let rounds="";
  if(!md.isDeleted){
    rounds=md.rounds.map((r,rIdx)=>{
      if(r.isDeleted){
        return `<div class="round-row del"><span style="color:color-mix(in srgb, var(--danger) 60%, transparent)">${IC.trash}</span>
          <span class="rl strike">Runde ${rIdx+1} – gelöscht</span></div>`;
      }
      const dur = r.endedAt!=null ? `<div class="rt">${Math.floor((r.endedAt-r.startedAt)/60000)}m ${Math.floor((r.endedAt-r.startedAt)/1000)%60}s</div>`:'';
      const crown = r.winnerTeam!==null ? `<span class="crown ${r.winnerTeam===0?'a':'b'}">${IC.crown}</span>${r.schneider?'<span class="schneider-badge">×2</span>':''}`
        : r.closed ? `<span class="muted-note">unentsch.</span>` : '';
      const delBtn = (r.winnerTeam!==null||r.teamAPoints>0||r.teamBPoints>0)
        ? `<button class="trash-btn" data-delr="${esc(r.id)}" aria-label="Runde löschen">${IC.trash}</button>`:'';
      return `<div class="round-row">
        <div class="rinfo"><span class="rl">Runde ${rIdx+1}</span><div class="rt">${fmt.timeShort(r.startedAt)}</div>${dur}</div>
        <span class="pa">${r.teamAPoints}</span><span class="col">:</span><span class="pb">${r.teamBPoints}</span>${crown}${delBtn}
      </div>`;
    }).join("");
  }
  const head = md.isDeleted
    ? `<span class="del-badge">${IC.trash}Gelöscht${md.deletedAt?' · '+fmt.dateShort(md.deletedAt):''}</span>`
    : `<span class="mdt">${fmt.dateMedium(md.date)}</span><button class="trash-btn" data-delmd="${esc(md.id)}" aria-label="Spieltag löschen">${IC.trash}</button>`;
  const scoreBlock = md.isDeleted
    ? `<p class="muted-note">Dieser Spieltag wurde aus der Wertung entfernt.</p>`
    : `<div class="md-score">
        <div class="s"><div class="stn a">${esc(nA)}</div><div class="sv">${md.teamARoundsWon}</div><div class="ss">${roundWord(md.teamARoundsWon)}</div></div>
        <div class="vs">vs</div>
        <div class="s r"><div class="stn b">${esc(nB)}</div><div class="sv">${md.teamBRoundsWon}</div><div class="ss">${roundWord(md.teamBRoundsWon)}</div></div>
       </div>${rounds}`;
  return `<div class="md-card ${md.isDeleted?'del':''}">
    <div class="md-head"><span class="mt">Spieltag ${idx+1}</span>${head}</div>${scoreBlock}</div>`;
}

function statsSummary(s){
  const streak=Game.currentStreak(s);
  const tA=Game.teamAName(s), tB=Game.teamBName(s);
  const totA=Game.totalRoundsA(s), totB=Game.totalRoundsB(s), tot=totA+totB;
  const avgDur=Game.averageRoundDuration(s), avgPts=Game.averagePointsPerMatchday(s);
  const stats=Game.playerStats(s).slice().sort((a,b)=>b.roundsWon-a.roundsWon);

  const streakCard = streak ? `<div class="panel"><div class="row-line" style="background:none;padding:0">
    <span style="color:var(--gold);font-size:26px">${IC.flame}</span>
    <div><div class="muted-note">Aktuelle Siegesserie</div>
      <div style="font-size:16px;font-weight:700;color:${streak.team===0?'var(--teamA)':'var(--teamB)'}">${esc(streak.team===0?tA:tB)} – ${streak.length} Runden in Folge</div></div>
    </div></div>`:'';
  const splitbar = tot>0 ? `<div class="splitbar"><div class="a" style="width:${(totA/tot*100)}%"></div><div class="b"></div></div>`:'';
  const durLine = avgDur!=null ? `<div class="row-line"><span class="ri">${IC.clock}</span><span class="rt">Ø Rundendauer</span><span class="rv">${Math.floor(avgDur/60000)}min ${Math.floor(avgDur/1000)%60}s</span></div>`:'';

  return `<div class="stack">
  ${streakCard}
  <div class="panel"><div class="cardtitle">Team-Gesamtbilanz</div>
    <div style="display:flex;align-items:flex-end">
      <div class="stat-block"><span class="sl" style="color:var(--teamA)">${esc(tA)}</span><span class="sv">${totA}</span><span class="ss">${roundWord(totA)}</span></div>
      <div style="flex:1;text-align:center;color:var(--muted);padding-bottom:6px">vs</div>
      <div class="stat-block r"><span class="sl" style="color:var(--teamB)">${esc(tB)}</span><span class="sv">${totB}</span><span class="ss">${roundWord(totB)}</span></div>
    </div>${splitbar}
  </div>
  <div class="panel"><div class="cardtitle">Durchschnitte</div>
    <div style="display:flex;flex-direction:column;gap:10px">
      ${durLine}
      <div class="row-line"><span class="ri">${IC.trendline}</span><span class="rt">Ø Punkte/Spieltag</span><span class="rv">${avgPts.a.toFixed(1)} : ${avgPts.b.toFixed(1)}</span></div>
    </div>
  </div>
  <div class="panel"><div class="cardtitle">Spieler-Statistik</div>
    <div style="display:flex;flex-direction:column;gap:10px">
      ${stats.map(x=>`<div class="row-line"><span class="ri">${IC.person}</span><span class="rt" style="font-weight:500">${esc(x.player.name)}</span><span class="rv">${roundLabel(x.roundsWon)}</span></div>`).join("")}
    </div>
  </div>
  <div class="panel"><div class="cardtitle">Spieltag-Ergebnisse</div>
    <div style="display:flex;flex-direction:column;gap:10px">
      ${s.matchdays.map((md,idx)=>{
        const win = md.isDeleted?'' : md.teamARoundsWon>md.teamBRoundsWon?`<span style="color:var(--teamA)">${IC.crown}</span>`
          : md.teamBRoundsWon>md.teamARoundsWon?`<span style="color:var(--teamB)">${IC.crown}</span>`:`<span style="color:var(--muted)">${IC.equal}</span>`;
        return `<div class="row-line" style="opacity:${md.isDeleted?.5:1}">
          <span class="rt" style="flex:none;color:var(--muted)">Tag ${idx+1}</span>
          ${md.isDeleted?`<span style="color:color-mix(in srgb, var(--danger) 60%, transparent)">${IC.trash}</span>`:''}
          <span style="flex:1"></span>
          <span style="font-weight:700;color:${md.isDeleted?'var(--muted)':'var(--teamA)'}">${md.teamARoundsWon}</span>
          <span class="col" style="color:var(--muted)">:</span>
          <span style="font-weight:700;color:${md.isDeleted?'var(--muted)':'var(--teamB)'}">${md.teamBRoundsWon}</span>${win}
        </div>`;
      }).join("")}
    </div>
  </div></div>`;
}

// ── Charts (SVG) ──
function statsCharts(s){
  return `<div style="display:flex;flex-direction:column;gap:20px">
    ${barChart(s)}${lineChart(s)}${donutChart(s)}</div>`;
}
function legend(tA,tB){
  return `<div class="legend">
    <span class="item"><span class="swatch" style="background:var(--teamA)"></span>${esc(tA)}</span>
    <span class="item"><span class="swatch" style="background:var(--teamB)"></span>${esc(tB)}</span></div>`;
}
function barChart(s){
  const tA=Game.teamAName(s), tB=Game.teamBName(s);
  const days=s.matchdays.filter(m=>!m.isDeleted);
  const maxV=Math.max(1,...days.map(m=>Math.max(m.teamARoundsWon,m.teamBRoundsWon)),1);
  let inner;
  if(!days.length){ inner=`<p class="muted-note">Noch keine Daten</p>`; }
  else{
    const H=80, groupW=46, gap=8, W=days.length*groupW;
    const bars=days.map((m,i)=>{
      const x=i*groupW;
      const ha=Math.max(2,H*m.teamARoundsWon/maxV), hb=Math.max(2,H*m.teamBRoundsWon/maxV);
      return `<rect x="${x+3}" y="${H-ha}" width="18" height="${ha}" rx="4" fill="var(--teamA)"/>
              <rect x="${x+24}" y="${H-hb}" width="18" height="${hb}" rx="4" fill="var(--teamB)"/>
              <text x="${x+groupW/2}" y="${H+14}" fill="var(--muted)" font-size="10" text-anchor="middle">${i+1}</text>`;
    }).join("");
    inner=`<svg viewBox="0 0 ${Math.max(W,60)} ${H+18}" width="100%" height="100" preserveAspectRatio="xMinYMax meet" style="overflow:visible">${bars}</svg>`;
  }
  return `<div class="panel"><div class="cardtitle" style="font-size:13px">Runden gewonnen pro Spieltag</div>
    ${inner}${legend(tA,tB)}</div>`;
}
function cumulativePoints(s){
  let cA=0,cB=0,pA=[0],pB=[0];
  for(const md of s.matchdays){ if(md.isDeleted)continue; cA+=md.teamARoundsWon; pA.push(cA); cB+=md.teamBRoundsWon; pB.push(cB); }
  return {a:pA,b:pB,maxV:Math.max(1,Math.max(...pA),Math.max(...pB))};
}
function lineChart(s){
  const tA=Game.teamAName(s), tB=Game.teamBName(s);
  const d=cumulativePoints(s);
  const W=300,H=120;
  const P=6, iw=W-2*P, ih=H-2*P;   // Innenabstand, damit die Punkte am Rand nicht abgeschnitten werden
  const grid=[0,0.25,0.5,0.75,1.0].map(f=>`<line x1="${P}" y1="${P+ih*(1-f)}" x2="${W-P}" y2="${P+ih*(1-f)}" stroke="var(--border)" stroke-opacity="0.5" stroke-width="0.5"/>`).join("");
  const poly=(pts,col)=>{
    const n=pts.length; if(n<2) return '';
    const coords=pts.map((v,i)=>[P+iw*i/(n-1), P+ih*(1-v/d.maxV)]);
    const path=coords.map((c,i)=>(i===0?'M':'L')+c[0].toFixed(1)+','+c[1].toFixed(1)).join(' ');
    const dots=coords.map(c=>`<circle cx="${c[0].toFixed(1)}" cy="${c[1].toFixed(1)}" r="3.5" fill="${col}"/>`).join('');
    return `<path d="${path}" fill="none" stroke="${col}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>${dots}`;
  };
  return `<div class="panel"><div class="cardtitle" style="font-size:13px">Kumulierte Runden (Gesamt)</div>
    <svg viewBox="0 0 ${W} ${H}" width="100%" height="120" preserveAspectRatio="none" role="img" aria-label="Kumulierte Runden pro Spieltag">${grid}${poly(d.a,COL.teamA)}${poly(d.b,COL.teamB)}</svg>
    ${legend(tA,tB)}</div>`;
}
function donutChart(s){
  const stats=Game.playerStats(s).slice().sort((a,b)=>b.roundsWon-a.roundsWon);
  const total=Math.max(1,stats.reduce((a,x)=>a+x.roundsWon,0));
  const palette=[COL.teamA,COL.teamB,COL.gold,COL.chart4];
  const R=60,rO=54,rI=54*0.62,cx=60,cy=60;
  const polar=(r,a)=>[cx+r*Math.cos(a), cy+r*Math.sin(a)];
  const slice=(a0,a1,col)=>{
    const large=(a1-a0)>Math.PI?1:0;
    const [x0,y0]=polar(rO,a0),[x1,y1]=polar(rO,a1),[x2,y2]=polar(rI,a1),[x3,y3]=polar(rI,a0);
    return `<path d="M${x0.toFixed(2)},${y0.toFixed(2)} A${rO},${rO} 0 ${large} 1 ${x1.toFixed(2)},${y1.toFixed(2)} L${x2.toFixed(2)},${y2.toFixed(2)} A${rI},${rI} 0 ${large} 0 ${x3.toFixed(2)},${y3.toFixed(2)} Z" fill="${col}"/>`;
  };
  let a=-Math.PI/2, arcs="";
  const realTotal=stats.reduce((x,y)=>x+y.roundsWon,0);
  if(realTotal===0){
    arcs=`<circle cx="${cx}" cy="${cy}" r="${(rO+rI)/2}" fill="none" stroke="var(--border)" stroke-width="${rO-rI}"/>`;
  }else{
    stats.forEach((x,i)=>{ const sw=x.roundsWon/realTotal*2*Math.PI; if(sw>0){arcs+=slice(a,a+sw,palette[i%palette.length]);} a+=sw; });
  }
  const legendRows=stats.map((x,i)=>{
    const pct=Math.round(x.roundsWon/total*100);
    return `<div class="li"><span class="dot" style="background:${palette[i%palette.length]}"></span><span class="nm">${esc(x.player.name)}</span><span class="pc">${pct}%</span></div>`;
  }).join("");
  return `<div class="panel"><div class="cardtitle" style="font-size:13px">Spieler-Anteil (Runden gewonnen)</div>
    <div class="donut-wrap">
      <div style="position:relative;width:120px;height:120px;flex-shrink:0">
        <svg viewBox="0 0 120 120" width="120" height="120">${arcs}</svg>
        <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center">
          <div style="font-family:var(--numfont);font-variant-numeric:var(--numvariant);font-size:22px;font-weight:800;color:var(--cream)">${realTotal}</div>
          <div style="font-size:10px;color:var(--muted)">Runden</div></div>
      </div>
      <div class="donut-legend">${legendRows}</div>
    </div></div>`;
}

// ─────────────────────────────────────────────────────────────
// Alerts / confirms
// ─────────────────────────────────────────────────────────────
function alertDialog({title,message,confirmLabel,destructive,onConfirm,cancelLabel,info}){
  const el=document.createElement('div');
  el.className='alert-back';
  el.innerHTML=`<div class="alert" role="alertdialog" aria-modal="true" aria-label="${esc(title)}"><div class="at">${esc(title)}</div>
    ${message?`<div class="am">${esc(message)}</div>`:''}
    <div class="ab">
      ${info?'':`<button class="cancel">${esc(cancelLabel||'Abbrechen')}</button>`}
      <button class="${destructive?'destructive':''} ok">${esc(confirmLabel)}</button>
    </div></div>`;
  modalRoot.appendChild(el); lockScroll(true);
  requestAnimationFrame(()=>el.classList.add('open'));
  let closed=false;
  const finish=()=>{ if(closed) return false; closed=true;
    el.classList.remove('open'); setTimeout(()=>{ el.remove(); lockScroll(false); },200); return true; };
  const nav=Nav.push(finish, true);
  const close=()=>{ if(finish()) Nav.drop(nav); };
  if(!info) $('.cancel',el).onclick=close;
  $('.ok',el).onclick=()=>{ close(); onConfirm&&onConfirm(); };
  el.onclick=(e)=>{ if(e.target===el) close(); };
}
function confirmDeleteSession(id, before){
  const s=store.sessions.find(x=>x.id===id); if(!s) return;
  alertDialog({title:`„${s.name}“ löschen?`, message:"Alle Spieltage und Runden dieses Spiels werden dauerhaft gelöscht"
      +(sharedOn() ? " – auch in der gemeinsamen Liste, auf allen verbundenen Geräten" : "")+". Das lässt sich nicht rückgängig machen.",
    confirmLabel:"Löschen", destructive:true, onConfirm:()=>{
      before&&before();
      store.sessions=store.sessions.filter(x=>x.id!==id);
      if(view.screen==="game" && view.sessionId===id) leaveGame();
      saveStore(); renderScreen(); scheduleSync();
      toast("Spiel gelöscht");
    }});
}
function confirmNextRound(s,tA,tB){
  if(!Game.canEndRound(s)){ toast("In dieser Runde gibt es noch keine Punkte"); return; }
  const r=Game.currentRound(s);
  const msg = r.teamAPoints===r.teamBPoints
    ? `Gleichstand ${r.teamAPoints}:${r.teamBPoints} – die Runde wird ohne Sieger beendet.`
    : `${r.teamAPoints>r.teamBPoints?tA:tB} führt ${Math.max(r.teamAPoints,r.teamBPoints)}:${Math.min(r.teamAPoints,r.teamBPoints)} und bekommt die Runde.`;
  alertDialog({title:"Runde vorzeitig beenden?", message:msg, confirmLabel:"Beenden",
    onConfirm:()=>{
      Game.lastRoundEvent=null; Game.nextRound(s); commit();
      const ev=Game.lastRoundEvent; Game.lastRoundEvent=null;
      if(ev) toastRoundWon(ev,tA,tB);
    }});
}
function confirmNewMatchday(s){
  alertDialog({title:"Neuer Spieltag?", message:"Der aktuelle Spieltag wird abgeschlossen und ein neuer gestartet.",
    confirmLabel:"Neuer Spieltag", onConfirm:()=>{
      Game.nextMatchday(s); commit();
      toast(`Spieltag ${Game.matchdayNumber(s)}: ${Game.teamAName(s)} gegen ${Game.teamBName(s)}`);
    }});
}
function confirmDeleteMatchday(s,id,after){
  alertDialog({title:"Spieltag löschen?", message:"Spieltag wird als gelöscht markiert und aus der Wertung entfernt.",
    confirmLabel:"Löschen", destructive:true, onConfirm:()=>{ Game.deleteMatchday(s,id); commit(); after&&after(); }});
}
function confirmDeleteRound(s,id,after){
  alertDialog({title:"Runde löschen?", message:"Runde wird aus der Wertung entfernt.",
    confirmLabel:"Löschen", destructive:true, onConfirm:()=>{ Game.deleteRound(s,id); commit(); after&&after(); }});
}

// ─────────────────────────────────────────────────────────────
// Share
// ─────────────────────────────────────────────────────────────
async function shareSession(s){
  const text=Game.exportText(s);
  try{
    if(navigator.share){ await navigator.share({title:s.name, text}); return; }
  }catch(e){ if(e && e.name==='AbortError') return; }
  try{ await navigator.clipboard.writeText(text); toast("In Zwischenablage kopiert"); }
  catch(e){ toast("Teilen nicht verfügbar"); }
}
// ─────────────────────────────────────────────────────────────
// Datensicherung: kompletter Export/Import (durable Aufzeichnung)
// ─────────────────────────────────────────────────────────────
const BACKUP_SCHEMA = "v3";
const MAX_IMPORT_BYTES = 20*1024*1024, MAX_IMPORT_SESSIONS = 500;
function pad2(n){ return String(n).padStart(2,"0"); }
function stamp(){ const d=new Date(); return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}_${pad2(d.getHours())}${pad2(d.getMinutes())}`; }
function downloadFile(name, text, mime){
  const blob=new Blob([text],{type:mime});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url; a.download=name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url), 1500);
}
function exportBackup(){
  const payload={ app:"watten-tracker", schema:BACKUP_SCHEMA, exportedAt:Date.now(), store };
  downloadFile(`watten-backup_${stamp()}.json`, JSON.stringify(payload,null,2), "application/json");
  toast("Backup exportiert");
}
async function shareBackup(){
  const payload={ app:"watten-tracker", schema:BACKUP_SCHEMA, exportedAt:Date.now(), store };
  const name=`watten-backup_${stamp()}.json`;
  const file=new File([JSON.stringify(payload,null,2)], name, {type:"application/json"});
  try{
    if(navigator.canShare && navigator.canShare({files:[file]})){
      await navigator.share({files:[file], title:"Watten-Backup"});
      return;
    }
  }catch(e){ if(e && e.name==="AbortError") return; }
  // Fallback: kein Datei-Teilen möglich (z.B. Desktop-Browser) → normaler Download
  exportBackup();
}
function parseBackup(raw){
  let data;
  try{ data=JSON.parse(raw); }catch(e){ throw new Error("Datei ist kein gültiges JSON."); }
  const sessions = (data && data.store && Array.isArray(data.store.sessions)) ? data.store.sessions
                 : Array.isArray(data && data.sessions) ? data.sessions : null;
  if(!sessions) throw new Error("Kein gültiges Watten-Backup.");
  if(sessions.length>MAX_IMPORT_SESSIONS) throw new Error("Zu viele Spiele im Backup.");
  // Undo-Verläufe fremder Geräte werden nicht übernommen (unnötig, und weniger ungeprüfte Daten)
  return sessions.map(x=>safeNormalize(x)).filter(Boolean).map(s=>{ s.undoStack=[]; return s; });
}
function mergeToast(prefix,res){
  const parts=[];
  if(res.added) parts.push(`${res.added} neu`);
  if(res.updated) parts.push(`${res.updated} aktualisiert`);
  if(res.kept) parts.push(`${res.kept} lokal neuer, behalten`);
  toast(`${prefix}: ${parts.join(", ")||"nichts zu tun"}`);
}
function importBackup(file, mode){ // mode: 'merge' | 'replace'
  if(file.size>MAX_IMPORT_BYTES){ toast("Import fehlgeschlagen: Datei ist zu groß"); return; }
  const reader=new FileReader();
  reader.onload=()=>{
    try{
      const incoming=parseBackup(reader.result);
      if(mode==="replace"){ store.sessions=incoming; toast(`${incoming.length} Spiel(e) importiert`); }
      else { const m=mergeSessions(store.sessions,incoming); store.sessions=m.sessions; mergeToast("Import",m); }
      saveStore(); renderScreen(); scheduleSync();
    }catch(e){ toast("Import fehlgeschlagen: "+e.message); }
  };
  reader.onerror=()=>toast("Datei konnte nicht gelesen werden");
  reader.readAsText(file);
}
// CSV: eine Zeile pro Runde über alle Spiele – gut für Tabellen/Obsidian
function exportAllCSV(){
  // Texte, die mit = + - @ beginnen, würde Excel als Formel ausführen → entschärfen
  const csvEsc=(v)=>{
    let t=String(v??"");
    if(typeof v==="string" && /^[=+\-@\t\r]/.test(t)) t="'"+t;
    return /[";\n\r]/.test(t) ? '"'+t.replace(/"/g,'""')+'"' : t;
  };
  const rows=[["Spiel","Variante","Ziel","Spieltag","Datum","Runde","Startzeit","Endzeit","Dauer_s","PunkteA","PunkteB","Gewinner","TeamA","TeamB","Schneider","Geloescht"]];
  const iso=(ms)=> ms==null ? "" : new Date(ms).toISOString();
  for(const s of store.sessions){
    s.matchdays.forEach((md,mi)=>{
      const tA=Game.teamNameOf(s,md,0), tB=Game.teamNameOf(s,md,1);
      md.rounds.forEach((r,ri)=>{
        rows.push([
          s.name, VARIANTS[s.variant].name, s.targetPoints, mi+1, iso(md.date), ri+1,
          iso(r.startedAt), iso(r.endedAt), r.endedAt!=null?Math.round((r.endedAt-r.startedAt)/1000):"",
          r.teamAPoints, r.teamBPoints,
          r.winnerTeam==null ? "" : (r.winnerTeam===0?tA:tB), tA, tB, r.schneider ? "ja":"nein",
          (s.matchdays[mi].isDeleted||r.isDeleted) ? "ja":"nein",
        ]);
      });
    });
  }
  const csv="\uFEFF"+rows.map(r=>r.map(csvEsc).join(";")).join("\n"); // BOM für Excel
  downloadFile(`watten-runden_${stamp()}.csv`, csv, "text/csv;charset=utf-8");
  toast("CSV exportiert");
}

// ── Home-Lab Sync (optional) ──
// Push-only Backup nach jeder Änderung an einen selbst gehosteten Endpunkt
// (z.B. DuckDNS+Caddy+watten-sync-server, siehe README). URL/Token liegen
// getrennt vom Spielstand in localStorage, nicht Teil des store-Backups.
const SYNC_KEY = "watten_sync_cfg";
// Nur https (http ausschließlich für localhost) und keine Zugangsdaten in der URL –
// sonst ginge der Token im Klartext über die Leitung.
function validSyncUrl(u){
  try{
    const x=new URL(u);
    if(x.username || x.password) return false;
    return x.protocol==="https:" || (x.protocol==="http:" && /^(localhost|127\.0\.0\.1|\[::1\])$/.test(x.hostname));
  }catch(e){ return false; }
}
function loadSyncCfg(){
  const empty={url:"",token:"",lastSync:null};
  try{
    const c=JSON.parse(localStorage.getItem(SYNC_KEY));
    if(!c || typeof c!=="object") return empty;
    return { url: typeof c.url==="string" ? c.url : "", token: typeof c.token==="string" ? c.token : "",
             lastSync: safeTs(c.lastSync, null) };
  }catch(e){ return empty; }
}
function saveSyncCfg(){ try{ localStorage.setItem(SYNC_KEY, JSON.stringify(syncCfg)); }catch(e){} }
let syncCfg = loadSyncCfg();
const syncConfigured = ()=> !!(syncCfg.url && syncCfg.token && validSyncUrl(syncCfg.url));
function syncEndpoint(path){ return syncCfg.url.replace(/\/+$/,"") + path; }

let syncTimer=null, syncBusy=false, syncAgain=false;
function scheduleSync(){
  if(Shared) Shared.schedule();           // gemeinsame Liste (Supabase), falls verbunden
  if(!syncConfigured()) return;
  clearTimeout(syncTimer);
  syncTimer=setTimeout(syncPush, 2500);
}
async function syncPush(silent){
  if(!syncConfigured()) return;
  if(syncBusy){ syncAgain=true; return; }   // nach dem laufenden Push nochmal sichern
  syncBusy=true; syncAgain=false;
  const payload={ app:"watten-tracker", schema:BACKUP_SCHEMA, exportedAt:Date.now(), store };
  try{
    const res=await fetch(syncEndpoint("/backup"),{
      method:"POST", credentials:"omit", referrerPolicy:"no-referrer", cache:"no-store",
      headers:{ "Content-Type":"application/json", "Authorization":"Bearer "+syncCfg.token },
      body: JSON.stringify(payload)
    });
    if(!res.ok) throw new Error("HTTP "+res.status);
    syncCfg.lastSync=Date.now(); saveSyncCfg();
    renderSyncStatus();
    if(!silent) toast("Mit Home-Lab synchronisiert");
  }catch(e){
    renderSyncStatus(e.message);
    if(!silent) toast("Sync fehlgeschlagen: "+e.message);
  }finally{
    syncBusy=false;
    if(syncAgain){ syncAgain=false; scheduleSync(); }
  }
}
async function syncPull(){
  if(!syncConfigured()) return toast("Sync nicht konfiguriert");
  try{
    const res=await fetch(syncEndpoint("/backup"),{ credentials:"omit", referrerPolicy:"no-referrer", cache:"no-store",
      headers:{ "Authorization":"Bearer "+syncCfg.token } });
    if(!res.ok) throw new Error("HTTP "+res.status);
    const incoming=parseBackup(await res.text());
    const m=mergeSessions(store.sessions,incoming); store.sessions=m.sessions;
    saveStore(); renderScreen(); if(Shared) Shared.schedule();
    mergeToast("Vom Home-Lab",m);
  }catch(e){ toast("Laden fehlgeschlagen: "+e.message); }
}
function renderSyncStatus(err){
  const el=document.getElementById("sync-status");
  if(!el) return;
  if(!syncConfigured()){ el.textContent="Nicht eingerichtet"; el.style.color="var(--muted)"; }
  else if(err){ el.textContent="⚠ Sync fehlgeschlagen: "+err; el.style.color="var(--danger)"; }
  else if(syncCfg.lastSync){ el.textContent="Zuletzt gesynct: "+fmt.timeShort(syncCfg.lastSync); el.style.color="var(--streak)"; }
  else{ el.textContent="Noch nicht synchronisiert"; el.style.color="var(--muted)"; }
}

// ─────────────────────────────────────────────────────────────
// Gemeinsam nutzen (optional): Spiele über Supabase mit anderen Geräten teilen.
// Abgleich und Verbindung stecken in sync.js, das Zusammenführen in core.js.
// ─────────────────────────────────────────────────────────────
const Shared = window.Sync || null;
const sharedOn = ()=> !!(Shared && Shared.configured());

// Stand aus der gemeinsamen Liste übernehmen. Die Spiel-Objekte behalten ihre
// Identität, damit offene Sheets und Dialoge weiter auf das richtige Spiel zeigen.
function applySharedDoc(doc){
  const byId=new Map(store.sessions.map(s=>[s.id,s]));
  const openId = view.screen==="game" ? view.sessionId : null;
  store.sessions = doc.sessions.map(d=>{
    const ex=byId.get(d.id);
    const full=normalizeSession({...d, undoStack: ex ? ex.undoStack : []});
    if(!full) return ex || null;
    if(!ex) return full;
    // Kam für dieses Spiel etwas von einem anderen Gerät, ist der eigene Rückgängig-Verlauf
    // überholt – er würde sonst fremde Einträge mit zurücknehmen.
    if(!Core.same(Core.sharedOf(ex), d)) full.undoStack=[];
    return replaceInPlace(ex, full);
  }).filter(Boolean);
  saveStore();
  if(openId && !store.sessions.some(s=>s.id===openId)){
    while(Nav.stack.some(e=>e.modal)) Nav.closeTop();     // Sheets/Dialoge zu einem Spiel, das es nicht mehr gibt
    toast("Dieses Spiel wurde auf einem anderen Gerät gelöscht");
  }
  renderScreen();
}

function shareStatusText(){
  const S=Shared;
  if(S.status==="busy") return ["Wird abgeglichen …","var(--muted)"];
  if(S.status==="offline") return ["Offline – wird später abgeglichen","var(--gold)"];
  if(S.status==="error") return ["Fehler: "+S.lastError,"var(--danger)"];
  if(!S.lastSync) return ["Verbunden","var(--streak)"];
  const sec=Math.round((Date.now()-S.lastSync)/1000);
  return ["Abgeglichen "+(sec<60 ? "gerade eben" : `vor ${Math.round(sec/60)} Min.`),"var(--streak)"];
}
function renderShareStatus(){
  const el=document.getElementById("share-status"); if(!el || !sharedOn()) return;
  const [text,color]=shareStatusText();
  el.textContent=text; el.style.color=color;
  const dot=document.getElementById("share-dot"); if(dot) dot.className="sync-dot "+Shared.status;
}

async function shareText(text, copiedMsg){
  try{
    if(navigator.share){ await navigator.share({text}); return; }
  }catch(e){ if(e && e.name==="AbortError") return; }
  try{ await navigator.clipboard.writeText(text); toast(copiedMsg); }
  catch(e){ toast("Teilen nicht verfügbar"); }
}
function shareInvite(){
  shareText(`🃏 Zähl mit beim Watten!\nLink öffnen und „Beitreten“ tippen:\n${Shared.inviteLink()}`, "Einladungslink kopiert");
}

// Sicherheitskopie der Spiele dieses Geräts, bevor es einer Liste beitritt (ein Platz, wird überschrieben)
function keepCopyBeforeJoin(){
  try{ localStorage.setItem(STORE_KEY+"_vor_beitritt", JSON.stringify({savedAt:Date.now(), sessions:store.sessions})); }catch(e){}
}

async function shareCreate(url, key, done){
  const cleanUrl=Shared.cleanUrl(url), k=(key||"").trim();
  if(!cleanUrl) return toast("Die Projekt-URL muss mit https:// beginnen");
  if(!Shared.validKey(k)) return toast("Bitte den Anon-Key vollständig eintragen");
  Shared.configure({url:cleanUrl, key:k, code:Shared.newCode()});
  done();
  try{
    await Shared.run();
    done();
    toast("Gemeinsame Liste erstellt");
    shareInvite();
  }catch(e){
    Shared.configure(null);
    done();
    alertDialog({title:"Verbindung fehlgeschlagen", info:true, confirmLabel:"OK",
      message:`${(e&&e.message)||e} – Sind URL und Anon-Key richtig, und wurde supabase.sql im Projekt ausgeführt?`});
  }
}

// Beitritt nur nach ausdrücklicher Bestätigung; der Dialog nennt den Server.
function shareJoin(cfg, done){
  let host=""; try{ host=new URL(cfg.url).host; }catch(e){}
  const n=store.sessions.length;
  const mine = n ? ` ${n===1?"Das Spiel":`Die ${n} Spiele`} auf diesem Gerät ${n===1?"kommt":"kommen"} zur gemeinsamen Liste dazu und ${n===1?"ist":"sind"} dann für alle sichtbar.` : "";
  const switching = sharedOn() ? " Die bisherige Verbindung wird dabei getrennt." : "";
  alertDialog({title:"Gemeinsamer Liste beitreten?",
    message:`Dieses Gerät verbindet sich mit dem Server ${host}.${mine}${switching} Tritt nur bei, wenn du den Link von jemandem aus deiner Runde bekommen hast.`,
    confirmLabel:"Beitreten", onConfirm:async()=>{
      keepCopyBeforeJoin();
      Shared.configure(cfg);
      done&&done();
      try{
        await Shared.run({join:true});
        done&&done();
        toast("Beigetreten – ihr nutzt jetzt eine gemeinsame Liste");
      }catch(e){
        Shared.configure(null);
        done&&done();
        alertDialog({title:"Beitreten fehlgeschlagen", info:true, confirmLabel:"OK", message:(e&&e.message)||String(e)});
      }
    }});
}

function shareLeave(done){
  alertDialog({title:"Verbindung trennen?", destructive:true, confirmLabel:"Trennen",
    message:"Die Spiele bleiben auf diesem Gerät, werden aber nicht mehr mit den anderen abgeglichen.",
    onConfirm:()=>{ Shared.configure(null); done(); toast("Verbindung getrennt"); }});
}

// Abschnitt „Gemeinsam nutzen“ im Sheet „Daten & Backup“
function renderShareSection(box){
  if(!Shared){ box.innerHTML=""; return; }
  const row=(id,icon,label,cls)=>`<button type="button" class="row ${cls||''}" id="${id}">
      <span class="row-ic">${icon}</span><span class="row-title">${label}</span><span class="row-chev">${IC.chevron}</span></button>`;
  const again=()=>renderShareSection(box);
  if(!sharedOn()){
    box.innerHTML=`<p class="field-lbl">Gemeinsam nutzen (optional)</p>
      <div class="group">
        <label class="row"><span class="row-ic">${IC.cloud}</span>
          <input class="row-input" id="sh-url" type="url" inputmode="url" placeholder="Projekt-URL (https://…supabase.co)" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" aria-label="Projekt-URL"></label>
        <label class="row"><span class="row-ic">${IC.shield}</span>
          <input class="row-input" id="sh-key" placeholder="Anon-Key" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" aria-label="Anon-Key"></label>
      </div>
      <div class="group" style="margin-top:10px">${row("sh-create", IC.plusCircle, "Gemeinsame Liste erstellen")}</div>
      <div class="group" style="margin-top:10px">
        <label class="row"><span class="row-ic">${IC.share}</span>
          <input class="row-input" id="sh-link" placeholder="Einladungslink einfügen" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" aria-label="Einladungslink"></label>
        ${row("sh-join", IC.person, "Mit Einladungslink beitreten")}
      </div>
      <p class="hint">Damit alle auf dem eigenen Handy mitzählen und denselben Stand sehen: kostenloses Supabase-Projekt anlegen, supabase.sql ausführen, URL und Anon-Key hier eintragen (Anleitung in der README). Wer einen Einladungslink bekommen hat, öffnet ihn einfach – oder fügt ihn hier ein, wenn die App vom Home-Bildschirm läuft.</p>`;
    $('#sh-create',box).onclick=()=>shareCreate($('#sh-url',box).value, $('#sh-key',box).value, again);
    $('#sh-join',box).onclick=()=>{
      const cfg=Shared.parseInvite($('#sh-link',box).value);
      if(!cfg) return toast("Das ist kein gültiger Einladungslink");
      shareJoin(cfg, again);
    };
    return;
  }
  box.innerHTML=`<p class="field-lbl">Gemeinsam nutzen</p>
    <div class="group">
      <div class="row"><span class="row-ic"><span class="sync-dot" id="share-dot"></span></span>
        <span class="row-stack"><span>Gemeinsame Liste aktiv</span><span class="row-sub">${esc(Shared.host())}</span><span class="row-sub" id="share-status"></span></span></div>
      ${row("sh-now", IC.history, "Jetzt abgleichen")}
      ${row("sh-invite", IC.share, "Einladungslink teilen")}
      ${row("sh-leave", IC.trash, "Verbindung trennen", "destructive")}
    </div>
    <p class="hint">Änderungen werden automatisch abgeglichen, Punkte von mehreren Handys zusammengezählt. Wer den Einladungslink hat, kann alles lesen, ändern und löschen – also nur an die eigene Runde schicken.</p>`;
  renderShareStatus();
  $('#sh-now',box).onclick=()=>Shared.run().then(()=>toast("Abgeglichen")).catch(()=>toast("Abgleich fehlgeschlagen"));
  $('#sh-invite',box).onclick=shareInvite;
  $('#sh-leave',box).onclick=()=>shareLeave(again);
}

// Einladungslink in der Adresszeile: Zugangsdaten sofort entfernen, dann nachfragen.
function takeInviteFromUrl(){
  if(!Shared || !/#join=/.test(location.hash)) return;
  const cfg=Shared.parseInvite(location.hash);
  try{ history.replaceState(history.state, "", location.pathname+location.search); }catch(e){}
  if(cfg) shareJoin(cfg);
  else alertDialog({title:"Einladungslink ungültig", info:true, confirmLabel:"OK",
    message:"Der Link ist unvollständig oder zeigt nicht auf eine verschlüsselte Verbindung (https)."});
}

function startShared(){
  if(!Shared) return;
  Shared.hooks.getState=()=>Core.docOf(store.sessions);
  Shared.hooks.setState=applySharedDoc;
  let before=Shared.status;
  Shared.hooks.onStatus=(s)=>{
    renderShareStatus();
    // Nur beim Umschlagen melden, nicht bei jedem weiteren Fehlversuch
    if(s==="error" && before!=="error") toast("⚠ Abgleich fehlgeschlagen – Änderungen bleiben auf diesem Gerät");
    if(s!=="busy") before=s;
  };
  const tick=()=>{ if(document.visibilityState==="visible") Shared.run().catch(()=>{}); };
  setInterval(tick, 30000);
  document.addEventListener("visibilitychange", tick);
  window.addEventListener("online", tick);
  window.addEventListener("hashchange", takeInviteFromUrl);
  tick();
  takeInviteFromUrl();
}

function openDataSheet(){
  const games=store.sessions.length;
  const rounds=store.sessions.reduce((a,s)=>a+s.matchdays.filter(m=>!m.isDeleted)
    .reduce((x,m)=>x+m.rounds.filter(r=>!r.isDeleted && r.winnerTeam!==null).length,0),0);
  const row=(id,icon,label,cls)=>`<button type="button" class="row ${cls||''}" id="${id}">
      <span class="row-ic">${icon}</span><span class="row-title">${label}</span><span class="row-chev">${IC.chevron}</span></button>`;
  const body=`
    <div class="info-box" style="margin-top:8px"><span class="i">${IC.shield}</span>
      Alle Spielstände liegen nur auf diesem Gerät. Sichere regelmäßig ein Backup.</div>
    <div class="panel">
      <div class="cardtitle">Aktuell aufgezeichnet</div>
      <div style="display:flex;gap:24px">
        <div class="stat-block"><span class="sv">${games}</span><span class="ss">${games===1?'Spiel':'Spiele'}</span></div>
        <div class="stat-block"><span class="sv">${rounds}</span><span class="ss">gespielte ${rounds===1?'Runde':'Runden'}</span></div>
      </div>
    </div>
    <div class="section"><p class="field-lbl">Sichern</p>
      <div class="group">
        ${row("d-share", IC.share, "Backup teilen")}
        ${row("d-export", IC.download, "Backup als Datei sichern")}
        ${row("d-csv", IC.table, "Alle Runden als CSV")}
      </div></div>
    <div class="section"><p class="field-lbl">Wiederherstellen</p>
      <div class="group">
        ${row("d-merge", IC.upload, "Backup zusammenführen")}
        ${row("d-replace", IC.upload, "Alles durch Backup ersetzen", "destructive")}
      </div>
      <input type="file" id="d-file" accept="application/json,.json" hidden>
      <p class="hint">Zusammenführen fügt Spiele hinzu und behält bei gleichen Spielen den neueren Stand. Ersetzen überschreibt alles auf diesem Gerät.</p></div>
    <div class="section" id="share-sec"></div>
    <div class="section"><p class="field-lbl">Home-Lab Sync (optional)</p>
      <div class="group">
        <label class="row"><span class="row-ic">${IC.cloud}</span>
          <input class="row-input" id="sy-url" type="url" inputmode="url" placeholder="https://dein-name.duckdns.org" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" aria-label="Server-Adresse" value="${esc(syncCfg.url)}"></label>
        <label class="row"><span class="row-ic">${IC.shield}</span>
          <input class="row-input" id="sy-token" type="password" placeholder="Token" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" aria-label="Token" value="${esc(syncCfg.token)}"></label>
      </div>
      <div class="group" style="margin-top:10px">
        ${row("sy-save", IC.check, "Zugang speichern")}
        ${row("sy-push", IC.upload, "Jetzt sichern")}
        ${row("sy-pull", IC.download, "Vom Server laden")}
      </div>
      <p class="hint" id="sync-status"></p>
      <p class="hint">Adresse und Token bleiben nur in diesem Browser. Nach jeder Änderung geht automatisch ein Backup an deinen eigenen Server (nur über https).</p></div>`;
  const {el,close}=sheetShell({ title:"Daten & Backup", trail:`<button id="d-done">Fertig</button>`, body });
  renderSyncStatus();
  renderShareSection($('#share-sec',el));
  let pendingMode="merge";
  const fileInput=$('#d-file',el);
  fileInput.onchange=(e)=>{ const f=e.target.files&&e.target.files[0]; if(f){ importBackup(f,pendingMode); close(); } e.target.value=""; };
  $('#d-done',el).onclick=close;
  $('#d-share',el).onclick=shareBackup;
  $('#d-export',el).onclick=exportBackup;
  $('#d-csv',el).onclick=exportAllCSV;
  $('#d-merge',el).onclick=()=>{ pendingMode="merge"; fileInput.click(); };
  $('#d-replace',el).onclick=()=>{
    alertDialog({title:"Alles ersetzen?", message:"Alle Spiele auf diesem Gerät werden durch das Backup ersetzt."
        +(sharedOn() ? " Das gilt auch für die gemeinsame Liste – auf allen verbundenen Geräten." : ""),
      confirmLabel:"Datei wählen", destructive:true, onConfirm:()=>{ pendingMode="replace"; fileInput.click(); }});
  };
  // Zugang aus den Feldern übernehmen; false, wenn die Adresse nicht zulässig ist
  const readCfg=()=>{
    const url=$('#sy-url',el).value.trim(), token=$('#sy-token',el).value.trim();
    if(url && !validSyncUrl(url)){ toast("Die Adresse muss mit https:// beginnen"); return false; }
    syncCfg.url=url; syncCfg.token=token; saveSyncCfg(); return true;
  };
  $('#sy-save',el).onclick=()=>{
    if(!readCfg()) return;
    toast(syncConfigured() ? "Sync-Zugang gespeichert" : "Sync-Zugang entfernt"); renderSyncStatus();
  };
  $('#sy-push',el).onclick=()=>{
    if(!readCfg()) return;
    if(!syncConfigured()) return toast("Bitte Adresse und Token eintragen");
    syncPush(false);
  };
  $('#sy-pull',el).onclick=()=>{
    if(!readCfg()) return;
    if(!syncConfigured()) return toast("Bitte Adresse und Token eintragen");
    alertDialog({title:"Vom Server laden?", message:"Spiele vom Home-Lab werden mit denen auf diesem Gerät zusammengeführt.",
      confirmLabel:"Laden", onConfirm:()=>{ close(); syncPull(); }});
  };
}

let toastTimer;
function toast(msg){
  const t=$("#toast"); t.textContent=msg; t.classList.add("show");
  clearTimeout(toastTimer); toastTimer=setTimeout(()=>t.classList.remove("show"), Math.min(5000, 1800+msg.length*35));
}

// ─────────────────────────────────────────────────────────────
// Boot
// ─────────────────────────────────────────────────────────────
renderScreen();
if(loadWarning) toast("⚠ "+loadWarning);
startShared();
// Service Worker (früher Inline-Skript in index.html – wegen der Content-Security-Policy hierher verlegt)
if('serviceWorker' in navigator){
  window.addEventListener('load',()=>navigator.serviceWorker.register('./service-worker.js').catch(()=>{}));
}
