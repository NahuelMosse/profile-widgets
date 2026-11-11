import { test } from "node:test";
import assert from "node:assert/strict";
import { drawHeatmap, drawNpm } from "../src/modules/widgets/domain/draw.mjs";
import { level, THEMES } from "../src/modules/widgets/domain/themes.mjs";

const DAY_MS = 864e5;
const calendarOf = (counts, start = "2026-01-04") => {
  const days = counts.map((n, i) => ({ date: new Date(Date.parse(start) + i * DAY_MS).toISOString().slice(0, 10), contributionCount: n, weekday: i % 7 }));
  return { totalContributions: counts.reduce((a, b) => a + b, 0), weeks: [{ contributionDays: days }] };
};
const daily = Array.from({ length: 28 }, (_, i) => ({ day: new Date(Date.parse("2026-09-01") + i * DAY_MS).toISOString().slice(0, 10), downloads: 10 }));

test("a log-scale level changes exactly at its boundary and a full window has no empty week @PW-1-S1 @PW-1-ASM-01", () => {
  const fills = [...drawHeatmap("dark", { calendar: calendarOf([4, 15]) }).matchAll(/fill="(#[0-9a-f]{6})" class="f"/g)].map((m) => m[1]);
  assert.deepEqual(fills, [3, 4].map((l) => level(THEMES.dark, l)));

  const pkg = { p: "demo-pkg", since: "2026-09-01", version: "1.0.0", daily, total: 280 };
  const path = drawNpm("dark", { packages: [pkg], today: "2026-11-11" }).match(/<path d="(M[^"]*)" pathLength/)[1];
  assert.equal(path, "M640.0 92.0 L785.3 92.0 L930.7 92.0 L1076.0 92.0");
});
