const FALLBACK_SINCE = "2026-01-01";

async function getJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: ${response.status}`);
  return response.json();
}

// A package's version and its daily downloads since it was published, from the registry and api.npmjs.org (no token needed).
// npm publishes a day's counts the next day.
export async function npmPackage(name, today) {
  const meta = await getJson(`https://registry.npmjs.org/${encodeURIComponent(name)}`);
  const since = (meta.time?.created || FALLBACK_SINCE).slice(0, 10);
  const range = await getJson(`https://api.npmjs.org/downloads/range/${since}:${today}/${encodeURIComponent(name)}`);
  const daily = (range.downloads || []).filter((d) => d.day >= since);
  return { p: name, since, version: meta["dist-tags"]?.latest || "—", daily, total: daily.reduce((a, d) => a + d.downloads, 0) };
}
