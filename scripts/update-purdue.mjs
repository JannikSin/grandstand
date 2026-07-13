// Purdue football + men's basketball schedules and results from ESPN's
// public site API. Stores raw factors only (ranks, home/away, conference);
// the interest score is computed in the app (tribunal condition 7).
import { fetchJson, loadData, saveData, runSource } from "./lib/common.mjs";

const BASE = "https://site.api.espn.com/apis/site/v2/sports";

// ESPN "season" params: CFB 2026 = fall 2026; MBB 2027 = the 2026-27 season.
// A season not yet published returns 0 events; the cron picks it up when live.
function currentSeasons() {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth() + 1;
  return {
    football: m <= 2 ? y - 1 : y,
    basketball: m >= 5 ? y + 1 : y,
  };
}

function mapGame(event) {
  const comp = event.competitions?.[0];
  if (!comp) return null;
  const us = comp.competitors?.find((c) => c.team?.abbreviation === "PUR" || c.team?.displayName?.includes("Purdue"));
  const them = comp.competitors?.find((c) => c !== us);
  if (!us || !them) return null;
  const done = comp.status?.type?.completed === true || event.competitions?.[0]?.status?.type?.state === "post";
  const usScore = Number(us.score?.displayValue ?? us.score?.value ?? NaN);
  const themScore = Number(them.score?.displayValue ?? them.score?.value ?? NaN);
  return {
    id: String(event.id),
    date: event.date,
    opponent: them.team?.displayName || "",
    opponentShort: them.team?.abbreviation || "",
    home: us.homeAway === "home",
    venue: comp.venue?.fullName || "",
    city: [comp.venue?.address?.city, comp.venue?.address?.state].filter(Boolean).join(", "),
    tv: comp.broadcasts?.[0]?.media?.shortName || event.competitions?.[0]?.broadcasts?.[0]?.media?.shortName || "",
    conferenceGame: comp.conferenceCompetition === true,
    opponentRank: them.curatedRank?.current && them.curatedRank.current <= 30 ? them.curatedRank.current : null,
    purdueRank: us.curatedRank?.current && us.curatedRank.current <= 30 ? us.curatedRank.current : null,
    result:
      done && Number.isFinite(usScore) && Number.isFinite(themScore)
        ? { win: usScore > themScore, purdueScore: usScore, oppScore: themScore }
        : null,
  };
}

async function fetchSport(path, season, previous) {
  // seasontype 2 = regular season, 3 = postseason. Before a season starts the
  // typeless query returns 0 events, so ask for both explicitly and merge.
  const games = [];
  let sawTeam = false;
  for (const type of [2, 3]) {
    const data = await fetchJson(`${BASE}/${path}/teams/purdue/schedule?season=${season}&seasontype=${type}`);
    if (!data.team?.displayName?.includes("Purdue")) throw new Error("schedule payload failed shape check");
    sawTeam = true;
    for (const ev of data.events || []) {
      const g = mapGame(ev);
      if (g && !games.some((x) => x.id === g.id)) games.push(g);
    }
  }
  if (!sawTeam) throw new Error("no valid payload");
  // Season not published yet (0 events): keep whatever we had.
  if (!games.length && previous?.games?.length) return previous;
  // Fill-only on results: never blank a stored result with a partial payload.
  const prevById = new Map((previous?.games || []).map((g) => [g.id, g]));
  for (const g of games) {
    if (!g.result && prevById.get(g.id)?.result) g.result = prevById.get(g.id).result;
  }
  games.sort((a, b) => a.date.localeCompare(b.date));
  return { season, label: String(season), games };
}

await runSource("purdue", async () => {
  let existing = {};
  try {
    existing = loadData("purdue.json");
  } catch {
    /* first run */
  }
  const seasons = currentSeasons();
  const football = await fetchSport("football/college-football", seasons.football, existing.football);
  const basketball = await fetchSport("basketball/mens-college-basketball", seasons.basketball, existing.basketball);
  saveData("purdue.json", { updated: new Date().toISOString().slice(0, 10), football, basketball });
});
