import lists from "../data/repos.json" with { type: "json" };
import { drawBuilding, drawHeatmap, drawNpm, drawNpmPackage, drawRepoCard, drawSkyline, drawStreak, drawToolCard, drawViews, parseWidget, widgetNames } from "../domain/draw.mjs";
import { THEME_NAMES } from "../domain/themes.mjs";

const DEFAULT_THEME = "dark";
const TEXT = "text/plain; charset=utf-8";
// Vercel strips s-maxage from what it sends to clients, so GitHub's image proxy only sees max-age.
const EDGE_CACHE = "public, max-age=1800, s-maxage=1800, stale-while-revalidate=86400";
// The views widget is komarev's counter: GitHub's image proxy must ask for it on every view, as it does for komarev's badge.
const NEVER_CACHED = "max-age=0, no-cache, no-store, must-revalidate";
const RETRY_AFTER_SECONDS = "300";

const describe = (name) => lists.repos[name]?.description;
const dayOf = (now) => now.toISOString().slice(0, 10);

async function requiredRepo(f, name) {
  const repo = await f.repo(name);
  if (!repo) throw new Error(`repo ${name} not found`);
  return repo;
}

// Each kind of widget asks its fetchers only for the data it draws (`load`); drawing it (`draw`) is a separate step, so
// that a failure of the upstream and a bug of the drawing answer differently.
const WIDGETS = {
  streak: {
    load: async (_arg, f) => {
      const [calendar, merged] = await Promise.all([f.calendar(), f.mergedPullRequests()]);
      return { calendar, merged };
    },
    draw: (_arg, theme, data) => drawStreak(theme, data),
  },
  heatmap: {
    load: async (_arg, f) => ({ calendar: await f.calendar() }),
    draw: (_arg, theme, data) => drawHeatmap(theme, data),
  },
  skyline: {
    load: async (_arg, f) => ({ calendar: await f.calendar() }),
    draw: (_arg, theme, data) => drawSkyline(theme, data),
  },
  building: {
    load: async (_arg, f, now) => {
      const [repos, events, user] = await Promise.all([f.recentRepos(), f.publicEvents(), f.profileUser()]);
      return { repos, events, descriptions: lists.repos, user, now };
    },
    draw: (_arg, theme, data) => drawBuilding(theme, data),
  },
  npm: {
    load: async (_arg, f, now) => {
      const today = dayOf(now);
      return { packages: await Promise.all(lists.npm.map((name) => f.npmPackage(name, today))), today };
    },
    draw: (_arg, theme, data) => drawNpm(theme, data),
  },
  views: {
    load: async (_arg, f) => ({ count: await f.profileViews() }),
    draw: (_arg, theme, data) => drawViews(theme, data),
    cache: NEVER_CACHED,
  },
  "npm-package": {
    load: async (name, f, now) => {
      const today = dayOf(now);
      return { pkg: await f.npmPackage(name, today), today, index: lists.npm.indexOf(name) };
    },
    draw: (_arg, theme, data) => drawNpmPackage(theme, data),
  },
  repo: {
    load: async (name, f) => ({ repo: await requiredRepo(f, name), description: describe(name), index: lists.featured.indexOf(name) }),
    draw: (_arg, theme, data) => drawRepoCard(theme, data),
  },
  tool: {
    load: async (name, f) => ({ name, description: describe(name), repo: await f.repo(name), index: lists.npm.indexOf(name) }),
    draw: (_arg, theme, data) => drawToolCard(theme, data),
  },
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

const internalError = () => ({
  status: 500,
  headers: { "Content-Type": TEXT, "Cache-Control": "no-store" },
  body: "Internal error.\n",
});

export const methodNotAllowed = () => ({
  status: 405,
  headers: { "Content-Type": TEXT, Allow: "GET, HEAD" },
  body: "Method not allowed.\n",
});

async function loadData(widget, fetchers, now) {
  try {
    return { data: await WIDGETS[widget.kind].load(widget.arg, fetchers, now) };
  } catch {
    return { failure: unavailable() };
  }
}

export async function respond(name, theme = DEFAULT_THEME, fetchers, now = new Date()) {
  const widget = parseWidget(name, lists);
  if (!widget || !THEME_NAMES.includes(theme)) return notFound();
  const { data, failure } = await loadData(widget, fetchers, now);
  if (failure) return failure;
  try {
    const svg = WIDGETS[widget.kind].draw(widget.arg, theme, data);
    if (svg === null) return unavailable();
    return { status: 200, headers: { "Content-Type": "image/svg+xml; charset=utf-8", "Cache-Control": WIDGETS[widget.kind].cache ?? EDGE_CACHE }, body: svg };
  } catch {
    return internalError();
  }
}
