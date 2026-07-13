# CLAUDE.md — Grandstand

Rules for every session working on this repo.

## Architecture (non-negotiable)

1. Zero-build static PWA: vendored preact + htm (see `vendor/VERSIONS.md`), no bundler, no new dependencies without explicit approval. Update scripts stay zero-dependency Node.
2. Data files in `data/` are written only by `scripts/*.mjs` (plus deliberate hand edits to `airports.json` / `config.json` / the annual tennis calendar reseed). Schemas live in `docs/SCHEMAS.md`; schema change = doc update in the same commit.
3. Merges are FILL-ONLY: a partial or garbage API payload must never erase a stored champion, result, or appearance. Scripts validate payload shape before writing and fail soft (keep old data, stamp `meta.json`).
4. Time discipline: instants are UTC ISO timestamps rendered in ET; tennis tournament dates are bare `YYYY-MM-DD` strings and are never timezone-converted.
5. Scores are computed in the app from raw stored factors and `config.json` weights. Scripts never bake a score into data.
6. Deterministic serialization: `stableStringify` (sorted keys, 2-space indent) for every data write.

## Security (binding)

7. No data-derived string ever lands in an `href`. Links are hardcoded `https://` bases + `encodeURIComponent`. Any URL that ever comes from data goes through `safeHttpsUrl`.
8. This is a PUBLIC repo. No personal details in any committed artifact: no names of family members, no home town, no employer references, no travel-benefit terminology. The metric here is the "getaway score"; keep that vocabulary.
9. Workflow stays `permissions: contents: write`, third-party actions pinned to full commit SHAs, no API data interpolated into shell steps.

## Verification

10. `npm test` green before any commit. UI changes: open the app on a static server and exercise the changed view.
11. The service worker keeps `data/*.json` out of the precache list (network-first). Vendor and icons are cache-first; bump `CACHE` in `sw.js` when shell assets change.
