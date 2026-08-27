/* Watten Tracker – PWA Port von WattenTracker.swift
 * Vanilla JS, keine Abhängigkeiten. Persistenz via localStorage.
 * Dates werden als Millisekunden (Number) gespeichert (JSON-safe).
 */
"use strict";

// ─────────────────────────────────────────────────────────────
// Design-Tokens (nur für JS-Zugriff; Farben leben im CSS)
// ─────────────────────────────────────────────────────────────
const COL = {
  teamA:"#4A90D9", teamB:"#D96B4A", gold:"#D4A843",
  border:"#3D5C3D", green2:"#5FAF5F"
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
  dice:'<svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="3"/><circle cx="9" cy="9" r="1.4" fill="#1A2B1A"/><circle cx="15" cy="15" r="1.4" fill="#1A2B1A"/><circle cx="15" cy="9" r="1.4" fill="#1A2B1A"/><circle cx="9" cy="15" r="1.4" fill="#1A2B1A"/></svg>',
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
  cloud:'<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 18a4 4 0 0 1-1-7.9A5 5 0 0 1 15.9 8 4.5 4.5 0 0 1 17 18H7z"/></svg>',
};

// ─────────────────────────────────────────────────────────────
// Game Variants
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
  deleteMatchday:"Spieltag gelöscht", other:"Aktion",
};

// ─────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────
const uuid = () => (crypto.randomUUID ? crypto.randomUUID()
  : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const r=Math.random()*16|0;return (c==='x'?r:(r&0x3|0x8)).toString(16);}));
const clone = (o) => (typeof structuredClone==='function' ? structuredClone(o) : JSON.parse(JSON.stringify(o)));
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

// ─────────────────────────────────────────────────────────────
// Models
// ─────────────────────────────────────────────────────────────
function newPlayer(name){ return {id:uuid(), name}; }
function newRound(){
  return {id:uuid(), teamAPoints:0, teamBPoints:0, hands:[], winnerTeam:null,
          startedAt:Date.now(), endedAt:null, isDeleted:false, deletedAt:null};
}
function newMatchday(rotationIndex){
  return {id:uuid(), rotationIndex, date:Date.now(), rounds:[newRound()],
          teamARoundsWon:0, teamBRoundsWon:0, isDeleted:false, deletedAt:null};
}
function newSession(name, variantKey){
  const v = VARIANTS[variantKey] || VARIANTS.ladinisch;
  return {
    id:uuid(), name, variant:v.key, targetPoints:v.defaultTarget,
    players:[1,2,3,4].map(i=>newPlayer(`Spieler ${i}`)),
    matchdays:[newMatchday(0)], currentMatchdayIndex:0,
    tricksA:0, tricksB:0, currentBid:2,
    customTeamA:null, customTeamB:null, customTeamNameA:null, customTeamNameB:null,
    undoStack:[], createdAt:Date.now(),
  };
}

function defaultTeams(rotationIndex){
  switch(((rotationIndex%3)+3)%3){
    case 0:  return {teamA:[0,1], teamB:[2,3]};
    case 1:  return {teamA:[0,2], teamB:[1,3]};
    default: return {teamA:[0,3], teamB:[1,2]};
  }
}

// ─────────────────────────────────────────────────────────────
// Persistence
// ─────────────────────────────────────────────────────────────
const STORE_KEY = "watten_store_v3";
function loadStore(){
  try{
    const raw = localStorage.getItem(STORE_KEY);
    if(!raw) return {sessions:[]};
    const s = JSON.parse(raw);
    if(!s || !Array.isArray(s.sessions)) return {sessions:[]};
    return s;
  }catch(e){ return {sessions:[]}; }
}
function saveStore(){
  try{ localStorage.setItem(STORE_KEY, JSON.stringify(store)); }
  catch(e){ console.warn("Speichern fehlgeschlagen", e); }
}

