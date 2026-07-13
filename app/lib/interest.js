// Purdue game interest score, 0-100, from raw stored factors only
// (rank, home/away, conference flag) plus config lists. Computed at render
// so weight edits in config.json re-score instantly (tribunal condition 7).

/** Rough team strength 0-30 from AP/coaches rank, config tiers as fallback. */
function strength(rank, name, cfg) {
  if (rank && rank >= 1 && rank <= 30) return 30 - rank + 1;
  const premium = (cfg.premiumPrograms || []).some((p) => name.includes(p));
  if (premium) return 14;
  return 6;
}

/** Win probability heuristic from strength differential plus home edge. */
export function winProbability(game, purdueRank, cfg) {
  const us = strength(purdueRank, "Purdue", cfg);
  const them = strength(game.opponentRank, game.opponent, cfg);
  let p = 0.5 + (us - them) * 0.02;
  p += game.home ? 0.08 : -0.08;
  return Math.min(0.95, Math.max(0.05, p));
}

function rivalryPts(opponent, cfg, max) {
  const rivals = cfg.rivals || {};
  for (const [name, val] of Object.entries(rivals)) {
    if (opponent.includes(name) || name.includes(opponent)) return Math.round((val / 100) * max);
  }
  return 0;
}

/**
 * Factors (weights from config, default 25/25/25/15/10):
 *  - winnable: likely wins score higher (he wants to see Purdue win)
 *  - closeness: toss-ups score higher, blowouts either way are penalized
 *  - rivalry: config-listed rivals
 *  - opponentQuality: ranked or premium program
 *  - demand: slow-moving ticket-demand tier (rival/premium/ranked > conference > other)
 */
export function interestScore(game, purdueRank, cfg, weights) {
  const w = weights || { winnable: 25, closeness: 25, rivalry: 25, opponentQuality: 15, demand: 10 };
  const p = winProbability(game, purdueRank, cfg);
  const rPts = rivalryPts(game.opponent, cfg, w.rivalry);
  const oppRanked = game.opponentRank && game.opponentRank <= 25;
  const premium = (cfg.premiumPrograms || []).some((x) => game.opponent.includes(x));

  let qPts = 0;
  if (game.opponentRank && game.opponentRank <= 5) qPts = w.opponentQuality;
  else if (game.opponentRank && game.opponentRank <= 15) qPts = Math.round(w.opponentQuality * 0.8);
  else if (oppRanked) qPts = Math.round(w.opponentQuality * 0.6);
  else if (premium) qPts = Math.round(w.opponentQuality * 0.5);
  else if (game.conferenceGame) qPts = Math.round(w.opponentQuality * 0.3);

  const demandTier = rPts > 0 || oppRanked || premium ? 1 : game.conferenceGame ? 0.6 : 0.2;

  const factors = [
    { label: `win chance ~${Math.round(p * 100)}%`, pts: Math.round(w.winnable * p), max: w.winnable },
    { label: p > 0.35 && p < 0.65 ? "projected close game" : "projected one-sided", pts: Math.round(w.closeness * (1 - Math.abs(p - 0.5) * 2)), max: w.closeness },
    { label: rPts > 0 ? "rivalry game" : "not a rival", pts: rPts, max: w.rivalry },
    { label: game.opponentRank ? `opponent ranked #${game.opponentRank}` : premium ? "premium program" : game.conferenceGame ? "conference opponent" : "non-conference filler", pts: qPts, max: w.opponentQuality },
    { label: demandTier === 1 ? "high ticket demand" : demandTier === 0.6 ? "moderate ticket demand" : "low ticket demand", pts: Math.round(w.demand * demandTier), max: w.demand },
  ];
  const score = Math.min(100, factors.reduce((s, f) => s + f.pts, 0));
  return { score, factors, winProbability: p };
}
