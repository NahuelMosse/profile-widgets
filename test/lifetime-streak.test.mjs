import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as github from "../src/modules/widgets/data/github.mjs";
import { drawStreak } from "../src/modules/widgets/domain/draw.mjs";
import { respond } from "../src/modules/widgets/presentation/respond.mjs";
import { NOW, TOKEN, yearDays } from "./support/stub-fetch.mjs";
import { publicFetch } from "./support/public-fetch.mjs";

const golden = (name, theme) => readFileSync(new URL(`./golden-v3/${name}.${theme}.svg`, import.meta.url), "utf8");
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const YEARS = Array.from({ length: 10 }, (_, i) => String(2017 + i));
const PAGE = "github.com/users/NahuelMosse/contributions";
const label = (svg) => svg.match(/aria-label="([^"]*)"/)[1];
const allDays = (years) => years.flatMap((year) => yearDays(year));

async function withFetch(fetchImpl, run) {
  const original = globalThis.fetch;
  globalThis.fetch = fetchImpl;
  try {
    return await run();
  } finally {
    globalThis.fetch = original;
  }
}

async function withToken(token, run) {
  const original = process.env.GITHUB_TOKEN;
  if (token === undefined) delete process.env.GITHUB_TOKEN;
  else process.env.GITHUB_TOKEN = token;
  try {
    return await run();
  } finally {
    if (original === undefined) delete process.env.GITHUB_TOKEN;
    else process.env.GITHUB_TOKEN = original;
  }
}

