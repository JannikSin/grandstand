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

  const today = new Date();
  const yesterday = new Date(today.getTime() - 86400000);
  let changed = false;

  for (const day of [yesterday, today]) {
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
