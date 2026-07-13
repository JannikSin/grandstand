import { html } from "htm/preact";
import { useState } from "preact/hooks";
import { fmtInstant, isPast } from "../lib/dates.js";
import { Getaway, LinksRow } from "./bits.js";

function raceDay(race) {
  return race.raceTime.slice(0, 10);
}

function shortDate(iso) {
  return new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", month: "short", day: "numeric" }).format(
    new Date(iso),
  );
}

export function F1Row({ race, isNew }) {
  const [open, setOpen] = useState(false);
  const done = Boolean(race.results);
  const podium = race.results?.podium || [];
  return html`
    <div class="card">
      <button class="row" onClick=${() => setOpen(!open)} aria-expanded=${open}>
        <span class="date mono">${shortDate(race.raceTime)}</span>
        <span class="title">
          <span class="name">${race.name}</span>
          <span class="sub">
            ${race.sprint && html`<span class="chip">Sprint</span>`}
            ${isNew && html`<span class="chip new">new</span>`}
            ${race.city}, ${race.country}
          </span>
        </span>
        <span class="end">
          ${done
            ? html`<span class="won">🏁 ${podium[0]?.driver?.split(" ").at(-1) || ""}</span>`
            : html`<span class="mono" style="color:var(--muted)"
                  >${!race.getaway ? "—" : race.getaway.km > 450 ? "far" : race.getaway.score}</span
                ><span class="lbl">getaway</span>`}
        </span>
      </button>
      ${open &&
      html`
        <div class="detail">
          <dl>
            <dt>Circuit</dt>
            <dd>${race.circuit}</dd>
            ${done
              ? podium.map((p) => html`<dt>P${p.pos}</dt><dd>${p.driver} (${p.team})</dd>`)
              : race.sessions.map((s) => html`<dt>${s.label}</dt><dd class="mono">${fmtInstant(s.time)}</dd>`)}
          </dl>
          ${done && race.results.watched?.length
            ? html`
                <dl>
                  <dt>Watched</dt>
                  <dd>
                    ${race.results.watched.map(
                      (w) => html`<div>P${w.pos} ${w.driver} <span style="color:var(--muted)">(${w.team})</span></div>`,
                    )}
                  </dd>
                </dl>
              `
            : null}
          ${!done && html`<${Getaway} g=${race.getaway} color="var(--f1)" />`}
          <${LinksRow} query=${`${race.name} F1 tickets`} mapQuery=${`${race.circuit} ${race.city}`} />
        </div>
      `}
    </div>
  `;
}

export function F1({ data }) {
  const { races, standings } = data.f1;
  const next = races.find((r) => !isPast({ start: raceDay(r), end: raceDay(r) }));
  return html`
    <div>
      <div class="standings">
        <div class="card">
          <h3>Drivers</h3>
          <ol>
            ${standings.drivers.slice(0, 5).map(
              (d) => html`<li><span>${d.pos}. ${d.driver.split(" ").at(-1)}</span><span class="mono">${d.points}</span></li>`,
            )}
          </ol>
        </div>
        <div class="card">
          <h3>Constructors</h3>
          <ol>
            ${standings.constructors.slice(0, 5).map(
              (c) => html`<li><span>${c.pos}. ${c.team}</span><span class="mono">${c.points}</span></li>`,
            )}
          </ol>
        </div>
      </div>
      ${races.map((r) => html`<${F1Row} key=${r.id} race=${r} isNew=${false} />`)}
      ${next ? null : html`<div class="empty">Season complete.</div>`}
    </div>
  `;
}
