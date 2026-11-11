import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { GET } from "../api/profile/[name].mjs";
import { respond } from "../src/modules/widgets/presentation/respond.mjs";
import { widgetNames } from "../src/modules/widgets/domain/draw.mjs";
import * as github from "../src/modules/widgets/data/github.mjs";
import * as npm from "../src/modules/widgets/data/npm.mjs";
import lists from "../src/modules/widgets/data/repos.json" with { type: "json" };
import { fixtureFetch, NOW, TOKEN } from "./support/stub-fetch.mjs";

const fetchers = { ...github, ...npm };
const golden = (name, theme) => readFileSync(new URL(`./golden-v2/${name}.${theme}.svg`, import.meta.url), "utf8");
const ask = (path) => GET(new Request(new URL(path, "https://widgets.example")));
const TEXT = "text/plain; charset=utf-8";

let requests = [];
const recordingFetch = async (input, init) => {
  const { hostname, pathname } = new URL(typeof input === "string" ? input : input.url);
  requests.push(`${hostname}${pathname.replace(/range\/[^/]+/, "range")}`);
  return fixtureFetch(input, init);
};

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

const throwingFetchers = Object.fromEntries(Object.keys(fetchers).map((key) => [key, () => { throw new Error(`${key} must not be called`); }]));

test("a widget answers an SVG cached at the edge for 1800 s and stale for 86400 s @PW-1-S2 @PW-1-ASM-03", async () => {
  const expected = {
    streak: ["api.github.com/graphql", "api.github.com/search/issues"],
    heatmap: ["api.github.com/graphql"],
    skyline: ["api.github.com/graphql"],
    building: ["api.github.com/graphql", "api.github.com/users/NahuelMosse/events/public"],
    "repo-Portfolio": ["api.github.com/repos/NahuelMosse/Portfolio"],
    "tool-motion-audit": ["api.github.com/repos/NahuelMosse/motion-audit"],
    "npm-http-attack": ["registry.npmjs.org/http-attack", "api.npmjs.org/downloads/range/http-attack"],
    npm: lists.npm.flatMap((p) => [`registry.npmjs.org/${p}`, `api.npmjs.org/downloads/range/${p}`]),
  };
  await withToken(TOKEN, () => withFetch(recordingFetch, async () => {
    const response = await ask("/api/profile/streak.svg?theme=light");
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-type"), "image/svg+xml; charset=utf-8");
    assert.equal(response.headers.get("cache-control"), "public, s-maxage=1800, stale-while-revalidate=86400");
    assert.equal(await response.text(), golden("streak", "light"));

    // The theme defaults to dark and the .svg suffix is optional.
    assert.equal(await (await ask("/api/profile/streak.svg")).text(), golden("streak", "dark"));
    assert.equal(await (await ask("/api/profile/streak?theme=dark")).text(), golden("streak", "dark"));

    const direct = await respond("heatmap", "dark", fetchers, NOW);
    assert.deepEqual(direct, {
      status: 200,
      headers: { "Content-Type": "image/svg+xml; charset=utf-8", "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=86400" },
      body: golden("heatmap", "dark"),
    });

    const drawn = [["skyline", "dark"], ["repo-Portfolio", "dark"], ["tool-http-attack", "light"], ["npm-motion-audit", "dark"], ["npm", "light"], ["building", "dark"]];
    for (const [name, theme] of drawn) assert.equal((await respond(name, theme, fetchers, NOW)).body, golden(name, theme), `${name}.${theme}`);

    // Each widget asks only for the data it draws.
    for (const [name, urls] of Object.entries(expected)) {
      requests = [];
      assert.equal((await ask(`/api/profile/${name}.svg`)).status, 200, name);
      assert.deepEqual([...requests].sort(), [...urls].sort(), name);
    }
  }));
});

