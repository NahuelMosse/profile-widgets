import { test } from "node:test";
import assert from "node:assert/strict";
import { drawBuilding, drawHeatmap, drawNpm, drawNpmPackage, drawRepoCard, drawSkyline, drawStreak } from "../src/modules/widgets/domain/draw.mjs";
import { level, THEMES } from "../src/modules/widgets/domain/themes.mjs";

const DAY_MS = 864e5;
const NOW = new Date("2026-11-11T16:43:58.000Z");
const hours = (n) => new Date(NOW.getTime() - n * 36e5).toISOString();
const label = (svg) => svg.match(/aria-label="([^"]*)"/)[1];
const calendarOf = (counts, start = "2026-01-04") => {
  const days = counts.map((n, i) => ({ date: new Date(Date.parse(start) + i * DAY_MS).toISOString().slice(0, 10), contributionCount: n, weekday: i % 7 }));
  const weeks = [];
  for (let i = 0; i < days.length; i += 7) weeks.push({ contributionDays: days.slice(i, i + 7) });
  return { totalContributions: counts.reduce((a, b) => a + b, 0), weeks };
};
const dailyOf = (count, downloads, start = "2026-09-01") =>
  Array.from({ length: count }, (_, i) => ({ day: new Date(Date.parse(start) + i * DAY_MS).toISOString().slice(0, 10), downloads: typeof downloads === "function" ? downloads(i) : downloads }));
const packageOf = (daily) => ({ p: "demo-pkg", since: daily[0].day, version: "1.0.0", daily, total: daily.reduce((a, d) => a + d.downloads, 0) });
const npmOf = (daily) => drawNpm("dark", { packages: [packageOf(daily)], today: "2026-11-11" });
const sparkPath = (svg) => svg.match(/<path d="(M[^"]*)" pathLength/)[1];
const fills = (svg) => [...svg.matchAll(/fill="(#[0-9a-f]{6})" class="f"/g)].map((m) => m[1]);

test("the drawings hold at the edges of their numbers @PW-5-S1 @PW-5-ASM-01 @PW-4-S1 @PW-4-ASM-01 @PW-2-S1 @PW-2-ASM-01 @PW-1-S1 @PW-1-ASM-01", () => {
  // Contribution levels on the log scale of the busiest day.
  const heat = drawHeatmap("dark", { calendar: calendarOf([1, 10, 11, 50, 100]) });
  assert.deepEqual(fills(heat), [1, 2, 3, 4, 4].map((l) => level(THEMES.dark, l)));

  // Skyline: the prism of a lone contribution is as tall as the busiest day can be, its top at the title's line, and the
  // frame ends one inset under its foot; prisms are painted back to front.
  const lone = drawSkyline("dark", { calendar: calendarOf([1]) });
  assert.match(lone, /88\.4,56\.0/);
  assert.match(lone, /<svg[^>]* width="1012" height="199" viewBox="0 0 1012 199"/);
  const titles = [...drawSkyline("dark", { calendar: calendarOf(Array(14).fill(1)) }).matchAll(/<title>(\d{4}-\d\d-\d\d): 1<\/title>/g)].map((m) => m[1]);
  const cells = calendarOf(Array(14).fill(1)).weeks.flatMap((w, wi) => w.contributionDays.map((d) => ({ wi, di: d.weekday, date: d.date })));
  const expected = cells.sort((a, b) => a.wi * 3.2 + a.di * 6.5 - (b.wi * 3.2 + b.di * 6.5) || a.wi - b.wi).map((c) => c.date);
  assert.deepEqual(titles, expected);

  // A month label stays on the third week from the end.
  const months = drawHeatmap("dark", { calendar: calendarOf(Array(49).fill(1)) });
  assert.match(months, />Jan</);
  assert.match(months, />Feb</);

  // Streaks at the first day and with no activity.
  const streak = (counts) => label(drawStreak("dark", { calendar: calendarOf(counts), merged: 0 })).match(/^Current streak (\d+) days, longest (\d+)/).slice(1);
  assert.deepEqual(streak([1, 1, 1]), ["3", "3"]);
  assert.deepEqual(streak([5]), ["1", "1"]);
  assert.deepEqual(streak([0]), ["0", "0"]);

  // The words of a description wrap at 35 characters, counted without the leading space.
  const word = "a".repeat(35);
  const card = drawRepoCard("dark", { repo: { name: "n", description: "", stargazerCount: 0, pushedAt: "2026-11-01T00:00:00Z", primaryLanguage: null }, description: `${word} tail`, index: 0 });
  assert.match(card, new RegExp(`y="92"[^>]*>${word}<`));
  assert.match(card, /y="112"[^>]*>tail</);
});