// A calendar as the profile gives it: the days from `first`, a week from Sunday.
function calendarOf(first, counts) {
  const weeks = [];
  counts.forEach((n, i) => {
    const d = new Date(`${first}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + i);
    const day = { date: d.toISOString().slice(0, 10), contributionCount: n, weekday: d.getUTCDay() };
    if (weeks.length === 0 || day.weekday === 0) weeks.push({ contributionDays: [] });
    weeks.at(-1).contributionDays.push(day);
  });
  return { totalContributions: counts.reduce((a, b) => a + b, 0), weeks };
}

// GitHub's GraphQL answering the years query: one `y<year>` collection per year it names, with its days.
const graphqlYears = async (init) => {
  const { query } = JSON.parse(init.body);
  const user = Object.fromEntries([...query.matchAll(/\by(\d{4}):\s*contributionsCollection\(from:\s*"(\d{4})-01-01T00:00:00Z",\s*to:\s*"(\d{4})-12-31T23:59:59Z"\)/g)]
    .map(([, alias, from, to]) => {
      assert.equal(from, alias);
      assert.equal(to, alias);
      assert.match(query, /contributionDays\s*\{\s*date\s+contributionCount\s+weekday\s*\}/);
      const days = yearDays(alias);
      const weeks = [];
      for (const day of days) {
        if (weeks.length === 0 || day.weekday === 0) weeks.push({ contributionDays: [] });
        weeks.at(-1).contributionDays.push(day);
      }
      return [`y${alias}`, { contributionCalendar: { weeks } }];
    }));
  return json({ data: { user } });
};

test("the streak runs across years into the last 12 months, and a year page's days from the calendar on are not read @PW-12-S1 @PW-12-ASM-01 @PW-12-ASM-02", () => {
  // The calendar starts on Sunday 2026-01-04: 5 days with contributions, a day with none, 11 more up to today.
  const calendar = calendarOf("2026-01-04", [1, 1, 1, 1, 1, 0, ...Array(11).fill(2)]);
  // The year pages: 15 days running from 2025-12-20 to 2026-01-03, and two days the calendar already covers, one of them
  // in the future, that must not count.
  const counts = { 2025: {}, 2026: { "2026-01-01": 1, "2026-01-02": 1, "2026-01-03": 1, "2026-01-09": 7, "2026-06-01": 5 } };
  for (let day = 20; day <= 31; day++) counts[2025][`2025-12-${day}`] = 1;
  const history = { since: 2025, days: [...yearDays("2025", counts[2025]), ...yearDays("2026", counts[2026])] };

  const svg = drawStreak("dark", { calendar, merged: 4, history });
  assert.equal(label(svg), "Current streak 11 days, longest 20, 31 active days since 2025, 4 merged pull requests in public repositories");
  assert.match(svg, /STREAK · SINCE 2025/);
  assert.doesNotMatch(svg, /LAST 12 MONTHS/);
  for (const [n, name] of [[11, "CURRENT STREAK"], [20, "LONGEST"], [31, "ACTIVE DAYS"], [4, "MERGED PRS · PUBLIC REPOS"]]) {
    assert.match(svg, new RegExp(`>${n}</text><text [^>]*>${name}</text>`), name);
  }

  // Today without contributions does not break the current streak; any other day does.
  const today = calendarOf("2026-01-04", [1, 1, 1, 1, 1, 0, ...Array(11).fill(2), 0]);
  assert.match(label(drawStreak("dark", { calendar: today, merged: 4, history })), /^Current streak 11 days, longest 20, 31 active days since 2025,/);
  const broken = calendarOf("2026-01-04", [1, 1, 1, 1, 1, 0, ...Array(11).fill(2), 0, 0]);
  assert.match(label(drawStreak("dark", { calendar: broken, merged: 4, history })), /^Current streak 0 days, longest 20, 31 active days since 2025,/);

  // A streak still running since before the calendar counts its days in the year pages.
  const running = calendarOf("2026-01-04", Array(17).fill(3));
  assert.match(label(drawStreak("dark", { calendar: running, merged: 0, history })), /^Current streak 32 days, longest 32, 32 active days since 2025,/);

  // Without the year pages the widget keeps the last 12 months.
  const lastYear = drawStreak("dark", { calendar, merged: 4 });
  assert.equal(label(lastYear), "Current streak 11 days, longest 11, 16 active days in the last year, 4 merged pull requests in public repositories");
  assert.match(lastYear, /STREAK · LAST 12 MONTHS/);
});

test("the streak counts every day since the account began, read from the public pages with no token @PW-12-S1 @PW-12-ASM-01 @PW-12-ASM-02", async () => {
  const requests = [];
  const pages = [];
  const seeing = (url) => {
    if (url.hostname === "github.com" && url.searchParams.has("from")) pages.push(url);
  };
  await withToken(TOKEN, () => withFetch(publicFetch({ requests, override: seeing }), async () => {
    assert.deepEqual(await github.contributionHistory(NOW), { since: 2017, days: allDays(YEARS) });
  }));
  assert.deepEqual(requests.map((r) => r.at).sort(), ["api.github.com/users/NahuelMosse", ...YEARS.map(() => PAGE)].sort());
  assert.ok(requests.every((r) => !r.token), JSON.stringify(requests));
  assert.deepEqual(pages.map((u) => `${u.searchParams.get("from")}..${u.searchParams.get("to")}`).sort(), YEARS.map((y) => `${y}-01-01..${y}-12-31`));

  // The current year is the one of `now`.
  await withFetch(publicFetch(), async () => {
    assert.deepEqual(await github.contributionHistory(new Date("2025-03-01T00:00:00Z")), { since: 2017, days: allDays(YEARS.slice(0, 9)) });
    assert.deepEqual(await github.contributionHistory(new Date("2017-12-31T23:59:59Z")), { since: 2017, days: allDays(["2017"]) });
  });

  // The widget draws the days since 2017: the recorded last 12 months hold the current and longest streaks, 176 of the
  // 475 days with contributions, the rest in the years before them.
  await withToken(TOKEN, () => withFetch(publicFetch(), async () => {
    for (const theme of ["dark", "light"]) {
      const answer = await respond("streak", theme, github, NOW);
      assert.equal(answer.status, 200);
      assert.equal(answer.body, golden("streak", theme), theme);
      assert.match(label(answer.body), /^Current streak 53 days, longest 53, 475 active days since 2017, \d+ merged pull requests in public repositories$/);
      assert.match(answer.body, /STREAK · SINCE 2017/);
      assert.match(answer.body, />475<\/text>/);
    }
  }));
});

test("a year the public page does not give is asked of GraphQL with the token, and both failing is a 503 with Retry-After 300 @PW-12-ASM-03", async () => {
  const headingOnly = (year) => `<h2 tabindex="-1" id="js-contribution-activity-description" class="f4 text-normal mb-2">\n  1\n  contribution\n  in ${year}\n</h2>\n`;
  const failures = {
    "page 500": (url) => url.searchParams.get("from") === "2023-01-01" && new Response("oops", { status: 500 }),
    "page 429": (url) => url.searchParams.get("from") === "2017-01-01" && new Response("slow down", { status: 429 }),
    "page unreachable": (url) => {
      if (url.searchParams.get("from") === "2026-01-01") throw new TypeError("fetch failed");
    },
    "page changed": (url) => url.searchParams.get("from") === "2024-01-01" && new Response("<html><body>A new profile</body></html>", { status: 200 }),
    "no day cells": (url) => url.searchParams.get("from") === "2022-01-01" && new Response(headingOnly(2022), { status: 200 }),
  };
  for (const [name, failure] of Object.entries(failures)) {
    const requests = [];
    const queries = [];
    const override = (url, init) => {
      if (url.pathname === "/graphql") {
        queries.push(new Headers(init.headers ?? {}).get("authorization"));
        return graphqlYears(init);
      }
      return failure(url);
    };
    await withToken(TOKEN, () => withFetch(publicFetch({ requests, override }), async () => {
      assert.deepEqual(await github.contributionHistory(NOW), { since: 2017, days: allDays(YEARS) }, name);
    }));
    assert.equal(queries.length, 1, name);
    assert.ok(queries[0], name);
    assert.deepEqual(requests.filter((r) => r.token).map((r) => r.at), ["api.github.com/graphql"], name);
  }

  // With no token there is no fallback: the streak is a 503.
  const unavailable = { "Content-Type": "text/plain; charset=utf-8", "Retry-After": "300", "Cache-Control": "no-store" };
  await withToken(undefined, () => withFetch(publicFetch({ override: failures["page 500"] }), async () => {
    const answer = await respond("streak", "dark", github, NOW);
    assert.deepEqual({ status: answer.status, headers: answer.headers }, { status: 503, headers: unavailable });
  }));

  // The pages and GraphQL both failing, or no account, is a 503.
  const cases = {
    "both down": (url) => (url.searchParams.has("from") || url.pathname === "/graphql") && new Response("{}", { status: 500 }),
    "GraphQL errors": (url) => (url.searchParams.has("from") && new Response("oops", { status: 500 })) || (url.pathname === "/graphql" && json({ errors: [{ message: "bad" }] })),
    "no account": (url) => url.hostname === "api.github.com" && url.pathname === "/users/NahuelMosse" && json({ message: "Not Found" }, 404),
  };
  for (const [name, override] of Object.entries(cases)) {
    await withToken(TOKEN, () => withFetch(publicFetch({ override }), async () => {
      const answer = await respond("streak", "dark", github, NOW);
      assert.deepEqual({ status: answer.status, headers: answer.headers }, { status: 503, headers: unavailable }, name);
    }));
  }
});
