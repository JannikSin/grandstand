# Data schemas

Any schema change updates this doc in the same commit.

Two kinds of time, never mixed:
- **instants**: UTC ISO timestamps (`2026-09-05T16:00Z`) for things with a clock time (F1 sessions, Purdue tipoffs). Rendered in ET by the app.
- **all-day spans**: bare `YYYY-MM-DD` strings (tennis tournament dates). Never timezone-converted.

All files are written by `scripts/*.mjs` with sorted keys and 2-space indent so daily diffs stay readable.

## tennis.json

```
{ season, updated,
  events: [{
    id,            // internal stable slug ("wimbledon"), never changes; UI + join anchor
    espnId,        // ESPN tournament id captured on first scoreboard sighting (null until seen)
    name, tier,    // tier: slam | m1000 | atp500 | atp250 | finals | team | exhibition
    city, country, venue, surface, indoor,
    start, end,    // all-day spans
    lat, lon,      // coarse venue coords (city-level is fine), null if TBC
    notes,         // one-line blurb
    champion, runnerUp,  // filled by the merge from the final, or seeded; FILL-ONLY
    favorites: {   // only players actually seen on court; never a predicted entry list
      "<name>": { results: [{ round, opponent, won }] }
    }
  }]
}
```

## f1.json

```
{ season, updated,
  races: [{
    round, id, name, circuit, city, country, lat, lon, sprint,
    sessions: [{ label, time }],   // instants
    raceTime,                      // instant
    results: null | {
      podium: [{ pos, driver, team }],
      watched: [{ pos, driver, team, status }]  // favorite teams/drivers from config
    }
  }],
  standings: { drivers: [{ pos, driver, team, points }], constructors: [{ pos, team, points }] }
}
```

## purdue.json

```
{ updated,
  football | basketball: {
    season, label,
    games: [{
      id, date,                    // instant
      opponent, opponentShort, home, venue, city, tv, conferenceGame,
      opponentRank, purdueRank,    // curated rank <= 30 else null; raw factors only,
                                   // the interest score is computed in the app
      result: null | { win, purdueScore, oppScore }   // FILL-ONLY
    }]
  }
}
```

## airports.json

```
{ updated, note,
  airports: [{ iata, name, city, lat, lon, hub, international, ordNonstop, note? }],
  unserved: { note, cities: [] }
}
```

Flags are hand-maintained estimates (calibration knobs), not ground truth.

## config.json

```
{ homeAirport,
  tennis: { favorites: [] },
  f1: { teams: [], drivers: [] },
  purdue: { rivals: { name: 0-100 }, premiumPrograms: [] },
  weights: { getaway: {...}, interest: {...} }   // edit to re-score instantly
}
```

## meta.json

```
{ <source>: { lastRun, lastSuccess, lastError } }
```

App shows a staleness banner when any source's lastSuccess is older than 3 days.
