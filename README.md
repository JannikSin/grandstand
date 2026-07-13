# Grandstand

One board for three sports: ATP tennis, Formula 1, and Purdue football + men's basketball. Open it and see what's next, who's playing, who won while you weren't looking, and how easy the trip would be.

Zero-build static PWA (vendored preact + htm, no bundler), hosted on GitHub Pages. A GitHub Actions cron refreshes `data/*.json` daily; the app is just a reader.

## Views

- **Next Up**: everything upcoming across the three sports in one feed, plus a "while you were away" list of results recorded since your last visit.
- **Tennis**: the full season (Slams, Masters 1000, 500s, 250s, ATP Finals, plus marquee exhibitions), tier badges, champions once finals are played, and a "My players" filter.
- **F1**: every Grand Prix with session times in ET, podiums once run, and championship standings.
- **Purdue**: football and basketball calendars with a transparent 0-100 interest score per game (win chance, projected closeness, rivalry, opponent quality, ticket demand tier).

## Scores

- **Getaway score (0-100)**: a travel-feasibility screening heuristic per event, from the venue's distance to the nearest listed airport, nonstop availability from the home airport, hub frequency, and domestic vs international simplicity. The factor breakdown is always shown. It is geography math, not a fare or seat promise; check real schedules before planning anything.
- **Interest score (0-100)**: computed in the app from raw stored factors, so editing weights in `data/config.json` re-scores everything instantly.

## Data

| File | Source | Cadence |
|---|---|---|
| `data/f1.json` | [jolpica-f1](https://github.com/jolpica/jolpica-f1) (Ergast-compatible API) | daily cron |
| `data/purdue.json` | public ESPN site API (facts only: schedules, scores, ranks) | daily cron |
| `data/tennis.json` | curated season calendar + daily ESPN ATP scoreboard merge | daily cron; calendar reseeded each December (~1-2 h, see `docs/SCHEMAS.md`) |
| `data/airports.json` | hand-curated airport list with network flags | edited when routes change |
| `data/config.json` | favorites, rivals, score weights | edit to taste |
| `data/meta.json` | per-source freshness stamps | written by the cron |

The tennis merge is fill-only: a partial or garbage API response can never erase a recorded champion or result. Every source fails soft (old data kept, staleness banner in the app after 3 days).

Pre-tournament tennis fields never claim a confirmed entry list; Slams and Masters show "top players expected", which is a tier rule, not a fact.

## Development

```
npm test          # node --test: merge, scores, dates
npm run update    # run all three update scripts locally
npx serve .       # or any static server; the app is plain files
```

Schemas in `docs/SCHEMAS.md`. Change a schema, update that doc in the same commit.

F1 data via the jolpica-f1 API. Schedule facts from public ESPN listings; no ESPN content, branding, or prose is reproduced. All trademarks belong to their owners; this is a personal, non-commercial project.
