import lists from "../data/repos.json" with { type: "json" };
import { drawBuilding, drawHeatmap, drawNpm, drawNpmPackage, drawRepoCard, drawSkyline, drawStreak, drawToolCard, parseWidget, widgetNames } from "../domain/draw.mjs";
import { THEME_NAMES } from "../domain/themes.mjs";

const DEFAULT_THEME = "dark";
const TEXT = "text/plain; charset=utf-8";
const EDGE_CACHE = "public, s-maxage=1800, stale-while-revalidate=86400";
const RETRY_AFTER_SECONDS = "300";

const describe = (name) => lists.repos[name]?.description;
const dayOf = (now) => now.toISOString().slice(0, 10);

// Each kind of widget asks its fetchers only for the data it draws.
const WIDGETS = {
  streak: async (_arg, theme, f) => {
    const [calendar, merged] = await Promise.all([f.calendar(), f.mergedPullRequests()]);
    return drawStreak(theme, { calendar, merged });
  },
  heatmap: async (_arg, theme, f) => drawHeatmap(theme, { calendar: await f.calendar() }),
  skyline: async (_arg, theme, f) => drawSkyline(theme, { calendar: await f.calendar() }),
  building: async (_arg, theme, f, now) => {
    const [repos, events, user] = await Promise.all([f.recentRepos(), f.publicEvents(), f.profileUser()]);
    return drawBuilding(theme, { repos, events, descriptions: lists.repos, user, now });
  },
  npm: async (_arg, theme, f, now) => {
    const today = dayOf(now);
    const packages = await Promise.all(lists.npm.map((name) => f.npmPackage(name, today)));
    return drawNpm(theme, { packages, today });
  },
  "npm-package": async (name, theme, f, now) => {
    const today = dayOf(now);
    return drawNpmPackage(theme, { pkg: await f.npmPackage(name, today), today });
  },
  repo: async (name, theme, f) => drawRepoCard(theme, { repo: await f.repo(name), description: describe(name) }),
  tool: async (name, theme, f) => drawToolCard(theme, { name, description: describe(name), repo: await f.repo(name) }),
};

const notFound = () => ({
  status: 404,
  headers: { "Content-Type": TEXT },
  body: `Unknown widget or theme.\nWidgets: ${widgetNames(lists).join(", ")}\nThemes: ${THEME_NAMES.join(", ")}\n`,
});

const unavailable = () => ({
  status: 503,
  headers: { "Content-Type": TEXT, "Retry-After": RETRY_AFTER_SECONDS, "Cache-Control": "no-store" },
  body: "The widget data is unavailable. Try again later.\n",
});

export async function respond(name, theme = DEFAULT_THEME, fetchers, now = new Date()) {
  const widget = parseWidget(name, lists);
  if (!widget || !THEME_NAMES.includes(theme)) return notFound();
  try {
    const svg = await WIDGETS[widget.kind](widget.arg, theme, fetchers, now);
    if (svg === null) return unavailable();
    return { status: 200, headers: { "Content-Type": "image/svg+xml; charset=utf-8", "Cache-Control": EDGE_CACHE }, body: svg };
  } catch {
    return unavailable();
  }
}
