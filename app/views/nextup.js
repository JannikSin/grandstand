import { html } from "htm/preact";
import { daysUntil, fmtDayRange, fmtInstant, isPast, parseDay } from "../lib/dates.js";
import { TennisRow, favoriteSummary } from "./tennis.js";
import { F1Row } from "./f1.js";
import { PurdueRow } from "./purdue.js";

const SPORT_COLOR = { tennis: "var(--tennis)", f1: "var(--f1)", purdue: "var(--purdue)" };

function upcomingItems(data) {
  const items = [];
  for (const ev of data.tennis.events) {
    if (isPast(ev) || ev.start === undefined) continue;
    items.push({
      kind: "tennis",
      when: parseDay(ev.start).getTime(),
      underway: daysUntil(ev.start) === 0,
      ev,
    });
  }
  for (const race of data.f1.races) {
    if (race.results || isPast({ start: race.raceTime.slice(0, 10), end: race.raceTime.slice(0, 10) })) continue;
    items.push({ kind: "f1", when: new Date(race.raceTime).getTime(), underway: false, ev: race });
  }
  for (const sport of ["football", "basketball"]) {
    for (const g of data.purdue[sport].games) {
      if (g.result || new Date(g.date).getTime() < Date.now() - 6 * 3600000) continue;
      items.push({ kind: "purdue", when: new Date(g.date).getTime(), underway: false, ev: g, sport });
    }
  }
  return items.sort((a, b) => a.when - b.when);
}

function sinceLastVisit(data, lastVisit) {
  if (!lastVisit) return [];
  const t = lastVisit.getTime();
  const now = Date.now();
  const fresh = (iso) => {
    const x = new Date(iso).getTime();
    return x >= t - 86400000 && x <= now;
  };
  const out = [];
  for (const ev of data.tennis.events) {
    if (ev.champion && fresh(`${ev.end}T23:59:00Z`)) out.push({ kind: "tennis", ev });
  }
  for (const race of data.f1.races) {
    if (race.results && fresh(race.raceTime)) out.push({ kind: "f1", ev: race });
  }
  for (const sport of ["football", "basketball"]) {
    for (const g of data.purdue[sport].games) {
      if (g.result && fresh(g.date)) out.push({ kind: "purdue", ev: g, sport });
    }
  }
  return out;
}

function renderItem(item, favorites) {
  if (item.kind === "tennis") return html`<${TennisRow} key=${item.ev.id} ev=${item.ev} favorites=${favorites} isNew=${item.isNew} />`;
  if (item.kind === "f1") return html`<${F1Row} key=${item.ev.id} race=${item.ev} isNew=${item.isNew} />`;
  return html`<${PurdueRow} key=${item.ev.id} game=${item.ev} sport=${item.sport} isNew=${item.isNew} />`;
}

function Hero({ item, favorites }) {
  const { kind, ev } = item;
  const color = SPORT_COLOR[kind];
  const title = kind === "purdue" ? `${ev.home ? "vs" : "@"} ${ev.opponent}` : ev.name;
  const where =
    kind === "purdue" ? `${ev.venue}${ev.city ? ` · ${ev.city}` : ""}` : `${ev.city}, ${ev.country}`;
  const whenLabel =
    kind === "tennis" ? fmtDayRange(ev.start, ev.end) : fmtInstant(kind === "f1" ? ev.raceTime : ev.date);
  const days = kind === "tennis" ? daysUntil(ev.start) : Math.max(0, Math.ceil((item.when - Date.now()) / 86400000));
  const favs = kind === "tennis" ? favoriteSummary(ev, favorites) : null;
  const far = kind !== "purdue" && ev.getaway && ev.getaway.km > 450;
  const score = kind === "purdue" ? ev.interest?.score : far ? "far" : ev.getaway?.score;
  const scoreLabel = kind === "purdue" ? "interest" : "getaway";
  const eyebrow = { tennis: "Next on tour", f1: "Next grand prix", purdue: "Next Purdue game" }[kind];

  return html`
    <div class="hero">
      <div class="band" style=${`background:${color}`}></div>
      <div class="body">
        <div class="eyebrow">${eyebrow}${item.underway ? " · underway now" : ""}</div>
        <h2>${title}</h2>
        <div class="where">${where} · <span class="mono">${whenLabel}</span></div>
        ${favs ? html`<div class="where"><span class="chip fav">${favs.label}</span></div>` : null}
        <div class="strip mono">
          <div>
            <span class="big">${item.underway ? "LIVE" : days}</span>
            <span class="lbl">${item.underway ? "underway" : days === 1 ? "day out" : "days out"}</span>
          </div>
          <div>
            <span class="big" style=${typeof score === "number" && score >= 70 ? `color:${color}` : ""}>${score ?? "—"}</span>
            <span class="lbl">${scoreLabel}</span>
          </div>
          <div>
            <span class="big">${kind === "purdue" ? (ev.home ? "HOME" : "AWAY") : (ev.getaway?.airport?.iata ?? "—")}</span>
            <span class="lbl">${kind === "purdue" ? "venue" : "airport"}</span>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function NextUp({ data, lastVisit }) {
  const favorites = data.config.tennis.favorites;
  const items = upcomingItems(data);
  const missed = sinceLastVisit(data, lastVisit);
  const [hero, ...rest] = items;

  return html`
    <div>
      ${missed.length
        ? html`
            <div class="month-label">While you were away</div>
            ${missed.map((m) => renderItem({ ...m, isNew: true }, favorites))}
          `
        : null}
      ${hero ? html`<${Hero} item=${hero} favorites=${favorites} />` : html`<div class="empty">Nothing upcoming.</div>`}
      <div class="month-label">Coming up</div>
      ${rest.slice(0, 12).map((item) => renderItem(item, favorites))}
    </div>
  `;
}
