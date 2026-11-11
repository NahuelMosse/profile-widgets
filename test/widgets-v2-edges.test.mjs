import { test } from "node:test";
import assert from "node:assert/strict";
import { drawRepoCard, drawSkyline } from "../src/modules/widgets/domain/draw.mjs";

const DAY_MS = 864e5;
const calendarOf = (counts, start = "2026-01-04") => {
  const days = counts.map((n, i) => ({ date: new Date(Date.parse(start) + i * DAY_MS).toISOString().slice(0, 10), contributionCount: n, weekday: i % 7 }));
  const weeks = [];
  for (let i = 0; i < days.length; i += 7) weeks.push({ contributionDays: days.slice(i, i + 7) });
  return { totalContributions: counts.reduce((a, b) => a + b, 0), weeks };
};
const heightOf = (counts) => Number(drawSkyline("dark", { calendar: calendarOf(counts) }).match(/<svg[^>]* height="(\d+)"/)[1]);
const repoOf = (over = {}) => ({ name: "demo", stargazerCount: 4, pushedAt: "2026-11-01T10:00:00Z", primaryLanguage: null, ...over });
const firstLine = (svg) => svg.match(/y="104"[^>]*>([^<]*)</)[1];
const label = (svg) => svg.match(/aria-label="([^"]*)"/)[1];

test("the skyline's frame follows its tallest prism @PW-2-S1 @PW-1-S1", () => {
  // A lone contribution is the busiest day: 117 high, so the frame is ceil(48 + 24 + 117 + 42 + 10.6 + 24) = 266.
  assert.equal(heightOf([1]), 266);
  // The tallest prism on the fourth weekday of the first week sits 21 below the origin: ceil(48 + 24 + 96 + 42 + 10.6 + 24) = 245.
  assert.equal(heightOf([0, 0, 0, 100, 0, 0, 0]), 245);
});

test("a repo card's text falls back from the profile's description to GitHub's and then to nothing @PW-2-S1 @PW-1-S1", () => {
  const withGithub = drawRepoCard("dark", { repo: repoOf({ description: "From GitHub" }), description: "", index: 0 });
  assert.equal(firstLine(withGithub), "From GitHub");
  assert.equal(label(withGithub), "demo: From GitHub 4 stars, ");

  const withNone = drawRepoCard("dark", { repo: repoOf({ description: null }), index: 0 });
  assert.equal(firstLine(withNone), "");
  assert.equal(label(withNone), "demo:  4 stars, ");
});
