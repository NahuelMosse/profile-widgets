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
const packageOf = (daily, over = {}) => ({ p: "demo-pkg", since: daily[0].day, version: "1.0.0", daily, total: daily.reduce((a, d) => a + d.downloads, 0), ...over });
const npmOf = (daily) => drawNpm("dark", { packages: [packageOf(daily)], today: "2026-11-11" });
const sparkPath = (svg) => svg.match(/<path d="(M[^"]*)" pathLength/)[1];
const fills = (svg) => [...svg.matchAll(/fill="(#[0-9a-f]{6})" class="f"/g)].map((m) => m[1]);
const repoOf = (over = {}) => ({ name: "demo", description: "From GitHub", stargazerCount: 4, pushedAt: "2026-11-01T10:00:00Z", primaryLanguage: { name: "Rust" }, ...over });

test("the drawings hold at the edges of their numbers @PW-2-S1 @PW-2-ASM-01", () => {
  // Contribution levels on the log scale of the busiest day.
  assert.deepEqual(fills(drawHeatmap("dark", { calendar: calendarOf([1, 10, 11, 50, 100]) })), [1, 2, 3, 4, 4].map((l) => level(THEMES.dark, l)));

  // Skyline: a lone contribution is as tall as the busiest day can be; the frame grows to hold the tallest prism.
  assert.match(drawSkyline("dark", { calendar: calendarOf([1]) }), /979\.3,82\.6/);
  assert.match(drawSkyline("dark", { calendar: calendarOf([0, 0, 0, 0, 0, 0, 0, 100, 0, 0, 0, 0, 0, 0]) }), /<svg[^>]* height="266"/);

  // A month label stays on the third week from the end.
  const months = drawHeatmap("dark", { calendar: calendarOf(Array(49).fill(1)) });
  assert.match(months, />Jan</);
  assert.match(months, />Feb</);

  // Streaks: a quiet today does not break the run, the first day counts, no activity is zero.
  const streak = (counts) => label(drawStreak("dark", { calendar: calendarOf(counts), merged: 0 })).match(/^Current streak (\d+) days, longest (\d+)/).slice(1);
  assert.deepEqual(streak([0, 2, 3, 0, 1, 1, 0]), ["2", "2"]);
  assert.deepEqual(streak([1, 1, 0, 0]), ["0", "2"]);
  assert.deepEqual(streak([1, 1, 1]), ["3", "3"]);
  assert.deepEqual(streak([5]), ["1", "1"]);
  assert.deepEqual(streak([0]), ["0", "0"]);

  // A description wraps at 33 characters counted without the leading space; the card's own text wins over the repo's.
  const word = "a".repeat(33);
  const card = drawRepoCard("dark", { repo: repoOf({ primaryLanguage: null }), description: `${word} tail`, index: 0 });
  assert.match(card, new RegExp(`y="104"[^>]*>${word}<`));
  assert.match(card, /y="123"[^>]*>tail</);
  assert.match(drawRepoCard("dark", { repo: repoOf({ description: "Theirs" }), description: "Mine", index: 0 }), /y="104"[^>]*>Mine</);
});

test("the download counts hold at their windows @PW-2-S1 @PW-2-ASM-01", () => {
  assert.match(npmOf(dailyOf(28, 3)), />WEEKLY DOWNLOADS/);
  assert.match(npmOf(dailyOf(27, 3)), />DAILY DOWNLOADS/);
  assert.equal(sparkPath(npmOf(dailyOf(29, (i) => i + 1))), "M560.0 195.5 L667.0 177.5 L774.0 151.7 L881.0 125.8 L988.0 100.0");
  assert.match(npmOf(dailyOf(29, (i) => i + 1)), />182 THIS WEEK · PEAK 182</);
  assert.equal(sparkPath(npmOf(dailyOf(28, 10))), "M560.0 100.0 L702.7 100.0 L845.3 100.0 L988.0 100.0");
  assert.equal(sparkPath(npmOf(dailyOf(1, 9))), "M560.0 100.0");
  assert.equal(sparkPath(npmOf(dailyOf(2, (i) => 10 + i * 10))), "M560.0 148.0 L988.0 100.0");
  assert.match(npmOf(dailyOf(1, 1)), />1 LAST DAY · PEAK 1</);

  // The window starts at the oldest package; a day with a single download is reported.
  const older = packageOf(dailyOf(3, 5, "2026-09-01"));
  const newer = packageOf(dailyOf(3, 5, "2026-09-10"));
  assert.match(drawNpm("dark", { packages: [newer, older], today: "2026-11-11" }), /DOWNLOADS SINCE 2026-09-01</);
  const pkg = packageOf(dailyOf(5, 1, "2026-11-01"));
  assert.match(drawNpmPackage("dark", { pkg, today: "2026-11-11", index: 0 }), />\+5 this week</);
});

test("the building card holds at its limits @PW-2-S1 @PW-2-ASM-01", () => {
  const long = ["a", "b", "c"].map((c) => c.repeat(38)).join(" ");
  const base = { events: [], descriptions: { miga: { description: long } }, user: "NahuelMosse", now: NOW };
  const at = (n) => drawBuilding("dark", { ...base, repos: [{ name: "miga", primaryLanguage: null, pushedAt: hours(n) }] });
  assert.match(at(2), new RegExp(`y="120"[^>]*>${"a".repeat(38)}<`));
  assert.match(at(2), new RegExp(`y="139"[^>]*>${"b".repeat(38)}<`));
  assert.equal(at(2).includes(">" + "c".repeat(38)), false);

  const ago = (n) => at(n).match(/last push ([^<]*)</)[1];
  assert.equal(ago(0.4), "just now");
  assert.equal(ago(1), "1 h ago");
  assert.equal(ago(23), "23 h ago");
  assert.equal(ago(24), "1 d ago");
});

test("a log-scale level changes exactly at its boundary and a full window has no empty week @PW-2-S1 @PW-2-ASM-01", () => {
  assert.deepEqual(fills(drawHeatmap("dark", { calendar: calendarOf([4, 15]) })), [3, 4].map((l) => level(THEMES.dark, l)));
  assert.equal(sparkPath(npmOf(dailyOf(28, 10))).split(" L").length, 4);
});
