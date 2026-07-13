// Tennis: fold ESPN's daily ATP scoreboard (yesterday + today, finals end
// late) into the season calendar via the pure fill-only merge in app/lib.
import { fetchJson, loadData, saveData, runSource } from "./lib/common.mjs";
import { mergeScoreboard } from "../app/lib/merge.js";

const URL = "https://site.api.espn.com/apis/site/v2/sports/tennis/atp/scoreboard";

function yyyymmdd(d) {
  return d.toISOString().slice(0, 10).replaceAll("-", "");
}

await runSource("tennis", async () => {
  const config = loadData("config.json");
  let season = loadData("tennis.json");

  // 4-day lookback: a final lives in exactly one day's scoreboard bucket, and
  // a missed cron run must not lose a champion forever. The merge is
  // idempotent, so replayed days never double-write.
  const DAYS_BACK = 4;
  const today = new Date();
  let changed = false;

  const days = [];
  for (let i = DAYS_BACK; i >= 0; i--) days.push(new Date(today.getTime() - i * 86400000));
  for (const day of days) {
    const payload = await fetchJson(`${URL}?dates=${yyyymmdd(day)}`);
    if (!Array.isArray(payload?.events)) throw new Error("scoreboard payload failed shape check");
    const result = mergeScoreboard(season, payload, config.tennis.favorites);
    season = result.season;
    changed = changed || result.changed;
  }

  if (changed) {
    season.updated = today.toISOString().slice(0, 10);
    saveData("tennis.json", season);
  }
});
