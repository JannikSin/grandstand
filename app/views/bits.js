// Shared presentational pieces. All dynamic strings render as text nodes
// (htm escapes them); hrefs only ever come from the hardcoded builders.
import { html } from "htm/preact";
import { ticketSearchLinks, mapLink } from "../lib/util.js";

export function Meter({ value, color }) {
  const pct = Math.max(0, Math.min(100, value));
  return html`
    <div class="meter">
      <div class="bar"><i style=${`width:${pct}%;background:${color}`}></i></div>
      <span class="val mono">${pct}</span>
    </div>
  `;
}

export function Factors({ factors }) {
  return html`
    <ul class="factors">
      ${factors.map(
        (f) => html`
          <li>
            <span>${f.label}</span>
            <span class="pts mono">${f.max ? `${f.pts}/${f.max}` : ""}</span>
          </li>
        `,
      )}
    </ul>
  `;
}

export function Getaway({ g, color }) {
  if (!g) return html`<p class="blurb">Location not announced yet.</p>`;
  return html`
    <div>
      <dl>
        <dt>Getaway</dt>
        <dd><${Meter} value=${g.score} color=${color} /></dd>
        <dt>Airport</dt>
        <dd>${g.airport.iata} (${g.airport.name}), ~${g.km} km from the venue</dd>
      </dl>
      <${Factors} factors=${g.factors} />
    </div>
  `;
}

export function LinksRow({ query, mapQuery }) {
  return html`
    <p class="links">
      ${ticketSearchLinks(query).map((l) => html`<a href=${l.url} target="_blank" rel="noopener">${l.label} ↗</a>`)}
      <a href=${mapLink(mapQuery)} target="_blank" rel="noopener">Map ↗</a>
    </p>
  `;
}
