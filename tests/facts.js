// Was ein Nutzer von einem Spielstand sieht – unabhängig vom Speicherformat.
// Damit prüfen die Tests, dass beim Übernehmen älterer Daten und beim Teilen
// nichts verloren geht oder sich verändert.
"use strict";
module.exports = function facts(store) {
  return store.sessions.map((s) => ({
    name: s.name, variant: s.variant, target: s.targetPoints, quick: !!s.quickMode,
    players: s.players.map((p) => p.name),
    live: [s.tricksA, s.tricksB, s.currentBid],
    matchdays: s.matchdays.map((m) => ({
      deleted: !!m.isDeleted, won: [m.teamARoundsWon, m.teamBRoundsWon],
      teams: [m.teams.teamA, m.teams.teamB, m.teams.nameA || null, m.teams.nameB || null],
      rounds: m.rounds.map((r) => ({
        points: [r.teamAPoints, r.teamBPoints], winner: r.winnerTeam, schneider: !!r.schneider,
        closed: !!r.closed, deleted: !!r.isDeleted,
        hands: r.hands.filter((h) => !h.rest).map((h) => [h.winnerTeam, h.pointsAwarded]),
      })),
    })),
  })).sort((a, b) => a.name.localeCompare(b.name));
};
