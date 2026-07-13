// Two kinds of time, never mixed (tribunal condition 9):
//  - instants: UTC ISO timestamps (F1 sessions, Purdue tipoffs) -> rendered in ET
//  - all-day spans: bare "YYYY-MM-DD" strings (tennis tournaments) -> never timezone-converted

const ET = "America/New_York";

/** "2026-09-05T16:00Z" -> "Sat Sep 5, 12:00 PM ET" */
export function fmtInstant(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const s = new Intl.DateTimeFormat("en-US", {
    timeZone: ET,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
  return `${s} ET`;
}

/** Parse "YYYY-MM-DD" as a local-agnostic calendar date (noon UTC avoids DST edges). */
export function parseDay(day) {
  return new Date(`${day}T12:00:00Z`);
}

/** "2026-07-01".."2026-07-14" -> "Jul 1 - Jul 14" (same month: "Jul 1-14") */
export function fmtDayRange(start, end) {
  const f = (day, opts) =>
    new Intl.DateTimeFormat("en-US", { timeZone: "UTC", ...opts }).format(parseDay(day));
  if (!end || end === start) return f(start, { month: "short", day: "numeric" });
  const sameMonth = start.slice(0, 7) === end.slice(0, 7);
  if (sameMonth) return `${f(start, { month: "short", day: "numeric" })}-${f(end, { day: "numeric" })}`;
  return `${f(start, { month: "short", day: "numeric" })} - ${f(end, { month: "short", day: "numeric" })}`;
}

/** Days from `now` until the event begins. 0 = today/underway (clamped at 0 while running). */
export function daysUntil(startDay, now = new Date()) {
  const ms = parseDay(startDay).getTime() - now.getTime();
  return Math.max(0, Math.ceil(ms / 86400000));
}

/** True once the event's last day is entirely in the past. */
export function isPast(ev, now = new Date()) {
  const end = ev.end || ev.start;
  return parseDay(end).getTime() + 12 * 3600000 < now.getTime();
}
