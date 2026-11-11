import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  drawBuilding, drawHeatmap, drawNpm, drawNpmPackage, drawRepoCard, drawSkyline, drawStreak, drawToolCard, widgetNames,
} from "../src/modules/widgets/domain/draw.mjs";
import { THEME_NAMES } from "../src/modules/widgets/domain/themes.mjs";
import * as github from "../src/modules/widgets/data/github.mjs";
import * as npm from "../src/modules/widgets/data/npm.mjs";
import lists from "../src/modules/widgets/data/repos.json" with { type: "json" };
import { fixtureFetch, NOW, TOKEN } from "./support/stub-fetch.mjs";

globalThis.fetch = fixtureFetch;
process.env.GITHUB_TOKEN = TOKEN;

const today = NOW.toISOString().slice(0, 10);
const golden = (name, theme) => readFileSync(new URL(`./golden/${name}.${theme}.svg`, import.meta.url), "utf8");
const label = (svg) => svg.match(/aria-label="([^"]*)"/)[1];
const hours = (n) => new Date(NOW.getTime() - n * 36e5).toISOString();
const DAY_MS = 864e5;

const calendarOf = (counts, start = "2026-01-04") => {
  const days = counts.map((n, i) => ({ date: new Date(Date.parse(start) + i * DAY_MS).toISOString().slice(0, 10), contributionCount: n, weekday: i % 7 }));
  const weeks = [];
  for (let i = 0; i < days.length; i += 7) weeks.push({ contributionDays: days.slice(i, i + 7) });
  return { totalContributions: counts.reduce((a, b) => a + b, 0), weeks };
};
const dailyOf = (count, downloads, start = "2026-09-01") =>
  Array.from({ length: count }, (_, i) => ({ day: new Date(Date.parse(start) + i * DAY_MS).toISOString().slice(0, 10), downloads }));
const packageOf = (daily, since = daily[0].day) => ({ p: "demo-pkg", since, version: "2.0.1", daily, total: daily.reduce((a, d) => a + d.downloads, 0) });
const repoOf = (over = {}) => ({ name: "demo", description: "From GitHub", stargazerCount: 4, pushedAt: "2026-11-01T10:00:00Z", primaryLanguage: { name: "Rust" }, ...over });

async function recordedWidgets() {
  const calendar = await github.calendar();
  const merged = await github.mergedPullRequests();
  const packages = await Promise.all(lists.npm.map((p) => npm.npmPackage(p, today)));
  const widgets = {
    streak: (theme) => drawStreak(theme, { calendar, merged }),
    heatmap: (theme) => drawHeatmap(theme, { calendar }),
    skyline: (theme) => drawSkyline(theme, { calendar }),
    building: (theme) => drawBuilding(theme, { repos, events, descriptions: lists.repos, user: github.profileUser(), now: NOW }),
    npm: (theme) => drawNpm(theme, { packages, today }),
  };
  const repos = await github.recentRepos();
  const events = await github.publicEvents();
  for (const pkg of packages) {
    widgets[`npm-${pkg.p}`] = (theme) => drawNpmPackage(theme, { pkg, today });
    const repo = await github.repo(pkg.p);
    widgets[`tool-${pkg.p}`] = (theme) => drawToolCard(theme, { name: pkg.p, description: lists.repos[pkg.p]?.description, repo });
  }
  for (const name of lists.featured) {
    const repo = await github.repo(name);
    widgets[`repo-${name}`] = (theme) => drawRepoCard(theme, { repo, description: lists.repos[name]?.description });
  }
  return widgets;
}

