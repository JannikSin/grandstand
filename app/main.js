import { render } from "preact";
import { useEffect, useState } from "preact/hooks";
import { html } from "htm/preact";
import { loadAll, takeLastVisit, staleSources } from "./lib/store.js";
import { getawayScore } from "./lib/getaway.js";
import { interestScore } from "./lib/interest.js";
import { NextUp } from "./views/nextup.js";
import { Tennis } from "./views/tennis.js";
import { F1 } from "./views/f1.js";
import { Purdue } from "./views/purdue.js";

const TABS = [
  { id: "next", label: "Next Up" },
  { id: "tennis", label: "Tennis" },
  { id: "f1", label: "F1" },
  { id: "purdue", label: "Purdue" },
];

/** Attach computed scores once; views stay presentational. */
function enrich(data) {
  const { config, airports, tennis, f1, purdue } = data;
  const gw = (lat, lon) => getawayScore(lat, lon, airports.airports, config.weights.getaway);
  for (const ev of tennis.events) ev.getaway = gw(ev.lat, ev.lon);
  for (const race of f1.races) race.getaway = gw(race.lat, race.lon);
  for (const sport of [purdue.football, purdue.basketball]) {
    for (const g of sport.games) {
      g.interest = interestScore(g, g.purdueRank, config.purdue, config.weights.interest);
    }
  }
  return data;
}

function useHashTab() {
  const read = () => {
    const h = location.hash.replace("#", "");
    return TABS.some((t) => t.id === h) ? h : "next";
  };
  const [tab, setTab] = useState(read);
  useEffect(() => {
    const on = () => setTab(read());
    addEventListener("hashchange", on);
    return () => removeEventListener("hashchange", on);
  }, []);
  return tab;
}

function App() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [lastVisit] = useState(takeLastVisit);
  const tab = useHashTab();

  useEffect(() => {
    loadAll().then((d) => setData(enrich(d)), (e) => setErr(e));
  }, []);

  if (err) return html`<main><div class="empty">Data failed to load: ${String(err.message)}. Pull to refresh.</div></main>`;
  if (!data) return html`<main><div class="empty">Loading the board…</div></main>`;

  const stale = staleSources(data.meta);
  const updated = [data.tennis.updated, data.f1.updated, data.purdue.updated].sort().at(-1);

  return html`
    <header class="top">
      <h1><span class="g">G</span>RANDSTAND</h1>
      <span class="updated mono">data ${updated}</span>
    </header>
    ${stale.length ? html`<div class="stale">Heads up: ${stale.join(", ")} data has not refreshed in over 3 days.</div>` : null}
    <main>
      ${tab === "next" && html`<${NextUp} data=${data} lastVisit=${lastVisit} />`}
      ${tab === "tennis" && html`<${Tennis} data=${data} />`}
      ${tab === "f1" && html`<${F1} data=${data} />`}
      ${tab === "purdue" && html`<${Purdue} data=${data} />`}
    </main>
    <nav class="tabs">
      ${TABS.map((t) => html`<a href=${`#${t.id}`} data-tab=${t.id} class=${tab === t.id ? "active" : ""}>${t.label}</a>`)}
    </nav>
  `;
}

render(html`<${App} />`, document.getElementById("app"));

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js");
}
