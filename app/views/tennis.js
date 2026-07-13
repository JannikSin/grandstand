import { html } from "htm/preact";
import { useState } from "preact/hooks";
import { fmtDayRange, isPast, parseDay } from "../lib/dates.js";
import { Getaway, LinksRow } from "./bits.js";

const TIER_LABEL = {
  slam: "Slam",
  m1000: "1000",
  atp500: "500",
  atp250: "250",
  finals: "Finals",
  team: "Team",
  exhibition: "Exhibition",
};

// Slams and Masters are effectively mandatory for healthy top players; that
// expectation is a label, never a confirmation (entry lists are not free data).
const FAVS_EXPECTED_TIERS = new Set(["slam", "m1000", "finals"]);

export function favoriteSummary(ev, favorites) {
  const seen = Object.keys(ev.favorites || {});
  if (seen.length) return { label: seen.map((n) => n.split(" ").at(-1)).join(", "), confirmed: true };
  // Exhibitions never appear on the ESPN scoreboard; their lineups are
  // hand-authored in the calendar and stay clearly labeled as expected.
  if (!ev.champion && ev.expectedFavorites?.length) {
    return { label: `${ev.expectedFavorites.map((n) => n.split(" ").at(-1)).join(", ")} expected`, confirmed: false };
  }
  if (!ev.champion && FAVS_EXPECTED_TIERS.has(ev.tier)) return { label: "top players expected", confirmed: false };
  return null;
}

function FavoriteResults({ ev }) {
  const entries = Object.entries(ev.favorites || {});
  if (!entries.length) return null;
  return html`
    <div>
      ${entries.map(
        ([name, e]) => html`
          <dl>
            <dt>${name}</dt>
            <dd>
              ${e.results.map(
                (r) => html`
                  <div>
                    <span class=${r.won ? "won" : "lost"}>${r.won ? "d." : "l."}</span>
                    ${" "}${r.opponent} <span class="mono" style="color:var(--muted)">${r.round}</span>
                  </div>
                `,
              )}
            </dd>
          </dl>
        `,
      )}
    </div>
  `;
}

export function TennisRow({ ev, favorites, isNew }) {
  const [open, setOpen] = useState(false);
  const done = isPast(ev);
  const favs = favoriteSummary(ev, favorites);
  return html`
    <div class="card">
      <button class="row" onClick=${() => setOpen(!open)} aria-expanded=${open}>
        <span class="date mono">${fmtDayRange(ev.start, ev.end)}</span>
        <span class="title">
          <span class="name">${ev.name}</span>
          <span class="sub">
            <span class=${`chip tier-${ev.tier}`}>${TIER_LABEL[ev.tier] || ev.tier}</span>
            ${favs && html`<span class=${`chip fav${favs.confirmed ? "" : " expected"}`}>${favs.label}</span>`}
            ${isNew && html`<span class="chip new">new</span>`}
            ${ev.city}${ev.country && ev.country !== "TBC" ? `, ${ev.country}` : ""}
          </span>
        </span>
        <span class="end">
          ${ev.champion
            ? html`<span class="won">🏆 ${ev.champion}</span>`
            : done
              ? html`<span style="color:var(--muted)">done</span>`
              : html`<span class="mono" style="color:var(--muted)"
                    >${!ev.getaway ? "—" : ev.getaway.km > 450 ? "far" : ev.getaway.score}</span
                  ><span class="lbl">getaway</span>`}
        </span>
      </button>
      ${open &&
      html`
        <div class="detail">
          <p class="blurb">${ev.notes}</p>
          <dl>
            <dt>Venue</dt>
            <dd>${ev.venue || "TBC"}</dd>
            <dt>Surface</dt>
            <dd>${ev.surface}${ev.indoor ? ", indoor" : ""}</dd>
            ${ev.champion ? html`<dt>Champion</dt><dd>${ev.champion}</dd>` : null}
            ${ev.runnerUp ? html`<dt>Runner-up</dt><dd>${ev.runnerUp}</dd>` : null}
          </dl>
          <${FavoriteResults} ev=${ev} />
          ${!done && html`<${Getaway} g=${ev.getaway} color="var(--tennis)" />`}
          <${LinksRow} query=${`${ev.name} tennis tickets`} mapQuery=${`${ev.venue || ev.name} ${ev.city}`} />
        </div>
      `}
    </div>
  `;
}

export function Tennis({ data }) {
  const [upcomingOnly, setUpcomingOnly] = useState(true);
  const [favsOnly, setFavsOnly] = useState(false);
  const favorites = data.config.tennis.favorites;
  let events = [...data.tennis.events].sort((a, b) => a.start.localeCompare(b.start));
  if (upcomingOnly) events = events.filter((e) => !isPast(e));
  if (favsOnly) events = events.filter((e) => favoriteSummary(e, favorites));

  const months = [];
  for (const ev of events) {
    const label = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "long" }).format(parseDay(ev.start));
    const bucket = months.at(-1)?.label === label ? months.at(-1) : months[months.push({ label, events: [] }) - 1];
    bucket.events.push(ev);
  }

  return html`
    <div>
      <div class="filterbar">
        <button class=${upcomingOnly ? "on" : ""} onClick=${() => setUpcomingOnly(!upcomingOnly)}>Upcoming</button>
        <button class=${favsOnly ? "on" : ""} onClick=${() => setFavsOnly(!favsOnly)}>My players</button>
      </div>
      ${months.length === 0 && html`<div class="empty">Nothing matches these filters.</div>`}
      ${months.map(
        (m) => html`
          <div class="month-label">${m.label}</div>
          ${m.events.map((ev) => html`<${TennisRow} key=${ev.id} ev=${ev} favorites=${favorites} />`)}
        `,
      )}
    </div>
  `;
}
