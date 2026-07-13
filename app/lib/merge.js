// Tennis merge: fold one day of ESPN ATP scoreboard into the season file.
// Pure function, no fetch (tribunal conditions 6 + 8 and the fill-only rule):
//  - join on captured espnId first, then date-overlap + name/city token match
//  - upsert only: never deletes an existing champion, result, or appearance
//  - never invents entry lists; only records players actually seen on court

/** "306-2026" -> "306" (stable tournament id, year suffix stripped). */
export function espnTournamentId(rawId) {
  return String(rawId).split("-")[0];
}

function tokens(s) {
  return new Set(
    String(s)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .split(/[^a-z0-9]+/)
      .filter(
        (t) =>
          t.length > 2 &&
          ![
            "open", "the", "atp", "presented", "cup", "tennis", "club", "center", "centre",
            "stadium", "arena", "park", "international", "championships", "championship",
            "masters", "and", "complex", "national",
          ].includes(t),
      ),
  );
}

function overlapDays(aStart, aEnd, bStart, bEnd) {
  return aStart <= bEnd && bStart <= aEnd;
}

/** Find the season event a scoreboard tournament belongs to, or null. */
export function matchEvent(seasonEvents, sb) {
  const sbId = espnTournamentId(sb.id);
  const byId = seasonEvents.find((e) => e.espnId === sbId);
  if (byId) return byId;
  const sbStart = sb.date.slice(0, 10);
  const sbEnd = (sb.endDate || sb.date).slice(0, 10);
  const sbTokens = tokens(`${sb.name} ${sb.shortName || ""} ${sb.venue?.fullName || ""} ${sb.venue?.address?.city || ""}`);
  // Best token overlap wins, not first hit: several tournaments run the same
  // week, and a single incidental shared token must not bind the espnId to
  // the wrong event (it would lock in).
  let best = null;
  let bestHits = 0;
  for (const e of seasonEvents) {
    if (!overlapDays(e.start, e.end, sbStart, sbEnd)) continue;
    const evTokens = tokens(`${e.name} ${e.city} ${e.venue}`);
    let hits = 0;
    for (const t of evTokens) if (sbTokens.has(t)) hits++;
    if (hits > bestHits) {
      bestHits = hits;
      best = e;
    }
  }
  return bestHits >= 1 ? best : null;
}

/** Extract men's-singles matches from one scoreboard tournament. */
export function mensSinglesMatches(sb) {
  const grouping = (sb.groupings || []).find((g) => g.grouping?.slug === "mens-singles");
  if (!grouping) return [];
  return (grouping.competitions || [])
    .filter((c) => c.status?.type?.state === "post" && Array.isArray(c.competitors) && c.competitors.length === 2)
    .map((c) => {
      const [a, b] = c.competitors;
      return {
        round: c.round?.displayName || "",
        a: a.athlete?.displayName || "",
        b: b.athlete?.displayName || "",
        winner: a.winner ? a.athlete?.displayName : b.winner ? b.athlete?.displayName : null,
      };
    })
    .filter((m) => m.a && m.b && m.winner);
}

function isFinalRound(round) {
  const r = round.toLowerCase();
  return r === "final" || r === "finals" || r === "championship";
}

/**
 * Merge one scoreboard payload (ESPN /tennis/atp/scoreboard shape) into the
 * season. Returns { changed } and mutates a deep-copied season it returns.
 */
export function mergeScoreboard(season, scoreboard, favorites) {
  const next = structuredClone(season);
  let changed = false;

  for (const sb of scoreboard?.events || []) {
    const ev = matchEvent(next.events, sb);
    if (!ev) continue;

    const sbId = espnTournamentId(sb.id);
    if (ev.espnId !== sbId) {
      ev.espnId = sbId;
      changed = true;
    }

    for (const m of mensSinglesMatches(sb)) {
      // Champion: fill only, never overwrite.
      if (isFinalRound(m.round) && !ev.champion) {
        ev.champion = m.winner;
        ev.runnerUp = m.winner === m.a ? m.b : m.a;
        changed = true;
      }
      for (const fav of favorites) {
        if (m.a !== fav && m.b !== fav) continue;
        const entry = (ev.favorites[fav] ||= { results: [] });
        const opponent = m.a === fav ? m.b : m.a;
        const dup = entry.results.some((r) => r.round === m.round && r.opponent === opponent);
        if (!dup) {
          entry.results.push({ round: m.round, opponent, won: m.winner === fav });
          changed = true;
        }
      }
    }
  }
  return { season: next, changed };
}
