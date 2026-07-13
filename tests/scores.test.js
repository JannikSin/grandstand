import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { getawayScore, nearestAirport } from "../app/lib/getaway.js";
import { interestScore, winProbability } from "../app/lib/interest.js";
import { fmtDayRange, daysUntil, fmtInstant, isPast } from "../app/lib/dates.js";
import { ticketSearchLinks, safeHttpsUrl } from "../app/lib/util.js";

const airportsFile = JSON.parse(readFileSync(new URL("../data/airports.json", import.meta.url)));
const config = JSON.parse(readFileSync(new URL("../data/config.json", import.meta.url)));
const AIRPORTS = airportsFile.airports;

test("nearest airport: Wimbledon is a London airport", () => {
  const near = nearestAirport(51.43, -0.21, AIRPORTS);
  assert.equal(near.airport.iata, "LHR");
  assert.ok(near.km < 30);
});

test("getaway: ORD-nonstop hub city beats unserved city", () => {
  const london = getawayScore(51.43, -0.21, AIRPORTS, config.weights.getaway);
  const riyadh = getawayScore(24.71, 46.68, AIRPORTS, config.weights.getaway); // nearest listed is DXB, ~870 km
  assert.ok(london.score >= 70, `london ${london.score}`);
  assert.ok(riyadh.score <= 15, `riyadh ${riyadh.score}`);
  assert.ok(london.factors.length >= 4);
  const total = london.factors.reduce((s, f) => s + f.pts, 0);
  assert.equal(total, london.score);
});

test("getaway: domestic near-hub scores near max", () => {
  const indyCampus = getawayScore(40.43, -86.92, AIRPORTS, config.weights.getaway); // West Lafayette
  assert.equal(indyCampus.airport.iata, "IND");
  assert.ok(indyCampus.score >= 70, `got ${indyCampus.score}`);
});

test("getaway: null coords -> null (Next Gen Finals TBC)", () => {
  assert.equal(getawayScore(null, null, AIRPORTS, config.weights.getaway), null);
});

test("interest: rivalry toss-up at home outranks nonconference filler", () => {
  const iu = { opponent: "Indiana Hoosiers", opponentRank: 18, home: true, conferenceGame: true };
  const filler = { opponent: "Coastal Nobody", opponentRank: null, home: true, conferenceGame: false };
  const a = interestScore(iu, 20, config.purdue, config.weights.interest);
  const b = interestScore(filler, 20, config.purdue, config.weights.interest);
  assert.ok(a.score >= 75, `rivalry ${a.score}`);
  assert.ok(b.score <= 45, `filler ${b.score}`);
  assert.ok(a.score > b.score + 25);
});

test("interest: blowout against elite opponent scores below close ranked matchup", () => {
  const elite = { opponent: "Duke Blue Devils", opponentRank: 1, home: false, conferenceGame: false };
  const close = { opponent: "Michigan State Spartans", opponentRank: 12, home: true, conferenceGame: true };
  const a = interestScore(elite, null, config.purdue, config.weights.interest);
  const b = interestScore(close, 10, config.purdue, config.weights.interest);
  assert.ok(b.score > a.score);
});

test("win probability stays in bounds", () => {
  const p1 = winProbability({ opponent: "X", opponentRank: 1, home: false }, null, config.purdue);
  const p2 = winProbability({ opponent: "X", opponentRank: null, home: true }, 1, config.purdue);
  assert.ok(p1 >= 0.05 && p2 <= 0.95);
});

test("dates: all-day ranges never shift a day", () => {
  assert.equal(fmtDayRange("2026-07-01", "2026-07-14"), "Jul 1-14");
  assert.equal(fmtDayRange("2026-08-30", "2026-09-13"), "Aug 30 - Sep 13");
  assert.equal(fmtDayRange("2026-11-15", "2026-11-15"), "Nov 15");
});

test("dates: countdown and past detection", () => {
  const now = new Date("2026-07-13T15:00:00Z");
  assert.equal(daysUntil("2026-07-27", now), 14);
  assert.equal(daysUntil("2026-07-13", now), 0);
  assert.equal(isPast({ start: "2026-06-29", end: "2026-07-12" }, now), true);
  assert.equal(isPast({ start: "2026-07-13", end: "2026-07-19" }, now), false);
});

test("dates: instants render in ET", () => {
  assert.match(fmtInstant("2026-09-05T16:00:00Z"), /Sep 5.*12:00 PM ET/);
});

test("links are https with encoded queries only", () => {
  for (const l of ticketSearchLinks('Purdue "vs" <Indiana> & co')) {
    assert.ok(l.url.startsWith("https://"));
    assert.ok(!l.url.includes("<") && !l.url.includes('"'));
  }
  assert.equal(safeHttpsUrl("javascript:alert(1)"), null);
  assert.equal(safeHttpsUrl("https://ok.example/x"), "https://ok.example/x");
});