test("an unknown widget or theme answers 404 naming the valid ones @PW-1-ASM-04", async () => {
  const names = widgetNames(lists);
  const attempts = [["nope", "dark"], ["views", "dark"], ["streak", "sepia"], ["streak", ""], ["constructor", "dark"], ["<script>", "dark"], ["streak", "<script>"]];
  for (const [name, theme] of attempts) {
    const answer = await respond(name, theme, throwingFetchers, NOW);
    assert.equal(answer.status, 404, `${name} ${theme}`);
    assert.deepEqual(answer.headers, { "Content-Type": TEXT });
    assert.equal(answer.body, `Unknown widget or theme.\nWidgets: ${names.join(", ")}\nThemes: dark, light\n`);
  }
  for (const input of [[], [null], [{}], [undefined, "dark"], [5, "dark"]]) {
    const answer = await respond(...input);
    assert.equal(answer.status, 404);
    assert.equal(answer.headers["Content-Type"], TEXT);
  }

  for (const path of ["/api/profile/nope.svg", "/api/profile/views.svg", "/api/profile/streak.svg?theme=sepia", "/api/profile/%E0%A4%A.svg", "/api/profile/", "/api/profile/streak.svg.svg"]) {
    const response = await withFetch(() => { throw new Error("no request expected"); }, () => ask(path));
    assert.equal(response.status, 404, path);
    assert.equal(response.headers.get("content-type"), TEXT);
    assert.match(await response.text(), /^Unknown widget or theme\.\nWidgets: streak, heatmap/);
  }
});

test("an upstream failure answers 503 with Retry-After 300 and no-store @PW-1-ASM-04", async () => {
  const unavailable = { "Content-Type": TEXT, "Retry-After": "300", "Cache-Control": "no-store" };
  const failing = Object.fromEntries(Object.keys(fetchers).map((key) => [key, async () => { throw new Error("upstream down"); }]));
  for (const name of ["streak", "heatmap", "skyline", "building", "npm", "npm-http-attack", "repo-Portfolio", "tool-http-attack"]) {
    const answer = await respond(name, "dark", failing, NOW);
    assert.deepEqual({ status: answer.status, headers: answer.headers }, { status: 503, headers: unavailable }, name);
    assert.equal(answer.body, "The widget data is unavailable. Try again later.\n");
  }
  assert.equal((await respond("streak", "dark", undefined, NOW)).status, 503);

  const upstream = (status, path = "") => async (input, init) => {
    return String(input).includes(path) ? new Response("{}", { status }) : fixtureFetch(input, init);
  };
  const cases = [
    ["streak", upstream(500, "/graphql")],
    ["streak", upstream(500, "/search")],
    ["streak", async () => new Response(JSON.stringify({ errors: [{ message: "bad" }] }), { status: 200 })],
    ["building", upstream(502, "/events")],
    ["repo-Portfolio", upstream(404, "/repos")],
    ["repo-Portfolio", upstream(500, "/repos")],
    ["tool-http-attack", upstream(500, "/repos")],
    ["npm-http-attack", upstream(500, "registry.npmjs.org")],
    ["npm-http-attack", async (input, init) => (new URL(input).hostname === "api.npmjs.org" ? new Response("{}", { status: 429 }) : fixtureFetch(input, init))],
    ["streak", async () => { throw new TypeError("fetch failed"); }],
  ];
  await withToken(TOKEN, async () => {
    for (const [name, fetchImpl] of cases) {
      const response = await withFetch(fetchImpl, () => ask(`/api/profile/${name}.svg`));
      assert.equal(response.status, 503, name);
      assert.equal(response.headers.get("retry-after"), "300");
      assert.equal(response.headers.get("cache-control"), "no-store");
      assert.equal(response.headers.get("content-type"), TEXT);
    }
    // A tool card still draws when its repo is not on GitHub.
    const bare = await withFetch(upstream(404, "/repos"), () => ask("/api/profile/tool-http-attack.svg"));
    assert.equal(bare.status, 200);
    assert.match(await bare.text(), /<svg[^>]* height="176"/);
  });

  // Without the token nothing is asked of GitHub.
  const response = await withToken(undefined, () => withFetch(() => { throw new Error("no request expected"); }, () => ask("/api/profile/streak.svg")));
  assert.equal(response.status, 503);
  assert.equal(response.headers.get("retry-after"), "300");
});
