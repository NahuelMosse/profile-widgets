import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as github from "../src/modules/widgets/data/github.mjs";
import { parseYearTotal } from "../src/modules/widgets/domain/contributions-page.mjs";
import { drawSkyline } from "../src/modules/widgets/domain/draw.mjs";
import { respond } from "../src/modules/widgets/presentation/respond.mjs";
import { contributionYearPage, NOW, recordedYears, TOKEN } from "./support/stub-fetch.mjs";
import { contributionsPage, publicFetch, recordedCalendar } from "./support/public-fetch.mjs";

const golden = (name, theme) => readFileSync(new URL(`./golden-v3/${name}.${theme}.svg`, import.meta.url), "utf8");
const page2023 = JSON.parse(readFileSync(new URL("./fixtures/github-contributions-2023.json", import.meta.url), "utf8")).body;
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const YEARS = Array.from({ length: 10 }, (_, i) => String(2017 + i));
const ALL = YEARS.reduce((sum, year) => sum + recordedYears[year], 0);
const PAGE = "github.com/users/NahuelMosse/contributions";
const prisms = (svg) => [...svg.matchAll(/<polygon [^>]*>/g)].map((m) => m[0]);

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

// GitHub's GraphQL answering the years query: one `y<year>` collection per year it names.
const graphqlYears = async (init) => {
  const { query } = JSON.parse(init.body);
  const user = Object.fromEntries([...query.matchAll(/\by(\d{4}):\s*contributionsCollection\(from:\s*"(\d{4})-01-01T00:00:00Z",\s*to:\s*"(\d{4})-12-31T23:59:59Z"\)/g)]
    .map(([, alias, from, to]) => {
      assert.equal(from, alias);
      assert.equal(to, alias);
      return [`y${alias}`, { contributionCalendar: { totalContributions: recordedYears[alias] ?? 0 } }];
    }));
  return json({ data: { user } });
};

test("a year's page gives the total its heading writes, and nothing else @PW-11-S1 @PW-11-ASM-02", () => {
  // The page recorded on 2026-11-17 heads 2023 with "907 contributions in 2023".
  assert.equal(parseYearTotal(page2023, "2023"), 907);
  for (const [year, n] of [["2017", 1], ["2018", 0], ["2026", 7502], ["2030", 1234567]]) assert.equal(parseYearTotal(contributionYearPage(year, n), year), n, year);
  assert.equal(parseYearTotal(contributionYearPage("2019", 0).replace(">\n  0\n", ">\n  No\n"), "2019"), 0);

  // Another year's heading, the last year's page, or no heading at all is refused.
  assert.throws(() => parseYearTotal(page2023, "2024"), /contributions page/);
  assert.throws(() => parseYearTotal(contributionsPage(), "2026"), /contributions page/);
  assert.throws(() => parseYearTotal("", "2023"), /contributions page/);
  assert.throws(() => parseYearTotal("<html><body>Sign in to GitHub</body></html>", "2023"), /contributions page/);
  assert.throws(() => parseYearTotal(contributionYearPage("2023", 907).replace("contributions", "commits"), "2023"), /contributions page/);
});

test("the skyline sums every year since the account began, read from the public pages with no token @PW-11-S1 @PW-11-ASM-01 @PW-11-ASM-02", async () => {
  const requests = [];
  const pages = [];
  const seeing = (url) => {
    if (url.hostname === "github.com") pages.push(url);
  };
  await withToken(TOKEN, () => withFetch(publicFetch({ requests, override: seeing }), async () => {
    assert.deepEqual(await github.lifetimeContributions(NOW), { total: ALL, since: 2017 });
  }));
  assert.equal(ALL, 8859);
  assert.deepEqual(requests.map((r) => r.at).sort(), ["api.github.com/users/NahuelMosse", ...YEARS.map(() => PAGE)].sort());
  assert.ok(requests.every((r) => !r.token), JSON.stringify(requests));
  assert.deepEqual(pages.map((u) => `${u.searchParams.get("from")}..${u.searchParams.get("to")}`).sort(), YEARS.map((y) => `${y}-01-01..${y}-12-31`));

  // The current year is the one of `now`.
  await withFetch(publicFetch(), async () => {
    assert.deepEqual(await github.lifetimeContributions(new Date("2025-03-01T00:00:00Z")), { total: 1 + 239 + 907 + 125 + 85, since: 2017 });
    assert.deepEqual(await github.lifetimeContributions(new Date("2017-12-31T23:59:59Z")), { total: 1, since: 2017 });
  });

  // The skyline draws the sum as its number, labelled with the first year; its prisms stay the last 12 months.
  await withToken(TOKEN, () => withFetch(publicFetch(), async () => {
    for (const theme of ["dark", "light"]) {
      const answer = await respond("skyline", theme, github, NOW);
      assert.equal(answer.status, 200);
      assert.equal(answer.body, golden("skyline", theme), theme);
      assert.match(answer.body, /aria-label="8,859 contributions since 2017; the last 12 months as a 3D skyline"/);
      assert.match(answer.body, />8,859<\/text>/);
      assert.match(answer.body, />CONTRIBUTIONS SINCE 2017<\/text>/);
      assert.match(answer.body, /CONTRIBUTIONS · LAST 12 MONTHS/);
    }
  }));
  const other = drawSkyline("dark", { calendar: recordedCalendar, lifetime: { total: 1234567, since: 2009 } });
  assert.match(other, />1,234,567<\/text>/);
  assert.match(other, />CONTRIBUTIONS SINCE 2009<\/text>/);
  assert.doesNotMatch(other, /6,743/);
  assert.deepEqual(prisms(other), prisms(drawSkyline("dark", { calendar: recordedCalendar })));
});

test("a year the public page does not give is asked of GraphQL with the token, and both failing is a 503 with Retry-After 300 @PW-11-ASM-03", async () => {
  const failures = {
    "page 500": (url) => url.searchParams.get("from") === "2023-01-01" && new Response("oops", { status: 500 }),
    "page 429": (url) => url.searchParams.get("from") === "2017-01-01" && new Response("slow down", { status: 429 }),
    "page unreachable": (url) => {
      if (url.searchParams.get("from") === "2026-01-01") throw new TypeError("fetch failed");
    },
    "page changed": (url) => url.searchParams.get("from") === "2024-01-01" && new Response("<html><body>A new profile</body></html>", { status: 200 }),
    "another year's heading": (url) => url.searchParams.get("from") === "2025-01-01" && new Response(contributionYearPage("2024", 125), { status: 200 }),
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
      assert.deepEqual(await github.lifetimeContributions(NOW), { total: ALL, since: 2017 }, name);
    }));
    assert.equal(queries.length, 1, name);
    assert.ok(queries[0], name);
    assert.deepEqual(requests.filter((r) => r.token).map((r) => r.at), ["api.github.com/graphql"], name);
  }

  // With no token there is no fallback: the skyline is a 503.
  const unavailable = { "Content-Type": "text/plain; charset=utf-8", "Retry-After": "300", "Cache-Control": "no-store" };
  await withToken(undefined, () => withFetch(publicFetch({ override: failures["page 500"] }), async () => {
    const answer = await respond("skyline", "dark", github, NOW);
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
      const answer = await respond("skyline", "dark", github, NOW);
      assert.deepEqual({ status: answer.status, headers: answer.headers }, { status: 503, headers: unavailable }, name);
    }));
  }
});
