// Shared plumbing for the update scripts. Zero dependencies.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export const DATA_DIR = fileURLToPath(new URL("../../data/", import.meta.url));

const UA = "grandstand-schedule-bot (personal, once daily; github.com)";

/** Fetch JSON with an identifiable UA, a timeout, and one retry. */
export async function fetchJson(url) {
  let lastErr;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { "user-agent": UA, accept: "application/json" },
        signal: AbortSignal.timeout(30000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
      return await res.json();
    } catch (err) {
      lastErr = err;
      if (attempt === 0) await new Promise((r) => setTimeout(r, 5000));
    }
  }
  throw lastErr;
}

export function loadData(name) {
  return JSON.parse(readFileSync(DATA_DIR + name, "utf8"));
}

/** Deterministic JSON: sorted object keys, 2-space indent (stable daily diffs). */
export function stableStringify(value) {
  const sortKeys = (v) => {
    if (Array.isArray(v)) return v.map(sortKeys);
    if (v && typeof v === "object") {
      return Object.fromEntries(
        Object.keys(v)
          .sort()
          .map((k) => [k, sortKeys(v[k])]),
      );
    }
    return v;
  };
  return JSON.stringify(sortKeys(value), null, 2) + "\n";
}

export function saveData(name, value) {
  writeFileSync(DATA_DIR + name, stableStringify(value));
}

/** Record per-source success/failure so the app can show a staleness banner. */
export function stampMeta(source, error = null) {
  let meta = {};
  try {
    meta = loadData("meta.json");
  } catch {
    /* first run */
  }
  const now = new Date().toISOString();
  meta[source] = error
    ? { ...(meta[source] || {}), lastRun: now, lastError: String(error).slice(0, 300) }
    : { lastRun: now, lastSuccess: now, lastError: null };
  saveData("meta.json", meta);
}

/** Wrap a source update: soft-fail keeps old data and exits 0 (cron-safe). */
export async function runSource(source, fn) {
  try {
    await fn();
    stampMeta(source);
    console.log(`${source}: ok`);
  } catch (err) {
    stampMeta(source, err);
    console.error(`${source}: kept old data (${err})`);
  }
}
