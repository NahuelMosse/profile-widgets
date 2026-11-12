import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as handler from "../api/profile/[name].mjs";
import * as github from "../src/modules/widgets/data/github.mjs";
import { NOW } from "./support/stub-fetch.mjs";
import { respond } from "../src/modules/widgets/presentation/respond.mjs";
import * as npm from "../src/modules/widgets/data/npm.mjs";
import { publicFetch } from "./support/public-fetch.mjs";

const fetchers = { ...github, ...npm };

const golden = (name, theme) => readFileSync(new URL(`./golden-v3/${name}.${theme}.svg`, import.meta.url), "utf8");
const ask = (path) => handler.GET(new Request(new URL(path, "https://widgets.example")));

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

test("with no token the public interfaces still answer, and their failure is a 503 with Retry-After 300, drawn as recorded @PW-7-ASM-04", async () => {
  const requests = [];
  await withToken(undefined, () => withFetch(publicFetch({ requests }), async () => {
    for (const name of ["streak", "skyline", "building", "repo-Portfolio"]) {
      const answer = await respond(name, "light", fetchers, NOW);
      assert.equal(answer.status, 200, name);
      assert.equal(answer.body, golden(name, "light"), name);
    }
    assert.ok(requests.length > 0 && requests.every((r) => !r.token && r.at !== "api.github.com/graphql"));
  }));

  const down = (url) => url.hostname === "github.com" && new Response("oops", { status: 503 });
  requests.length = 0;
  await withToken(undefined, () => withFetch(publicFetch({ requests, override: down }), async () => {
    const response = await ask("/api/profile/streak.svg");
    assert.equal(response.status, 503);
    assert.equal(response.headers.get("retry-after"), "300");
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.ok(requests.every((r) => !r.token && r.at !== "api.github.com/graphql"));
  }));
});
