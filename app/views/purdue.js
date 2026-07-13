import { html } from "htm/preact";
import { useState } from "preact/hooks";
import { fmtInstant } from "../lib/dates.js";
import { Meter, Factors, LinksRow } from "./bits.js";

function shortDate(iso) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(iso));
}

export function PurdueRow({ game, sport, isNew }) {
  const [open, setOpen] = useState(false);
  const r = game.result;
  return html`
    <div class="card">
      <button class="row" onClick=${() => setOpen(!open)} aria-expanded=${open}>
        <span class="date mono">${shortDate(game.date)}</span>
        <span class="title">
          <span class="name">${game.home ? "vs" : "@"} ${game.opponent}</span>
          <span class="sub">
            ${game.opponentRank && html`<span class="chip pu fav">#${game.opponentRank}</span>`}
            ${isNew && html`<span class="chip new">new</span>`}
            ${game.home ? `${game.venue} (home)` : game.city}${game.tv ? ` · ${game.tv}` : ""}
          </span>
        </span>
        <span class="end">
          ${r
            ? html`<span class=${r.win ? "won" : "lost"}>${r.win ? "W" : "L"} ${r.purdueScore}-${r.oppScore}</span>`
            : html`<span class="mono" style=${`color:${game.interest.score >= 70 ? "var(--purdue)" : "var(--muted)"}`}
                >${game.interest.score}</span
              >`}
        </span>
      </button>
      ${open &&
      html`
        <div class="detail">
          <dl>
            <dt>Where</dt>
            <dd>${game.venue}${game.city ? ` · ${game.city}` : ""}</dd>
            <dt>When</dt>
            <dd class="mono">${fmtInstant(game.date)}</dd>
            ${game.tv ? html`<dt>TV</dt><dd>${game.tv}</dd>` : null}
            <dt>Interest</dt>
            <dd><${Meter} value=${game.interest.score} color="var(--purdue)" /></dd>
          </dl>
          <${Factors} factors=${game.interest.factors} />
          ${game.home
            ? html`<p class="blurb">Home game: your all-sports pass covers it. Interest score says whether it is worth the walk.</p>`
            : null}
          <${LinksRow}
            query=${`Purdue ${sport} ${game.opponent} tickets`}
            mapQuery=${`${game.venue} ${game.city || "West Lafayette"}`}
          />
        </div>
      `}
    </div>
  `;
}

export function Purdue({ data }) {
  const [sport, setSport] = useState("football");
  const bucket = data.purdue[sport];
  const games = bucket.games;
  return html`
    <div>
      <div class="filterbar">
        <button class=${sport === "football" ? "on" : ""} onClick=${() => setSport("football")}>Football</button>
        <button class=${sport === "basketball" ? "on" : ""} onClick=${() => setSport("basketball")}>Basketball</button>
      </div>
      ${games.length === 0 &&
      html`<div class="empty">
        The ${sport === "football" ? "2026" : "2026-27"} ${sport} schedule is not on ESPN yet. It will appear here
        automatically once published.
      </div>`}
      ${games.map((g) => html`<${PurdueRow} key=${g.id} game=${g} sport=${sport} />`)}
    </div>
  `;
}
