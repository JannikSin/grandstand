// Data loading + the one piece of personal state (last visit, localStorage).

const FILES = ["config", "airports", "tennis", "f1", "purdue", "meta"];

export async function loadAll() {
  const out = {};
  await Promise.all(
    FILES.map(async (name) => {
      const res = await fetch(`./data/${name}.json`, { cache: "no-cache" });
      if (!res.ok) throw new Error(`failed to load ${name}.json`);
      out[name] = await res.json();
    }),
  );
  return out;
}

const VISIT_KEY = "grandstand.lastVisit";

/** Previous visit time; stamps now on call. Anything after it is "new". */
export function takeLastVisit() {
  let prev = null;
  try {
    prev = localStorage.getItem(VISIT_KEY);
    localStorage.setItem(VISIT_KEY, new Date().toISOString());
  } catch {
    /* private mode */
  }
  return prev ? new Date(prev) : null;
}

/** Sources whose last successful update is older than three days. */
export function staleSources(meta, now = new Date()) {
  const out = [];
  for (const [source, m] of Object.entries(meta || {})) {
    const ok = m?.lastSuccess ? new Date(m.lastSuccess) : null;
    if (!ok || now.getTime() - ok.getTime() > 3 * 86400000) out.push(source);
  }
  return out;
}
