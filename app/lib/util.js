// Shared pure helpers. No DOM, no fetch.

/** Great-circle distance in km. */
export function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// Security rule: data-derived strings never land in an href directly.
// Every link is a hardcoded https base plus an encoded query.
export function ticketSearchLinks(query) {
  const q = encodeURIComponent(query);
  return [
    { label: "StubHub", url: `https://www.stubhub.com/find/s/?q=${q}` },
    { label: "SeatGeek", url: `https://seatgeek.com/search?search=${q}` },
    { label: "Ticketmaster", url: `https://www.ticketmaster.com/search?q=${q}` },
  ];
}

export function mapLink(query) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

/** Escape hatch for any URL that ever comes from data: https only, else null. */
export function safeHttpsUrl(url) {
  try {
    const u = new URL(url);
    return u.protocol === "https:" ? u.href : null;
  } catch {
    return null;
  }
}
