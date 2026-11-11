import { test } from "node:test";
import assert from "node:assert/strict";
import { GET } from "../api/profile/[name].mjs";
import { respond } from "../src/modules/widgets/presentation/respond.mjs";
import * as github from "../src/modules/widgets/data/github.mjs";
import * as npm from "../src/modules/widgets/data/npm.mjs";
import { fixtureFetch, NOW, TOKEN } from "./support/stub-fetch.mjs";

const fetchers = { ...github, ...npm };
const ask = (path) => GET(new Request(new URL(path, "https://widgets.example")));
const TEXT = "text/plain; charset=utf-8";

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

test("an upstream failure answers 503 with Retry-After 300 and no-store @PW-4-S1 @PW-4-ASM-01 @PW-1-ASM-04", async () => {
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
    assert.match(await bare.text(), /<svg[^>]* height="130"/);
  });

  // Without the token nothing is asked of GitHub.
  const response = await withToken(undefined, () => withFetch(() => { throw new Error("no request expected"); }, () => ask("/api/profile/streak.svg")));
  assert.equal(response.status, 503);
  assert.equal(response.headers.get("retry-after"), "300");
});