// ─────────────────────────────────────────────────────────────
// Game logic (Port von GameViewModel) – arbeitet direkt auf einer Session
// ─────────────────────────────────────────────────────────────
const Game = {
  currentMatchday: (s)=> s.matchdays[s.currentMatchdayIndex],
  currentRound:    (s)=> { const md=Game.currentMatchday(s); return md.rounds[md.rounds.length-1]; },
  isRoundOver:     (s)=> Game.currentRound(s).winnerTeam !== null,
  roundNumber:     (s)=> Game.currentMatchday(s).rounds.filter(r=>!r.isDeleted).length,
  canUndo:         (s)=> s.undoStack.length>0,
  lastUndoAction:  (s)=> s.undoStack.length ? s.undoStack[s.undoStack.length-1].action : null,
  undoHistory:     (s)=> s.undoStack.slice().reverse(),
  matchdayNumber:  (s)=> s.currentMatchdayIndex+1,

  teams:(s)=>{
    if(s.customTeamA && s.customTeamB) return {teamA:s.customTeamA, teamB:s.customTeamB};
    return defaultTeams(Game.currentMatchday(s).rotationIndex);
  },
  teamAName:(s)=>{
    if(s.customTeamNameA) return s.customTeamNameA;
    return Game.teams(s).teamA.map(i=>s.players[i].name).join(" & ");
  },
  teamBName:(s)=>{
    if(s.customTeamNameB) return s.customTeamNameB;
    return Game.teams(s).teamB.map(i=>s.players[i].name).join(" & ");
  },
  matchdayDate:(s)=> fmt.dateMedium(Game.currentMatchday(s).date),

  totalRoundsA:(s)=> s.matchdays.filter(m=>!m.isDeleted).reduce((a,m)=>a+m.teamARoundsWon,0),
  totalRoundsB:(s)=> s.matchdays.filter(m=>!m.isDeleted).reduce((a,m)=>a+m.teamBRoundsWon,0),

  playerStats:(s)=>{
    const wins = {}; s.players.forEach(p=>wins[p.id]=0);
    for(const md of s.matchdays){
      if(md.isDeleted) continue;
      const comp = s.customTeamA ? {teamA:s.customTeamA, teamB:s.customTeamB}
                                 : defaultTeams(md.rotationIndex);
      comp.teamA.forEach(i=>wins[s.players[i].id]+=md.teamARoundsWon);
      comp.teamB.forEach(i=>wins[s.players[i].id]+=md.teamBRoundsWon);
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

  // ── mutating actions ──
  snapshot:(s,action)=>{
    s.undoStack.push({
      matchdays:clone(s.matchdays), currentMatchdayIndex:s.currentMatchdayIndex,
      tricksA:s.tricksA, tricksB:s.tricksB, currentBid:s.currentBid,
      customTeamA:s.customTeamA?clone(s.customTeamA):null, customTeamB:s.customTeamB?clone(s.customTeamB):null,
      customTeamNameA:s.customTeamNameA, customTeamNameB:s.customTeamNameB,
      action, timestamp:Date.now(),
    });
    if(s.undoStack.length>30) s.undoStack.shift();
  },
  resetHand:(s)=>{ s.tricksA=0; s.tricksB=0; s.currentBid=2; },
  startNewRound:(s)=>{ Game.currentMatchday(s).rounds.push(newRound()); Game.resetHand(s); },

  addTrick:(s,team)=>{
    if(Game.isRoundOver(s)) return;
    Game.snapshot(s,"addTrick");
    if(team===0) s.tricksA++; else s.tricksB++;
    Haptics.light();
    Game._checkHand(s);
  },
  _checkHand:(s)=>{
    if(s.tricksA>=TRICKS_TO_WIN) Game._award(s,0);
    else if(s.tricksB>=TRICKS_TO_WIN) Game._award(s,1);
  },
  _award:(s,team)=>{
    const bid=s.currentBid;
    const md=Game.currentMatchday(s); const r=md.rounds[md.rounds.length-1];
    r.hands.push({id:uuid(), winnerTeam:team, pointsAwarded:bid, timestamp:Date.now()});
    if(team===0) r.teamAPoints+=bid; else r.teamBPoints+=bid;
    Game.resetHand(s);
    if(r.teamAPoints>=s.targetPoints || r.teamBPoints>=s.targetPoints){
      const w = r.teamAPoints>=s.targetPoints ? 0 : 1;
      r.winnerTeam=w; r.endedAt=Date.now();
      if(w===0) md.teamARoundsWon++; else md.teamBRoundsWon++;
      Haptics.success();
      Game.startNewRound(s);
    }
  },
  increaseBid:(s)=>{
    if(Game.isRoundOver(s)) return;
    Game.snapshot(s,"increaseBid"); s.currentBid++; Haptics.medium();
  },
  undo:(s)=>{
    const snap=s.undoStack.pop(); if(!snap) return;
    s.matchdays=snap.matchdays; s.currentMatchdayIndex=snap.currentMatchdayIndex;
    s.tricksA=snap.tricksA; s.tricksB=snap.tricksB; s.currentBid=snap.currentBid;
    s.customTeamA=snap.customTeamA; s.customTeamB=snap.customTeamB;
    s.customTeamNameA=snap.customTeamNameA; s.customTeamNameB=snap.customTeamNameB;
    Haptics.warning();
  },
  nextRound:(s)=>{
    const r=Game.currentRound(s);
    if(!(Game.isRoundOver(s) || r.teamAPoints>0 || r.teamBPoints>0)) return;
    Game.snapshot(s,"nextRound");
    if(!Game.isRoundOver(s)){
      const md=Game.currentMatchday(s); const rr=md.rounds[md.rounds.length-1];
      if(rr.teamAPoints>=rr.teamBPoints){ rr.winnerTeam=0; md.teamARoundsWon++; }
      else { rr.winnerTeam=1; md.teamBRoundsWon++; }
      // Hinweis: endedAt bleibt bewusst null (wie im Swift-Original) – ein
      // manuell beendetes Spiel zählt nicht in die Ø-Rundendauer.
    }
    Game.startNewRound(s);
  },
  nextMatchday:(s)=>{
    Game.snapshot(s,"nextMatchday");
    s.matchdays.push(newMatchday(Game.currentMatchday(s).rotationIndex+1));
    s.currentMatchdayIndex=s.matchdays.length-1;
    Game.resetHand(s); Haptics.heavy();
  },
  deleteMatchday:(s,id)=>{
    Game.snapshot(s,"deleteMatchday");
    const md=s.matchdays.find(m=>m.id===id); if(!md) return;
    md.isDeleted=true; md.deletedAt=Date.now(); Haptics.warning();
  },
  deleteRound:(s,id)=>{
    Game.snapshot(s,"deleteRound");
    const md=Game.currentMatchday(s);
    const r=md.rounds.find(x=>x.id===id); if(!r) return;
    if(r.winnerTeam!==null){
      if(r.winnerTeam===0) md.teamARoundsWon=Math.max(0,md.teamARoundsWon-1);
      else                 md.teamBRoundsWon=Math.max(0,md.teamBRoundsWon-1);
    }
    r.isDeleted=true; r.deletedAt=Date.now(); Haptics.warning();
  },
  setCustomTeams:(s,teamA,teamB,nameA,nameB)=>{
    Game.snapshot(s,"teamChange");
    s.customTeamA=teamA.slice(); s.customTeamB=teamB.slice();
    s.customTeamNameA=nameA?nameA:null; s.customTeamNameB=nameB?nameB:null;
  },
  updateVariant:(s,variantKey,target)=>{
    Game.snapshot(s,"other"); s.variant=variantKey; s.targetPoints=target;
  },
  updatePlayerName:(s,name,i)=>{ if(i<s.players.length) s.players[i].name=name; },
  updateSessionName:(s,n)=>{ s.name=n; },

  exportText:(s)=>{
    const dt=(ms)=>fmt.dateMedium(ms);
    const tA=Game.teamAName(s), tB=Game.teamBName(s);
    const lines=[
      `🃏 ${s.name} (${VARIANTS[s.variant].name})`,
      `Erstellt: ${dt(s.createdAt)}`,
      `Ziel: ${s.targetPoints} Punkte`, "",
      "═══ GESAMT ═══",
      `${tA}:  ${Game.totalRoundsA(s)} ${roundWord(Game.totalRoundsA(s))}`,
      `${tB}: ${Game.totalRoundsB(s)} ${roundWord(Game.totalRoundsB(s))}`, "",
    ];
    s.matchdays.forEach((md,i)=>{
      if(md.isDeleted) return;
      lines.push(`── Spieltag ${i+1} · ${dt(md.date)} ──`);
      lines.push(`  ${tA} ${md.teamARoundsWon} : ${md.teamBRoundsWon} ${tB}`);
      md.rounds.forEach((r,j)=>{
        if(r.isDeleted) return;
        let row=`  Runde ${j+1}: ${r.teamAPoints}:${r.teamBPoints}`;
        if(r.winnerTeam!==null) row+=` → ${r.winnerTeam===0?tA:tB} ✓`;
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
function commit(){ saveStore(); renderScreen(); scheduleSync(); }

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
  const sessions = store.sessions;
  let body;
  if(sessions.length===0){
    body = `<div class="empty">
      <div class="big">${IC.club}</div>
      <h2>Noch kein Spiel</h2>
      <p>Tippe auf + um ein neues Spiel zu starten.</p>
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
        <button class="iconbtn muted" data-act="data" aria-label="Daten & Backup">${IC.archive}</button>
        <button class="iconbtn" data-act="new" aria-label="Neues Spiel">${IC.plusCircle}</button>
      </div>
    </div>${body}`;
  app.querySelectorAll('[data-act="new"]').forEach(b=>b.onclick=openNewGame);
  app.querySelectorAll('[data-act="data"]').forEach(b=>b.onclick=openDataSheet);
  app.querySelectorAll('[data-sess]').forEach(c=>{
    c.onclick=(e)=>{ if(e.target.closest('[data-del]')) return; openSession(c.dataset.sess); };
  });
  app.querySelectorAll('[data-del]').forEach(b=>{
    b.onclick=(e)=>{ e.stopPropagation(); confirmDeleteSession(b.dataset.del); };
    // long-press / context menu on card
  });
  app.querySelectorAll('[data-sess]').forEach(c=>{
    c.oncontextmenu=(e)=>{ e.preventDefault(); confirmDeleteSession(c.dataset.sess); };
    let t; c.addEventListener('touchstart',()=>{ t=setTimeout(()=>confirmDeleteSession(c.dataset.sess),600); },{passive:true});
    ['touchend','touchmove','touchcancel'].forEach(ev=>c.addEventListener(ev,()=>clearTimeout(t),{passive:true}));
  });
}

function sessionCard(s){
  const totalA=s.matchdays.filter(m=>!m.isDeleted).reduce((a,m)=>a+m.teamARoundsWon,0);
  const totalB=s.matchdays.filter(m=>!m.isDeleted).reduce((a,m)=>a+m.teamBRoundsWon,0);
  const rot=s.matchdays[s.currentMatchdayIndex].rotationIndex;
  const comp = (s.customTeamA&&s.customTeamB) ? {teamA:s.customTeamA,teamB:s.customTeamB} : defaultTeams(rot);
  const nameA = s.customTeamNameA || comp.teamA.map(i=>s.players[i].name).join(" & ");
  const nameB = s.customTeamNameB || comp.teamB.map(i=>s.players[i].name).join(" & ");
  const md=s.matchdays[s.currentMatchdayIndex];
  const ar=md.rounds.filter(r=>!r.isDeleted).length;
  return `<button class="sess-card" data-sess="${s.id}">
    <div class="ctx-del" data-del="${s.id}">${IC.trash}</div>
    <div class="sc-top">
      <div class="sc-name">${esc(s.name)}</div>
      <div class="sc-date">${fmt.dateShort(s.createdAt)}</div>
    </div>
    <div class="variant-badge">${esc(VARIANTS[s.variant].name)}</div>
    <hr class="divider">
    <div class="sc-vs">
      <div class="sc-side"><div class="sc-team a">${esc(nameA)}</div><div class="sc-score">${totalA}</div></div>
      <div class="sc-mid">vs</div>
      <div class="sc-side r"><div class="sc-team b">${esc(nameB)}</div><div class="sc-score">${totalB}</div></div>
    </div>
    <div class="sc-foot">Spieltag ${s.currentMatchdayIndex+1} · ${roundLabel(ar)}</div>
  </button>`;
}

// ── GAME ──
function renderGame(){
  const s=currentSession();
  if(!s){ view.screen="home"; return renderHome(); }
  const streak=Game.currentStreak(s);
  const over=Game.isRoundOver(s);
  const r=Game.currentRound(s);
  const canUndo=Game.canUndo(s);
  const tgt=s.targetPoints;

  const scoreCol=(side,name,pts,won)=>{
    const frac=Math.min(1,pts/tgt);
    const dots=Array.from({length:Math.max(1,won+1)},(_,i)=>`<i class="${i<won?'on':''}"></i>`).join("");
    return `<div class="score-col ${side}">
      <div class="tn">${esc(name)}</div>
      <div class="pts">${pts}</div>
      <div class="progress"><span style="width:${(frac*100).toFixed(1)}%"></span></div>
      <div class="tgt">/ ${tgt}</div>
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

  app.innerHTML = `
  <div class="topbar game">
    <button class="iconbtn muted" data-back aria-label="Zurück" style="color:var(--gold)">
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
    </button>
    <div class="title">${esc(s.name)}</div>
    <div class="tb-actions">
      <button class="iconbtn ${canUndo?'':'muted'}" data-open="undo" aria-label="Verlauf">${IC.history}</button>
      <button class="iconbtn" data-open="teams" aria-label="Teams">${IC.shuffle}</button>
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
    </div>

    ${!over?`
    <div>
      <div class="row2">
        <button class="bigbtn btn-a" data-trick="0"><span class="ic">${IC.hand}</span>+ Stich</button>
        <button class="bigbtn btn-b" data-trick="1"><span class="ic">${IC.hand}</span>+ Stich</button>
      </div>
      <div class="trick-labels"><span class="a">${esc(tA)}</span><span class="b">${esc(tB)}</span></div>
    </div>`:''}

    <div class="row2">
      ${!over?`<button class="bigbtn btn-gold" data-bid><span class="ic">${IC.arrowUp}</span>Bieten (${s.currentBid+1})</button>`:''}
      <button class="undo-btn ${canUndo?'':'dim'}" data-undo ${canUndo?'':'disabled'}>
        ${IC.undo}<span class="txt"><span class="t1">Rückgängig</span>${canUndo?`<span class="t2">${esc(UNDO_LABEL[Game.lastUndoAction(s)])}</span>`:''}</span>
      </button>
    </div>

    <hr class="divider">
    <div class="row2">
      <button class="bigbtn btn-border" data-next><span class="ic">${IC.arrowRight}</span>Nächste Runde</button>
      <button class="bigbtn btn-danger" data-newmd><span class="ic">${IC.flag}</span>Neuer Spieltag</button>
    </div>
  </div></div>`;

  $('[data-back]',app).onclick=()=>{ view.screen="home"; renderHome(); };
  app.querySelectorAll('[data-trick]').forEach(b=>b.onclick=()=>{ Game.addTrick(s,+b.dataset.trick); commit(); });
  const bid=$('[data-bid]',app); if(bid) bid.onclick=()=>{ Game.increaseBid(s); commit(); };
  $('[data-undo]',app).onclick=()=>{ if(!canUndo)return; Game.undo(s); commit(); };
  $('[data-next]',app).onclick=()=>{ Game.nextRound(s); commit(); };
  $('[data-newmd]',app).onclick=()=>confirmNewMatchday(s);
  $('[data-share]',app).onclick=()=>shareSession(s);
  app.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>openSheet(b.dataset.open,s));
}

function openSession(id){
  const s=store.sessions.find(x=>x.id===id);
  // Sicherung wie Swift ensureRound(): aktueller Spieltag hat immer >=1 Runde
  if(s){ const md=s.matchdays[s.currentMatchdayIndex];
    if(md && md.rounds.length===0){ md.rounds.push(newRound()); saveStore(); } }
  view.sessionId=id; view.screen="game"; renderGame();
}

// ─────────────────────────────────────────────────────────────
// Sheets / Modals
// ─────────────────────────────────────────────────────────────
const modalRoot=$("#modal-root");

function sheetShell({title, lead, trail, body, wide}){
  const el=document.createElement('div');
  el.innerHTML=`
  <div class="sheet-back"></div>
  <div class="sheet" role="dialog" aria-modal="true">
    <div class="sheet-bar"><div class="grip"></div>
      <div class="sheet-lead">${lead||''}</div>
      <div class="sheet-title">${esc(title)}</div>
      <div class="sheet-trail">${trail||''}</div>
    </div>
    <div class="sheet-body ${wide?'wide':''}">${body}</div>
  </div>`;
  modalRoot.appendChild(el);
  const back=$('.sheet-back',el), sheet=$('.sheet',el);
  requestAnimationFrame(()=>{ back.classList.add('open'); sheet.classList.add('open'); });
  const close=()=>{ back.classList.remove('open'); sheet.classList.remove('open');
    setTimeout(()=>el.remove(),280); };
  back.onclick=close;
  return {el, close};
}

function openSheet(kind,s){
  if(kind==="settings") return openSettings(s);
  if(kind==="stats")    return openStats(s);
  if(kind==="teams")    return openTeams(s);
  if(kind==="undo")     return openUndo(s);
}

// ── New game ──
function openNewGame(){
  let name="", variant="ladinisch";
  const variantOpts=()=>VARIANT_ORDER.map(k=>{
    const v=VARIANTS[k];
    return `<button class="variant-opt ${k===variant?'sel':''}" data-v="${k}">
      <div class="vo-txt"><div class="vo-name">${esc(v.name)}</div><div class="vo-desc">${esc(v.desc)}</div></div>
      ${k===variant?`<span class="vo-check">${IC.check}</span>`:''}
    </button>`;
  }).join("");
  const body=`
    <div class="section">
      <p class="field-lbl">Spielname</p>
      <input class="txtfield" id="ng-name" placeholder="z.B. Stammtisch Freitag" autocomplete="off">
    </div>
    <div class="section">
      <p class="field-lbl">Spielvariante</p>
      <div id="ng-variants">${variantOpts()}</div>
    </div>`;
  const {el,close}=sheetShell({
    title:"Neues Spiel",
    lead:`<button id="ng-cancel">Abbrechen</button>`,
    trail:`<button id="ng-create">Erstellen</button>`,
    body,
  });
  const nameInput=$('#ng-name',el);
  nameInput.oninput=e=>name=e.target.value;
  const rewire=()=>$('#ng-variants',el).querySelectorAll('[data-v]').forEach(b=>b.onclick=()=>{
    variant=b.dataset.v; $('#ng-variants',el).innerHTML=variantOpts(); rewire(); });
  rewire();
  $('#ng-cancel',el).onclick=close;
  $('#ng-create',el).onclick=()=>{
    const nm = name.trim()||`Spiel ${store.sessions.length+1}`;
    const s=newSession(nm,variant);
    store.sessions.push(s); saveStore();
    close(); openSession(s.id);
  };
}

// ── Settings ──
function openSettings(s){
  let names=s.players.map(p=>p.name);
  let sessionName=s.name, variant=s.variant, target=s.targetPoints;
  const variantOpts=()=>VARIANT_ORDER.map(k=>{
    const v=VARIANTS[k];
    return `<button class="variant-opt ${k===variant?'sel':''}" data-v="${k}">
      <div class="vo-txt"><div class="vo-name">${esc(v.name)}</div><div class="vo-desc">${esc(v.desc)}</div></div>
      ${k===variant?`<span class="vo-check">${IC.check}</span>`:''}
    </button>`;
  }).join("");
  const nameRows=()=>names.map((n,i)=>`
    <div class="name-row"><span class="num">${i+1}.</span>
      <input data-name="${i}" value="${esc(n)}" placeholder="Spieler ${i+1}" autocomplete="off"></div>`).join("");
  const body=`
    <div class="section"><p class="field-lbl">Spielname</p>
      <input class="txtfield" id="st-name" value="${esc(sessionName)}"></div>
    <div class="section"><p class="field-lbl">Spielvariante</p><div id="st-variants">${variantOpts()}</div></div>
    <div class="section"><p class="field-lbl">Zielpunkte</p>
      <div class="stepper"><span class="val" id="st-target">Bis ${target} Punkte</span>
        <div class="ctrls"><button id="st-minus">−</button><span class="sepv"></span><button id="st-plus">+</button></div></div>
      <p class="hint" id="st-hint">Standard für ${esc(VARIANTS[variant].name)}: ${VARIANTS[variant].defaultTarget} Punkte</p>
    </div>
    <div class="section"><p class="field-lbl">Spielernamen</p><div id="st-names">${nameRows()}</div></div>`;
  const {el,close}=sheetShell({ title:"Einstellungen", trail:`<button id="st-done">Fertig</button>`, body });

  $('#st-name',el).oninput=e=>sessionName=e.target.value;
  const rewireV=()=>$('#st-variants',el).querySelectorAll('[data-v]').forEach(b=>b.onclick=()=>{
    variant=b.dataset.v; target=VARIANTS[variant].defaultTarget;
    $('#st-variants',el).innerHTML=variantOpts(); rewireV();
    $('#st-target',el).textContent=`Bis ${target} Punkte`;
    $('#st-hint',el).textContent=`Standard für ${VARIANTS[variant].name}: ${VARIANTS[variant].defaultTarget} Punkte`;
  });
  rewireV();
  const setT=(d)=>{ target=Math.min(30,Math.max(5,target+d)); $('#st-target',el).textContent=`Bis ${target} Punkte`; };
  $('#st-minus',el).onclick=()=>setT(-1); $('#st-plus',el).onclick=()=>setT(1);
  const bindNames=()=>$('#st-names',el).querySelectorAll('[data-name]').forEach(inp=>{
    inp.oninput=e=>names[+inp.dataset.name]=e.target.value; });
  bindNames();
  $('#st-done',el).onclick=()=>{
    Game.updateSessionName(s,sessionName);
    Game.updateVariant(s,variant,target);
    names.forEach((n,i)=>{ if(n.trim()!=="") Game.updatePlayerName(s,n,i); });
    saveStore(); close(); renderGame();
  };
}

// ── Team setup ──
function openTeams(s){
  let teamA=(s.customTeamA?s.customTeamA.slice():[0,1]);
  let teamB=(s.customTeamB?s.customTeamB.slice():[2,3]);
  let nameA=s.customTeamNameA||"", nameB=s.customTeamNameB||"";
  const editor=(side,team,other)=>{
    const rows=team.map(idx=>`
      <div class="player-row ${side}"><span class="pi">${IC.person}</span>
        <span class="pn">${esc(s.players[idx].name)}</span>
        <button class="swap" data-swap="${idx}" data-side="${side}">${IC.swap}</button></div>`).join("");
    return `<div class="team-edit ${side}"><div class="te-lbl">${side==='a'?'Team A':'Team B'}</div>${rows}</div>`;
  };
  const renderEditors=()=>editor('a',teamA,teamB)+editor('b',teamB,teamA);
  const body=`
    <div class="info-box"><span class="i">${IC.info}</span>Tippe auf ⇄ um einen Spieler zu wechseln.</div>
    <div id="te-editors">${renderEditors()}</div>
    <div class="section" style="margin-top:0"><p class="field-lbl">Teamnamen (optional)</p>
      <div class="names2">
        <input class="a" id="te-nameA" value="${esc(nameA)}" placeholder="Team A">
        <input class="b" id="te-nameB" value="${esc(nameB)}" placeholder="Team B"></div></div>
    <button class="dice-btn" id="te-dice">${IC.dice}Zufällig auswürfeln</button>`;
  const {el,close}=sheetShell({
    title:"Teams einstellen", wide:true,
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
    const i=[0,1,2,3].sort(()=>Math.random()-.5); teamA=[i[0],i[1]]; teamB=[i[2],i[3]];
    Haptics.medium(); $('#te-editors',el).innerHTML=renderEditors(); rewire();
  };
  $('#te-cancel',el).onclick=close;
  $('#te-apply',el).onclick=()=>{
    Game.setCustomTeams(s,teamA,teamB,nameA.trim(),nameB.trim());
    saveStore(); close(); renderGame();
  };
}

// ── Undo history ──
function openUndo(s){
  const undoIcon={addTrick:IC.hand,increaseBid:IC.arrowUp,nextRound:IC.arrowRight,
    nextMatchday:IC.flag,teamChange:IC.shuffle,deleteRound:IC.trash,deleteMatchday:IC.trash,other:IC.pencil};
  const undoColor={addTrick:COL.teamA,increaseBid:COL.gold,nextRound:COL.border,
    nextMatchday:"#C44B4B",teamChange:"#8A9E8A",deleteRound:"#C44B4B",deleteMatchday:"#C44B4B",other:"#8A9E8A"};
  const hist=Game.undoHistory(s);
  const body = hist.length===0
    ? `<div class="empty-mini"><span class="big">${IC.clock}</span><span>Keine Aktionen</span></div>`
    : `<div style="padding-top:8px">${hist.map((snap,idx)=>`
        <div class="undo-item">
          <span class="ci" style="background:${undoColor[snap.action]}">${undoIcon[snap.action]}</span>
          <div class="ut"><div class="u1">${esc(UNDO_LABEL[snap.action])}</div><div class="u2">${fmt.timeMedium(snap.timestamp)}</div></div>
          ${idx===0?'<span class="now">Aktuell</span>':''}
        </div>`).join("")}</div>`;
  const {el,close}=sheetShell({
    title:"Verlauf / Undo",
    lead:`<button id="uh-close">Schließen</button>`,
    trail: Game.canUndo(s)?`<button id="uh-undo">Rückgängig</button>`:'',
    body,
  });
  $('#uh-close',el).onclick=close;
  const u=$('#uh-undo',el); if(u) u.onclick=()=>{ Game.undo(s); saveStore(); close(); renderGame(); };
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
  const comp = s.customTeamA ? {teamA:s.customTeamA,teamB:s.customTeamB} : defaultTeams(md.rotationIndex);
  const nA = s.customTeamNameA || comp.teamA.map(i=>s.players[i].name).join(" & ");
  const nB = s.customTeamNameB || comp.teamB.map(i=>s.players[i].name).join(" & ");
  let rounds="";
  if(!md.isDeleted){
    rounds=md.rounds.map((r,rIdx)=>{
      if(r.isDeleted){
        return `<div class="round-row del"><span style="color:rgba(196,75,75,.6)">${IC.trash}</span>
          <span class="rl strike">Runde ${rIdx+1} – gelöscht</span></div>`;
      }
      const dur = r.endedAt!=null ? `<div class="rt">${Math.floor((r.endedAt-r.startedAt)/60000)}m ${Math.floor((r.endedAt-r.startedAt)/1000)%60}s</div>`:'';
      const crown = r.winnerTeam!==null ? `<span class="crown ${r.winnerTeam===0?'a':'b'}">${IC.crown}</span>`:'';
      const delBtn = (r.winnerTeam!==null||r.teamAPoints>0||r.teamBPoints>0)
        ? `<button class="trash-btn" data-delr="${r.id}" style="width:auto">${IC.trash}</button>`:'';
      return `<div class="round-row">
        <div class="rinfo"><span class="rl">Runde ${rIdx+1}</span><div class="rt">${fmt.timeShort(r.startedAt)}</div>${dur}</div>
        <span class="pa">${r.teamAPoints}</span><span class="col">:</span><span class="pb">${r.teamBPoints}</span>${crown}${delBtn}
      </div>`;
    }).join("");
  }
  const head = md.isDeleted
    ? `<span class="del-badge">${IC.trash}Gelöscht${md.deletedAt?' · '+fmt.dateShort(md.deletedAt):''}</span>`
    : `<span class="mdt">${fmt.dateMedium(md.date)}</span><button class="trash-btn" data-delmd="${md.id}">${IC.trash}</button>`;
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

  return `
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
          ${md.isDeleted?`<span style="color:rgba(196,75,75,.6)">${IC.trash}</span>`:''}
          <span style="flex:1"></span>
          <span style="font-weight:700;color:${md.isDeleted?'var(--muted)':'var(--teamA)'}">${md.teamARoundsWon}</span>
          <span class="col" style="color:var(--muted)">:</span>
          <span style="font-weight:700;color:${md.isDeleted?'var(--muted)':'var(--teamB)'}">${md.teamBRoundsWon}</span>${win}
        </div>`;
      }).join("")}
    </div>
  </div>`;
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
      const ha=Math.max(4,H*m.teamARoundsWon/maxV), hb=Math.max(4,H*m.teamBRoundsWon/maxV);
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
  const grid=[0.25,0.5,0.75,1.0].map(f=>`<line x1="0" y1="${H*(1-f)}" x2="${W}" y2="${H*(1-f)}" stroke="var(--border)" stroke-opacity="0.5" stroke-width="0.5"/>`).join("");
  const poly=(pts,col)=>{
    const n=pts.length; if(n<2) return '';
    const coords=pts.map((v,i)=>[W*i/(n-1), H*(1-v/d.maxV)]);
    const path=coords.map((c,i)=>(i===0?'M':'L')+c[0].toFixed(1)+','+c[1].toFixed(1)).join(' ');
    const dots=coords.map(c=>`<circle cx="${c[0].toFixed(1)}" cy="${c[1].toFixed(1)}" r="3.5" fill="${col}"/>`).join('');
    return `<path d="${path}" fill="none" stroke="${col}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>${dots}`;
  };
  return `<div class="panel"><div class="cardtitle" style="font-size:13px">Kumulierte Runden (Gesamt)</div>
    <svg viewBox="0 0 ${W} ${H}" width="100%" height="120" preserveAspectRatio="none">${grid}${poly(d.a,COL.teamA)}${poly(d.b,COL.teamB)}</svg>
    ${legend(tA,tB)}</div>`;
}
function donutChart(s){
  const stats=Game.playerStats(s).slice().sort((a,b)=>b.roundsWon-a.roundsWon);
  const total=Math.max(1,stats.reduce((a,x)=>a+x.roundsWon,0));
  const palette=[COL.teamA,COL.teamB,COL.gold,COL.green2];
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
          <div style="font-size:22px;font-weight:800;color:var(--cream)">${realTotal}</div>
          <div style="font-size:10px;color:var(--muted)">Runden</div></div>
      </div>
      <div class="donut-legend">${legendRows}</div>
    </div></div>`;
}

// ─────────────────────────────────────────────────────────────
// Alerts / confirms
// ─────────────────────────────────────────────────────────────
function alertDialog({title,message,confirmLabel,destructive,onConfirm,cancelLabel}){
  const el=document.createElement('div');
  el.className='alert-back';
  el.innerHTML=`<div class="alert"><div class="at">${esc(title)}</div>
    ${message?`<div class="am">${esc(message)}</div>`:''}
    <div class="ab">
      <button class="cancel">${esc(cancelLabel||'Abbrechen')}</button>
      <button class="${destructive?'destructive':''} ok">${esc(confirmLabel)}</button>
    </div></div>`;
  modalRoot.appendChild(el);
  requestAnimationFrame(()=>el.classList.add('open'));
  const close=()=>{ el.classList.remove('open'); setTimeout(()=>el.remove(),200); };
  $('.cancel',el).onclick=close;
  $('.ok',el).onclick=()=>{ close(); onConfirm&&onConfirm(); };
  el.onclick=(e)=>{ if(e.target===el) close(); };
}
function confirmDeleteSession(id){
  alertDialog({title:"Spiel löschen?", message:"Alle Daten dieses Spiels werden dauerhaft gelöscht.",
    confirmLabel:"Löschen", destructive:true, onConfirm:()=>{
      store.sessions=store.sessions.filter(x=>x.id!==id); saveStore(); renderHome(); }});
}
function confirmNewMatchday(s){
  alertDialog({title:"Neuer Spieltag?", message:"Der aktuelle Spieltag wird abgeschlossen und ein neuer gestartet.",
    confirmLabel:"Neuer Spieltag", destructive:true, onConfirm:()=>{ Game.nextMatchday(s); commit(); }});
}
function confirmDeleteMatchday(s,id,after){
  alertDialog({title:"Spieltag löschen?", message:"Spieltag wird als gelöscht markiert und aus der Wertung entfernt.",
    confirmLabel:"Löschen", destructive:true, onConfirm:()=>{ Game.deleteMatchday(s,id); saveStore(); after&&after(); }});
}
function confirmDeleteRound(s,id,after){
  alertDialog({title:"Runde löschen?", message:"Runde wird aus der Wertung entfernt.",
    confirmLabel:"Löschen", destructive:true, onConfirm:()=>{ Game.deleteRound(s,id); saveStore(); after&&after(); }});
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
function parseBackup(raw){
  const data=JSON.parse(raw);
  const sessions = (data && data.store && Array.isArray(data.store.sessions)) ? data.store.sessions
                 : Array.isArray(data && data.sessions) ? data.sessions : null;
  if(!sessions) throw new Error("Kein gültiges Watten-Backup.");
  return sessions;
}
function importBackup(file, mode){ // mode: 'merge' | 'replace'
  const reader=new FileReader();
  reader.onload=()=>{
    try{
      const incoming=parseBackup(reader.result);
      if(mode==="replace"){ store.sessions=incoming; }
      else { const byId={}; store.sessions.forEach(s=>byId[s.id]=s); incoming.forEach(s=>byId[s.id]=s); store.sessions=Object.values(byId); }
      saveStore(); toast(`${incoming.length} Spiel(e) importiert`); renderHome();
    }catch(e){ toast("Import fehlgeschlagen: "+e.message); }
  };
  reader.onerror=()=>toast("Datei konnte nicht gelesen werden");
  reader.readAsText(file);
}
// CSV: eine Zeile pro Runde über alle Spiele – gut für Tabellen/Obsidian
function exportAllCSV(){
  const csvEsc=(v)=>{ const t=String(v??""); return /[";\n]/.test(t) ? '"'+t.replace(/"/g,'""')+'"' : t; };
  const rows=[["Spiel","Variante","Ziel","Spieltag","Datum","Runde","Startzeit","Endzeit","Dauer_s","PunkteA","PunkteB","Gewinner","TeamA","TeamB","Geloescht"]];
  const iso=(ms)=> ms==null ? "" : new Date(ms).toISOString();
  for(const s of store.sessions){
    const tA=Game.teamAName(s), tB=Game.teamBName(s);
    s.matchdays.forEach((md,mi)=>{
      md.rounds.forEach((r,ri)=>{
        rows.push([
          s.name, VARIANTS[s.variant].name, s.targetPoints, mi+1, iso(md.date), ri+1,
          iso(r.startedAt), iso(r.endedAt), r.endedAt!=null?Math.round((r.endedAt-r.startedAt)/1000):"",
          r.teamAPoints, r.teamBPoints,
          r.winnerTeam==null ? "" : (r.winnerTeam===0?tA:tB), tA, tB,
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
function loadSyncCfg(){
  try{ const c=JSON.parse(localStorage.getItem(SYNC_KEY)); return c&&typeof c==="object" ? c : {url:"",token:"",lastSync:null}; }
  catch(e){ return {url:"",token:"",lastSync:null}; }
}
function saveSyncCfg(){ try{ localStorage.setItem(SYNC_KEY, JSON.stringify(syncCfg)); }catch(e){} }
let syncCfg = loadSyncCfg();
const syncConfigured = ()=> !!(syncCfg.url && syncCfg.token);
function syncEndpoint(path){ return syncCfg.url.replace(/\/+$/,"") + path; }

let syncTimer=null, syncBusy=false;
function scheduleSync(){
  if(!syncConfigured()) return;
  clearTimeout(syncTimer);
  syncTimer=setTimeout(syncPush, 2500);
}
async function syncPush(silent){
  if(!syncConfigured() || syncBusy) return;
  syncBusy=true;
  const payload={ app:"watten-tracker", schema:BACKUP_SCHEMA, exportedAt:Date.now(), store };
  try{
    const res=await fetch(syncEndpoint("/backup"),{
      method:"POST",
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
  }finally{ syncBusy=false; }
}
async function syncPull(){
  if(!syncConfigured()) return toast("Sync nicht konfiguriert");
  try{
    const res=await fetch(syncEndpoint("/backup"),{ headers:{ "Authorization":"Bearer "+syncCfg.token } });
    if(!res.ok) throw new Error("HTTP "+res.status);
    const incoming=parseBackup(await res.text());
    const byId={}; store.sessions.forEach(s=>byId[s.id]=s); incoming.forEach(s=>byId[s.id]=s); store.sessions=Object.values(byId);
    saveStore(); renderHome();
    toast(`${incoming.length} Spiel(e) vom Home-Lab geladen`);
  }catch(e){ toast("Laden fehlgeschlagen: "+e.message); }
}
function renderSyncStatus(err){
  const el=document.getElementById("sync-status");
  if(!el) return;
  if(err){ el.textContent="⚠ Sync fehlgeschlagen: "+err; el.style.color="var(--danger)"; }
  else if(syncCfg.lastSync){ el.textContent="Zuletzt gesynct: "+fmt.timeShort(syncCfg.lastSync); el.style.color="var(--streak)"; }
  else{ el.textContent="Noch nicht synchronisiert"; el.style.color="var(--muted)"; }
}

function openDataSheet(){
  const games=store.sessions.length;
  const rounds=store.sessions.reduce((a,s)=>a+s.matchdays.reduce((x,m)=>x+m.rounds.length,0),0);
  const body=`
    <div class="info-box" style="margin-top:8px"><span class="i">${IC.shield}</span>
      Alle Daten liegen nur auf diesem Gerät (localStorage). Exportiere regelmäßig ein Backup –
      z.B. auf dein NAS oder in deinen Obsidian-Vault.</div>
    <div class="panel" style="margin-bottom:16px">
      <div class="cardtitle">Aktuell aufgezeichnet</div>
      <div style="display:flex;gap:24px">
        <div class="stat-block"><span class="sv">${games}</span><span class="ss">${games===1?'Spiel':'Spiele'}</span></div>
        <div class="stat-block"><span class="sv">${rounds}</span><span class="ss">${rounds===1?'Runde':'Runden'} gesamt</span></div>
      </div>
    </div>
    <button class="dice-btn" id="d-export" style="margin-top:0">${IC.download}Backup exportieren (JSON)</button>
    <button class="dice-btn" id="d-csv" style="background:var(--surface);color:var(--cream);border:1px solid var(--border)">${IC.table}Alle Runden als CSV</button>
    <div style="height:14px"></div>
    <p class="field-lbl">Backup importieren</p>
    <button class="dice-btn" id="d-merge" style="background:var(--surface);color:var(--cream);border:1px solid var(--border)">${IC.upload}Zusammenführen (empfohlen)</button>
    <button class="dice-btn" id="d-replace" style="background:var(--surface);color:var(--danger);border:1px solid rgba(196,75,75,.4)">${IC.upload}Alles ersetzen</button>
    <input type="file" id="d-file" accept="application/json,.json" style="display:none">
    <p class="hint">Zusammenführen fügt Spiele hinzu bzw. aktualisiert gleiche; Ersetzen überschreibt alles auf diesem Gerät.</p>
    <div style="height:22px"></div>
    <p class="field-lbl">${IC.cloud} Home-Lab Sync (optional)</p>
    <div class="section">
      <input class="txtfield" id="sy-url" placeholder="https://dein-name.duckdns.org" autocomplete="off" autocapitalize="off" spellcheck="false" value="${esc(syncCfg.url)}">
    </div>
    <div class="section">
      <input class="txtfield" id="sy-token" type="password" placeholder="Token" autocomplete="off" autocapitalize="off" spellcheck="false" value="${esc(syncCfg.token)}">
    </div>
    <button class="dice-btn" id="sy-save" style="margin-top:0">${IC.check}Sync-Zugang speichern</button>
    <div style="display:flex;gap:10px;margin-top:10px">
      <button class="dice-btn" id="sy-push" style="flex:1;background:var(--surface);color:var(--cream);border:1px solid var(--border)">${IC.upload}Jetzt sichern</button>
      <button class="dice-btn" id="sy-pull" style="flex:1;background:var(--surface);color:var(--cream);border:1px solid var(--border)">${IC.download}Von Server laden</button>
    </div>
    <p class="hint" id="sync-status">${syncCfg.lastSync?"Zuletzt gesynct: "+fmt.timeShort(syncCfg.lastSync):"Noch nicht synchronisiert"}</p>
    <p class="hint">URL und Token bleiben nur in diesem Browser gespeichert, nie im App-Code. Nach jeder Änderung wird automatisch ein Backup an deinen eigenen Server geschickt.</p>`;
  const {el,close}=sheetShell({ title:"Daten & Backup", trail:`<button id="d-done">Fertig</button>`, body });
  let pendingMode="merge";
  const fileInput=$('#d-file',el);
  fileInput.onchange=(e)=>{ const f=e.target.files&&e.target.files[0]; if(f){ importBackup(f,pendingMode); close(); } e.target.value=""; };
  $('#d-done',el).onclick=close;
  $('#d-export',el).onclick=exportBackup;
  $('#d-csv',el).onclick=exportAllCSV;
  $('#d-merge',el).onclick=()=>{ pendingMode="merge"; fileInput.click(); };
  $('#d-replace',el).onclick=()=>{
    alertDialog({title:"Alles ersetzen?", message:"Alle Spiele auf diesem Gerät werden durch das Backup ersetzt.",
      confirmLabel:"Datei wählen", destructive:true, onConfirm:()=>{ pendingMode="replace"; fileInput.click(); }});
  };
  $('#sy-save',el).onclick=()=>{
    syncCfg.url=$('#sy-url',el).value.trim();
    syncCfg.token=$('#sy-token',el).value.trim();
    saveSyncCfg();
    toast(syncConfigured() ? "Sync-Zugang gespeichert" : "Sync-Zugang entfernt");
  };
  $('#sy-push',el).onclick=()=>{
    syncCfg.url=$('#sy-url',el).value.trim(); syncCfg.token=$('#sy-token',el).value.trim(); saveSyncCfg();
    if(!syncConfigured()) return toast("Bitte URL und Token eintragen");
    syncPush(false);
  };
  $('#sy-pull',el).onclick=()=>{
    syncCfg.url=$('#sy-url',el).value.trim(); syncCfg.token=$('#sy-token',el).value.trim(); saveSyncCfg();
    if(!syncConfigured()) return toast("Bitte URL und Token eintragen");
    alertDialog({title:"Vom Server laden?", message:"Spiele vom Home-Lab werden mit denen auf diesem Gerät zusammengeführt.",
      confirmLabel:"Laden", onConfirm:syncPull});
  };
}

let toastTimer;
function toast(msg){
  const t=$("#toast"); t.textContent=msg; t.classList.add("show");
  clearTimeout(toastTimer); toastTimer=setTimeout(()=>t.classList.remove("show"),2200);
}

// ─────────────────────────────────────────────────────────────
// Boot
// ─────────────────────────────────────────────────────────────
renderScreen();