test("the download counts hold at their windows @PW-5-S1 @PW-5-ASM-01 @PW-4-S1 @PW-4-ASM-01 @PW-2-S1 @PW-2-ASM-01 @PW-1-S1 @PW-1-ASM-01", () => {
  assert.match(npmOf(dailyOf(28, 3)), />WEEKLY DOWNLOADS/);
  assert.match(npmOf(dailyOf(27, 3)), />DAILY DOWNLOADS/);
  assert.equal(sparkPath(npmOf(dailyOf(29, (i) => i + 1))), "M530.0 167.6 L644.5 152.6 L759.0 131.1 L873.5 109.5 L988.0 88.0");
  assert.match(npmOf(dailyOf(29, (i) => i + 1)), />182 THIS WEEK · PEAK 182</);
  assert.equal(sparkPath(npmOf(dailyOf(1, 9))), "M530.0 88.0");
  assert.equal(sparkPath(npmOf(dailyOf(2, (i) => 10 + i * 10))), "M530.0 128.0 L988.0 88.0");
  assert.match(npmOf(dailyOf(1, 1)), />1 LAST DAY · PEAK 1</);

  // A day with a single download is reported.
  const pkg = packageOf(dailyOf(5, 1, "2026-11-01"));
  assert.match(drawNpmPackage("dark", { pkg, today: "2026-11-11", index: 0 }), />\+5 this week</);
});

test("the building card holds at its limits @PW-5-S1 @PW-5-ASM-01 @PW-4-S1 @PW-4-ASM-01 @PW-2-S1 @PW-2-ASM-01 @PW-1-S1 @PW-1-ASM-01", () => {
  const long = ["a", "b", "c", "d"].map((c) => c.repeat(35)).join(" ");
  const base = { events: [], descriptions: { miga: { description: long } }, user: "NahuelMosse", now: NOW };
  const svg = drawBuilding("dark", { ...base, repos: [{ name: "miga", primaryLanguage: null, pushedAt: hours(2) }] });
  assert.match(svg, new RegExp(`y="114"[^>]*>${"a".repeat(35)}<`));
  assert.match(svg, new RegExp(`y="134"[^>]*>${"b".repeat(35)}<`));
  assert.equal(svg.includes(">" + "c".repeat(35)), false);

  const ago = (n) => drawBuilding("dark", { ...base, repos: [{ name: "miga", primaryLanguage: null, pushedAt: hours(n) }] }).match(/last push ([^<]*)</)[1];
  assert.equal(ago(1), "1 h ago");
  assert.equal(ago(23), "23 h ago");
  assert.equal(ago(24), "1 d ago");
});

test("a log-scale level changes exactly at its boundary and a full window has no empty week @PW-5-S1 @PW-5-ASM-01 @PW-4-S1 @PW-4-ASM-01 @PW-2-S1 @PW-2-ASM-01 @PW-1-S1 @PW-1-ASM-01", () => {
  assert.deepEqual(fills(drawHeatmap("dark", { calendar: calendarOf([4, 15]) })), [3, 4].map((l) => level(THEMES.dark, l)));
  assert.equal(sparkPath(npmOf(dailyOf(28, 10))), "M530.0 88.0 L682.7 88.0 L835.3 88.0 L988.0 88.0");
});