test("each README widget draws from its data in both themes @PW-1-S1 @PW-1-ASM-01", async () => {
  assert.deepEqual(THEME_NAMES, ["dark", "light"]);
  const widgets = await recordedWidgets();
  assert.deepEqual(Object.keys(widgets).sort(), widgetNames(lists).sort());
  for (const [name, draw] of Object.entries(widgets))
    for (const theme of THEME_NAMES) assert.equal(draw(theme), golden(name, theme), `${name}.${theme}`);

  // The streak counts from the calendar; a day without contributions today does not break the current streak.
  const streak = (counts, merged) => label(drawStreak("dark", { calendar: calendarOf(counts), merged }));
  assert.equal(streak([0, 2, 3, 0, 1, 1, 0], 7), "Current streak 2 days, longest 2, 4 active days in the last year, 7 merged pull requests in public repositories");
  assert.equal(streak([3, 0, 2, 2], 0), "Current streak 2 days, longest 2, 3 active days in the last year, 0 merged pull requests in public repositories");
  assert.equal(streak([1, 1, 0, 0], 1), "Current streak 0 days, longest 2, 2 active days in the last year, 1 merged pull requests in public repositories");
  assert.match(drawStreak("light", { calendar: calendarOf([1200]), merged: 1234 }), />1,234<\/text><text[^>]*>MERGED PRS/);

  // An empty year draws without NaN; one cell per day.
  const empty = calendarOf([0, 0, 0, 0, 0, 0, 0, 0]);
  assert.equal(drawHeatmap("dark", { calendar: empty }).includes("NaN"), false);
  assert.equal(drawSkyline("dark", { calendar: empty }).includes("NaN"), false);
  assert.equal(drawHeatmap("dark", { calendar: empty }).split('class="f"').length - 1, 8);
  assert.equal(drawSkyline("dark", { calendar: empty }).split('<g class="r"').length - 1, 8);

  // A repo card wraps the description in two lines and closes the second with an ellipsis; a missing language is a dash.
  const long = "one two three four five six seven eight nine ten eleven twelve — thirteen fourteen fifteen";
  const card = drawRepoCard("dark", { repo: repoOf({ primaryLanguage: null }), description: long });
  assert.match(card, />one two three four five six seven</);
  assert.match(card, />eight nine ten eleven twelve…</);
  assert.equal(card.includes(">thirteen"), false);
  assert.match(card, /font-size="13">—</);
  assert.match(label(card), /^demo: one two three .* fifteen 4 stars, $/);
  assert.match(drawRepoCard("dark", { repo: repoOf({ name: 'a<b&"c' }), description: undefined }), />a&lt;b&amp;&quot;c</);
  assert.match(drawRepoCard("dark", { repo: repoOf(), description: undefined }), />From GitHub</);
  assert.match(drawRepoCard("dark", { repo: repoOf({ description: null }), description: undefined }), /<svg[^>]* height="170"/);

  // A tool card without its repo is shorter and has no meta row.
  const bare = drawToolCard("dark", { name: "demo-pkg", description: "Does a thing.", repo: null });
  assert.match(bare, /<svg[^>]* height="130"/);
  assert.equal(bare.includes('y1="126.5"'), true);
  assert.equal(bare.includes("<circle"), false);
  assert.equal(label(bare), "demo-pkg, an npm package and a Claude Code skill: Does a thing.");
  const full = drawToolCard("dark", { name: "demo-pkg", description: "Does a thing.", repo: repoOf() });
  assert.match(full, /<svg[^>]* height="170"/);
  assert.equal(label(full), "demo-pkg, an npm package and a Claude Code skill: Does a thing. 4 stars, Rust");

  // After four weeks of data the sparkline is weekly, ending at the last reported day.
  const weekly = packageOf(dailyOf(60, 10));
  const weeklySvg = drawNpm("dark", { packages: [weekly], today });
  assert.match(weeklySvg, />WEEKLY DOWNLOADS SINCE 2026-09-01</);
  assert.match(weeklySvg, />70 THIS WEEK · PEAK 70</);
  assert.match(label(weeklySvg), /^npm downloads of the dev-kit tools since publication: 600 in total, 70 in the last 7 days\. demo-pkg v2\.0\.1: 600, 70 in the last 7 days$/);
  assert.match(weeklySvg, /<path d="M640\.0 [\d.]+ L/);
  const single = packageOf(dailyOf(1, 9));
  assert.match(drawNpm("dark", { packages: [single], today }), />9 LAST DAY · PEAK 9</);
  assert.match(drawNpmPackage("dark", { pkg: weekly, today }), />\+70 this week</);
  assert.equal(label(drawNpmPackage("dark", { pkg: weekly, today })), "demo-pkg v2.0.1 on npm: 600 downloads since 2026-09-01, 70 in the last 7 days");

  // Currently building: the latest repo with a description, the first PR event of such a repo, a relative push time.
  const descriptions = { miga: { description: "A bakery." }, other: { description: "Another." } };
  const repos = [
    { name: "NahuelMosse", primaryLanguage: null, pushedAt: hours(1) },
    { name: "nodescription", primaryLanguage: null, pushedAt: hours(1) },
    { name: "miga", primaryLanguage: { name: "HTML" }, pushedAt: hours(5) },
    { name: "other", primaryLanguage: null, pushedAt: hours(1) },
  ];
  const events = [
    { type: "PushEvent", repo: { name: "NahuelMosse/miga" }, created_at: "2026-11-11T00:00:00Z", payload: {} },
    { type: "PullRequestEvent", repo: { name: "NahuelMosse/nodescription" }, created_at: "2026-11-11T00:00:00Z", payload: { action: "closed", number: 1 } },
    { type: "PullRequestEvent", repo: { name: "NahuelMosse/other" }, created_at: "2026-11-10T10:00:00Z", payload: { action: "opened", pull_request: { number: 7 } } },
    { type: "PullRequestEvent", repo: { name: "NahuelMosse/miga" }, created_at: "2026-11-09T10:00:00Z", payload: { action: "merged", number: 8 } },
  ];
  const building = (over) => drawBuilding("light", { repos, events, descriptions, user: "NahuelMosse", now: NOW, ...over });
  const svg = building({});
  assert.match(svg, />miga</);
  assert.match(svg, />HTML · last push 5 h ago</);
  assert.match(svg, />other · #7</);
  assert.match(svg, />Pull request opened</);
  assert.equal(label(svg), "Currently building miga: A bakery. Pull request opened in other on 2026-11-10.");
  assert.equal(label(building({ events: [] })), "Currently building miga: A bakery.");
  assert.equal(building({ events: [] }).includes("LATEST REVIEWABLE WORK"), false);
  assert.match(building({ repos: [{ ...repos[2], pushedAt: hours(0.4) }] }), /last push just now</);
  assert.match(building({ repos: [{ ...repos[2], pushedAt: hours(49) }] }), /last push 2 d ago</);
  assert.equal(building({ repos: repos.slice(0, 2) }), null);
  assert.equal(building({ user: "miga", repos: [repos[2]] }), null);

  // Every drawing validates its theme and its data.
  const draws = [drawStreak, drawHeatmap, drawSkyline, drawRepoCard, drawToolCard, drawNpmPackage, drawNpm, drawBuilding];
  for (const draw of draws) {
    assert.throws(() => draw("dark", null), TypeError, draw.name);
    assert.throws(() => draw("dark", {}), TypeError, draw.name);
    assert.throws(() => draw("dark"), TypeError, draw.name);
    assert.throws(() => draw("sepia", {}), /unknown theme/, draw.name);
  }
  assert.throws(() => drawHeatmap("sepia", { calendar: calendarOf([1]) }), /unknown theme/);
  assert.throws(() => drawHeatmap("dark", { calendar: null }), /missing calendar/);
});
