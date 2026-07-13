// F1 calendar, results, and standings from the jolpica API (Ergast-compatible).
// Fill-only on results: a completed race's stored result is never overwritten.
import { fetchJson, loadData, saveData, runSource } from "./lib/common.mjs";

const BASE = "https://api.jolpi.ca/ergast/f1";
const SEASON = 2026;

function slug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function sessions(race) {
  const out = [];
  const add = (label, s) => {
    if (s?.date) out.push({ label, time: `${s.date}T${s.time || "12:00:00Z"}` });
  };
  add("Practice 1", race.FirstPractice);
  add("Practice 2", race.SecondPractice);
  add("Practice 3", race.ThirdPractice);
  add("Sprint Qualifying", race.SprintQualifying);
  add("Sprint", race.Sprint);
  add("Qualifying", race.Qualifying);
  out.push({ label: "Race", time: `${race.date}T${race.time || "12:00:00Z"}` });
  return out;
}

function watchedResult(results, config) {
  const teams = config.f1.teams.map((t) => t.toLowerCase());
  const drivers = config.f1.drivers;
  return results
    .filter((r) => {
      const name = `${r.Driver.givenName} ${r.Driver.familyName}`;
      const team = r.Constructor?.name || "";
      return drivers.some((d) => d === name) || teams.some((t) => team.toLowerCase().includes(t));
    })
    .map((r) => ({
      pos: Number(r.position),
      driver: `${r.Driver.givenName} ${r.Driver.familyName}`,
      team: r.Constructor?.name || "",
      status: r.status,
    }));
}

await runSource("f1", async () => {
  const config = loadData("config.json");
  let existing = { races: [] };
  try {
    existing = loadData("f1.json");
  } catch {
    /* first run */
  }
  const byRound = new Map(existing.races.map((r) => [r.round, r]));

  const calendar = await fetchJson(`${BASE}/${SEASON}/races/?format=json&limit=100`);
  const races = calendar.MRData?.RaceTable?.Races;
  if (!Array.isArray(races) || races.length < 15) throw new Error("calendar payload failed shape check");

  const today = new Date().toISOString().slice(0, 10);
  const out = [];
  for (const race of races) {
    const round = Number(race.round);
    const prev = byRound.get(round);
    const entry = {
      round,
      id: `r${String(round).padStart(2, "0")}-${slug(race.raceName)}`,
      name: race.raceName,
      circuit: race.Circuit.circuitName,
      city: race.Circuit.Location.locality,
      country: race.Circuit.Location.country,
      lat: Number(race.Circuit.Location.lat),
      lon: Number(race.Circuit.Location.long),
      sprint: Boolean(race.Sprint),
      sessions: sessions(race),
      raceTime: `${race.date}T${race.time || "12:00:00Z"}`,
      results: prev?.results || null,
    };
    // Fill-only: fetch results just for finished races that have none stored.
    if (!entry.results && race.date < today) {
      const rr = await fetchJson(`${BASE}/${SEASON}/${round}/results/?format=json&limit=30`);
      const results = rr.MRData?.RaceTable?.Races?.[0]?.Results;
      if (Array.isArray(results) && results.length) {
        entry.results = {
          podium: results.slice(0, 3).map((r) => ({
            pos: Number(r.position),
            driver: `${r.Driver.givenName} ${r.Driver.familyName}`,
            team: r.Constructor?.name || "",
          })),
          watched: watchedResult(results, config),
        };
      }
    }
    out.push(entry);
  }

  const ds = await fetchJson(`${BASE}/${SEASON}/driverstandings/?format=json&limit=10`);
  const cs = await fetchJson(`${BASE}/${SEASON}/constructorstandings/?format=json&limit=10`);
  const standings = {
    drivers: (ds.MRData?.StandingsTable?.StandingsLists?.[0]?.DriverStandings || []).map((s) => ({
      pos: Number(s.position),
      driver: `${s.Driver.givenName} ${s.Driver.familyName}`,
      team: s.Constructors?.[0]?.name || "",
      points: Number(s.points),
    })),
    constructors: (cs.MRData?.StandingsTable?.StandingsLists?.[0]?.ConstructorStandings || []).map((s) => ({
      pos: Number(s.position),
      team: s.Constructor?.name || "",
      points: Number(s.points),
    })),
  };

  saveData("f1.json", { season: SEASON, updated: new Date().toISOString().slice(0, 10), races: out, standings });
});
