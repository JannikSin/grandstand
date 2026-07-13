import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { mergeScoreboard, matchEvent, espnTournamentId } from "../app/lib/merge.js";

const FAVS = ["Jannik Sinner", "Novak Djokovic", "Carlos Alcaraz", "Flavio Cobolli", "Daniil Medvedev"];
const day = JSON.parse(readFileSync(new URL("../fixtures/scoreboard-day.json", import.meta.url)));
const finalDay = JSON.parse(readFileSync(new URL("../fixtures/scoreboard-final.json", import.meta.url)));

function season() {
  return {
    season: 2026,
    events: [
      {
        id: "washington", espnId: null, name: "Mubadala Citi DC Open", tier: "atp500",
        city: "Washington, D.C.", country: "United States", venue: "Rock Creek Park Tennis Center",
        surface: "hard", indoor: false, start: "2026-07-27", end: "2026-08-02",
        champion: null, runnerUp: null, favorites: {}, lat: 38.94, lon: -77.05, notes: "",
      },
      {
        id: "los-cabos", espnId: null, name: "Mifel Tennis Open", tier: "atp250",
        city: "Los Cabos", country: "Mexico", venue: "Cabo Sports Complex",
        surface: "hard", indoor: false, start: "2026-07-27", end: "2026-08-01",
        champion: null, runnerUp: null, favorites: {}, lat: 22.89, lon: -109.91, notes: "",
      },
    ],
  };
}

test("strips year from espn tournament id", () => {
  assert.equal(espnTournamentId("306-2026"), "306");
});

test("matches by name tokens on first sighting, then by captured espnId", () => {
  const s = season();
  const sb = day.events[0];
  assert.equal(matchEvent(s.events, sb).id, "washington");
  const { season: merged } = mergeScoreboard(s, day, FAVS);
  assert.equal(merged.events[0].espnId, "421");
  // renamed event still matches via espnId
  const renamed = structuredClone(day);
  renamed.events[0].name = "Completely New Sponsor Classic";
  const again = mergeScoreboard(merged, renamed, FAVS);
  assert.equal(again.season.events[0].espnId, "421");
});

test("records favorite results from mens singles only, skips live matches", () => {
  const { season: merged, changed } = mergeScoreboard(season(), day, FAVS);
  const ev = merged.events[0];
  assert.equal(changed, true);
  assert.deepEqual(ev.favorites["Daniil Medvedev"].results, [
    { round: "Quarterfinal", opponent: "Tommy Paul", won: true },
  ]);
  // women's final in fixture must not set champion
  assert.equal(ev.champion, null);
});

test("final sets champion and runner-up", () => {
  const first = mergeScoreboard(season(), day, FAVS).season;
  const { season: merged } = mergeScoreboard(first, finalDay, FAVS);
  const ev = merged.events[0];
  assert.equal(ev.champion, "Ben Shelton");
  assert.equal(ev.runnerUp, "Daniil Medvedev");
  assert.equal(ev.favorites["Daniil Medvedev"].results.length, 2);
});

test("merge is fill-only: partial payload never blanks existing results", () => {
  const full = mergeScoreboard(mergeScoreboard(season(), day, FAVS).season, finalDay, FAVS).season;
  // empty scoreboard (outage stub) changes nothing
  const { season: afterEmpty, changed } = mergeScoreboard(full, { events: [] }, FAVS);
  assert.equal(changed, false);
  assert.deepEqual(afterEmpty, full);
  // replaying an old day does not duplicate results or overwrite the champion
  const replay = mergeScoreboard(full, day, FAVS);
  assert.equal(replay.season.events[0].champion, "Ben Shelton");
  assert.equal(replay.season.events[0].favorites["Daniil Medvedev"].results.length, 2);
  assert.equal(replay.changed, false);
});

test("unrelated tournament does not match", () => {
  const sb = structuredClone(day.events[0]);
  sb.id = "999-2026";
  sb.name = "Generali Open Kitzbuhel";
  sb.venue = { fullName: "Kitzbuheler Tennis Club", address: { city: "Kitzbuhel" } };
  assert.equal(matchEvent(season().events, sb), null);
});
