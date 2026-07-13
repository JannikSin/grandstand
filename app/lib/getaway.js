// Getaway score: how practical is it to reach this event from ORD on a
// flexible free-flight basis. Pure geography/network heuristic computed from
// airports.json flags; it is a screening estimate, never a promise of a seat.
import { haversineKm } from "./util.js";

/** Nearest listed airport to a venue. Returns null if venue has no coords. */
export function nearestAirport(lat, lon, airports) {
  if (lat == null || lon == null) return null;
  let best = null;
  let bestKm = Infinity;
  for (const a of airports) {
    const km = haversineKm(lat, lon, a.lat, a.lon);
    if (km < bestKm) {
      bestKm = km;
      best = a;
    }
  }
  return best ? { airport: best, km: Math.round(bestKm) } : null;
}

function distancePts(km, max) {
  if (km <= 50) return max;
  if (km <= 120) return Math.round(max * 0.75);
  if (km <= 250) return Math.round(max * 0.45);
  if (km <= 450) return Math.round(max * 0.2);
  return 0;
}

/**
 * Score 0-100 with a transparent factor breakdown.
 * Factors: venue-to-airport distance, ORD nonstop, hub frequency, domestic simplicity.
 * Events in cities with no reasonably close listed airport (>450 km) floor out.
 */
export function getawayScore(lat, lon, airports, weights) {
  const w = weights || { distance: 40, ordNonstop: 30, hub: 15, domestic: 15 };
  const near = nearestAirport(lat, lon, airports);
  if (!near) return null;
  const { airport, km } = near;
  const factors = [
    { label: `${airport.iata} is ${km} km away`, pts: distancePts(km, w.distance), max: w.distance },
    {
      label: airport.ordNonstop ? `ORD nonstop to ${airport.iata}` : `no ORD nonstop (positioning leg via a hub)`,
      pts: airport.ordNonstop ? w.ordNonstop : 0,
      max: w.ordNonstop,
    },
    {
      label: airport.hub ? `${airport.iata} is a hub (many daily frequencies)` : `not a hub (fewer chances per day)`,
      pts: airport.hub ? w.hub : 0,
      max: w.hub,
    },
    {
      label: airport.international ? `international trip (buffer day + backup flight wise)` : `domestic (simple same-day options)`,
      pts: airport.international ? 0 : w.domestic,
      max: w.domestic,
    },
  ];
  if (airport.note) factors.push({ label: `note: ${airport.note}`, pts: 0, max: 0 });
  const score = factors.reduce((s, f) => s + f.pts, 0);
  return { score, airport, km, factors };
}
